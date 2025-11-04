package com.example.gams.repositories;

import com.example.gams.entities.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Integer> {
    
    // Buscar por nombre
    Optional<Categoria> findByNombre(String nombre);
    
    // Buscar por nombre ignorando mayúsculas
    Optional<Categoria> findByNombreIgnoreCase(String nombre);
    
    // Verificar si existe por nombre
    boolean existsByNombre(String nombre);
    
    // Listar solo categorías activas
    List<Categoria> findByActivoTrue();
    
    // Listar ordenadas por nombre
    List<Categoria> findByActivoTrueOrderByNombreAsc();
    
    // Buscar por nombre que contenga (búsqueda parcial)
    @Query("SELECT c FROM Categoria c WHERE LOWER(c.nombre) LIKE LOWER(CONCAT('%', :searchTerm, '%')) AND c.activo = true")
    List<Categoria> searchByNombre(String searchTerm);
    
    // Contar categorías activas
    long countByActivoTrue();
}
