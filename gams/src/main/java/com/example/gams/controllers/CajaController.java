package com.example.gams.controllers;

import com.example.gams.entities.CajaSesion;
import com.example.gams.services.CajaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/caja")
public class CajaController {

    private final CajaService cajaService;

    /**
     * Estado actual de la caja (y totales del turno en vivo si está abierta)
     */
    @GetMapping("/actual")
    public ResponseEntity<Map<String, Object>> estadoActual() {
        Map<String, Object> response = new HashMap<>();
        try {
            response.put("success", true);
            response.put("caja", cajaService.estadoActual());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al consultar la caja: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Abrir caja con el efectivo inicial del cajón
     */
    @PostMapping("/abrir")
    public ResponseEntity<Map<String, Object>> abrirCaja(@RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            BigDecimal montoInicial = aDecimal(body.get("montoInicial"));
            CajaSesion caja = cajaService.abrirCaja(montoInicial);

            response.put("success", true);
            response.put("message", "Caja abierta con S/ " + caja.getMontoInicial());
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Cerrar caja: recibe el efectivo contado físicamente y devuelve el arqueo
     */
    @PostMapping("/cerrar")
    public ResponseEntity<Map<String, Object>> cerrarCaja(@RequestBody Map<String, Object> body) {
        Map<String, Object> response = new HashMap<>();
        try {
            BigDecimal montoReal = aDecimal(body.get("montoReal"));
            String observaciones = body.get("observaciones") != null
                    ? String.valueOf(body.get("observaciones")) : null;

            CajaSesion caja = cajaService.cerrarCaja(montoReal, observaciones);

            Map<String, Object> arqueo = new HashMap<>();
            arqueo.put("montoInicial", caja.getMontoInicial());
            arqueo.put("totalVentas", caja.getTotalVentas());
            arqueo.put("totalEfectivo", caja.getTotalEfectivo());
            arqueo.put("montoEsperado", caja.getMontoEsperado());
            arqueo.put("montoReal", caja.getMontoReal());
            arqueo.put("diferencia", caja.getDiferencia());

            response.put("success", true);
            response.put("message", "Caja cerrada correctamente");
            response.put("arqueo", arqueo);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Historial de sesiones de caja (arqueos anteriores)
     */
    @GetMapping("/historial")
    public ResponseEntity<Map<String, Object>> historial() {
        Map<String, Object> response = new HashMap<>();
        try {
            response.put("success", true);
            response.put("sesiones", cajaService.historial());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al listar sesiones: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    private BigDecimal aDecimal(Object valor) {
        if (valor == null) {
            return null;
        }
        try {
            return new BigDecimal(String.valueOf(valor));
        } catch (NumberFormatException e) {
            throw new RuntimeException("Monto inválido: " + valor);
        }
    }
}