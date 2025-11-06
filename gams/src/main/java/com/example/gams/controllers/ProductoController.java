package com.example.gams.controllers;

import com.example.gams.dto.ProductoDTO;
import com.example.gams.dto.VarianteDTO;
import com.example.gams.entities.Producto;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.services.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/productos")
@CrossOrigin(origins = "*")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    // ============================================
    // PRODUCTOS
    // ============================================

    @GetMapping
    public ResponseEntity<List<ProductoDTO>> listarProductos(
            @RequestParam(required = false) Boolean activo,
            @RequestParam(required = false) Integer categoriaId,
            @RequestParam(required = false) Integer marcaId,
            @RequestParam(required = false) Producto.Genero genero,
            @RequestParam(required = false) String buscar) {

        List<Producto> productos;

        if (buscar != null && !buscar.isEmpty()) {
            productos = productoService.buscarProductosPorCodigoOrNombre(buscar);
        } else if (categoriaId != null) {
            productos = productoService.buscarProductosPorCategoria(categoriaId);
        } else if (marcaId != null) {
            productos = productoService.buscarProductosPorMarca(marcaId);
        } else if (genero != null) {
            productos = productoService.buscarProductosPorGenero(genero);
        } else if (activo != null && activo) {
            productos = productoService.listarProductosOrdenadosPorNombre();
        } else {
            productos = productoService.listarProductos();
        }

        // Convertir a DTO con información adicional
        List<ProductoDTO> productosDTO = productos.stream().map(producto -> {
            ProductoDTO dto = new ProductoDTO(producto);
            dto.setStockTotal(productoService.calcularStockTotalProducto(producto.getId()));
            dto.setCantidadVariantes((int) productoService.contarVariantesPorProducto(producto.getId()));
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(productosDTO);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductoDTO> obtenerProducto(@PathVariable Integer id) {
        Optional<Producto> producto = productoService.buscarProductoPorId(id);
        if (producto.isPresent()) {
            ProductoDTO dto = new ProductoDTO(producto.get());
            dto.setStockTotal(productoService.calcularStockTotalProducto(id));
            dto.setCantidadVariantes((int) productoService.contarVariantesPorProducto(id));
            return ResponseEntity.ok(dto);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/codigo/{codigo}")
    public ResponseEntity<ProductoDTO> obtenerProductoPorCodigo(@PathVariable String codigo) {
        Optional<Producto> producto = productoService.buscarProductoPorCodigo(codigo);
        if (producto.isPresent()) {
            ProductoDTO dto = new ProductoDTO(producto.get());
            dto.setStockTotal(productoService.calcularStockTotalProducto(producto.get().getId()));
            dto.setCantidadVariantes((int) productoService.contarVariantesPorProducto(producto.get().getId()));
            return ResponseEntity.ok(dto);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/recientes")
    public ResponseEntity<List<ProductoDTO>> listarProductosRecientes() {
        List<Producto> productos = productoService.listarProductosRecientes();
        List<ProductoDTO> productosDTO = productos.stream()
                .map(ProductoDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(productosDTO);
    }

    @PostMapping
    public ResponseEntity<?> crearProducto(@RequestBody Producto producto) {
        try {
            // Verificar si ya existe un producto con ese código
            if (productoService.existeProductoPorCodigo(producto.getCodigo())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Ya existe un producto con el código: " + producto.getCodigo());
            }

            // Guardar usando el método CON VALIDACIÓN
            Producto nuevoProducto = productoService.guardarProductoConValidacion(producto);

            return ResponseEntity.status(HttpStatus.CREATED).body(nuevoProducto);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al crear producto: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarProducto(@PathVariable Integer id, @RequestBody Producto producto) {
        try {
            // Verificar que el producto existe
            Optional<Producto> productoExistente = productoService.buscarProductoPorId(id);
            if (!productoExistente.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Producto no encontrado con id: " + id);
            }

            // Preservar fecha de creación original
            Producto productoActual = productoExistente.get();
            if (productoActual.getFechaCreacion() != null) {
                producto.setFechaCreacion(productoActual.getFechaCreacion());
            }

            // Establecer el ID
            producto.setId(id);

            // Guardar usando el método CON VALIDACIÓN
            Producto productoActualizado = productoService.guardarProductoConValidacion(producto);

            return ResponseEntity.ok(productoActualizado);

        } catch (RuntimeException e) {
            // Capturar errores de validación
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al actualizar producto: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarProducto(@PathVariable Integer id) {
        try {
            Optional<Producto> producto = productoService.buscarProductoPorId(id);
            if (!producto.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            productoService.desactivarProductoCompleto(id);
            return ResponseEntity.ok().body("Producto y sus variantes desactivados exitosamente");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al eliminar el producto: " + e.getMessage());
        }
    }

    @GetMapping("/estadisticas")
    public ResponseEntity<Map<String, Object>> obtenerEstadisticas() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalProductos", productoService.contarProductos());
        stats.put("productosActivos", productoService.contarProductosActivos());
        stats.put("totalVariantes", productoService.contarVariantes());
        stats.put("stockTotal", productoService.calcularStockTotalSistema());
        return ResponseEntity.ok(stats);
    }

    // ============================================
    // VARIANTES
    // ============================================

    @GetMapping("/{productoId}/variantes")
    public ResponseEntity<List<VarianteDTO>> listarVariantesDeProducto(@PathVariable Integer productoId) {
        List<ProductoVariante> variantes = productoService.buscarVariantesPorProducto(productoId);
        List<VarianteDTO> variantesDTO = variantes.stream()
                .map(VarianteDTO::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(variantesDTO);
    }

    @GetMapping("/variantes")
    public ResponseEntity<List<VarianteDTO>> listarVariantes(
            @RequestParam(required = false) Boolean activo,
            @RequestParam(required = false) Boolean bajoStock,
            @RequestParam(required = false) Boolean sinStock,
            @RequestParam(required = false) Integer colorId,
            @RequestParam(required = false) Integer tallaId) {

        List<ProductoVariante> variantes;

        if (bajoStock != null && bajoStock) {
            variantes = productoService.buscarVariantesConStockBajo();
        } else if (sinStock != null && sinStock) {
            variantes = productoService.buscarVariantesSinStock();
        } else if (colorId != null) {
            variantes = productoService.buscarVariantesPorColor(colorId);
        } else if (tallaId != null) {
            variantes = productoService.buscarVariantesPorTalla(tallaId);
        } else if (activo != null && activo) {
            variantes = productoService.listarVariantesActivas();
        } else {
            variantes = productoService.listarVariantes();
        }

        List<VarianteDTO> variantesDTO = variantes.stream()
                .map(VarianteDTO::new)
                .collect(Collectors.toList());

        return ResponseEntity.ok(variantesDTO);
    }

    @GetMapping("/variantes/{id}")
    public ResponseEntity<VarianteDTO> obtenerVariante(@PathVariable Integer id) {
        Optional<ProductoVariante> variante = productoService.buscarVariantePorId(id);
        return variante.map(v -> ResponseEntity.ok(new VarianteDTO(v)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/variantes/sku/{sku}")
    public ResponseEntity<VarianteDTO> obtenerVariantePorSku(@PathVariable String sku) {
        Optional<ProductoVariante> variante = productoService.buscarVariantePorSku(sku);
        return variante.map(v -> ResponseEntity.ok(new VarianteDTO(v)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/variantes/barcode/{codigo}")
    public ResponseEntity<VarianteDTO> obtenerVariantePorCodigoBarras(@PathVariable String codigo) {
        Optional<ProductoVariante> variante = productoService.buscarVariantePorCodigoBarras(codigo);
        return variante.map(v -> ResponseEntity.ok(new VarianteDTO(v)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/variantes/buscar/{codigo}")
    public ResponseEntity<VarianteDTO> buscarVariantePorCodigo(@PathVariable String codigo) {
        Optional<ProductoVariante> variante = productoService.buscarVariantePorSkuOCodigoBarras(codigo);
        return variante.map(v -> ResponseEntity.ok(new VarianteDTO(v)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/variantes")
    public ResponseEntity<?> crearVariante(@RequestBody ProductoVariante variante) {
        try {
            // Verificar que el producto exista
            Optional<Producto> producto = productoService.buscarProductoPorId(variante.getProducto().getId());
            if (!producto.isPresent()) {
                return ResponseEntity.badRequest().body("El producto especificado no existe");
            }

            // Verificar si ya existe una variante con esa combinación
            Optional<ProductoVariante> varianteExistente = productoService.buscarVarianteEspecifica(
                    variante.getProducto().getId(),
                    variante.getColor().getId(),
                    variante.getTalla().getId());

            if (varianteExistente.isPresent()) {
                return ResponseEntity.badRequest()
                        .body("Ya existe una variante con esa combinación de producto, color y talla");
            }

            ProductoVariante nuevaVariante = productoService.guardarVariante(variante);
            return ResponseEntity.status(HttpStatus.CREATED).body(new VarianteDTO(nuevaVariante));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al crear la variante: " + e.getMessage());
        }
    }

    @PutMapping("/variantes/{id}")
    public ResponseEntity<?> actualizarVariante(@PathVariable Integer id, @RequestBody ProductoVariante variante) {
        try {
            Optional<ProductoVariante> varianteExistente = productoService.buscarVariantePorId(id);
            if (!varianteExistente.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            // Preservar la fecha de creación original
            ProductoVariante varianteActual = varianteExistente.get();
            if (varianteActual.getFechaCreacion() != null) {
                variante.setFechaCreacion(varianteActual.getFechaCreacion());
            }
            
            // Establecer el ID
            variante.setId(id);
            
            // Guardar variante
            ProductoVariante varianteActualizada = productoService.guardarVariante(variante);
            return ResponseEntity.ok(new VarianteDTO(varianteActualizada));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Error de validación: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al actualizar la variante: " + e.getMessage());
        }
    }

    @PutMapping("/variantes/{id}/stock")
    public ResponseEntity<?> actualizarStockVariante(
            @PathVariable Integer id,
            @RequestParam Integer nuevoStock) {
        try {
            ProductoVariante variante = productoService.actualizarStock(id, nuevoStock);
            return ResponseEntity.ok(new VarianteDTO(variante));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al actualizar el stock: " + e.getMessage());
        }
    }

    @DeleteMapping("/variantes/{id}")
    public ResponseEntity<?> eliminarVariante(@PathVariable Integer id) {
        try {
            Optional<ProductoVariante> variante = productoService.buscarVariantePorId(id);
            if (!variante.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            productoService.eliminarVariante(id);
            return ResponseEntity.ok().body("Variante eliminada exitosamente");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al eliminar la variante: " + e.getMessage());
        }
    }

    @GetMapping("/variantes/alertas")
    public ResponseEntity<Map<String, Object>> obtenerAlertasStock() {
        Map<String, Object> alertas = new HashMap<>();

        List<VarianteDTO> stockBajo = productoService.buscarVariantesConStockBajo()
                .stream().map(VarianteDTO::new).collect(Collectors.toList());

        List<VarianteDTO> sinStock = productoService.buscarVariantesSinStock()
                .stream().map(VarianteDTO::new).collect(Collectors.toList());

        alertas.put("stockBajo", stockBajo);
        alertas.put("sinStock", sinStock);
        alertas.put("totalStockBajo", stockBajo.size());
        alertas.put("totalSinStock", sinStock.size());

        return ResponseEntity.ok(alertas);
    }
}