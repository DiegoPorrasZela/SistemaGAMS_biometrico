package com.example.gams.dto;

import com.example.gams.entities.DetalleVenta;
import com.example.gams.entities.Venta;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Representación segura de una venta para el frontend:
 * expone solo nombres (nunca la entidad Usuario completa).
 */
public class VentaResponseDTO {

    private Integer id;
    private String codigo;
    private LocalDateTime fecha;
    private String vendedor;
    private String cliente;
    private String clienteDocumento;
    private String estado;
    private String metodoPago;
    private BigDecimal subtotal;
    private BigDecimal descuento;
    private BigDecimal total;
    private BigDecimal montoRecibido;
    private BigDecimal vuelto;
    private BigDecimal operacionGravada;
    private BigDecimal igv;
    private String observaciones;
    private LocalDateTime fechaAnulacion;
    private String usuarioAnulacion;
    private String motivoAnulacion;
    private List<DetalleDTO> detalles;

    public static class DetalleDTO {
        private Integer varianteId;
        private String sku;
        private String descripcion;
        private Integer cantidad;
        private BigDecimal precioUnitario;
        private BigDecimal subtotal;

        public DetalleDTO(DetalleVenta detalle) {
            this.varianteId = detalle.getVariante() != null ? detalle.getVariante().getId() : null;
            this.sku = detalle.getVarianteSku();
            this.descripcion = detalle.getDescripcion();
            this.cantidad = detalle.getCantidad();
            this.precioUnitario = detalle.getPrecioUnitario();
            this.subtotal = detalle.getSubtotal();
        }

        public Integer getVarianteId() {
            return varianteId;
        }

        public String getSku() {
            return sku;
        }

        public String getDescripcion() {
            return descripcion;
        }

        public Integer getCantidad() {
            return cantidad;
        }

        public BigDecimal getPrecioUnitario() {
            return precioUnitario;
        }

        public BigDecimal getSubtotal() {
            return subtotal;
        }
    }

    public VentaResponseDTO(Venta venta) {
        this.id = venta.getId();
        this.codigo = venta.getCodigo();
        this.fecha = venta.getFecha();
        this.vendedor = venta.getVendedor() != null ? venta.getVendedor().getNombreCompleto() : null;
        this.cliente = venta.getNombreCliente();
        this.clienteDocumento = venta.getCliente() != null ? venta.getCliente().getNumeroDocumento() : null;
        this.estado = venta.getEstado().name();
        this.metodoPago = venta.getMetodoPago().name();
        this.subtotal = venta.getSubtotal();
        this.descuento = venta.getDescuento();
        this.total = venta.getTotal();
        this.montoRecibido = venta.getMontoRecibido();
        this.vuelto = venta.getVuelto();
        this.operacionGravada = venta.getOperacionGravada();
        this.igv = venta.getIgv();
        this.observaciones = venta.getObservaciones();
        this.fechaAnulacion = venta.getFechaAnulacion();
        this.usuarioAnulacion = venta.getUsuarioAnulacion() != null
                ? venta.getUsuarioAnulacion().getNombreCompleto() : null;
        this.motivoAnulacion = venta.getMotivoAnulacion();
        this.detalles = venta.getDetalles().stream()
                .map(DetalleDTO::new)
                .collect(Collectors.toList());
    }

    // Getters
    public Integer getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public LocalDateTime getFecha() {
        return fecha;
    }

    public String getVendedor() {
        return vendedor;
    }

    public String getCliente() {
        return cliente;
    }

    public String getClienteDocumento() {
        return clienteDocumento;
    }

    public String getEstado() {
        return estado;
    }

    public String getMetodoPago() {
        return metodoPago;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getDescuento() {
        return descuento;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public BigDecimal getMontoRecibido() {
        return montoRecibido;
    }

    public BigDecimal getVuelto() {
        return vuelto;
    }

    public BigDecimal getOperacionGravada() {
        return operacionGravada;
    }

    public BigDecimal getIgv() {
        return igv;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public LocalDateTime getFechaAnulacion() {
        return fechaAnulacion;
    }

    public String getUsuarioAnulacion() {
        return usuarioAnulacion;
    }

    public String getMotivoAnulacion() {
        return motivoAnulacion;
    }

    public List<DetalleDTO> getDetalles() {
        return detalles;
    }
}