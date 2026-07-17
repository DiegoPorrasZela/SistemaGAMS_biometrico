package com.example.gams.services;

import com.example.gams.entities.*;
import com.example.gams.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
@Transactional
public class CatalogoService {

    private final CategoriaRepository categoriaRepository;
    private final MarcaRepository marcaRepository;
    private final TallaRepository tallaRepository;
    private final ColorRepository colorRepository;
    private final ProductoRepository productoRepository;
    private final ProductoVarianteRepository varianteRepository;

    // ============================================
    // CATEGORÍAS
    // ============================================

    public List<Categoria> listarCategorias() {
        return categoriaRepository.findAll();
    }

    public List<Categoria> listarCategoriasActivas() {
        return categoriaRepository.findByActivoTrue();
    }

    public List<Categoria> listarCategoriasActivasOrdenadas() {
        return categoriaRepository.findByActivoTrueOrderByNombreAsc();
    }

    public Optional<Categoria> buscarCategoriaPorId(@NonNull Integer id) {
        return categoriaRepository.findById(id);
    }

    public Optional<Categoria> buscarCategoriaPorNombre(String nombre) {
        return categoriaRepository.findByNombre(nombre);
    }

    public List<Categoria> buscarCategoriasPorNombre(String searchTerm) {
        return categoriaRepository.searchByNombre(searchTerm);
    }

    public Categoria guardarCategoria(@NonNull Categoria categoria) {
        return categoriaRepository.save(categoria);
    }

    public void eliminarCategoria(@NonNull Integer id) {
        long productosAsociados = productoRepository.countByCategoriaId(id);
        if (productosAsociados > 0) {
            throw new IllegalStateException(
                "No se puede eliminar: " + productosAsociados + " producto(s) usan esta categoría. Desactívala en su lugar.");
        }
        categoriaRepository.deleteById(id);
    }

    public boolean existeCategoriaPorNombre(String nombre) {
        return categoriaRepository.existsByNombre(nombre);
    }

    public long contarCategoriasActivas() {
        return categoriaRepository.countByActivoTrue();
    }

    // ============================================
    // MARCAS
    // ============================================

    public List<Marca> listarMarcas() {
        return marcaRepository.findAll();
    }

    public List<Marca> listarMarcasActivas() {
        return marcaRepository.findByActivoTrue();
    }

    public List<Marca> listarMarcasActivasOrdenadas() {
        return marcaRepository.findByActivoTrueOrderByNombreAsc();
    }

    public Optional<Marca> buscarMarcaPorId(@NonNull Integer id) {
        return marcaRepository.findById(id);
    }

    public Optional<Marca> buscarMarcaPorNombre(String nombre) {
        return marcaRepository.findByNombre(nombre);
    }

    public List<Marca> buscarMarcasPorNombre(String searchTerm) {
        return marcaRepository.searchByNombre(searchTerm);
    }

    public Marca guardarMarca(@NonNull Marca marca) {
        return marcaRepository.save(marca);
    }

    public void eliminarMarca(@NonNull Integer id) {
        long productosAsociados = productoRepository.countByMarcaId(id);
        if (productosAsociados > 0) {
            throw new IllegalStateException(
                "No se puede eliminar: " + productosAsociados + " producto(s) usan esta marca. Desactívala en su lugar.");
        }
        marcaRepository.deleteById(id);
    }

    public boolean existeMarcaPorNombre(String nombre) {
        return marcaRepository.existsByNombre(nombre);
    }

    public long contarMarcasActivas() {
        return marcaRepository.countByActivoTrue();
    }

    // ============================================
    // TALLAS
    // ============================================

    public List<Talla> listarTallas() {
        return tallaRepository.findAll();
    }

    public List<Talla> listarTallasActivas() {
        return tallaRepository.findByActivoTrue();
    }

    public List<Talla> listarTallasPorTipo(Talla.TipoTalla tipo) {
        return tallaRepository.findByTipoAndActivoTrue(tipo);
    }

