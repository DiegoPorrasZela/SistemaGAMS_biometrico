package com.example.gams.repositories;

import com.example.gams.entities.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

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

    // Conteos totales (incluye inactivos) para validar eliminación de catálogos
    long countByCategoriaId(Integer categoriaId);

    long countByMarcaId(Integer marcaId);

    // Filtro combinado: categoria, marca, buscar y activo son opcionales
    @Query("SELECT p FROM Producto p WHERE " +
           "(:buscar IS NULL OR LOWER(p.codigo) LIKE LOWER(CONCAT('%', :buscar, '%')) OR LOWER(p.nombre) LIKE LOWER(CONCAT('%', :buscar, '%'))) AND " +
           "(:categoriaId IS NULL OR p.categoria.id = :categoriaId) AND " +
           "(:marcaId IS NULL OR p.marca.id = :marcaId) AND " +
           "(:activo IS NULL OR p.activo = :activo) " +
           "ORDER BY p.nombre ASC")
    List<Producto> filtrarProductos(@Param("buscar") String buscar,
                                    @Param("categoriaId") Integer categoriaId,
                                    @Param("marcaId") Integer marcaId,
                                    @Param("activo") Boolean activo);
}