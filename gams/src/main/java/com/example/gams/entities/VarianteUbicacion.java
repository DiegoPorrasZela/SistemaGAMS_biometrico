package com.example.gams.entities;

import jakarta.persistence.*;

/**
 * Cantidad de unidades de una variante en una ubicación física concreta
 * (estante, vitrina, exhibición, etc.).
 *
 * Invariante del sistema: la suma de `cantidad` de todas las filas de una
 * variante debe ser igual a su `stock_actual`. StockUbicacionService es el
 * único punto que escribe esta tabla y garantiza esa coherencia.
 */
@Entity
@Table(name = "variante_ubicaciones", uniqueConstraints = @UniqueConstraint(columnNames = { "variante_id",
        "ubicacion" }))
public class VarianteUbicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variante_id", nullable = false)
    private ProductoVariante variante;

    @Column(nullable = false, length = 100)
    private String ubicacion;

    @Column(nullable = false)
    private Integer cantidad = 0;

    public VarianteUbicacion() {
    }

    public VarianteUbicacion(ProductoVariante variante, String ubicacion, Integer cantidad) {
        this.variante = variante;
        this.ubicacion = ubicacion;
        this.cantidad = cantidad;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public ProductoVariante getVariante() {
        return variante;
    }

    public void setVariante(ProductoVariante variante) {
        this.variante = variante;
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }
}
