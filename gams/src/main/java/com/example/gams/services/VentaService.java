package com.example.gams.services;

import com.example.gams.dto.VentaDTO;
import com.example.gams.entities.CajaSesion;
import com.example.gams.entities.Cliente;
import com.example.gams.entities.DetalleVenta;
import com.example.gams.entities.MovimientoInventario;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.entities.Usuario;
import com.example.gams.entities.Venta;
import com.example.gams.repositories.CajaSesionRepository;
import com.example.gams.repositories.ClienteRepository;
import com.example.gams.repositories.ProductoVarianteRepository;
import com.example.gams.repositories.UsuarioRepository;
import com.example.gams.repositories.VentaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Service
public class VentaService {

    private final VentaRepository ventaRepository;
    private final ClienteRepository clienteRepository;
    private final ProductoVarianteRepository varianteRepository;
    private final UsuarioRepository usuarioRepository;
    private final MovimientoInventarioService movimientoService;
    private final CajaSesionRepository cajaSesionRepository;

    // ==================== REGISTRO DE VENTA ====================

    /**
     * Registra una venta completa en una sola transacción:
     * valida stock, crea cabecera y detalles, descuenta stock y
     * registra los movimientos de inventario (SALIDA).
     * Si algo falla, todo se revierte.
     */
    @Transactional
    public Venta registrarVenta(VentaDTO dto) {
        // 0. Debe haber un turno de caja abierto: sin caja no hay control del efectivo
        if (cajaSesionRepository.findFirstByEstado(CajaSesion.EstadoCaja.ABIERTA).isEmpty()) {
            throw new RuntimeException("Debes abrir la caja antes de registrar ventas");
        }

        // 1. Validaciones básicas del pedido
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new RuntimeException("La venta debe tener al menos un producto");
        }

        Venta.MetodoPago metodoPago;
        try {
            metodoPago = Venta.MetodoPago.valueOf(dto.getMetodoPago());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new RuntimeException("Método de pago inválido: " + dto.getMetodoPago());
        }

        // 2. Cabecera de la venta
        Usuario vendedor = obtenerUsuarioActual();
        Venta venta = new Venta();
        venta.setCodigo(generarCodigo());
        venta.setVendedor(vendedor);
        venta.setMetodoPago(metodoPago);
        venta.setObservaciones(dto.getObservaciones());

        if (dto.getClienteId() != null) {
            Cliente cliente = clienteRepository.findById(dto.getClienteId())
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado: " + dto.getClienteId()));
            venta.setCliente(cliente);
        }

        // 3. Líneas: validar stock con bloqueo de fila y congelar precios de BD
        for (VentaDTO.ItemVentaDTO item : dto.getItems()) {
            if (item.getCantidad() == null || item.getCantidad() <= 0) {
                throw new RuntimeException("La cantidad debe ser mayor a cero");
            }

            // Bloqueo pesimista: evita que dos vendedores vendan la última unidad a la vez
            ProductoVariante variante = varianteRepository.findByIdForUpdate(item.getVarianteId())
                    .orElseThrow(() -> new RuntimeException("Variante no encontrada: " + item.getVarianteId()));

            if (!Boolean.TRUE.equals(variante.getActivo())) {
                throw new RuntimeException("El producto " + variante.getSku() + " no está activo");
            }

            if (variante.getStockActual() < item.getCantidad()) {
                throw new RuntimeException(String.format(
                        "Stock insuficiente para %s: disponible %d, solicitado %d",
                        variante.getSku(), variante.getStockActual(), item.getCantidad()));
            }

            // Precio congelado desde la BD (nunca se confía en el frontend)
            BigDecimal precio = variante.getProducto().getPrecioVenta();
            DetalleVenta detalle = new DetalleVenta(variante, precio, item.getCantidad());
            venta.agregarDetalle(detalle);
        }

        // 4. Totales y descuento
        BigDecimal descuento = dto.getDescuento() != null ? dto.getDescuento() : BigDecimal.ZERO;
        if (descuento.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El descuento no puede ser negativo");
        }
        venta.setDescuento(descuento);
        venta.recalcularTotales();

        if (venta.getTotal().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El descuento no puede ser mayor al subtotal");
        }

