package com.example.gams.repositories;

import com.example.gams.entities.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Integer> {

    // Buscar por número de documento (DNI/RUC/CE)
    Optional<Cliente> findByNumeroDocumento(String numeroDocumento);

    // Verificar si existe el documento (para evitar duplicados)
    boolean existsByNumeroDocumento(String numeroDocumento);

    // Listar clientes activos
    List<Cliente> findByActivoTrueOrderByNombreAsc();

    // Búsqueda para el POS: por documento o nombre
    @Query("SELECT c FROM Cliente c WHERE c.activo = true AND " +
           "(LOWER(c.nombre) LIKE LOWER(CONCAT('%', :termino, '%')) OR " +
           "c.numeroDocumento LIKE CONCAT('%', :termino, '%'))")
    List<Cliente> buscar(@Param("termino") String termino);
}