    public List<Talla> listarTallasOrdenadasPorOrden() {
        return tallaRepository.findByActivoTrueOrderByOrdenAsc();
    }

    public List<Talla> listarTallasPorTipoOrdenadas(Talla.TipoTalla tipo) {
        return tallaRepository.findByTipoAndActivoTrueOrderByOrdenAsc(tipo);
    }

    public Optional<Talla> buscarTallaPorId(@NonNull Integer id) {
        return tallaRepository.findById(id);
    }

    public Optional<Talla> buscarTallaPorNombre(String nombre) {
        return tallaRepository.findByNombre(nombre);
    }

    public Talla guardarTalla(@NonNull Talla talla) {
        if (talla.getOrden() == null) {
            // Sin orden especificado: asignar al final de la lista
            Integer maxOrden = tallaRepository.findMaxOrden();
            talla.setOrden(maxOrden == null ? 1 : maxOrden + 1);
        } else {
            // Semántica de inserción: si el orden ya está ocupado por otra talla,
            // desplazar en +1 todas las que estén en esa posición o después
            Integer idActual = talla.getId() == null ? -1 : talla.getId();
            List<Talla> posteriores = tallaRepository.findByOrdenGreaterThanEqual(talla.getOrden());

            boolean ordenOcupado = posteriores.stream()
                .anyMatch(t -> t.getOrden().equals(talla.getOrden()) && !t.getId().equals(idActual));

            if (ordenOcupado) {
                for (Talla t : posteriores) {
                    if (!t.getId().equals(idActual)) {
                        t.setOrden(t.getOrden() + 1);
                    }
                }
                tallaRepository.saveAll(posteriores.stream()
                    .filter(t -> !t.getId().equals(idActual))
                    .toList());
            }
        }
        return tallaRepository.save(talla);
    }

    public void eliminarTalla(@NonNull Integer id) {
        long variantesAsociadas = varianteRepository.countByTallaId(id);
        if (variantesAsociadas > 0) {
            throw new IllegalStateException(
                "No se puede eliminar: " + variantesAsociadas + " variante(s) usan esta talla. Desactívala en su lugar.");
        }
        tallaRepository.deleteById(id);
    }

    public boolean existeTallaPorNombre(String nombre) {
        return tallaRepository.existsByNombre(nombre);
    }

    public long contarTallasActivas() {
        return tallaRepository.countByActivoTrue();
    }

    public long contarTallasPorTipo(Talla.TipoTalla tipo) {
        return tallaRepository.countByTipoAndActivoTrue(tipo);
    }

    // ============================================
    // COLORES
    // ============================================

    public List<Color> listarColores() {
        return colorRepository.findAll();
    }

    public List<Color> listarColoresActivos() {
        return colorRepository.findByActivoTrue();
    }

    public List<Color> listarColoresActivosOrdenados() {
        return colorRepository.findByActivoTrueOrderByNombreAsc();
    }

    public Optional<Color> buscarColorPorId(@NonNull Integer id) {
        return colorRepository.findById(id);
    }

    public Optional<Color> buscarColorPorNombre(String nombre) {
        return colorRepository.findByNombre(nombre);
    }

    public Optional<Color> buscarColorPorCodigoHex(String codigoHex) {
        return colorRepository.findByCodigoHex(codigoHex);
    }

    public List<Color> buscarColoresPorNombre(String searchTerm) {
        return colorRepository.searchByNombre(searchTerm);
    }

    public Color guardarColor(@NonNull Color color) {
        return colorRepository.save(color);
    }

    public void eliminarColor(@NonNull Integer id) {
        long variantesAsociadas = varianteRepository.countByColorId(id);
        if (variantesAsociadas > 0) {
            throw new IllegalStateException(
                "No se puede eliminar: " + variantesAsociadas + " variante(s) usan este color. Desactívalo en su lugar.");
        }
        colorRepository.deleteById(id);
    }

    public boolean existeColorPorNombre(String nombre) {
        return colorRepository.existsByNombre(nombre);
    }

    public long contarColoresActivos() {
        return colorRepository.countByActivoTrue();
    }
}