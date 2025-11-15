package com.example.gams.services;

import com.example.gams.entities.MovimientoInventario;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.entities.Usuario;
import com.example.gams.repositories.MovimientoInventarioRepository;
import com.example.gams.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MovimientoInventarioService {

    @Autowired
    private MovimientoInventarioRepository movimientoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    /**
     * Registrar un movimiento de inventario automáticamente
     */
    @Transactional
    public MovimientoInventario registrarMovimiento(
            ProductoVariante variante,
            MovimientoInventario.TipoMovimiento tipo,
            Integer cantidad,
            Integer stockAnterior,
            Integer stockNuevo,
            String motivo,
            String referencia) {

        // Obtener usuario actual del contexto de seguridad
        Usuario usuario = obtenerUsuarioActual();

        MovimientoInventario movimiento = new MovimientoInventario();
        movimiento.setVariante(variante);
        movimiento.setTipo(tipo);
        movimiento.setCantidad(cantidad);
        movimiento.setStockAnterior(stockAnterior);
        movimiento.setStockNuevo(stockNuevo);
        movimiento.setMotivo(motivo);
        movimiento.setReferencia(referencia);
        movimiento.setUsuario(usuario);
        
        // Guardar información desnormalizada para mantener historial aunque se elimine la variante
        movimiento.setVarianteSku(variante.getSku());
        movimiento.setProductoNombre(variante.getProducto().getNombre());
        movimiento.setColorNombre(variante.getColor().getNombre());
        movimiento.setTallaNombre(variante.getTalla().getNombre());

        return movimientoRepository.save(movimiento);
    }

    /**
     * Registrar movimiento de entrada (nueva variante, compra, devolución)
     */
    @Transactional
    public MovimientoInventario registrarEntrada(
            ProductoVariante variante,
            Integer cantidad,
            String motivo) {

        Integer stockAnterior = variante.getStock();
        Integer stockNuevo = stockAnterior + cantidad;

        return registrarMovimiento(
                variante,
                MovimientoInventario.TipoMovimiento.ENTRADA,
                cantidad,
                stockAnterior,
                stockNuevo,
                motivo,
                null
        );
    }

    /**
     * Registrar movimiento de salida (venta, baja)
     */
    @Transactional
    public MovimientoInventario registrarSalida(
            ProductoVariante variante,
            Integer cantidad,
            String motivo,
            String referencia) {

        Integer stockAnterior = variante.getStock();
        Integer stockNuevo = stockAnterior - cantidad;

        return registrarMovimiento(
                variante,
                MovimientoInventario.TipoMovimiento.SALIDA,
                cantidad,
                stockAnterior,
                stockNuevo,
                motivo,
                referencia
        );
    }

    /**
     * Registrar ajuste de inventario (corrección de stock)
     */
    @Transactional
    public MovimientoInventario registrarAjuste(
            ProductoVariante variante,
            Integer stockAnterior,
            Integer stockNuevo,
            String motivo) {

        Integer cantidad = Math.abs(stockNuevo - stockAnterior);

        return registrarMovimiento(
                variante,
                MovimientoInventario.TipoMovimiento.AJUSTE,
                cantidad,
                stockAnterior,
                stockNuevo,
                motivo,
                null
        );
    }

    /**
     * Registrar eliminación de variante (para auditoría)
     * CRÍTICO: El movimiento se guarda SIN REFERENCIA a la variante (variante_id = NULL)
     * para evitar problemas de FK cuando se elimine la variante
     */
    @Transactional
    public MovimientoInventario registrarEliminacion(
            ProductoVariante variante,
            String motivo) {

        Integer stockActual = variante.getStock() != null ? variante.getStock() : 0;
        
        // Obtener usuario actual
        Usuario usuario = obtenerUsuarioActual();

        MovimientoInventario movimiento = new MovimientoInventario();
        // CRÍTICO: NO asignar la variante para evitar FK constraint
        movimiento.setVariante(null);  // NULL desde el principio
        movimiento.setTipo(MovimientoInventario.TipoMovimiento.SALIDA);
        movimiento.setCantidad(stockActual);  // Cantidad que había cuando se eliminó
        movimiento.setStockAnterior(stockActual);  // Stock antes de eliminar
        movimiento.setStockNuevo(0);            // Stock después (0 porque se eliminó)
        movimiento.setMotivo(motivo);
        movimiento.setReferencia("VARIANTE_ELIMINADA_ID_" + variante.getId());
        movimiento.setUsuario(usuario);
        
        // CRÍTICO: Guardar información desnormalizada (única fuente de datos)
        movimiento.setVarianteSku(variante.getSku());
        movimiento.setProductoNombre(variante.getProducto().getNombre());
        movimiento.setColorNombre(variante.getColor().getNombre());
        movimiento.setTallaNombre(variante.getTalla().getNombre());

        MovimientoInventario saved = movimientoRepository.save(movimiento);
        
        System.out.println("✅ Movimiento SALIDA (eliminación) guardado con ID: " + saved.getId() + " (sin FK a variante)");
        return saved;
    }

    /**
     * Obtener todos los movimientos ordenados por fecha descendente
     */
    public List<MovimientoInventario> listarTodosMovimientos() {
        return movimientoRepository.findUltimosMovimientos();
    }

    /**
     * Obtener movimientos de hoy
     */
    public List<MovimientoInventario> listarMovimientosHoy() {
        return movimientoRepository.findMovimientosHoy();
    }

    /**
     * Obtener movimientos de una variante específica
     */
    public List<MovimientoInventario> listarMovimientosPorVariante(Integer varianteId) {
        return movimientoRepository.findByVarianteIdOrderByFechaDesc(varianteId);
    }

    /**
     * Obtener movimientos de un producto (todas sus variantes)
     */
    public List<MovimientoInventario> listarMovimientosPorProducto(Integer productoId) {
        return movimientoRepository.findByProductoId(productoId);
    }

    /**
     * Obtener movimientos entre fechas
     */
    public List<MovimientoInventario> listarMovimientosPorFechas(
            LocalDateTime fechaInicio, LocalDateTime fechaFin) {
        return movimientoRepository.findByFechaBetweenOrderByFechaDesc(fechaInicio, fechaFin);
    }

    /**
     * Obtener movimientos por tipo
     */
    public List<MovimientoInventario> listarMovimientosPorTipo(
            MovimientoInventario.TipoMovimiento tipo) {
        return movimientoRepository.findByTipoOrderByFechaDesc(tipo);
    }

    /**
     * Obtener movimientos por usuario
     */
    public List<MovimientoInventario> listarMovimientosPorUsuario(Integer usuarioId) {
        return movimientoRepository.findByUsuarioIdOrderByFechaDesc(usuarioId);
    }

    /**
     * Obtener el usuario actual del contexto de seguridad
     */
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
