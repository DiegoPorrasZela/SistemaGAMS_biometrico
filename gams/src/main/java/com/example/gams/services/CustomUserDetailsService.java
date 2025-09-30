package com.example.gams.services;

import com.example.gams.entities.Usuario;
import com.example.gams.repositories.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@Transactional
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsernameAndActivoTrue(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + username));

        // ⚠️ VALIDACIÓN CRÍTICA: Solo ADMIN puede usar login tradicional
        boolean esAdmin = usuario.getRoles().stream()
                .anyMatch(rol -> "ADMIN".equalsIgnoreCase(rol.getNombre()));
        
        if (!esAdmin) {
            throw new BadCredentialsException("Acceso denegado. Solo administradores pueden usar login tradicional.");
        }

        // Verificar si el usuario está bloqueado
        if (usuario.getBloqueadoHasta() != null && 
            usuario.getBloqueadoHasta().isAfter(LocalDateTime.now())) {
            throw new UsernameNotFoundException("Usuario bloqueado temporalmente");
        }

        // Actualizar último acceso
        usuario.setUltimoAcceso(LocalDateTime.now());
        usuarioRepository.save(usuario);

        // Crear las autoridades (roles)
        var authorities = usuario.getRoles().stream()
                .map(rol -> new SimpleGrantedAuthority("ROLE_" + rol.getNombre()))
                .collect(Collectors.toList());

        return User.builder()
                .username(usuario.getUsername())
                .password(usuario.getContraseña())
                .authorities(authorities)
                .accountExpired(false)
                .accountLocked(!usuario.getActivo())
                .credentialsExpired(false)
                .disabled(!usuario.getActivo())
                .build();
    }

    // Método adicional para obtener el usuario completo
    public Usuario findUsuarioByUsername(String username) {
        return usuarioRepository.findByUsernameAndActivoTrue(username)
                .orElse(null);
    }
}