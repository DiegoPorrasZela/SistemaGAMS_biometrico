package com.example.gams.services;

import com.example.gams.entities.Cliente;
import com.example.gams.repositories.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;

    /**
     * Registra un cliente validando el documento según su tipo.
     */
    @Transactional
    public Cliente registrar(Cliente cliente) {
        validar(cliente);

        if (clienteRepository.existsByNumeroDocumento(cliente.getNumeroDocumento())) {
            throw new RuntimeException(
                    "Ya existe un cliente con el documento " + cliente.getNumeroDocumento());
        }

        return clienteRepository.save(cliente);
    }

    /**
     * Actualiza los datos de contacto y nombre de un cliente existente.
     */
    @Transactional
    public Cliente actualizar(Integer id, Cliente datos) {
        Cliente cliente = obtenerPorId(id);

        // El documento no se cambia: identifica al cliente
        cliente.setNombre(datos.getNombre());
        cliente.setTelefono(datos.getTelefono());
        cliente.setEmail(datos.getEmail());
        cliente.setDireccion(datos.getDireccion());

        validar(cliente);
        return clienteRepository.save(cliente);
    }

    /**
     * Desactiva un cliente (soft-delete: sus ventas históricas se conservan).
     */
    @Transactional
    public void desactivar(Integer id) {
        Cliente cliente = obtenerPorId(id);
        cliente.setActivo(false);
        clienteRepository.save(cliente);
    }

    public Cliente obtenerPorId(Integer id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado: " + id));
    }

    // Búsqueda exacta por documento (para el POS: "¿ya existe este DNI?")
    public Optional<Cliente> buscarPorDocumento(String numeroDocumento) {
        return clienteRepository.findByNumeroDocumento(numeroDocumento);
    }

    // Búsqueda parcial por nombre o documento (autocompletado del POS)
    public List<Cliente> buscar(String termino) {
        if (termino == null || termino.isBlank()) {
            return clienteRepository.findByActivoTrueOrderByNombreAsc();
        }
        return clienteRepository.buscar(termino.trim());
    }

    public List<Cliente> listarActivos() {
        return clienteRepository.findByActivoTrueOrderByNombreAsc();
    }

    // ==================== VALIDACIONES ====================

    private void validar(Cliente cliente) {
        if (cliente.getNombre() == null || cliente.getNombre().isBlank()) {
            throw new RuntimeException("El nombre del cliente es obligatorio");
        }

        String doc = cliente.getNumeroDocumento();
        if (doc == null || doc.isBlank()) {
            throw new RuntimeException("El número de documento es obligatorio");
        }

        if (cliente.getTipoDocumento() == null) {
            throw new RuntimeException("El tipo de documento es obligatorio");
        }

        switch (cliente.getTipoDocumento()) {
            case DNI:
                if (!doc.matches("\\d{8}")) {
                    throw new RuntimeException("El DNI debe tener 8 dígitos");
                }
                break;
            case RUC:
                if (!doc.matches("\\d{11}")) {
                    throw new RuntimeException("El RUC debe tener 11 dígitos");
                }
                break;
            case CE:
                if (!doc.matches("[A-Za-z0-9]{6,12}")) {
                    throw new RuntimeException("El carnet de extranjería debe tener entre 6 y 12 caracteres");
                }
                break;
        }
    }
}