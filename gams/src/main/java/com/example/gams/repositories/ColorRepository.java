package com.example.gams.repositories;

import com.example.gams.entities.Color;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ColorRepository extends JpaRepository<Color, Integer> {
    
    // Buscar por nombre
    Optional<Color> findByNombre(String nombre);
    
    // Buscar por nombre ignorando mayúsculas
    Optional<Color> findByNombreIgnoreCase(String nombre);
    
    // Buscar por código hexadecimal
    Optional<Color> findByCodigoHex(String codigoHex);
    
    // Verificar si existe por nombre
    boolean existsByNombre(String nombre);
    
    // Listar solo colores activos
    List<Color> findByActivoTrue();
    
    // Listar ordenados por nombre
    List<Color> findByActivoTrueOrderByNombreAsc();
    
    // Buscar por nombre que contenga
    @Query("SELECT c FROM Color c WHERE LOWER(c.nombre) LIKE LOWER(CONCAT('%', :searchTerm, '%')) AND c.activo = true")
    List<Color> searchByNombre(String searchTerm);
    
    // Contar colores activos
    long countByActivoTrue();
}