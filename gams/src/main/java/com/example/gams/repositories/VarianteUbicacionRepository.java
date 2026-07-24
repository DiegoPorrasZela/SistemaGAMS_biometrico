package com.example.gams.repositories;

import com.example.gams.entities.VarianteUbicacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VarianteUbicacionRepository extends JpaRepository<VarianteUbicacion, Integer> {

    List<VarianteUbicacion> findByVarianteIdOrderByCantidadDesc(Integer varianteId);

    void deleteByVarianteId(Integer varianteId);
}
