package com.example.gams.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Datos que envía el POS para registrar una venta.
 * Los precios NO viajan desde el frontend: el backend los toma de la BD.
 */
public class VentaDTO {

    private Integer clienteId;          // NULL = venta rápida ("Cliente Varios")
    private String metodoPago;          // EFECTIVO, TARJETA, YAPE, PLIN, TRANSFERENCIA
    private BigDecimal descuento;       // Descuento en soles sobre el subtotal (opcional)
    private BigDecimal montoRecibido;   // Solo para EFECTIVO (cálculo de vuelto)
    private String observaciones;
    private List<ItemVentaDTO> items;

    public static class ItemVentaDTO {
        private Integer varianteId;
        private Integer cantidad;

        public Integer getVarianteId() {
            return varianteId;
        }

        public void setVarianteId(Integer varianteId) {
            this.varianteId = varianteId;
        }

        public Integer getCantidad() {
            return cantidad;
        }

        public void setCantidad(Integer cantidad) {
            this.cantidad = cantidad;
        }
    }

    public Integer getClienteId() {
        return clienteId;
    }

    public void setClienteId(Integer clienteId) {
        this.clienteId = clienteId;
    }

    public String getMetodoPago() {
        return metodoPago;
    }

    public void setMetodoPago(String metodoPago) {
        this.metodoPago = metodoPago;
    }

    public BigDecimal getDescuento() {
        return descuento;
    }

    public void setDescuento(BigDecimal descuento) {
        this.descuento = descuento;
    }

    public BigDecimal getMontoRecibido() {
        return montoRecibido;
    }

    public void setMontoRecibido(BigDecimal montoRecibido) {
        this.montoRecibido = montoRecibido;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    public List<ItemVentaDTO> getItems() {
        return items;
    }

    public void setItems(List<ItemVentaDTO> items) {
        this.items = items;
    }
}