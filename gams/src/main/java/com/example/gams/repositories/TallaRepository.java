package com.example.gams.repositories;

import com.example.gams.entities.Talla;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TallaRepository extends JpaRepository<Talla, Integer> {

    // Mayor orden registrado (para asignar "al final" cuando no se especifica)
    @Query("SELECT MAX(t.orden) FROM Talla t")
    Integer findMaxOrden();

    // Tallas cuyo orden es >= al indicado (para desplazar al insertar)
    List<Talla> findByOrdenGreaterThanEqual(Integer orden);
    
    // Buscar por nombre
    Optional<Talla> findByNombre(String nombre);
    
    // Verificar si existe por nombre
    boolean existsByNombre(String nombre);
    
    // Listar solo tallas activas
    List<Talla> findByActivoTrue();
    
    // Listar por tipo
    List<Talla> findByTipoAndActivoTrue(Talla.TipoTalla tipo);
    
    // Listar ordenadas por orden
    List<Talla> findByActivoTrueOrderByOrdenAsc();
    
    // Listar por tipo ordenadas por orden
    List<Talla> findByTipoAndActivoTrueOrderByOrdenAsc(Talla.TipoTalla tipo);
    
    // Contar tallas activas
    long countByActivoTrue();
    
    // Contar tallas por tipo
    long countByTipoAndActivoTrue(Talla.TipoTalla tipo);
}