        // Política de descuentos por rol: el ADMIN no tiene límite; el vendedor
        // tiene un tope según el monto de la venta (2 soles si supera S/40,
        // 5 soles si supera S/100, nada en ventas de S/40 o menos)
        if (descuento.compareTo(BigDecimal.ZERO) > 0 && !esAdmin(vendedor)) {
            BigDecimal maximo = descuentoMaximoVendedor(venta.getSubtotal());
            if (descuento.compareTo(maximo) > 0) {
                if (maximo.compareTo(BigDecimal.ZERO) == 0) {
                    throw new RuntimeException(
                            "Los vendedores no pueden aplicar descuento en ventas de S/ 40.00 o menos");
                }
                throw new RuntimeException(String.format(
                        "Descuento máximo permitido para esta venta: S/ %.2f (solicita a un administrador)",
                        maximo));
            }
        }

        // 5. Pago en efectivo: validar monto recibido y calcular vuelto
        if (metodoPago == Venta.MetodoPago.EFECTIVO) {
            BigDecimal recibido = dto.getMontoRecibido();
            if (recibido == null || recibido.compareTo(venta.getTotal()) < 0) {
                throw new RuntimeException("El monto recibido es menor al total de la venta");
            }
            venta.setMontoRecibido(recibido);
            venta.setVuelto(recibido.subtract(venta.getTotal()));
        }

        // 6. Guardar la venta (cabecera + detalles por cascada)
        Venta ventaGuardada = ventaRepository.save(venta);

        // 7. Registrar movimientos SALIDA y descontar stock
        //    (el movimiento se registra ANTES de modificar el stock porque
        //    registrarSalida lee el stock actual como "stock anterior")
        for (DetalleVenta detalle : ventaGuardada.getDetalles()) {
            ProductoVariante variante = detalle.getVariante();
            movimientoService.registrarSalida(
                    variante,
                    detalle.getCantidad(),
                    "Venta " + ventaGuardada.getCodigo(),
                    ventaGuardada.getCodigo());

            variante.setStockActual(variante.getStockActual() - detalle.getCantidad());
            varianteRepository.save(variante);
        }

