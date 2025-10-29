package com.example.gams.services;

import com.example.gams.entities.Producto;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.repositories.ProductoRepository;
import com.example.gams.repositories.ProductoVarianteRepository;
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

    public ProductoVariante guardarVariante(ProductoVariante variante) {
        // Generar SKU automático si no existe
        if (variante.getSku() == null || variante.getSku().isEmpty()) {
            String sku = generarSku(variante);
            variante.setSku(sku);
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
     * Ejemplo: POL-001-ROJO-M
     */
    private String generarSku(ProductoVariante variante) {
        String codigoProducto = variante.getProducto().getCodigo();
        String nombreColor = variante.getColor().getNombre().toUpperCase().replace(" ", "-");
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
}