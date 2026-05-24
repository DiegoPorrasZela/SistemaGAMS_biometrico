package com.example.gams.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rostros_biometricos")
public class RostroBiometrico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(name = "foto_numero", nullable = false)
    private Integer fotoNumero;

    /** Vector de 128 floats serializado como JSON por el servicio Python. */
    @Column(nullable = false, columnDefinition = "JSON")
    private String encoding;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    // ── Getters y Setters ───────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Integer getFotoNumero() { return fotoNumero; }
    public void setFotoNumero(Integer fotoNumero) { this.fotoNumero = fotoNumero; }

    public String getEncoding() { return encoding; }
    public void setEncoding(String encoding) { this.encoding = encoding; }

    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
}
