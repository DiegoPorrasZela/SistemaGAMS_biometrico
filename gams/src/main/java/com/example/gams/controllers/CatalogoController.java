package com.example.gams.controllers;

import com.example.gams.entities.*;
import com.example.gams.services.CatalogoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/catalogo")
@CrossOrigin(origins = "*")
public class CatalogoController {

    @Autowired
    private CatalogoService catalogoService;

    // ============================================
    // CATEGORÍAS
    // ============================================

    @GetMapping("/categorias")
    public ResponseEntity<List<Categoria>> listarCategorias(@RequestParam(required = false) Boolean activo) {
        List<Categoria> categorias = activo != null && activo ? 
            catalogoService.listarCategoriasActivasOrdenadas() : 
            catalogoService.listarCategorias();
        return ResponseEntity.ok(categorias);
    }

    @GetMapping("/categorias/{id}")
    public ResponseEntity<Categoria> obtenerCategoria(@PathVariable Integer id) {
        Optional<Categoria> categoria = catalogoService.buscarCategoriaPorId(id);
        return categoria.map(ResponseEntity::ok)
                       .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/categorias/buscar")
    public ResponseEntity<List<Categoria>> buscarCategorias(@RequestParam String nombre) {
        List<Categoria> categorias = catalogoService.buscarCategoriasPorNombre(nombre);
        return ResponseEntity.ok(categorias);
    }

    @PostMapping("/categorias")
    public ResponseEntity<?> crearCategoria(@RequestBody Categoria categoria) {
        try {
            if (catalogoService.existeCategoriaPorNombre(categoria.getNombre())) {
                return ResponseEntity.badRequest()
                    .body("Ya existe una categoría con ese nombre");
            }
            Categoria nuevaCategoria = catalogoService.guardarCategoria(categoria);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevaCategoria);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al crear la categoría: " + e.getMessage());
        }
    }

