package com.example.gams.services;

import com.example.gams.dto.UbicacionCantidadDTO;
import com.example.gams.entities.ProductoVariante;
import com.example.gams.entities.VarianteUbicacion;
import com.example.gams.repositories.ProductoVarianteRepository;
import com.example.gams.repositories.VarianteUbicacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Gestiona el desglose de stock por ubicación física de cada variante.
 *
 * Invariante: sum(cantidad de las filas) == variante.stockActual.
 *
 * El stock total sigue siendo `stock_actual` (ventas, movimientos y reportes
 * no cambian). Este servicio mantiene el desglose coherente:
 *  - al leer, se auto-corrige contra el stock actual (self-healing), de modo
 *    que una venta solo necesita llamar a sincronizar() tras descontar stock;
 *  - los aumentos van a la ubicación principal (la de la variante);
 *  - las disminuciones salen primero de la principal y luego del resto.
 */
@Service
@RequiredArgsConstructor
public class StockUbicacionService {

    public static final String SIN_UBICACION = "Sin ubicación";

    private final VarianteUbicacionRepository ubicacionRepository;
    private final ProductoVarianteRepository varianteRepository;

    /**
     * Devuelve el desglose de la variante, garantizando que exista y que sume
     * exactamente el stock actual.
     */
    @Transactional
    public List<VarianteUbicacion> obtenerDesglose(ProductoVariante variante) {
        List<VarianteUbicacion> filas = ubicacionRepository.findByVarianteIdOrderByCantidadDesc(variante.getId());
        int stock = variante.getStockActual() != null ? variante.getStockActual() : 0;

        if (filas.isEmpty()) {
            VarianteUbicacion inicial = new VarianteUbicacion(variante, ubicacionPrincipal(variante), stock);
            filas = new ArrayList<>();
            filas.add(ubicacionRepository.save(inicial));
            return filas;
        }

        int suma = filas.stream().mapToInt(VarianteUbicacion::getCantidad).sum();
        if (suma != stock) {
            ajustarDiferencia(filas, stock - suma, ubicacionPrincipal(variante));
        }
        return filas;
    }

    /** Re-alinea el desglose con el stock actual (llamar tras ventas/ajustes). */
    @Transactional
    public void sincronizar(ProductoVariante variante) {
        obtenerDesglose(variante);
    }

    /**
     * Cuando se edita el campo `ubicacion` de la variante (el atajo de "una
     * sola ubicación"), el desglose debe seguir el cambio: se renombra la fila
     * que estaba en la ubicación anterior. Si la variante tiene su stock
     * repartido y no hay fila con el nombre anterior, no se toca nada (esa
     * redistribución se gestiona con el editor de ubicaciones).
     */
    @Transactional
    public void renombrarUbicacion(ProductoVariante variante, String ubicacionAnterior, String ubicacionNueva) {
        String nueva = ubicacionNueva != null ? ubicacionNueva.trim() : "";
        String anterior = ubicacionAnterior != null ? ubicacionAnterior.trim() : "";
        if (nueva.isEmpty() || nueva.equalsIgnoreCase(anterior)) {
            return;
        }

        List<VarianteUbicacion> filas = ubicacionRepository.findByVarianteIdOrderByCantidadDesc(variante.getId());
        if (filas.isEmpty()) {
            return; // obtenerDesglose la creará con el nombre nuevo
        }

        VarianteUbicacion objetivo = filas.stream()
                .filter(f -> f.getUbicacion().equalsIgnoreCase(anterior))
                .findFirst()
                .orElse(filas.size() == 1 ? filas.get(0) : null);
        if (objetivo == null) {
            return;
        }

        // Si ya existe una fila con el nombre nuevo, fusionar cantidades
        VarianteUbicacion existente = filas.stream()
                .filter(f -> f != objetivo && f.getUbicacion().equalsIgnoreCase(nueva))
                .findFirst()
                .orElse(null);
        if (existente != null) {
            existente.setCantidad(existente.getCantidad() + objetivo.getCantidad());
            ubicacionRepository.save(existente);
            ubicacionRepository.delete(objetivo);
        } else {
            objetivo.setUbicacion(nueva);
            ubicacionRepository.save(objetivo);
        }
    }

