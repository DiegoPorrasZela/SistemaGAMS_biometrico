package com.example.gams.dto;

import com.example.gams.entities.VarianteUbicacion;

/** Par ubicación + cantidad del desglose de stock de una variante. */
public class UbicacionCantidadDTO {

    private String ubicacion;
    private Integer cantidad;

    public UbicacionCantidadDTO() {
    }

    public UbicacionCantidadDTO(String ubicacion, Integer cantidad) {
        this.ubicacion = ubicacion;
        this.cantidad = cantidad;
    }

    public UbicacionCantidadDTO(VarianteUbicacion entidad) {
        this.ubicacion = entidad.getUbicacion();
        this.cantidad = entidad.getCantidad();
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
