package com.example.gams.repositories;

import com.example.gams.entities.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    
    Optional<Usuario> findByUsername(String username);
    
    Optional<Usuario> findByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM Usuario u JOIN FETCH u.roles WHERE u.username = :username AND u.activo = true")
    Optional<Usuario> findByUsernameAndActivoTrue(@Param("username") String username);
    
    @Query("SELECT u FROM Usuario u WHERE u.activo = true")
    java.util.List<Usuario> findAllActive();
}