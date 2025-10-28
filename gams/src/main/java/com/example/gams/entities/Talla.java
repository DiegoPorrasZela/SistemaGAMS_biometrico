package com.example.gams.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "tallas")
public class Talla {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(nullable = false, length = 20)
    private String nombre;
    
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TipoTalla tipo = TipoTalla.ROPA;
    
    @Column(name = "orden")
    private Integer orden;
    
    @Column(nullable = false)
    private Boolean activo = true;
    
    public enum TipoTalla {
        ROPA, CALZADO, UNICA
    }
    
    // Constructores
    public Talla() {}
    
    public Talla(String nombre, TipoTalla tipo, Integer orden) {
        this.nombre = nombre;
        this.tipo = tipo;
        this.orden = orden;
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
    
    public TipoTalla getTipo() {
        return tipo;
    }
    
    public void setTipo(TipoTalla tipo) {
        this.tipo = tipo;
    }
    
    public Integer getOrden() {
        return orden;
    }
    
    public void setOrden(Integer orden) {
        this.orden = orden;
    }
    
    public Boolean getActivo() {
        return activo;
    }
    
    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}