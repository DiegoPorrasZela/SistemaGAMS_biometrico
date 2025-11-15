package com.example.gams.controllers;

import com.example.gams.dto.MovimientoDTO;
import com.example.gams.entities.MovimientoInventario;
import com.example.gams.services.MovimientoInventarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/movimientos")
@CrossOrigin(origins = "*")
public class MovimientoInventarioController {

    @Autowired
    private MovimientoInventarioService movimientoService;

    /**
     * Listar todos los movimientos con filtros combinables
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listarMovimientos(
            @RequestParam(required = false) Integer varianteId,
            @RequestParam(required = false) Integer productoId,
            @RequestParam(required = false) Integer usuarioId,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin,
            @RequestParam(required = false, defaultValue = "false") Boolean hoy) {

        try {
            List<MovimientoInventario> movimientos;

            // Empezar con todos los movimientos
            movimientos = movimientoService.listarTodosMovimientos();

            // Aplicar filtro por variante específica
            if (varianteId != null) {
                movimientos = movimientos.stream()
                    .filter(m -> m.getVariante() != null && m.getVariante().getId().equals(varianteId))
                    .collect(Collectors.toList());
            }

            // Aplicar filtro por producto
            if (productoId != null) {
                movimientos = movimientos.stream()
                    .filter(m -> m.getVariante() != null && 
                                 m.getVariante().getProducto().getId().equals(productoId))
                    .collect(Collectors.toList());
            }

            // Aplicar filtro por usuario
            if (usuarioId != null) {
                movimientos = movimientos.stream()
                    .filter(m -> m.getUsuario().getId().equals(usuarioId))
                    .collect(Collectors.toList());
            }

            // Aplicar filtro por tipo
            if (tipo != null) {
                MovimientoInventario.TipoMovimiento tipoMovimiento = 
                    MovimientoInventario.TipoMovimiento.valueOf(tipo.toUpperCase());
                movimientos = movimientos.stream()
                    .filter(m -> m.getTipo().equals(tipoMovimiento))
                    .collect(Collectors.toList());
            }

            // Aplicar filtro por fecha (hoy tiene prioridad)
            if (hoy) {
                LocalDateTime inicioDia = LocalDateTime.now().toLocalDate().atStartOfDay();
                LocalDateTime finDia = inicioDia.plusDays(1);
                final LocalDateTime finalInicioDia = inicioDia;
                final LocalDateTime finalFinDia = finDia;
                movimientos = movimientos.stream()
                    .filter(m -> m.getFecha().isAfter(finalInicioDia) && m.getFecha().isBefore(finalFinDia))
                    .collect(Collectors.toList());
            } else if (fechaInicio != null && fechaFin != null) {
                final LocalDateTime finalFechaInicio = fechaInicio;
                final LocalDateTime finalFechaFin = fechaFin;
                movimientos = movimientos.stream()
                    .filter(m -> m.getFecha().isAfter(finalFechaInicio) && m.getFecha().isBefore(finalFechaFin))
                    .collect(Collectors.toList());
            }

            // Convertir a DTO
            List<MovimientoDTO> movimientosDTO = movimientos.stream()
                    .map(MovimientoDTO::new)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("movimientos", movimientosDTO);
            response.put("total", movimientosDTO.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error al listar movimientos: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Obtener estadísticas de movimientos
     */
    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {

        try {
            List<MovimientoInventario> movimientos;

            if (fechaInicio != null && fechaFin != null) {
                movimientos = movimientoService.listarMovimientosPorFechas(fechaInicio, fechaFin);
            } else {
                movimientos = movimientoService.listarMovimientosHoy();
            }

            // Calcular estadísticas
            long totalEntradas = movimientos.stream()
                    .filter(m -> m.getTipo() == MovimientoInventario.TipoMovimiento.ENTRADA)
                    .count();

            long totalSalidas = movimientos.stream()
                    .filter(m -> m.getTipo() == MovimientoInventario.TipoMovimiento.SALIDA)
                    .count();

            long totalAjustes = movimientos.stream()
                    .filter(m -> m.getTipo() == MovimientoInventario.TipoMovimiento.AJUSTE)
                    .count();

            long totalDevoluciones = movimientos.stream()
                    .filter(m -> m.getTipo() == MovimientoInventario.TipoMovimiento.DEVOLUCION)
                    .count();

            Map<String, Object> estadisticas = new HashMap<>();
            estadisticas.put("totalMovimientos", movimientos.size());
            estadisticas.put("totalEntradas", totalEntradas);
            estadisticas.put("totalSalidas", totalSalidas);
            estadisticas.put("totalAjustes", totalAjustes);
            estadisticas.put("totalDevoluciones", totalDevoluciones);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("estadisticas", estadisticas);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error al obtener estadísticas: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