        return ventaGuardada;
    }

    // ==================== ANULACIÓN ====================

    /**
     * Anula una venta: devuelve el stock (movimientos DEVOLUCION) y marca
     * la venta como ANULADA conservando toda la auditoría. Nunca se elimina.
     */
    @Transactional
    public Venta anularVenta(Integer ventaId, String motivo) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada: " + ventaId));

        if (venta.esAnulada()) {
            throw new RuntimeException("La venta " + venta.getCodigo() + " ya está anulada");
        }

        // Ventana de anulación: las ventas antiguas ya forman parte de reportes
        // cerrados; solo se pueden anular ventas de los últimos 7 días
        if (venta.getFecha().isBefore(LocalDateTime.now().minusDays(7))) {
            throw new RuntimeException(
                    "Solo se pueden anular ventas de los últimos 7 días (esta es del "
                            + venta.getFecha().toLocalDate() + ")");
        }

        if (motivo == null || motivo.isBlank()) {
            throw new RuntimeException("Debe indicar el motivo de la anulación");
        }

        // Devolver stock de cada línea (si la variante aún existe)
        for (DetalleVenta detalle : venta.getDetalles()) {
            ProductoVariante variante = detalle.getVariante();
            if (variante == null) {
                continue; // La variante fue eliminada: no hay stock que devolver
            }

            // Bloquear la fila para actualizar stock de forma segura
            variante = varianteRepository.findByIdForUpdate(variante.getId())
                    .orElse(null);
            if (variante == null) {
                continue;
            }

            Integer stockAnterior = variante.getStockActual();
            Integer stockNuevo = stockAnterior + detalle.getCantidad();

            movimientoService.registrarMovimiento(
                    variante,
                    MovimientoInventario.TipoMovimiento.DEVOLUCION,
                    detalle.getCantidad(),
                    stockAnterior,
                    stockNuevo,
                    "Anulación de venta " + venta.getCodigo() + ": " + motivo,
                    venta.getCodigo());

            variante.setStockActual(stockNuevo);
            varianteRepository.save(variante);
        }

        venta.setEstado(Venta.EstadoVenta.ANULADA);
        venta.setFechaAnulacion(LocalDateTime.now());
        venta.setUsuarioAnulacion(obtenerUsuarioActual());
        venta.setMotivoAnulacion(motivo);

        return ventaRepository.save(venta);
    }

    // ==================== CONSULTAS ====================

    public Venta obtenerPorId(Integer id) {
        return ventaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada: " + id));
    }

    public Venta obtenerPorCodigo(String codigo) {
        return ventaRepository.findByCodigo(codigo)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada: " + codigo));
    }

    public List<Venta> listarTodas() {
        return ventaRepository.findAllByOrderByFechaDesc();
    }

    /**
     * Historial paginado con filtros opcionales (para que el POS no cargue
     * todas las ventas históricas de una sola vez)
     */
    public Page<Venta> listarPaginado(LocalDateTime desde, LocalDateTime hasta,
                                      Integer vendedorId, Venta.EstadoVenta estado,
                                      int page, int size) {
        return ventaRepository.buscarVentas(desde, hasta, vendedorId, estado,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
    }

    public List<Venta> listarPorFechas(LocalDateTime desde, LocalDateTime hasta) {
        return ventaRepository.findByFechaBetweenOrderByFechaDesc(desde, hasta);
    }

    public List<Venta> listarVentasDeHoy() {
        LocalDateTime inicio = LocalDate.now().atStartOfDay();
        LocalDateTime fin = inicio.plusDays(1).minusNanos(1);
        return ventaRepository.findByFechaBetweenOrderByFechaDesc(inicio, fin);
    }

    public List<Venta> listarPorVendedor(Integer vendedorId) {
        return ventaRepository.findByVendedorIdOrderByFechaDesc(vendedorId);
    }

    /**
     * Resumen del día para el dashboard del POS:
     * total vendido, cantidad de ventas y desglose por método de pago.
     */
    public Map<String, Object> resumenDeHoy() {
        LocalDateTime inicio = LocalDate.now().atStartOfDay();
        LocalDateTime fin = inicio.plusDays(1).minusNanos(1);

        Map<String, Object> resumen = new HashMap<>();
        resumen.put("totalVendido", ventaRepository.sumTotalVendido(inicio, fin));
        resumen.put("cantidadVentas", ventaRepository.countVentasCompletadas(inicio, fin));

        Map<String, BigDecimal> porMetodo = new HashMap<>();
        for (Object[] fila : ventaRepository.sumTotalPorMetodoPago(inicio, fin)) {
            porMetodo.put(String.valueOf(fila[0]), (BigDecimal) fila[1]);
        }
        resumen.put("porMetodoPago", porMetodo);

        return resumen;
    }

    // ==================== UTILIDADES ====================

    /**
     * Genera el correlativo interno: V-2026-00001, V-2026-00002...
     * La numeración se reinicia cada año.
     */
    private String generarCodigo() {
        int anioActual = Year.now().getValue();
        int siguiente = 1;

        Venta ultima = ventaRepository.findTopByOrderByIdDesc().orElse(null);
        if (ultima != null && ultima.getCodigo() != null) {
            // Formato esperado: V-AAAA-NNNNN
            String[] partes = ultima.getCodigo().split("-");
            if (partes.length == 3) {
                try {
                    int anioUltima = Integer.parseInt(partes[1]);
                    if (anioUltima == anioActual) {
                        siguiente = Integer.parseInt(partes[2]) + 1;
                    }
                } catch (NumberFormatException ignored) {
                    // Código con formato inesperado: se reinicia la numeración
                }
            }
        }

        return String.format("V-%d-%05d", anioActual, siguiente);
    }

    private boolean esAdmin(Usuario usuario) {
        return usuario.getRoles().stream()
                .anyMatch(rol -> "ADMIN".equalsIgnoreCase(rol.getNombre()));
    }

    /**
     * Tope de descuento para el rol VENDEDOR según el subtotal de la venta:
     * más de S/100 -> S/5, más de S/40 -> S/2, S/40 o menos -> sin descuento.
     */
    private BigDecimal descuentoMaximoVendedor(BigDecimal subtotal) {
        if (subtotal.compareTo(new BigDecimal("100")) > 0) {
            return new BigDecimal("5.00");
        }
        if (subtotal.compareTo(new BigDecimal("40")) > 0) {
            return new BigDecimal("2.00");
        }
        return BigDecimal.ZERO;
    }

    private Usuario obtenerUsuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("No hay usuario autenticado");
        }

        String username = authentication.getName();
        return usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + username));
    }
}