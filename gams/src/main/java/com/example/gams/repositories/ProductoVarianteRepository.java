package com.example.gams.repositories;

import com.example.gams.entities.ProductoVariante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoVarianteRepository extends JpaRepository<ProductoVariante, Integer> {
    
    // Buscar por SKU
    Optional<ProductoVariante> findBySku(String sku);
    
    // Buscar por código de barras
    Optional<ProductoVariante> findByCodigoBarras(String codigoBarras);
    
    // Verificar si existe SKU
    boolean existsBySku(String sku);
    
    // Verificar si existe código de barras
    boolean existsByCodigoBarras(String codigoBarras);
    
    // Listar variantes activas
    List<ProductoVariante> findByActivoTrue();
    
    // Listar variantes de un producto
    List<ProductoVariante> findByProductoIdAndActivoTrue(Integer productoId);
    
    // Listar variantes por color
    List<ProductoVariante> findByColorIdAndActivoTrue(Integer colorId);
    
    // Listar variantes por talla
    List<ProductoVariante> findByTallaIdAndActivoTrue(Integer tallaId);
    
    // Buscar variante específica (producto + color + talla)
    Optional<ProductoVariante> findByProductoIdAndColorIdAndTallaIdAndActivoTrue(
        Integer productoId, Integer colorId, Integer tallaId);
    
    // Variantes con stock bajo
    @Query("SELECT v FROM ProductoVariante v WHERE v.stockActual <= v.stockMinimo AND v.activo = true")
    List<ProductoVariante> findStockBajo();
    
    // Variantes sin stock
    @Query("SELECT v FROM ProductoVariante v WHERE v.stockActual = 0 AND v.activo = true")
    List<ProductoVariante> findSinStock();
    
    // Variantes con stock
    @Query("SELECT v FROM ProductoVariante v WHERE v.stockActual > 0 AND v.activo = true")
    List<ProductoVariante> findConStock();
    
    // Buscar por SKU o código de barras
    @Query("SELECT v FROM ProductoVariante v WHERE (v.sku = :codigo OR v.codigoBarras = :codigo) AND v.activo = true")
    Optional<ProductoVariante> findBySkuOrCodigoBarras(@Param("codigo") String codigo);
    
    // Contar variantes de un producto
    long countByProductoIdAndActivoTrue(Integer productoId);
    
    // Contar variantes con stock bajo
    @Query("SELECT COUNT(v) FROM ProductoVariante v WHERE v.stockActual <= v.stockMinimo AND v.activo = true")
    long countStockBajo();
    
    // Suma total de stock
    @Query("SELECT COALESCE(SUM(v.stockActual), 0) FROM ProductoVariante v WHERE v.activo = true")
    Long sumStockTotal();
    
    // Suma de stock por producto
    @Query("SELECT COALESCE(SUM(v.stockActual), 0) FROM ProductoVariante v WHERE v.producto.id = :productoId AND v.activo = true")
    Long sumStockByProducto(@Param("productoId") Integer productoId);
}