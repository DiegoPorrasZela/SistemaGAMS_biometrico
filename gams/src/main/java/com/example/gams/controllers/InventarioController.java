package com.example.gams.controllers;

import com.example.gams.dto.MovimientoDTO;
import com.example.gams.dto.VarianteDTO;
import com.example.gams.entities.MovimientoInventario;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.services.InventarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventario")
@CrossOrigin(origins = "*")
public class InventarioController {

    @Autowired
    private InventarioService inventarioService;

    // ============================================
    // MOVIMIENTOS DE INVENTARIO
    // ============================================

    @GetMapping("/movimientos")
    public ResponseEntity<List<MovimientoDTO>> listarMovimientos(
            @RequestParam(required = false) Integer varianteId,
            @RequestParam(required = false) Integer productoId,
            @RequestParam(required = false) Integer usuarioId,
            @RequestParam(required = false) MovimientoInventario.TipoMovimiento tipo,
            @RequestParam(required = false) String referencia,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fechaFin) {
        
        List<MovimientoInventario> movimientos;
        
        if (varianteId != null) {
            movimientos = inventarioService.listarMovimientosPorVariante(varianteId);
        } else if (productoId != null) {
            movimientos = inventarioService.listarMovimientosPorProducto(productoId);
        } else if (usuarioId != null) {
            movimientos = inventarioService.listarMovimientosPorUsuario(usuarioId);
        } else if (tipo != null) {
            movimientos = inventarioService.listarMovimientosPorTipo(tipo);
        } else if (referencia != null) {
            movimientos = inventarioService.listarMovimientosPorReferencia(referencia);
        } else if (fechaInicio != null && fechaFin != null) {
            movimientos = inventarioService.listarMovimientosPorFechas(fechaInicio, fechaFin);
        } else {
            movimientos = inventarioService.listarUltimosMovimientos();
        }
        
        List<MovimientoDTO> movimientosDTO = movimientos.stream()
            .map(MovimientoDTO::new)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(movimientosDTO);
    }

    @GetMapping("/movimientos/{id}")
    public ResponseEntity<MovimientoDTO> obtenerMovimiento(@PathVariable Integer id) {
        Optional<MovimientoInventario> movimiento = inventarioService.buscarMovimientoPorId(id);
        return movimiento.map(m -> ResponseEntity.ok(new MovimientoDTO(m)))
                        .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/movimientos/hoy")
    public ResponseEntity<List<MovimientoDTO>> listarMovimientosHoy() {
        List<MovimientoInventario> movimientos = inventarioService.listarMovimientosHoy();
        List<MovimientoDTO> movimientosDTO = movimientos.stream()
            .map(MovimientoDTO::new)
            .collect(Collectors.toList());
        return ResponseEntity.ok(movimientosDTO);
    }

    @GetMapping("/movimientos/entradas")
    public ResponseEntity<List<MovimientoDTO>> listarEntradas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        List<MovimientoInventario> movimientos = inventarioService.listarEntradasEntreFechas(inicio, fin);
        List<MovimientoDTO> movimientosDTO = movimientos.stream()
            .map(MovimientoDTO::new)
            .collect(Collectors.toList());
        return ResponseEntity.ok(movimientosDTO);
    }