    /**
     * Reemplaza el desglose completo de la variante. La suma debe coincidir con
     * el stock actual: este editor redistribuye unidades entre ubicaciones, no
     * modifica el total (para eso están los movimientos de inventario).
     */
    @Transactional
    public List<VarianteUbicacion> guardarDesglose(ProductoVariante variante, List<UbicacionCantidadDTO> desglose) {
        if (desglose == null || desglose.isEmpty()) {
            throw new IllegalArgumentException("El desglose debe tener al menos una ubicación");
        }

        int stock = variante.getStockActual() != null ? variante.getStockActual() : 0;
        int suma = 0;
        Set<String> nombres = new LinkedHashSet<>();

        for (UbicacionCantidadDTO fila : desglose) {
            String nombre = fila.getUbicacion() != null ? fila.getUbicacion().trim() : "";
            if (nombre.isEmpty()) {
                throw new IllegalArgumentException("Hay una ubicación sin nombre");
            }
            if (!nombres.add(nombre.toLowerCase())) {
                throw new IllegalArgumentException("Ubicación repetida: " + nombre);
            }
            if (fila.getCantidad() == null || fila.getCantidad() < 0) {
                throw new IllegalArgumentException("Cantidad inválida en " + nombre);
            }
            suma += fila.getCantidad();
        }

        if (suma != stock) {
            throw new IllegalArgumentException(String.format(
                    "La suma de las ubicaciones (%d) no coincide con el stock de la variante (%d)", suma, stock));
        }

        ubicacionRepository.deleteByVarianteId(variante.getId());
        ubicacionRepository.flush();

        List<VarianteUbicacion> guardadas = new ArrayList<>();
        String principal = null;
        int mayorCantidad = -1;
        for (UbicacionCantidadDTO fila : desglose) {
            String nombre = fila.getUbicacion().trim();
            guardadas.add(ubicacionRepository.save(new VarianteUbicacion(variante, nombre, fila.getCantidad())));
            if (fila.getCantidad() > mayorCantidad) {
                mayorCantidad = fila.getCantidad();
                principal = nombre;
            }
        }

        // La ubicación "legacy" de la variante pasa a ser la que concentra más
        // unidades, para que las vistas que muestran una sola siga siendo veraz.
        variante.setUbicacion(principal);
        varianteRepository.save(variante);

        return guardadas;
    }

    /** Ubicación de referencia de la variante para aumentos y desglose inicial. */
    private String ubicacionPrincipal(ProductoVariante variante) {
        String ubicacion = variante.getUbicacion();
        return (ubicacion != null && !ubicacion.trim().isEmpty()) ? ubicacion.trim() : SIN_UBICACION;
    }

    /**
     * Aplica una diferencia de stock al desglose. Aumentos: a la ubicación
     * principal. Disminuciones: primero de la principal, luego del resto
     * (mayor cantidad primero); filas en 0 se eliminan salvo la última.
     */
    private void ajustarDiferencia(List<VarianteUbicacion> filas, int diferencia, String principal) {
        if (diferencia > 0) {
            VarianteUbicacion destino = filas.stream()
                    .filter(f -> f.getUbicacion().equalsIgnoreCase(principal))
                    .findFirst()
                    .orElse(filas.get(0));
            destino.setCantidad(destino.getCantidad() + diferencia);
            ubicacionRepository.save(destino);
            return;
        }

        int porDescontar = -diferencia;

        // Principal primero, resto ya viene ordenado por cantidad descendente
        List<VarianteUbicacion> orden = new ArrayList<>(filas);
        orden.sort((a, b) -> {
            boolean aP = a.getUbicacion().equalsIgnoreCase(principal);
            boolean bP = b.getUbicacion().equalsIgnoreCase(principal);
            if (aP != bP) return aP ? -1 : 1;
            return b.getCantidad() - a.getCantidad();
        });

        for (VarianteUbicacion fila : orden) {
            if (porDescontar <= 0) break;
            int quitar = Math.min(fila.getCantidad(), porDescontar);
            fila.setCantidad(fila.getCantidad() - quitar);
            porDescontar -= quitar;
        }

        List<VarianteUbicacion> vacias = new ArrayList<>();
        List<VarianteUbicacion> conStock = new ArrayList<>();
        for (VarianteUbicacion fila : orden) {
            if (fila.getCantidad() == 0) vacias.add(fila);
            else conStock.add(fila);
        }

        if (conStock.isEmpty() && !vacias.isEmpty()) {
            // Stock 0: conservar solo la fila principal como referencia
            VarianteUbicacion referencia = vacias.remove(0);
            ubicacionRepository.save(referencia);
        }
        for (VarianteUbicacion fila : conStock) {
            ubicacionRepository.save(fila);
        }
        if (!vacias.isEmpty()) {
            ubicacionRepository.deleteAll(vacias);
        }
    }
}
