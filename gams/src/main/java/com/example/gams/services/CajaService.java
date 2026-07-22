package com.example.gams.services;

import com.example.gams.entities.CajaSesion;
import com.example.gams.entities.Usuario;
import com.example.gams.entities.Venta;
import com.example.gams.repositories.CajaSesionRepository;
import com.example.gams.repositories.UsuarioRepository;
import com.example.gams.repositories.VentaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class CajaService {

    private final CajaSesionRepository cajaRepository;
    private final VentaRepository ventaRepository;
    private final UsuarioRepository usuarioRepository;

    /**
     * Abre una sesión de caja con el efectivo inicial del cajón.
     * Solo puede existir una sesión abierta a la vez.
     */
    @Transactional
    public CajaSesion abrirCaja(BigDecimal montoInicial) {
        if (cajaRepository.findFirstByEstado(CajaSesion.EstadoCaja.ABIERTA).isPresent()) {
            throw new RuntimeException("Ya hay una caja abierta. Ciérrala antes de abrir otra.");
        }

        if (montoInicial == null || montoInicial.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("El monto inicial no puede ser negativo");
        }

        CajaSesion caja = new CajaSesion(obtenerUsuarioActual(), montoInicial);
        return cajaRepository.save(caja);
    }

    /**
     * Cierra la sesión abierta: congela los totales del turno (calculados
     * por rango de fechas sobre las ventas COMPLETADAS) y registra el arqueo:
     * efectivo esperado vs. efectivo contado físicamente.
     */
    @Transactional
    public CajaSesion cerrarCaja(BigDecimal montoReal, String observaciones) {
        CajaSesion caja = cajaRepository.findFirstByEstado(CajaSesion.EstadoCaja.ABIERTA)
                .orElseThrow(() -> new RuntimeException("No hay ninguna caja abierta"));

        if (montoReal == null || montoReal.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Debes indicar el efectivo contado (no puede ser negativo)");
        }

        LocalDateTime ahora = LocalDateTime.now();
        BigDecimal totalVentas = ventaRepository.sumTotalVendido(caja.getFechaApertura(), ahora);
        BigDecimal totalEfectivo = totalPorMetodo(caja.getFechaApertura(), ahora)
                .getOrDefault(Venta.MetodoPago.EFECTIVO.name(), BigDecimal.ZERO);

        caja.setEstado(CajaSesion.EstadoCaja.CERRADA);
        caja.setFechaCierre(ahora);
        caja.setUsuarioCierre(obtenerUsuarioActual());
        caja.setTotalVentas(totalVentas);
        caja.setTotalEfectivo(totalEfectivo);
        caja.setMontoEsperado(caja.getMontoInicial().add(totalEfectivo));
        caja.setMontoReal(montoReal);
        caja.setDiferencia(montoReal.subtract(caja.getMontoEsperado()));
        caja.setObservaciones(observaciones);

        return cajaRepository.save(caja);
    }

    /**
     * Estado actual de la caja para el POS: si está abierta incluye los
     * totales del turno en vivo (lo que va vendido desde la apertura).
     */
    public Map<String, Object> estadoActual() {
        Map<String, Object> resultado = new HashMap<>();
        Optional<CajaSesion> abierta = cajaRepository.findFirstByEstado(CajaSesion.EstadoCaja.ABIERTA);

        if (abierta.isEmpty()) {
            resultado.put("abierta", false);
            return resultado;
        }

        CajaSesion caja = abierta.get();
        LocalDateTime ahora = LocalDateTime.now();
        BigDecimal totalVentas = ventaRepository.sumTotalVendido(caja.getFechaApertura(), ahora);
        Map<String, BigDecimal> porMetodo = totalPorMetodo(caja.getFechaApertura(), ahora);
        BigDecimal totalEfectivo = porMetodo.getOrDefault(Venta.MetodoPago.EFECTIVO.name(), BigDecimal.ZERO);

        resultado.put("abierta", true);
        resultado.put("id", caja.getId());
        resultado.put("fechaApertura", caja.getFechaApertura());
        resultado.put("usuarioApertura", caja.getUsuarioApertura().getNombreCompleto());
        resultado.put("montoInicial", caja.getMontoInicial());
        resultado.put("totalVentas", totalVentas);
        resultado.put("totalEfectivo", totalEfectivo);
        resultado.put("porMetodoPago", porMetodo);
        resultado.put("montoEsperado", caja.getMontoInicial().add(totalEfectivo));
        resultado.put("cantidadVentas",
                ventaRepository.countVentasCompletadas(caja.getFechaApertura(), ahora));

        return resultado;
    }

    /** Historial de sesiones cerradas (para revisar arqueos pasados) */
    public List<Map<String, Object>> historial() {
        return cajaRepository.findAllByOrderByFechaAperturaDesc().stream()
                .map(this::aMapa)
                .collect(Collectors.toList());
    }

    // ==================== UTILIDADES ====================

    private Map<String, BigDecimal> totalPorMetodo(LocalDateTime desde, LocalDateTime hasta) {
        Map<String, BigDecimal> porMetodo = new HashMap<>();
        for (Object[] fila : ventaRepository.sumTotalPorMetodoPago(desde, hasta)) {
            porMetodo.put(String.valueOf(fila[0]), (BigDecimal) fila[1]);
        }
        return porMetodo;
    }

    /** Representación segura de la sesión (sin exponer la entidad Usuario) */
    private Map<String, Object> aMapa(CajaSesion caja) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", caja.getId());
        m.put("estado", caja.getEstado().name());
        m.put("fechaApertura", caja.getFechaApertura());
        m.put("usuarioApertura", caja.getUsuarioApertura() != null
                ? caja.getUsuarioApertura().getNombreCompleto() : null);
        m.put("montoInicial", caja.getMontoInicial());
        m.put("fechaCierre", caja.getFechaCierre());
        m.put("usuarioCierre", caja.getUsuarioCierre() != null
                ? caja.getUsuarioCierre().getNombreCompleto() : null);
        m.put("totalVentas", caja.getTotalVentas());
        m.put("totalEfectivo", caja.getTotalEfectivo());
        m.put("montoEsperado", caja.getMontoEsperado());
        m.put("montoReal", caja.getMontoReal());
        m.put("diferencia", caja.getDiferencia());
        m.put("observaciones", caja.getObservaciones());
        return m;
    }

    private Usuario obtenerUsuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("No hay usuario autenticado");
        }

        return usuarioRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException(
                        "Usuario no encontrado: " + authentication.getName()));
    }
}