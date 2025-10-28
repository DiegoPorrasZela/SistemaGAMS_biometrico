package com.example.gams.repositories;

import com.example.gams.entities.Marca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarcaRepository extends JpaRepository<Marca, Integer> {
    
    // Buscar por nombre
    Optional<Marca> findByNombre(String nombre);
    
    // Buscar por nombre ignorando mayúsculas
    Optional<Marca> findByNombreIgnoreCase(String nombre);
    
    // Verificar si existe por nombre
    boolean existsByNombre(String nombre);
    
    // Listar solo marcas activas
    List<Marca> findByActivoTrue();
    
    // Listar ordenadas por nombre
    List<Marca> findByActivoTrueOrderByNombreAsc();
    
    // Buscar por nombre que contenga
    @Query("SELECT m FROM Marca m WHERE LOWER(m.nombre) LIKE LOWER(CONCAT('%', :searchTerm, '%')) AND m.activo = true")
    List<Marca> searchByNombre(String searchTerm);
    
    // Contar marcas activas
    long countByActivoTrue();
}