    @PutMapping("/categorias/{id}")
    public ResponseEntity<?> actualizarCategoria(@PathVariable Integer id, @RequestBody Categoria categoria) {
        try {
            Optional<Categoria> categoriaExistente = catalogoService.buscarCategoriaPorId(id);
            if (!categoriaExistente.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            categoria.setId(id);
            Categoria categoriaActualizada = catalogoService.guardarCategoria(categoria);
            return ResponseEntity.ok(categoriaActualizada);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al actualizar la categoría: " + e.getMessage());
        }
    }

    @DeleteMapping("/categorias/{id}")
    public ResponseEntity<?> eliminarCategoria(@PathVariable Integer id) {
        try {
            Optional<Categoria> categoria = catalogoService.buscarCategoriaPorId(id);
            if (!categoria.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            catalogoService.eliminarCategoria(id);
            return ResponseEntity.ok().body("Categoría eliminada exitosamente");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al eliminar la categoría: " + e.getMessage());
        }
    }

    // ============================================
    // MARCAS
    // ============================================

    @GetMapping("/marcas")
    public ResponseEntity<List<Marca>> listarMarcas(@RequestParam(required = false) Boolean activo) {
        List<Marca> marcas = activo != null && activo ? 
            catalogoService.listarMarcasActivasOrdenadas() : 
            catalogoService.listarMarcas();
        return ResponseEntity.ok(marcas);
    }

    @GetMapping("/marcas/{id}")
    public ResponseEntity<Marca> obtenerMarca(@PathVariable Integer id) {
        Optional<Marca> marca = catalogoService.buscarMarcaPorId(id);
        return marca.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/marcas/buscar")
    public ResponseEntity<List<Marca>> buscarMarcas(@RequestParam String nombre) {
        List<Marca> marcas = catalogoService.buscarMarcasPorNombre(nombre);
        return ResponseEntity.ok(marcas);
    }

    @PostMapping("/marcas")
    public ResponseEntity<?> crearMarca(@RequestBody Marca marca) {
        try {
            if (catalogoService.existeMarcaPorNombre(marca.getNombre())) {
                return ResponseEntity.badRequest()
                    .body("Ya existe una marca con ese nombre");
            }
            Marca nuevaMarca = catalogoService.guardarMarca(marca);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevaMarca);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al crear la marca: " + e.getMessage());
        }
    }

    @PutMapping("/marcas/{id}")
    public ResponseEntity<?> actualizarMarca(@PathVariable Integer id, @RequestBody Marca marca) {
        try {
            Optional<Marca> marcaExistente = catalogoService.buscarMarcaPorId(id);
            if (!marcaExistente.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            marca.setId(id);
            Marca marcaActualizada = catalogoService.guardarMarca(marca);
            return ResponseEntity.ok(marcaActualizada);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al actualizar la marca: " + e.getMessage());
        }
    }

    @DeleteMapping("/marcas/{id}")
    public ResponseEntity<?> eliminarMarca(@PathVariable Integer id) {
        try {
            Optional<Marca> marca = catalogoService.buscarMarcaPorId(id);
            if (!marca.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            catalogoService.eliminarMarca(id);
            return ResponseEntity.ok().body("Marca eliminada exitosamente");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al eliminar la marca: " + e.getMessage());
        }
    }

    // ============================================
    // COLORES
    // ============================================

    @GetMapping("/colores")
    public ResponseEntity<List<Color>> listarColores(@RequestParam(required = false) Boolean activo) {
        List<Color> colores = activo != null && activo ? 
            catalogoService.listarColoresActivosOrdenados() : 
            catalogoService.listarColores();
        return ResponseEntity.ok(colores);
    }

    @GetMapping("/colores/{id}")
    public ResponseEntity<Color> obtenerColor(@PathVariable Integer id) {
        Optional<Color> color = catalogoService.buscarColorPorId(id);
        return color.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/colores/buscar")
    public ResponseEntity<List<Color>> buscarColores(@RequestParam String nombre) {
        List<Color> colores = catalogoService.buscarColoresPorNombre(nombre);
        return ResponseEntity.ok(colores);
    }

    @PostMapping("/colores")
    public ResponseEntity<?> crearColor(@RequestBody Color color) {
        try {
            if (catalogoService.existeColorPorNombre(color.getNombre())) {
                return ResponseEntity.badRequest()
                    .body("Ya existe un color con ese nombre");
            }
            Color nuevoColor = catalogoService.guardarColor(color);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevoColor);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al crear el color: " + e.getMessage());
        }
    }

    @PutMapping("/colores/{id}")
    public ResponseEntity<?> actualizarColor(@PathVariable Integer id, @RequestBody Color color) {
        try {
            Optional<Color> colorExistente = catalogoService.buscarColorPorId(id);
            if (!colorExistente.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            color.setId(id);
            Color colorActualizado = catalogoService.guardarColor(color);
            return ResponseEntity.ok(colorActualizado);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al actualizar el color: " + e.getMessage());
        }
    }

    @DeleteMapping("/colores/{id}")
    public ResponseEntity<?> eliminarColor(@PathVariable Integer id) {
        try {
            Optional<Color> color = catalogoService.buscarColorPorId(id);
            if (!color.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            catalogoService.eliminarColor(id);
            return ResponseEntity.ok().body("Color eliminado exitosamente");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al eliminar el color: " + e.getMessage());
        }
    }

    // ============================================
    // TALLAS
    // ============================================

    @GetMapping("/tallas")
    public ResponseEntity<List<Talla>> listarTallas(
            @RequestParam(required = false) Boolean activo,
            @RequestParam(required = false) Talla.TipoTalla tipo) {
        List<Talla> tallas;
        
        if (tipo != null) {
            tallas = catalogoService.listarTallasPorTipoOrdenadas(tipo);
        } else if (activo != null && activo) {
            tallas = catalogoService.listarTallasOrdenadasPorOrden();
        } else {
            tallas = catalogoService.listarTallas();
        }
        
        return ResponseEntity.ok(tallas);
    }

    @GetMapping("/tallas/{id}")
    public ResponseEntity<Talla> obtenerTalla(@PathVariable Integer id) {
        Optional<Talla> talla = catalogoService.buscarTallaPorId(id);
        return talla.map(ResponseEntity::ok)
                   .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tallas")
    public ResponseEntity<?> crearTalla(@RequestBody Talla talla) {
        try {
            if (catalogoService.existeTallaPorNombre(talla.getNombre())) {
                return ResponseEntity.badRequest()
                    .body("Ya existe una talla con ese nombre");
            }
            Talla nuevaTalla = catalogoService.guardarTalla(talla);
            return ResponseEntity.status(HttpStatus.CREATED).body(nuevaTalla);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al crear la talla: " + e.getMessage());
        }
    }

    @PutMapping("/tallas/{id}")
    public ResponseEntity<?> actualizarTalla(@PathVariable Integer id, @RequestBody Talla talla) {
        try {
            Optional<Talla> tallaExistente = catalogoService.buscarTallaPorId(id);
            if (!tallaExistente.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            talla.setId(id);
            Talla tallaActualizada = catalogoService.guardarTalla(talla);
            return ResponseEntity.ok(tallaActualizada);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al actualizar la talla: " + e.getMessage());
        }
    }

    @DeleteMapping("/tallas/{id}")
    public ResponseEntity<?> eliminarTalla(@PathVariable Integer id) {
        try {
            Optional<Talla> talla = catalogoService.buscarTallaPorId(id);
            if (!talla.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            catalogoService.eliminarTalla(id);
            return ResponseEntity.ok().body("Talla eliminada exitosamente");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error al eliminar la talla: " + e.getMessage());
        }
    }
}