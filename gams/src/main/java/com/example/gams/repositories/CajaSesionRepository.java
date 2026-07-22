package com.example.gams.repositories;

import com.example.gams.entities.CajaSesion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CajaSesionRepository extends JpaRepository<CajaSesion, Integer> {

    // Sesión abierta actual (solo puede haber una a la vez)
    Optional<CajaSesion> findFirstByEstado(CajaSesion.EstadoCaja estado);

    // Historial de sesiones, la más reciente primero
    List<CajaSesion> findAllByOrderByFechaAperturaDesc();
}