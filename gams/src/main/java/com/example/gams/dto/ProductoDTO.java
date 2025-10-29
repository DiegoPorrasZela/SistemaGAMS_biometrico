package com.example.gams.dto;

import com.example.gams.entities.Producto;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductoDTO {
    
    private Integer id;
    private String codigo;
    private String nombre;
    private String descripcion;
    private Integer categoriaId;
    private String categoriaNombre;
    private Integer marcaId;
    private String marcaNombre;
    private Producto.Genero genero;
    private Producto.Temporada temporada;
    private BigDecimal precioCompra;
    private BigDecimal precioVenta;
    private BigDecimal porcentajeGanancia;
    private String imagenUrl;
    private Boolean activo;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private Long stockTotal; // Stock total de todas las variantes
    private Integer cantidadVariantes; // Cantidad de variantes del producto
    
    // Constructores
    public ProductoDTO() {}
    
    public ProductoDTO(Producto producto) {
        this.id = producto.getId();
        this.codigo = producto.getCodigo();
        this.nombre = producto.getNombre();
        this.descripcion = producto.getDescripcion();
        this.categoriaId = producto.getCategoria().getId();
        this.categoriaNombre = producto.getCategoria().getNombre();
        this.marcaId = producto.getMarca() != null ? producto.getMarca().getId() : null;
        this.marcaNombre = producto.getMarca() != null ? producto.getMarca().getNombre() : null;
        this.genero = producto.getGenero();
        this.temporada = producto.getTemporada();
        this.precioCompra = producto.getPrecioCompra();
        this.precioVenta = producto.getPrecioVenta();
        this.porcentajeGanancia = producto.getPorcentajeGanancia();
        this.imagenUrl = producto.getImagenUrl();
        this.activo = producto.getActivo();
        this.fechaCreacion = producto.getFechaCreacion();
        this.fechaActualizacion = producto.getFechaActualizacion();
    }
    
    // Getters y Setters
    public Integer getId() {
        return id;
    }
    
    public void setId(Integer id) {
        this.id = id;
    }
    
    public String getCodigo() {
        return codigo;
    }
    
    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
    
    public String getNombre() {
        return nombre;
    }
    
    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
    
    public String getDescripcion() {
        return descripcion;
    }
    
    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }
    
    public Integer getCategoriaId() {
        return categoriaId;
    }
    
    public void setCategoriaId(Integer categoriaId) {
        this.categoriaId = categoriaId;
    }
    
    public String getCategoriaNombre() {
        return categoriaNombre;
    }
    
    public void setCategoriaNombre(String categoriaNombre) {
        this.categoriaNombre = categoriaNombre;
    }
    
    public Integer getMarcaId() {
        return marcaId;
    }
    
    public void setMarcaId(Integer marcaId) {
        this.marcaId = marcaId;
    }
    
    public String getMarcaNombre() {
        return marcaNombre;
    }
    
    public void setMarcaNombre(String marcaNombre) {
        this.marcaNombre = marcaNombre;
    }
    
    public Producto.Genero getGenero() {
        return genero;
    }
    
    public void setGenero(Producto.Genero genero) {
        this.genero = genero;
    }
    
    public Producto.Temporada getTemporada() {
        return temporada;
    }
    
    public void setTemporada(Producto.Temporada temporada) {
        this.temporada = temporada;
    }
    
    public BigDecimal getPrecioCompra() {
        return precioCompra;
    }
    
    public void setPrecioCompra(BigDecimal precioCompra) {
        this.precioCompra = precioCompra;
    }
    
    public BigDecimal getPrecioVenta() {
        return precioVenta;
    }
    
    public void setPrecioVenta(BigDecimal precioVenta) {
        this.precioVenta = precioVenta;
    }
    
    public BigDecimal getPorcentajeGanancia() {
        return porcentajeGanancia;
    }
    
    public void setPorcentajeGanancia(BigDecimal porcentajeGanancia) {
        this.porcentajeGanancia = porcentajeGanancia;
    }
    
    public String getImagenUrl() {
        return imagenUrl;
    }
    
    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
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
    
    public LocalDateTime getFechaActualizacion() {
        return fechaActualizacion;
    }
    
    public void setFechaActualizacion(LocalDateTime fechaActualizacion) {
        this.fechaActualizacion = fechaActualizacion;
    }
    
    public Long getStockTotal() {
        return stockTotal;
    }
    
    public void setStockTotal(Long stockTotal) {
        this.stockTotal = stockTotal;
    }
    
    public Integer getCantidadVariantes() {
        return cantidadVariantes;
    }
    
    public void setCantidadVariantes(Integer cantidadVariantes) {
        this.cantidadVariantes = cantidadVariantes;
    }
}