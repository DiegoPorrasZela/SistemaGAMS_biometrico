package com.example.gams.controllers;

import com.example.gams.entities.Proveedor;
import com.example.gams.services.ProveedorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/proveedores")
public class ProveedorController {

    private final ProveedorService proveedorService;

    @GetMapping
    public ResponseEntity<List<Proveedor>> listarProveedores(@RequestParam(required = false) Boolean activo) {
        List<Proveedor> proveedores = activo != null && activo ?
            proveedorService.listarProveedoresActivosOrdenados() :
            proveedorService.listarProveedores();
        return ResponseEntity.ok(proveedores);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Proveedor> obtenerProveedor(@PathVariable @NonNull Integer id) {
        Optional<Proveedor> proveedor = proveedorService.buscarProveedorPorId(id);
        return proveedor.map(ResponseEntity::ok)
                        .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Proveedor>> buscarProveedores(@RequestParam String search) {
        return ResponseEntity.ok(proveedorService.buscarProveedores(search));
    }

    @PostMapping
    public ResponseEntity<?> crearProveedor(@RequestBody Proveedor proveedor) {
        try {
            if (proveedorService.existeProveedorPorNombre(proveedor.getNombre())) {
                return ResponseEntity.badRequest()
                    .body("Ya existe un proveedor con ese nombre");
            }
            if (proveedorService.existeProveedorPorRuc(proveedor.getRuc())) {
                return ResponseEntity.badRequest()
                    .body("Ya existe un proveedor con ese RUC");
            }
            Proveedor nuevoProveedor = proveedorService.guardarProveedor(proveedor);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevoProveedor);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al crear el proveedor: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarProveedor(@PathVariable @NonNull Integer id, @RequestBody Proveedor proveedor) {
        try {
            Optional<Proveedor> proveedorExistente = proveedorService.buscarProveedorPorId(id);
            if (!proveedorExistente.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            // Preservar la fecha de creación original
            if (proveedorExistente.get().getFechaCreacion() != null) {
                proveedor.setFechaCreacion(proveedorExistente.get().getFechaCreacion());
            }
            proveedor.setId(id);
            Proveedor proveedorActualizado = proveedorService.guardarProveedor(proveedor);
            return ResponseEntity.ok(proveedorActualizado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al actualizar el proveedor: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarProveedor(@PathVariable @NonNull Integer id) {
        try {
            Optional<Proveedor> proveedor = proveedorService.buscarProveedorPorId(id);
            if (!proveedor.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            proveedorService.eliminarProveedor(id);
            return ResponseEntity.ok().body("Proveedor eliminado exitosamente");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al eliminar el proveedor: " + e.getMessage());
        }
    }
}