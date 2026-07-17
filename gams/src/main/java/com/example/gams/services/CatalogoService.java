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
        return tallaRepository.save(talla);
    }

    public void eliminarTalla(@NonNull Integer id) {
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
        colorRepository.deleteById(id);
    }

    public boolean existeColorPorNombre(String nombre) {
        return colorRepository.existsByNombre(nombre);
    }

    public long contarColoresActivos() {
        return colorRepository.countByActivoTrue();
    }
}