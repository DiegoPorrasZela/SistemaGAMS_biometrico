package com.example.gams.repositories;

import com.example.gams.entities.DetalleVenta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DetalleVentaRepository extends JpaRepository<DetalleVenta, Integer> {

    // Líneas de una venta
    List<DetalleVenta> findByVentaId(Integer ventaId);

    // Productos más vendidos (unidades) en un rango de fechas, solo ventas COMPLETADAS
    @Query("SELECT d.productoNombre, SUM(d.cantidad) AS unidades FROM DetalleVenta d " +
           "WHERE d.venta.estado = 'COMPLETADA' AND d.venta.fecha BETWEEN :desde AND :hasta " +
           "GROUP BY d.productoNombre ORDER BY unidades DESC")
    List<Object[]> findMasVendidos(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    // Unidades vendidas de una variante (para validar si se puede eliminar, etc.)
    @Query("SELECT COALESCE(SUM(d.cantidad), 0) FROM DetalleVenta d " +
           "WHERE d.variante.id = :varianteId AND d.venta.estado = 'COMPLETADA'")
    Long sumUnidadesVendidasByVariante(@Param("varianteId") Integer varianteId);

    // Verificar si una variante tiene ventas asociadas
    boolean existsByVarianteId(Integer varianteId);
}