    @GetMapping("/movimientos/salidas")
    public ResponseEntity<List<MovimientoDTO>> listarSalidas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        List<MovimientoInventario> movimientos = inventarioService.listarSalidasEntreFechas(inicio, fin);
        List<MovimientoDTO> movimientosDTO = movimientos.stream()
            .map(MovimientoDTO::new)
            .collect(Collectors.toList());
        return ResponseEntity.ok(movimientosDTO);
    }

    // ============================================
    // OPERACIONES DE INVENTARIO
    // ============================================

    @PostMapping("/entrada")
    public ResponseEntity<?> registrarEntrada(@RequestBody Map<String, Object> request) {
        try {
            Integer varianteId = (Integer) request.get("varianteId");
            Integer cantidad = (Integer) request.get("cantidad");
            String motivo = (String) request.get("motivo");
            String referencia = (String) request.get("referencia");
            Integer usuarioId = (Integer) request.get("usuarioId");
            
            MovimientoInventario movimiento = inventarioService.registrarEntrada(
                varianteId, cantidad, motivo, referencia, usuarioId
            );
            
            return ResponseEntity.status(HttpStatus.CREATED).body(new MovimientoDTO(movimiento));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al registrar entrada: " + e.getMessage());
        }
    }

    @PostMapping("/salida")
    public ResponseEntity<?> registrarSalida(@RequestBody Map<String, Object> request) {
        try {
            Integer varianteId = (Integer) request.get("varianteId");
            Integer cantidad = (Integer) request.get("cantidad");
            String motivo = (String) request.get("motivo");
            String referencia = (String) request.get("referencia");
            Integer usuarioId = (Integer) request.get("usuarioId");
            
            // Validar stock disponible
            if (!inventarioService.validarStockParaVenta(varianteId, cantidad)) {
                return ResponseEntity.badRequest()
                    .body("Stock insuficiente para realizar esta operación");
            }
            
            MovimientoInventario movimiento = inventarioService.registrarSalida(
                varianteId, cantidad, motivo, referencia, usuarioId
            );
            
            return ResponseEntity.status(HttpStatus.CREATED).body(new MovimientoDTO(movimiento));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al registrar salida: " + e.getMessage());
        }
    }

    @PostMapping("/ajuste")
    public ResponseEntity<?> registrarAjuste(@RequestBody Map<String, Object> request) {
        try {
            Integer varianteId = (Integer) request.get("varianteId");
            Integer cantidad = (Integer) request.get("cantidad");
            String motivo = (String) request.get("motivo");
            Integer usuarioId = (Integer) request.get("usuarioId");
            
            MovimientoInventario movimiento = inventarioService.registrarAjuste(
                varianteId, cantidad, motivo, usuarioId
            );
            
            return ResponseEntity.status(HttpStatus.CREATED).body(new MovimientoDTO(movimiento));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al registrar ajuste: " + e.getMessage());
        }
    }

    @PostMapping("/devolucion")
    public ResponseEntity<?> registrarDevolucion(@RequestBody Map<String, Object> request) {
        try {
            Integer varianteId = (Integer) request.get("varianteId");
            Integer cantidad = (Integer) request.get("cantidad");
            String motivo = (String) request.get("motivo");
            String referencia = (String) request.get("referencia");
            Integer usuarioId = (Integer) request.get("usuarioId");
            
            MovimientoInventario movimiento = inventarioService.registrarDevolucion(
                varianteId, cantidad, motivo, referencia, usuarioId
            );
            
            return ResponseEntity.status(HttpStatus.CREATED).body(new MovimientoDTO(movimiento));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al registrar devolución: " + e.getMessage());
        }
    }

    // ============================================
    // ALERTAS Y REPORTES
    // ============================================

    @GetMapping("/alertas")
    public ResponseEntity<Map<String, Object>> obtenerAlertas() {
        Map<String, Object> alertas = new HashMap<>();
        
        List<VarianteDTO> stockBajo = inventarioService.obtenerAlertasStockBajo()
            .stream().map(VarianteDTO::new).collect(Collectors.toList());
        
        List<VarianteDTO> sinStock = inventarioService.obtenerVariantesSinStock()
            .stream().map(VarianteDTO::new).collect(Collectors.toList());
        
        alertas.put("stockBajo", stockBajo);
        alertas.put("sinStock", sinStock);
        alertas.put("totalStockBajo", inventarioService.contarVariantesStockBajo());
        alertas.put("totalSinStock", sinStock.size());
        
        return ResponseEntity.ok(alertas);
    }

    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("stockTotal", inventarioService.obtenerStockTotal());
        stats.put("movimientosHoy", inventarioService.contarMovimientosHoy());
        stats.put("entradasTotal", inventarioService.contarMovimientosPorTipo(MovimientoInventario.TipoMovimiento.ENTRADA));
        stats.put("salidasTotal", inventarioService.contarMovimientosPorTipo(MovimientoInventario.TipoMovimiento.SALIDA));
        stats.put("ajustesTotal", inventarioService.contarMovimientosPorTipo(MovimientoInventario.TipoMovimiento.AJUSTE));
        stats.put("devolucionesTotal", inventarioService.contarMovimientosPorTipo(MovimientoInventario.TipoMovimiento.DEVOLUCION));
        stats.put("variantesStockBajo", inventarioService.contarVariantesStockBajo());
        
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/historial/{varianteId}")
    public ResponseEntity<List<MovimientoDTO>> obtenerHistorialVariante(@PathVariable Integer varianteId) {
        List<MovimientoInventario> movimientos = inventarioService.obtenerHistorialVariante(varianteId);
        List<MovimientoDTO> movimientosDTO = movimientos.stream()
            .map(MovimientoDTO::new)
            .collect(Collectors.toList());
        return ResponseEntity.ok(movimientosDTO);
    }

    @GetMapping("/validar-stock/{varianteId}")
    public ResponseEntity<Map<String, Object>> validarStock(
            @PathVariable Integer varianteId, 
            @RequestParam Integer cantidad) {
        
        Map<String, Object> response = new HashMap<>();
        boolean disponible = inventarioService.validarStockParaVenta(varianteId, cantidad);
        
        response.put("disponible", disponible);
        response.put("varianteId", varianteId);
        response.put("cantidadSolicitada", cantidad);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stock-producto/{productoId}")
    public ResponseEntity<Map<String, Object>> obtenerStockProducto(@PathVariable Integer productoId) {
        Map<String, Object> response = new HashMap<>();
        
        Long stockTotal = inventarioService.obtenerStockTotalProducto(productoId);
        List<ProductoVariante> variantes = inventarioService.obtenerVariantesConStock();
        
        // Filtrar variantes del producto específico
        List<VarianteDTO> variantesProducto = variantes.stream()
            .filter(v -> v.getProducto().getId().equals(productoId))
            .map(VarianteDTO::new)
            .collect(Collectors.toList());
        
        response.put("productoId", productoId);
        response.put("stockTotal", stockTotal);
        response.put("variantes", variantesProducto);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/reporte")
    public ResponseEntity<Map<String, Object>> generarReporte(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        
        Map<String, Object> reporte = new HashMap<>();
        
        List<MovimientoInventario> movimientos = inventarioService.listarMovimientosPorFechas(inicio, fin);
        List<MovimientoInventario> entradas = inventarioService.listarEntradasEntreFechas(inicio, fin);
        List<MovimientoInventario> salidas = inventarioService.listarSalidasEntreFechas(inicio, fin);
        
        // Calcular totales
        int totalEntradas = entradas.stream().mapToInt(MovimientoInventario::getCantidad).sum();
        int totalSalidas = salidas.stream().mapToInt(MovimientoInventario::getCantidad).sum();
        
        reporte.put("periodo", Map.of("inicio", inicio, "fin", fin));
        reporte.put("totalMovimientos", movimientos.size());
        reporte.put("totalEntradas", totalEntradas);
        reporte.put("totalSalidas", totalSalidas);
        reporte.put("diferencia", totalEntradas - totalSalidas);
        reporte.put("movimientos", movimientos.stream().map(MovimientoDTO::new).collect(Collectors.toList()));
        
        return ResponseEntity.ok(reporte);
    }
}