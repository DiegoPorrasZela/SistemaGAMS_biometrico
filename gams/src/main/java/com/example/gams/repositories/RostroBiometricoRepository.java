package com.example.gams.repositories;

import com.example.gams.entities.RostroBiometrico;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RostroBiometricoRepository extends JpaRepository<RostroBiometrico, Long> {

    /** Cuántas fotos tiene registradas un usuario (0‒MAX_FOTOS). */
    long countByUsername(String username);

    /** True si el usuario tiene al menos una foto registrada. */
    boolean existsByUsername(String username);
}
