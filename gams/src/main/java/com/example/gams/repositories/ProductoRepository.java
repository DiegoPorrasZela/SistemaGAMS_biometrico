package com.example.gams.repositories;

import com.example.gams.entities.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Integer> {
    
    // Buscar por código
    Optional<Producto> findByCodigo(String codigo);
    
    // Verificar si existe por código
    boolean existsByCodigo(String codigo);
    
    // Listar productos activos
    List<Producto> findByActivoTrue();
    
    // Listar por categoría
    List<Producto> findByCategoriaIdAndActivoTrue(Integer categoriaId);
    
    // Listar por marca
    List<Producto> findByMarcaIdAndActivoTrue(Integer marcaId);
    
    // Listar por género
    List<Producto> findByGeneroAndActivoTrue(Producto.Genero genero);
    
    // Listar por temporada
    List<Producto> findByTemporadaAndActivoTrue(Producto.Temporada temporada);
    
    // Buscar por nombre que contenga
    @Query("SELECT p FROM Producto p WHERE LOWER(p.nombre) LIKE LOWER(CONCAT('%', :searchTerm, '%')) AND p.activo = true")
    List<Producto> searchByNombre(@Param("searchTerm") String searchTerm);
    
    // Buscar por código o nombre
    @Query("SELECT p FROM Producto p WHERE (LOWER(p.codigo) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%'))) AND p.activo = true")
    List<Producto> searchByCodigoOrNombre(@Param("search") String search);
    
    // Buscar por rango de precio
    List<Producto> findByPrecioVentaBetweenAndActivoTrue(BigDecimal precioMin, BigDecimal precioMax);
    
    // Productos ordenados por nombre
    List<Producto> findByActivoTrueOrderByNombreAsc();
    
    // Productos ordenados por precio
    List<Producto> findByActivoTrueOrderByPrecioVentaAsc();
    
    // Productos más recientes
    @Query("SELECT p FROM Producto p WHERE p.activo = true ORDER BY p.fechaCreacion DESC")
    List<Producto> findRecientes();
    
    // Contar productos activos
    long countByActivoTrue();
    
    // Contar por categoría
    long countByCategoriaIdAndActivoTrue(Integer categoriaId);
    
    // Contar por marca
    long countByMarcaIdAndActivoTrue(Integer marcaId);
}