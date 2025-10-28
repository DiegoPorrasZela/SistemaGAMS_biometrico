package com.example.gams.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "proveedores")
public class Proveedor {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(nullable = false, length = 200)
    private String nombre;
    
    @Column(length = 11)
    private String ruc;
    
    @Column(columnDefinition = "TEXT")
    private String direccion;
    
    @Column(length = 20)
    private String telefono;
    
    @Column(length = 100)
    private String email;
    
    @Column(name = "contacto_nombre", length = 100)
    private String contactoNombre;
    
    @Column(nullable = false)
    private Boolean activo = true;
    
    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;
    
    @PrePersist
    protected void onCreate() {
        fechaCreacion = LocalDateTime.now();
    }
    
    // Constructores
    public Proveedor() {}
    
    public Proveedor(String nombre, String ruc, String telefono, String email) {
        this.nombre = nombre;
        this.ruc = ruc;
        this.telefono = telefono;
        this.email = email;
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
    
    public String getRuc() {
        return ruc;
    }
    
    public void setRuc(String ruc) {
        this.ruc = ruc;
    }
    
    public String getDireccion() {
        return direccion;
    }
    
    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }
    
    public String getTelefono() {
        return telefono;
    }
    
    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getContactoNombre() {
        return contactoNombre;
    }
    
    public void setContactoNombre(String contactoNombre) {
        this.contactoNombre = contactoNombre;
    }
    
    public Boolean getActivo() {
        return activo;
    }
    
    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
    
    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
    
    public void setFechaCreacion(LocalDateTime fechaCreacion) {
        this.fechaCreacion = fechaCreacion;
    }
}