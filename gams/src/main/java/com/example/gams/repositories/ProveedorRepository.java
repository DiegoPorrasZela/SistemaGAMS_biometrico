package com.example.gams.repositories;

import com.example.gams.entities.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Integer> {
    
    // Buscar por nombre
    Optional<Proveedor> findByNombre(String nombre);
    
    // Buscar por RUC
    Optional<Proveedor> findByRuc(String ruc);
    
    // Verificar si existe por RUC
    boolean existsByRuc(String ruc);
    
    // Listar proveedores activos
    List<Proveedor> findByActivoTrue();
    
    // Listar ordenados por nombre
    List<Proveedor> findByActivoTrueOrderByNombreAsc();
    
    // Buscar por nombre que contenga
    @Query("SELECT p FROM Proveedor p WHERE LOWER(p.nombre) LIKE LOWER(CONCAT('%', :searchTerm, '%')) AND p.activo = true")
    List<Proveedor> searchByNombre(@Param("searchTerm") String searchTerm);
    
    // Buscar por nombre o RUC
    @Query("SELECT p FROM Proveedor p WHERE (LOWER(p.nombre) LIKE LOWER(CONCAT('%', :search, '%')) OR p.ruc LIKE CONCAT('%', :search, '%')) AND p.activo = true")
    List<Proveedor> searchByNombreOrRuc(@Param("search") String search);
    
    // Contar proveedores activos
    long countByActivoTrue();
}