package com.example.gams.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "colores")
public class Color {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(nullable = false, length = 50)
    private String nombre;
    
    @Column(name = "codigo_hex", length = 7)
    private String codigoHex;
    
    @Column(nullable = false)
    private Boolean activo = true;
    
    // Constructores
    public Color() {}
    
    public Color(String nombre, String codigoHex) {
        this.nombre = nombre;
        this.codigoHex = codigoHex;
    }
    
    // Getters y Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public String getNombre() {
        return nombre;
    }
    
    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
    
    public String getCodigoHex() {
        return codigoHex;
    }
    
    public void setCodigoHex(String codigoHex) {
        this.codigoHex = codigoHex;
    }
    
    public Boolean getActivo() {
        return activo;
    }
    
    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
