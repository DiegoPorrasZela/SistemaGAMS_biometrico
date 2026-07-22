package com.example.gams.services;

import com.example.gams.entities.Proveedor;
import com.example.gams.repositories.ProductoRepository;
import com.example.gams.repositories.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
@Transactional
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;
    private final ProductoRepository productoRepository;

    public List<Proveedor> listarProveedores() {
        return proveedorRepository.findAll();
    }

    public List<Proveedor> listarProveedoresActivosOrdenados() {
        return proveedorRepository.findByActivoTrueOrderByNombreAsc();
    }

    public Optional<Proveedor> buscarProveedorPorId(@NonNull Integer id) {
        return proveedorRepository.findById(id);
    }

    public List<Proveedor> buscarProveedores(String search) {
        return proveedorRepository.searchByNombreOrRuc(search);
    }

    public boolean existeProveedorPorNombre(String nombre) {
        return proveedorRepository.findByNombre(nombre).isPresent();
    }

    public boolean existeProveedorPorRuc(String ruc) {
        return ruc != null && !ruc.isBlank() && proveedorRepository.findByRuc(ruc).isPresent();
    }

    public Proveedor guardarProveedor(@NonNull Proveedor proveedor) {
        return proveedorRepository.save(proveedor);
    }

    public void eliminarProveedor(@NonNull Integer id) {
        long productosAsociados = productoRepository.countByProveedorId(id);
        if (productosAsociados > 0) {
            throw new IllegalStateException(
                "No se puede eliminar: " + productosAsociados + " producto(s) usan este proveedor. Desactívalo en su lugar.");
        }
        proveedorRepository.deleteById(id);
    }
}