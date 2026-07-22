package com.example.gams.controllers;

import com.example.gams.dto.VentaDTO;
import com.example.gams.dto.VentaResponseDTO;
import com.example.gams.entities.Venta;
import com.example.gams.services.VentaService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    private final VentaService ventaService;

    /**
     * Registrar una venta desde el POS
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> registrarVenta(@RequestBody VentaDTO dto) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Dos cobros exactamente simultáneos pueden generar el mismo correlativo;
            // el UNIQUE de la BD rechaza al segundo y aquí se reintenta (cada intento
            // es una transacción nueva que regenera el código)
            Venta venta = null;
            for (int intento = 1; venta == null; intento++) {
                try {
                    venta = ventaService.registrarVenta(dto);
                } catch (DataIntegrityViolationException e) {
                    if (intento >= 3) {
                        throw new RuntimeException(
                                "No se pudo generar el comprobante por alta concurrencia, intenta de nuevo");
                    }
                }
            }

            response.put("success", true);
            response.put("message", "Venta " + venta.getCodigo() + " registrada correctamente");
            response.put("venta", new VentaResponseDTO(venta));
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Listar ventas con filtros combinables (día de hoy, rango de fechas,
     * vendedor, estado)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listarVentas(
            @RequestParam(required = false, defaultValue = "false") Boolean hoy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            @RequestParam(required = false) Integer vendedorId,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size) {

        Map<String, Object> response = new HashMap<>();
        try {
            LocalDateTime desde = null;
            LocalDateTime hasta = null;

            if (hoy) {
                desde = LocalDate.now().atStartOfDay();
                hasta = desde.plusDays(1).minusNanos(1);
            } else if (fechaInicio != null && fechaFin != null) {
                desde = fechaInicio.atStartOfDay();
                hasta = fechaFin.plusDays(1).atStartOfDay().minusNanos(1);
            }

            Venta.EstadoVenta estadoVenta = (estado != null && !estado.isBlank())
                    ? Venta.EstadoVenta.valueOf(estado.toUpperCase())
                    : null;

            Page<Venta> pagina = ventaService.listarPaginado(desde, hasta, vendedorId, estadoVenta, page, size);

            List<VentaResponseDTO> ventasDTO = pagina.getContent().stream()
                    .map(VentaResponseDTO::new)
                    .collect(Collectors.toList());

            response.put("success", true);
            response.put("ventas", ventasDTO);
            response.put("total", pagina.getTotalElements());
            response.put("page", pagina.getNumber());
            response.put("totalPages", pagina.getTotalPages());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al listar ventas: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Obtener una venta por id (para el detalle / reimpresión del ticket)
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerVenta(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Venta venta = ventaService.obtenerPorId(id);
            response.put("success", true);
            response.put("venta", new VentaResponseDTO(venta));
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    /**
     * Obtener una venta por su código de comprobante
     */
    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<Map<String, Object>> obtenerVentaPorCodigo(@PathVariable String codigo) {
        Map<String, Object> response = new HashMap<>();
        try {
            Venta venta = ventaService.obtenerPorCodigo(codigo);
            response.put("success", true);
            response.put("venta", new VentaResponseDTO(venta));
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    /**
     * Anular una venta (solo ADMIN): devuelve el stock y conserva la auditoría
     */
    @PostMapping("/{id}/anular")
    public ResponseEntity<Map<String, Object>> anularVenta(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        boolean esAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!esAdmin) {
            response.put("success", false);
            response.put("message", "Solo un administrador puede anular ventas");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        try {
            Venta venta = ventaService.anularVenta(id, body.get("motivo"));
            response.put("success", true);
            response.put("message", "Venta " + venta.getCodigo() + " anulada correctamente");
            response.put("venta", new VentaResponseDTO(venta));
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Resumen del día para el POS: total vendido, número de ventas
     * y desglose por método de pago
     */
    @GetMapping("/resumen-hoy")
    public ResponseEntity<Map<String, Object>> resumenDeHoy() {
        Map<String, Object> response = new HashMap<>();
        try {
            response.put("success", true);
            response.put("resumen", ventaService.resumenDeHoy());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al obtener el resumen: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}