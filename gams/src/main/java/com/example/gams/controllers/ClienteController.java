package com.example.gams.controllers;

import com.example.gams.entities.Cliente;
import com.example.gams.services.ClienteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    /**
     * Listar clientes activos, con búsqueda opcional por nombre o documento
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> listarClientes(
            @RequestParam(required = false) String buscar) {

        Map<String, Object> response = new HashMap<>();
        try {
            List<Cliente> clientes = clienteService.buscar(buscar);
            response.put("success", true);
            response.put("clientes", clientes);
            response.put("total", clientes.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error al listar clientes: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Buscar cliente por número de documento exacto (para el POS:
     * el vendedor escribe el DNI y el sistema lo encuentra o propone crearlo)
     */
    @GetMapping("/documento/{numeroDocumento}")
    public ResponseEntity<Map<String, Object>> buscarPorDocumento(@PathVariable String numeroDocumento) {
        Map<String, Object> response = new HashMap<>();
        Optional<Cliente> cliente = clienteService.buscarPorDocumento(numeroDocumento);

        if (cliente.isPresent()) {
            response.put("success", true);
            response.put("cliente", cliente.get());
            return ResponseEntity.ok(response);
        }

        response.put("success", false);
        response.put("message", "No existe un cliente con el documento " + numeroDocumento);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    /**
     * Obtener cliente por id
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> obtenerCliente(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            response.put("success", true);
            response.put("cliente", clienteService.obtenerPorId(id));
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    /**
     * Registrar un cliente nuevo (alta rápida desde el POS)
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> registrarCliente(@RequestBody Cliente cliente) {
        Map<String, Object> response = new HashMap<>();
        try {
            Cliente guardado = clienteService.registrar(cliente);
            response.put("success", true);
            response.put("message", "Cliente registrado correctamente");
            response.put("cliente", guardado);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Actualizar datos de un cliente
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> actualizarCliente(
            @PathVariable Integer id,
            @RequestBody Cliente cliente) {

        Map<String, Object> response = new HashMap<>();
        try {
            Cliente actualizado = clienteService.actualizar(id, cliente);
            response.put("success", true);
            response.put("message", "Cliente actualizado correctamente");
            response.put("cliente", actualizado);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Desactivar un cliente (soft-delete: sus ventas se conservan)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> desactivarCliente(@PathVariable Integer id) {
        Map<String, Object> response = new HashMap<>();
        try {
            clienteService.desactivar(id);
            response.put("success", true);
            response.put("message", "Cliente desactivado correctamente");
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}