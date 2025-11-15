package com.example.gams.services;

import com.example.gams.entities.Producto;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.entities.Color;
import com.example.gams.entities.Talla;
import com.example.gams.repositories.ProductoRepository;
import com.example.gams.repositories.ProductoVarianteRepository;
import com.example.gams.repositories.ColorRepository;
import com.example.gams.repositories.TallaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProductoService {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoVarianteRepository varianteRepository;
    
    @Autowired
    private ColorRepository colorRepository;  // NUEVO - AGREGAR
    
    @Autowired
    private TallaRepository tallaRepository;  // NUEVO - AGREGAR

    // ============================================
    // PRODUCTOS
    // ============================================

    public List<Producto> listarProductos() {
        return productoRepository.findAll();
    }

    public List<Producto> listarProductosActivos() {
        return productoRepository.findByActivoTrue();
    }

    public List<Producto> listarProductosOrdenadosPorNombre() {
        return productoRepository.findByActivoTrueOrderByNombreAsc();
    }

    public List<Producto> listarProductosOrdenadosPorPrecio() {
        return productoRepository.findByActivoTrueOrderByPrecioVentaAsc();
    }

    public List<Producto> listarProductosRecientes() {
        return productoRepository.findRecientes();
    }

    public Optional<Producto> buscarProductoPorId(Integer id) {
        return productoRepository.findById(id);
    }

    public Optional<Producto> buscarProductoPorCodigo(String codigo) {
        return productoRepository.findByCodigo(codigo);
    }

    public List<Producto> buscarProductosPorNombre(String searchTerm) {
        return productoRepository.searchByNombre(searchTerm);
    }

    public List<Producto> buscarProductosPorCodigoOrNombre(String search) {
        return productoRepository.searchByCodigoOrNombre(search);
    }

    public List<Producto> buscarProductosPorCategoria(Integer categoriaId) {
        return productoRepository.findByCategoriaIdAndActivoTrue(categoriaId);
    }

    public List<Producto> buscarProductosPorMarca(Integer marcaId) {
        return productoRepository.findByMarcaIdAndActivoTrue(marcaId);
    }

    public List<Producto> buscarProductosPorGenero(Producto.Genero genero) {
        return productoRepository.findByGeneroAndActivoTrue(genero);
    }

    public List<Producto> buscarProductosPorTemporada(Producto.Temporada temporada) {
        return productoRepository.findByTemporadaAndActivoTrue(temporada);
    }

    public List<Producto> buscarProductosPorRangoPrecio(BigDecimal precioMin, BigDecimal precioMax) {
        return productoRepository.findByPrecioVentaBetweenAndActivoTrue(precioMin, precioMax);
    }

    public Producto guardarProducto(Producto producto) {
        return productoRepository.save(producto);
    }

    public void eliminarProducto(Integer id) {
        productoRepository.deleteById(id);
    }

    public boolean existeProductoPorCodigo(String codigo) {
        return productoRepository.existsByCodigo(codigo);
    }

    public long contarProductos() {
        return productoRepository.count();
    }

    public long contarProductosActivos() {
        return productoRepository.countByActivoTrue();
    }

    public long contarProductosPorCategoria(Integer categoriaId) {
        return productoRepository.countByCategoriaIdAndActivoTrue(categoriaId);
    }

    public long contarProductosPorMarca(Integer marcaId) {
        return productoRepository.countByMarcaIdAndActivoTrue(marcaId);
    }

    // ============================================
    // VARIANTES
    // ============================================

    public List<ProductoVariante> listarVariantes() {
        return varianteRepository.findAll();
    }

    public List<ProductoVariante> listarVariantesActivas() {
        return varianteRepository.findByActivoTrue();
    }

    public Optional<ProductoVariante> buscarVariantePorId(Integer id) {
        return varianteRepository.findById(id);
    }

    public Optional<ProductoVariante> buscarVariantePorSku(String sku) {
        return varianteRepository.findBySku(sku);
    }

    public Optional<ProductoVariante> buscarVariantePorCodigoBarras(String codigoBarras) {
        return varianteRepository.findByCodigoBarras(codigoBarras);
    }

    public Optional<ProductoVariante> buscarVariantePorSkuOCodigoBarras(String codigo) {
        return varianteRepository.findBySkuOrCodigoBarras(codigo);
    }

    public List<ProductoVariante> buscarVariantesPorProducto(Integer productoId) {
        return varianteRepository.findByProductoIdAndActivoTrue(productoId);
    }

    public Optional<ProductoVariante> buscarVarianteEspecifica(Integer productoId, Integer colorId, Integer tallaId) {
        return varianteRepository.findByProductoIdAndColorIdAndTallaIdAndActivoTrue(productoId, colorId, tallaId);
    }

    public List<ProductoVariante> buscarVariantesConStockBajo() {
        return varianteRepository.findStockBajo();
    }

    public List<ProductoVariante> buscarVariantesSinStock() {
        return varianteRepository.findSinStock();
    }

    public List<ProductoVariante> buscarVariantesConStock() {
        return varianteRepository.findConStock();
    }

    public List<ProductoVariante> buscarVariantesPorColor(Integer colorId) {
        return varianteRepository.findByColorIdAndActivoTrue(colorId);
    }

    public List<ProductoVariante> buscarVariantesPorTalla(Integer tallaId) {
        return varianteRepository.findByTallaIdAndActivoTrue(tallaId);
    }

    /**
     * Guarda una variante con validación mejorada y carga completa de entidades
     * VERSIÓN CORREGIDA - RESUELVE EL ERROR DE NULLPOINTEREXCEPTION
     */
    public ProductoVariante guardarVariante(ProductoVariante variante) {
        // Validar que el producto existe
        if (variante.getProducto() == null || variante.getProducto().getId() == null) {
            throw new RuntimeException("El producto es requerido");
        }
        
        // Validar que la talla existe
        if (variante.getTalla() == null || variante.getTalla().getId() == null) {
            throw new RuntimeException("La talla es requerida");
        }
        
        // Validar que el color existe
        if (variante.getColor() == null || variante.getColor().getId() == null) {
            throw new RuntimeException("El color es requerido");
        }
        
        // CRÍTICO: Cargar las entidades COMPLETAS desde la base de datos
        // Esto resuelve el error de NullPointerException al generar el SKU
        
        Optional<Producto> productoOpt = productoRepository.findById(variante.getProducto().getId());
        if (!productoOpt.isPresent()) {
            throw new RuntimeException("Producto no encontrado con id: " + variante.getProducto().getId());
        }
        Producto productoCompleto = productoOpt.get();
        variante.setProducto(productoCompleto);
        
        // Cargar talla completa
        Optional<Talla> tallaOpt = tallaRepository.findById(variante.getTalla().getId());
        if (!tallaOpt.isPresent()) {
            throw new RuntimeException("Talla no encontrada con id: " + variante.getTalla().getId());
        }
        variante.setTalla(tallaOpt.get());
        
        // Cargar color completo
        Optional<Color> colorOpt = colorRepository.findById(variante.getColor().getId());
        if (!colorOpt.isPresent()) {
            throw new RuntimeException("Color no encontrado con id: " + variante.getColor().getId());
        }
        variante.setColor(colorOpt.get());
        
        // Si el stock viene como null, establecer 0
        if (variante.getStockActual() == null) {
            variante.setStockActual(0);
        }
        
        // VALIDACIÓN DE REGLA DE NEGOCIO:
        // Si el producto tiene stock general (min/max), las variantes NO pueden tener stock min/max
        if (productoCompleto.getStockMinimo() != null || productoCompleto.getStockMaximo() != null) {
            // Producto tiene control de stock GENERAL
            // Las variantes NO deben tener stock_minimo ni stock_maximo
            variante.setStockMinimo(null);
            variante.setStockMaximo(null);
        }
        // Si el producto NO tiene stock general, las variantes SÍ pueden tener stock min/max
        // (Esto ya viene del frontend, no necesitamos hacer nada)
        
        // REGENERAR SKU SIEMPRE (ya que puede haber cambiado color o talla)
        // Esto asegura que el SKU siempre esté actualizado con la combinación actual
        String skuNuevo = generarSku(variante);
        variante.setSku(skuNuevo);
        
        // Verificar si ya existe otra variante con el mismo SKU
        Optional<ProductoVariante> varianteExistente = varianteRepository.findBySku(skuNuevo);
        if (varianteExistente.isPresent() && !varianteExistente.get().getId().equals(variante.getId())) {
            throw new RuntimeException("Ya existe una variante con esa combinación de producto, color y talla");
        }
        
        return varianteRepository.save(variante);
    }

    public void eliminarVariante(Integer id) {
        varianteRepository.deleteById(id);
    }

    public boolean existeVariantePorSku(String sku) {
        return varianteRepository.existsBySku(sku);
    }

    public boolean existeVariantePorCodigoBarras(String codigoBarras) {
        return varianteRepository.existsByCodigoBarras(codigoBarras);
    }

    public long contarVariantes() {
        return varianteRepository.count();
    }

    public long contarVariantesPorProducto(Integer productoId) {
        return varianteRepository.countByProductoIdAndActivoTrue(productoId);
    }

    public long contarVariantesConStockBajo() {
        return varianteRepository.countStockBajo();
    }

    public Long calcularStockTotalProducto(Integer productoId) {
        return varianteRepository.sumStockByProducto(productoId);
    }

    public Long calcularStockTotalSistema() {
        return varianteRepository.sumStockTotal();
    }

    // ============================================
    // MÉTODOS AUXILIARES
    // ============================================

    /**
     * Genera un SKU automático basado en el producto, color y talla
     * Formato: CODIGO-COLOR-TALLA
     * Ejemplo: U22239413-NEGRO-M
     * Características:
     * - Código del producto en mayúsculas
     * - Color en mayúsculas, espacios reemplazados por guiones
     * - Talla en mayúsculas
     */
    private String generarSku(ProductoVariante variante) {
        String codigoProducto = variante.getProducto().getCodigo().toUpperCase();
        String nombreColor = variante.getColor().getNombre()
            .toUpperCase()
            .replace(" ", "-")
            .replace("Á", "A")
            .replace("É", "E")
            .replace("Í", "I")
            .replace("Ó", "O")
            .replace("Ú", "U");
        String nombreTalla = variante.getTalla().getNombre().toUpperCase();
        
        return String.format("%s-%s-%s", codigoProducto, nombreColor, nombreTalla);
    }

    /**
     * Actualiza el stock de una variante
     */
    public ProductoVariante actualizarStock(Integer varianteId, Integer nuevoStock) {
        Optional<ProductoVariante> varianteOpt = varianteRepository.findById(varianteId);
        if (varianteOpt.isPresent()) {
            ProductoVariante variante = varianteOpt.get();
            variante.setStockActual(nuevoStock);
            return varianteRepository.save(variante);
        }
        throw new RuntimeException("Variante no encontrada con id: " + varianteId);
    }

    /**
     * Verifica si una variante tiene stock disponible
     */
    public boolean tieneStockDisponible(Integer varianteId, Integer cantidad) {
        Optional<ProductoVariante> varianteOpt = varianteRepository.findById(varianteId);
        if (varianteOpt.isPresent()) {
            return varianteOpt.get().getStockActual() >= cantidad;
        }
        return false;
    }

    /**
     * Obtiene variantes con stock crítico (menor al mínimo)
     */
    public List<ProductoVariante> obtenerVariantesConStockCritico() {
        return varianteRepository.findStockBajo();
    }

    /**
     * Desactiva un producto y todas sus variantes
     */
    public void desactivarProductoCompleto(Integer productoId) {
        Optional<Producto> productoOpt = productoRepository.findById(productoId);
        if (productoOpt.isPresent()) {
            Producto producto = productoOpt.get();
            producto.setActivo(false);
            productoRepository.save(producto);
            
            // Desactivar todas las variantes del producto
            List<ProductoVariante> variantes = varianteRepository.findByProductoIdAndActivoTrue(productoId);
            for (ProductoVariante variante : variantes) {
                variante.setActivo(false);
                varianteRepository.save(variante);
            }
        }
    }

    /**
     * Activa un producto (las variantes se activan manualmente)
     */
    public void activarProducto(Integer productoId) {
        Optional<Producto> productoOpt = productoRepository.findById(productoId);
        if (productoOpt.isPresent()) {
            Producto producto = productoOpt.get();
            producto.setActivo(true);
            productoRepository.save(producto);
        }
    }

    /**
     * Verifica si un producto tiene variantes con control de stock individual
     * (variantes con stock_minimo o stock_maximo definidos)
     */
    public boolean tieneVariantesConStockIndividual(Integer productoId) {
        List<ProductoVariante> variantes = varianteRepository.findByProductoIdAndActivoTrue(productoId);
        
        for (ProductoVariante variante : variantes) {
            if (variante.getStockMinimo() != null || variante.getStockMaximo() != null) {
                return true; // Encontramos al menos una variante con stock individual
            }
        }
        
        return false; // Ninguna variante tiene stock individual
    }
    
    /**
     * Guarda o actualiza un producto con validación de reglas de stock
     * VERSIÓN MEJORADA CON VALIDACIÓN BIDIRECCIONAL
     */
    public Producto guardarProductoConValidacion(Producto producto) {
        // Si es una actualización (tiene ID), validar reglas de stock
        if (producto.getId() != null) {
            // El usuario está intentando poner stock general (min o max)
            boolean intentaPonerStockGeneral = 
                producto.getStockMinimo() != null || producto.getStockMaximo() != null;
            
            if (intentaPonerStockGeneral) {
                // Verificar si ya existen variantes con stock individual
                if (tieneVariantesConStockIndividual(producto.getId())) {
                    throw new RuntimeException(
                        "No se puede definir stock general porque este producto ya tiene variantes " +
                        "con control de stock individual. Primero elimina o actualiza las variantes."
                    );
                }
            }
        }
        
        return productoRepository.save(producto);
    }
}