/**
 * GAMS S.A.C - ventas.js
 * Lógica del Punto de Venta (POS) e historial de ventas
 */

class PosManager {

    constructor() {
        this.carrito = [];              // [{varianteId, sku, nombre, color, colorHex, talla, precio, stock, cantidad}]
        this.cliente = null;            // null = Cliente Varios
        this.metodoPago = 'EFECTIVO';
        this.productos = [];
        this.esAdmin = (document.body.dataset.userRole || '').toUpperCase().includes('ADMIN');
        this.searchTimer = null;
        this.ultimaVenta = null;
        this.histPage = 0;              // Página actual del historial
        this.histSoloHoy = true;        // Filtro activo del historial
        this.cajaActual = null;         // Estado de la sesión de caja
        this.cartelCajaMostrado = false; // El cartelito de apertura se muestra una sola vez

        this.bindEventos();
        this.restaurarCarrito();
        this.cargarProductos('');
        this.cargarEstadoCaja();        // Al entrar: si la caja está cerrada, invita a abrirla
        this.focusBuscador();
    }

    // ==================== EVENTOS ====================

    bindEventos() {
        // Cambio de vista
        document.getElementById('btnVistaPos').addEventListener('click', () => this.cambiarVista('pos'));
        document.getElementById('btnVistaHistorial').addEventListener('click', () => this.cambiarVista('historial'));

        // Buscador: Enter = intento de código exacto (escáner), tipeo = búsqueda con debounce
        const search = document.getElementById('posSearch');
        search.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.buscarCodigoExacto(search.value.trim());
            }
        });
        search.addEventListener('input', () => {
            document.getElementById('btnClearSearch').classList.toggle('hidden', !search.value);
            clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => this.cargarProductos(search.value.trim()), 300);
        });
        document.getElementById('btnClearSearch').addEventListener('click', () => {
            search.value = '';
            document.getElementById('btnClearSearch').classList.add('hidden');
            this.cargarProductos('');
            this.focusBuscador();
        });

        // Carrito (con confirmación: un click accidental no borra la venta armada)
        document.getElementById('btnVaciarCarrito').addEventListener('click', () => {
            if (this.carrito.length === 0) return;
            const unidades = this.carrito.reduce((s, i) => s + i.cantidad, 0);
            if (!confirm(`¿Vaciar el carrito? Se quitarán ${unidades} unidad(es).`)) return;
            this.carrito = [];
            this.renderCarrito();
        });
        document.getElementById('ticketDescuento').addEventListener('input', () => this.renderTotales());

        // Cliente
        document.getElementById('btnCambiarCliente').addEventListener('click', () => this.abrirModalCliente());
        document.getElementById('btnBuscarCliente').addEventListener('click', () => this.buscarCliente());
        document.getElementById('clienteBuscarDoc').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.buscarCliente();
        });
        document.getElementById('btnGuardarCliente').addEventListener('click', () => this.guardarCliente());
        document.getElementById('btnClienteVarios').addEventListener('click', () => {
            this.setCliente(null);
            this.cerrarModal('modalCliente');
        });

        // Método de pago
        document.querySelectorAll('.metodo-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setMetodoPago(btn.dataset.metodo));
        });

        // Efectivo
        document.getElementById('montoRecibido').addEventListener('input', () => this.renderVuelto());
        // Los chips de billetes SUMAN (dos clicks en S/20 = pagó con dos billetes);
        // "Exacto" fija el total y "Borrar" limpia para corregir
        document.querySelectorAll('.efectivo-chips .chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const input = document.getElementById('montoRecibido');
                if (chip.dataset.monto === 'exacto') {
                    input.value = this.calcularTotal().toFixed(2);
                } else if (chip.dataset.monto === 'borrar') {
                    input.value = '';
                } else {
                    const actual = parseFloat(input.value) || 0;
                    input.value = (actual + parseFloat(chip.dataset.monto)).toFixed(2);
                }
                this.renderVuelto();
            });
        });

        // Cobrar
        document.getElementById('btnCobrar').addEventListener('click', () => this.cobrar());

        // Modal ticket
        document.getElementById('btnImprimirTicket').addEventListener('click', () => window.print());
        document.getElementById('btnNuevaVenta').addEventListener('click', () => {
            this.cerrarModal('modalTicket');
            this.focusBuscador();
        });

        // Historial
        document.getElementById('btnFiltrarHistorial').addEventListener('click', () => this.cargarHistorial(false));
        document.getElementById('btnHistorialHoy').addEventListener('click', () => {
            document.getElementById('filtroFechaInicio').value = '';
            document.getElementById('filtroFechaFin').value = '';
            document.getElementById('filtroEstado').value = '';
            this.cargarHistorial(true);
        });

        // Paginación del historial
        document.getElementById('btnPagAnterior').addEventListener('click', () => this.cambiarPagina(-1));
        document.getElementById('btnPagSiguiente').addEventListener('click', () => this.cambiarPagina(1));

        // Caja
        document.getElementById('btnAbrirCaja').addEventListener('click', () => this.mostrarModalAbrirCaja());
        document.getElementById('btnAbrirCajaAviso').addEventListener('click', () => this.mostrarModalAbrirCaja());
        document.getElementById('btnConfirmarAbrirCaja').addEventListener('click', () => this.abrirCaja());
        document.getElementById('btnCerrarCaja').addEventListener('click', () => this.prepararCierreCaja());
        document.getElementById('btnConfirmarCerrarCaja').addEventListener('click', () => this.cerrarCaja());
        document.getElementById('cajaMontoReal').addEventListener('input', () => this.renderDiferenciaArqueo());

        // Chip de caja del header: abre o cierra según el estado actual
        document.getElementById('btnCajaHeader').addEventListener('click', () => {
            if (this.cajaActual && this.cajaActual.abierta) {
                this.prepararCierreCaja();
            } else {
                this.mostrarModalAbrirCaja();
            }
        });

        // Anular
        document.getElementById('btnConfirmarAnular').addEventListener('click', () => this.confirmarAnulacion());

        // Cierre genérico de modales
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => this.cerrarModal(btn.dataset.close));
        });
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.cerrarModal(modal.id);
            });
        });

        // Escaneo a prueba de foco: si el vendedor empieza a tipear (o la
        // pistola escanea) sin estar en un campo, el buscador captura las teclas
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (e.key.length !== 1) return; // Solo caracteres imprimibles

            const tag = document.activeElement ? document.activeElement.tagName : '';
            const enCampo = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
            const posVisible = !document.getElementById('vistaPos').classList.contains('hidden');
            const modalAbierto = Array.from(document.querySelectorAll('.modal'))
                .some(m => m.style.display === 'flex');

            if (!enCampo && posVisible && !modalAbierto) {
                this.focusBuscador();
            }
        });
    }

    focusBuscador() {
        const search = document.getElementById('posSearch');
        search.focus();
        search.select();
    }

    // ==================== CATÁLOGO ====================

    async cargarProductos(termino) {
        try {
            const url = '/api/productos?activo=true' + (termino ? '&buscar=' + encodeURIComponent(termino) : '');
            const resp = await fetch(url);
            this.productos = await resp.json();
            this.renderCatalogo();
        } catch (e) {
            this.toast('No se pudo cargar el catálogo', 'error');
        }
    }

    renderCatalogo() {
        const grid = document.getElementById('catalogGrid');
        const empty = document.getElementById('catalogEmpty');
        grid.innerHTML = '';

        const visibles = this.productos.filter(p => (p.cantidadVariantes || 0) > 0);
        empty.classList.toggle('hidden', visibles.length > 0);

        visibles.forEach(p => {
            const stock = p.stockTotal || 0;
            const card = document.createElement('div');
            card.className = 'product-card' + (stock === 0 ? ' sin-stock' : '');

            let stockClass = '', stockTexto = stock + ' und.';
            if (stock === 0) { stockClass = 'agotado'; stockTexto = 'Agotado'; }
            else if (p.variantesConStockBajo > 0) { stockClass = 'bajo'; }

            // Foto real del producto para reconocer la prenda de un vistazo;
            // si no tiene (o falla la URL), se muestra el ícono genérico
            const media = p.imagenUrl
                ? `<img class="product-card-img" src="${this.esc(p.imagenUrl)}" alt="" loading="lazy">`
                : `<div class="product-card-icon"><i class="fas fa-shirt"></i></div>`;

            card.innerHTML = `
                <div class="product-card-media">
                    ${media}
                    <span class="product-card-stock ${stockClass}">${stockTexto}</span>
                </div>
                <div class="product-card-nombre">${this.esc(p.nombre)}</div>
                <div class="product-card-meta">${this.esc(p.categoriaNombre || '')}${p.marcaNombre ? ' · ' + this.esc(p.marcaNombre) : ''}</div>
                <div class="product-card-precio">${this.soles(p.precioVenta)}</div>
            `;

            const img = card.querySelector('.product-card-img');
            if (img) {
                img.addEventListener('error', () => {
                    img.outerHTML = '<div class="product-card-icon"><i class="fas fa-shirt"></i></div>';
                });
            }

            if (stock > 0) {
                card.addEventListener('click', () => this.elegirVariante(p));
            }
            grid.appendChild(card);
        });
    }

    /** Enter en el buscador: intenta código de barras / SKU exacto (flujo de escáner) */
    async buscarCodigoExacto(codigo) {
        if (!codigo) return;
        try {
            const resp = await fetch('/api/productos/variantes/buscar/' + encodeURIComponent(codigo));
            if (resp.ok) {
                const variante = await resp.json();
                this.agregarAlCarrito(variante);
                // Listo para el siguiente escaneo
                document.getElementById('posSearch').value = '';
                document.getElementById('btnClearSearch').classList.add('hidden');
                this.cargarProductos('');
                this.focusBuscador();
            } else {
                // No es un código: se queda como búsqueda por texto
                this.toast('Código no encontrado, mostrando búsqueda por nombre', 'error');
            }
        } catch (e) {
            this.toast('Error al buscar el código', 'error');
        }
    }

    /** Click en tarjeta: si hay una sola variante con stock la agrega, si no abre el selector */
    async elegirVariante(producto) {
        try {
            const resp = await fetch('/api/productos/' + producto.id + '/variantes');
            const variantes = (await resp.json()).filter(v => v.activo);

            const conStock = variantes.filter(v => v.stockActual > 0);
            if (conStock.length === 1) {
                this.agregarAlCarrito(conStock[0]);
                this.focusBuscador();
                return;
            }

            document.getElementById('modalVariantesTitulo').textContent = producto.nombre;
            const lista = document.getElementById('listaVariantes');
            lista.innerHTML = '';

            variantes.forEach(v => {
                const agotada = v.stockActual <= 0;
                const row = document.createElement('div');
                row.className = 'variante-row' + (agotada ? ' agotada' : '');
                row.innerHTML = `
                    <div class="variante-row-info">
                        <span class="color-dot" style="background:${v.colorCodigoHex || '#ccc'}"></span>
                        <span>${this.esc(v.colorNombre)}</span>
                        <span class="talla-badge">${this.esc(v.tallaNombre)}</span>
                        ${v.ubicacion ? `<span class="ubicacion-tag" title="Ubicación en tienda"><i class="fas fa-location-dot"></i> ${this.esc(v.ubicacion)}</span>` : ''}
                    </div>
                    <div class="variante-row-stock">
                        ${agotada ? 'Sin stock' : `<strong>${v.stockActual}</strong> disp. · ${this.soles(v.precioVenta)}`}
                    </div>
                `;
                if (!agotada) {
                    row.addEventListener('click', () => {
                        this.agregarAlCarrito(v);
                        this.cerrarModal('modalVariantes');
                        this.focusBuscador();
                    });
                }
                lista.appendChild(row);
            });

            this.abrirModal('modalVariantes');
        } catch (e) {
            this.toast('No se pudieron cargar las variantes', 'error');
        }
    }

    // ==================== CARRITO ====================

    agregarAlCarrito(variante) {
        if (!variante.activo || variante.stockActual <= 0) {
            this.toast('El producto no tiene stock disponible', 'error');
            return;
        }

        const existente = this.carrito.find(i => i.varianteId === variante.id);
        if (existente) {
            if (existente.cantidad + 1 > variante.stockActual) {
                this.toast(`Stock máximo: ${variante.stockActual} unidades de ${variante.sku}`, 'error');
                return;
            }
            existente.cantidad++;
            existente.stock = variante.stockActual;
        } else {
            this.carrito.push({
                varianteId: variante.id,
                sku: variante.sku,
                nombre: variante.productoNombre,
                color: variante.colorNombre,
                colorHex: variante.colorCodigoHex,
                talla: variante.tallaNombre,
                precio: parseFloat(variante.precioVenta),
                stock: variante.stockActual,
                cantidad: 1
            });
        }
        this.renderCarrito();
    }

    cambiarCantidad(varianteId, delta) {
        const item = this.carrito.find(i => i.varianteId === varianteId);
        if (!item) return;

        const nueva = item.cantidad + delta;
        if (nueva <= 0) {
            this.carrito = this.carrito.filter(i => i.varianteId !== varianteId);
        } else if (nueva > item.stock) {
            this.toast(`Solo hay ${item.stock} unidades disponibles`, 'error');
            return;
        } else {
            item.cantidad = nueva;
        }
        this.renderCarrito();
    }

    /** Fija la cantidad exacta de una línea (input editable del carrito) */
    fijarCantidad(varianteId, valor) {
        const item = this.carrito.find(i => i.varianteId === varianteId);
        if (!item) return;

        let cantidad = parseInt(valor, 10);
        if (isNaN(cantidad) || cantidad < 1) {
            cantidad = 1;
        }
        if (cantidad > item.stock) {
            this.toast(`Solo hay ${item.stock} unidades disponibles`, 'error');
            cantidad = item.stock;
        }
        item.cantidad = cantidad;
        this.renderCarrito();
    }

    renderCarrito() {
        const cont = document.getElementById('cartItems');
        cont.innerHTML = '';

        if (this.carrito.length === 0) {
            cont.innerHTML = `
                <div id="cartEmpty" class="cart-empty">
                    <i class="fas fa-basket-shopping"></i>
                    <p>El carrito está vacío</p>
                    <small>Escanea o selecciona un producto</small>
                </div>`;
        }

        this.carrito.forEach(item => {
            const linea = document.createElement('div');
            // item-error: la cantidad pedida supera el stock real (ver sincronizarStockCarrito)
            linea.className = 'cart-item' + (item.cantidad > item.stock ? ' item-error' : '');
            linea.innerHTML = `
                <div>
                    <div class="cart-item-nombre">${this.esc(item.nombre)}</div>
                    <div class="cart-item-variante">
                        <span class="color-dot" style="background:${item.colorHex || '#ccc'}"></span>
                        ${this.esc(item.color)} · Talla ${this.esc(item.talla)}
                    </div>
                </div>
                <div class="cart-item-subtotal">${this.soles(item.precio * item.cantidad)}</div>
                <div class="cart-item-controls">
                    <div class="qty-stepper">
                        <button class="qty-btn" data-act="menos"><i class="fas fa-minus"></i></button>
                        <input class="qty-input" type="number" min="1" max="${item.stock}"
                               value="${item.cantidad}" title="Escribe la cantidad y presiona Enter">
                        <button class="qty-btn" data-act="mas" ${item.cantidad >= item.stock ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                        <span class="cart-item-precio">× ${this.soles(item.precio)}</span>
                    </div>
                    <button class="cart-item-remove" title="Quitar"><i class="fas fa-trash-can"></i></button>
                </div>
            `;
            linea.querySelector('[data-act="menos"]').addEventListener('click', () => this.cambiarCantidad(item.varianteId, -1));
            linea.querySelector('[data-act="mas"]').addEventListener('click', () => this.cambiarCantidad(item.varianteId, 1));
            const qtyInput = linea.querySelector('.qty-input');
            qtyInput.addEventListener('change', () => this.fijarCantidad(item.varianteId, qtyInput.value));
            qtyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    qtyInput.blur(); // Dispara el change y aplica la cantidad
                    this.focusBuscador();
                }
            });
            linea.querySelector('.cart-item-remove').addEventListener('click', () => {
                this.carrito = this.carrito.filter(i => i.varianteId !== item.varianteId);
                this.renderCarrito();
            });
            cont.appendChild(linea);
        });

        this.renderTotales();
    }

    calcularSubtotal() {
        return this.carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
    }

    calcularTotal() {
        const descuento = parseFloat(document.getElementById('ticketDescuento').value) || 0;
        return Math.max(0, this.calcularSubtotal() - descuento);
    }

    renderTotales() {
        const subtotal = this.calcularSubtotal();
        const total = this.calcularTotal();

        document.getElementById('ticketSubtotal').textContent = this.soles(subtotal);
        document.getElementById('ticketTotal').textContent = this.soles(total);
        document.getElementById('btnCobrarTotal').textContent = this.soles(total);

        // Aviso del tope de descuento (solo para vendedores)
        const hint = document.getElementById('descuentoHint');
        const inputDesc = document.getElementById('ticketDescuento');
        const descuento = parseFloat(inputDesc.value) || 0;
        const maximo = this.maxDescuentoPermitido();
        if (this.esAdmin || this.carrito.length === 0) {
            hint.textContent = '';
            hint.classList.remove('hint-error');
            inputDesc.classList.remove('input-error');
        } else {
            const excede = descuento > maximo + 0.001;
            hint.textContent = maximo > 0
                ? `Tope de descuento (vendedor): ${this.soles(maximo)}`
                : 'Ventas de S/ 40.00 o menos: sin descuento';
            hint.classList.toggle('hint-error', excede);
            inputDesc.classList.toggle('input-error', excede);
        }

        this.guardarCarrito();
        this.renderVuelto();
    }

    /** Tope de descuento según rol: ADMIN sin límite, vendedor según el subtotal */
    maxDescuentoPermitido() {
        const subtotal = this.calcularSubtotal();
        if (this.esAdmin) return subtotal;
        if (subtotal > 100) return 5;
        if (subtotal > 40) return 2;
        return 0;
    }

    /**
     * Habilita COBRAR solo cuando la venta es válida: hay productos,
     * el descuento respeta el tope y (en efectivo) el monto recibido alcanza
     */
    actualizarBotonCobrar() {
        const total = this.calcularTotal();
        const descuento = parseFloat(document.getElementById('ticketDescuento').value) || 0;
        const excedeDescuento = descuento > this.maxDescuentoPermitido() + 0.001;

        let faltaEfectivo = false;
        if (this.metodoPago === 'EFECTIVO' && this.carrito.length > 0) {
            const recibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
            faltaEfectivo = recibido + 0.001 < total;
        }

        // Sin caja abierta no se cobra (el backend también lo valida)
        const cajaCerrada = this.cajaActual !== null && this.cajaActual.abierta === false;

        document.getElementById('btnCobrar').disabled =
            this.carrito.length === 0 || excedeDescuento || faltaEfectivo || cajaCerrada;
    }

    // ==================== PAGO ====================

    setMetodoPago(metodo) {
        this.metodoPago = metodo;
        document.querySelectorAll('.metodo-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.metodo === metodo);
        });
        document.getElementById('panelEfectivo').style.display = metodo === 'EFECTIVO' ? 'block' : 'none';
        this.renderVuelto();
    }

    renderVuelto() {
        const recibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
        const vuelto = recibido - this.calcularTotal();
        const cont = document.querySelector('.efectivo-vuelto');
        document.getElementById('vueltoCalculado').textContent = this.soles(Math.abs(vuelto) < 0.005 ? 0 : vuelto);
        cont.classList.toggle('negativo', vuelto < -0.005);
        this.actualizarBotonCobrar();
    }

    async cobrar() {
        if (this.carrito.length === 0) return;

        // Si alguna línea quedó marcada con stock insuficiente, no intentar cobrar
        const conflicto = this.carrito.find(i => i.cantidad > i.stock);
        if (conflicto) {
            this.toast(`Revisa "${conflicto.nombre}": solo hay ${conflicto.stock} disponible(s)`, 'error');
            return;
        }

        const descuento = parseFloat(document.getElementById('ticketDescuento').value) || 0;
        const payload = {
            clienteId: this.cliente ? this.cliente.id : null,
            metodoPago: this.metodoPago,
            descuento: descuento,
            montoRecibido: this.metodoPago === 'EFECTIVO'
                ? (parseFloat(document.getElementById('montoRecibido').value) || 0)
                : null,
            observaciones: null,
            items: this.carrito.map(i => ({ varianteId: i.varianteId, cantidad: i.cantidad }))
        };

        if (this.metodoPago === 'EFECTIVO' && payload.montoRecibido < this.calcularTotal()) {
            this.toast('El monto recibido es menor al total', 'error');
            document.getElementById('montoRecibido').focus();
            return;
        }

        const btn = document.getElementById('btnCobrar');
        btn.disabled = true;

        try {
            const resp = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();

            if (!data.success) {
                this.toast(data.message || 'No se pudo registrar la venta', 'error');
                // Rechazo por stock: otro vendedor se adelantó. Se refresca el
                // stock real de cada línea y se marcan las que exceden
                if ((data.message || '').includes('Stock insuficiente')) {
                    await this.sincronizarStockCarrito();
                } else {
                    this.actualizarBotonCobrar();
                }
                return;
            }

            this.ultimaVenta = data.venta;
            this.mostrarTicket(data.venta, true);
            this.resetVenta();
            this.cargarProductos(document.getElementById('posSearch').value.trim());
        } catch (e) {
            this.toast('Error de conexión al registrar la venta', 'error');
            this.actualizarBotonCobrar();
        }
    }

    /**
     * Tras un rechazo por stock, consulta el stock real de cada línea del
     * carrito, actualiza el catálogo y marca en rojo las líneas excedidas
     */
    async sincronizarStockCarrito() {
        for (const item of this.carrito) {
            try {
                const resp = await fetch('/api/productos/variantes/' + item.varianteId);
                if (resp.ok) {
                    const v = await resp.json();
                    item.stock = (v.activo && v.stockActual > 0) ? v.stockActual : 0;
                } else {
                    item.stock = 0; // La variante ya no existe
                }
            } catch (e) {
                // Sin conexión: se conserva el stock conocido
            }
        }

        this.renderCarrito();
        this.cargarProductos(document.getElementById('posSearch').value.trim());

        const conflictos = this.carrito.filter(i => i.cantidad > i.stock);
        if (conflictos.length > 0) {
            this.toast('Stock actualizado: corrige las líneas marcadas en rojo', 'error');
        }
    }

    resetVenta() {
        this.carrito = [];
        this.setCliente(null);
        document.getElementById('ticketDescuento').value = '0';
        document.getElementById('montoRecibido').value = '';
        this.renderCarrito();
    }

    // ==================== TICKET ====================

    mostrarTicket(venta, esNueva) {
        document.getElementById('modalTicketTitulo').textContent =
            esNueva ? 'Venta registrada' : 'Detalle de venta';

        // Vuelto destacado solo al cobrar en efectivo
        const banner = document.getElementById('ticketVueltoBanner');
        const hayVuelto = esNueva && venta.metodoPago === 'EFECTIVO' && venta.vuelto != null;
        banner.classList.toggle('hidden', !hayVuelto);
        if (hayVuelto) {
            document.getElementById('ticketVueltoMonto').textContent = this.soles(venta.vuelto);
        }

        const fecha = new Date(venta.fecha);
        const lineas = venta.detalles.map(d => `
            <div class="tk-linea">
                <span class="tk-desc">${d.cantidad} x ${this.esc(d.descripcion)}</span>
                <span>${this.soles(d.subtotal)}</span>
            </div>`).join('');

        document.getElementById('ticketPrint').innerHTML = `
            <div class="tk-header tk-center">
                <h3>GAMS S.A.C</h3>
                <p>Ticket de venta</p>
                <p><strong>${this.esc(venta.codigo)}</strong></p>
                <p>${fecha.toLocaleDateString('es-PE')} ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <hr class="tk-sep">
            <div class="tk-linea"><span>Vendedor:</span><span>${this.esc(venta.vendedor || '-')}</span></div>
            <div class="tk-linea"><span>Cliente:</span><span>${this.esc(venta.cliente)}${venta.clienteDocumento ? ' (' + this.esc(venta.clienteDocumento) + ')' : ''}</span></div>
            <hr class="tk-sep">
            ${lineas}
            <hr class="tk-sep">
            <div class="tk-linea"><span>Subtotal</span><span>${this.soles(venta.subtotal)}</span></div>
            ${parseFloat(venta.descuento) > 0 ? `<div class="tk-linea"><span>Descuento</span><span>-${this.soles(venta.descuento)}</span></div>` : ''}
            <div class="tk-total"><span>TOTAL</span><span>${this.soles(venta.total)}</span></div>
            <div class="tk-linea"><span>Op. gravada</span><span>${this.soles(venta.operacionGravada)}</span></div>
            <div class="tk-linea"><span>IGV (18%)</span><span>${this.soles(venta.igv)}</span></div>
            <hr class="tk-sep">
            <div class="tk-linea"><span>Pago</span><span>${venta.metodoPago}</span></div>
            ${venta.montoRecibido != null ? `
                <div class="tk-linea"><span>Recibido</span><span>${this.soles(venta.montoRecibido)}</span></div>
                <div class="tk-linea"><span>Vuelto</span><span>${this.soles(venta.vuelto)}</span></div>` : ''}
            ${venta.estado === 'ANULADA' ? '<p class="tk-anulada">** ANULADA **</p>' : ''}
            <hr class="tk-sep">
            <p class="tk-center">¡Gracias por su compra!</p>
        `;

        this.abrirModal('modalTicket');
    }

    // ==================== CLIENTE ====================

    setCliente(cliente) {
        this.cliente = cliente;
        document.getElementById('clienteNombre').textContent = cliente ? cliente.nombre : 'Cliente Varios';
        document.getElementById('clienteDocumento').textContent = cliente
            ? cliente.tipoDocumento + ' ' + cliente.numeroDocumento : '';
        this.guardarCarrito();
    }

    abrirModalCliente() {
        document.getElementById('clienteBuscarDoc').value = '';
        document.getElementById('clienteBuscarMsg').textContent = '';
        document.getElementById('clienteBuscarMsg').className = 'cliente-msg';
        document.getElementById('clienteAltaForm').classList.add('hidden');
        this.abrirModal('modalCliente');
        setTimeout(() => document.getElementById('clienteBuscarDoc').focus(), 100);
    }

    async buscarCliente() {
        const doc = document.getElementById('clienteBuscarDoc').value.trim();
        const msg = document.getElementById('clienteBuscarMsg');
        if (!doc) return;

        try {
            const resp = await fetch('/api/clientes/documento/' + encodeURIComponent(doc));
            const data = await resp.json();

            if (data.success) {
                this.setCliente(data.cliente);
                this.cerrarModal('modalCliente');
                this.toast('Cliente: ' + data.cliente.nombre, 'success');
            } else {
                msg.textContent = 'No existe. Completa los datos para registrarlo:';
                msg.className = 'cliente-msg error';
                const form = document.getElementById('clienteAltaForm');
                form.classList.remove('hidden');
                // Pre-seleccionar tipo según longitud del documento
                document.getElementById('clienteAltaTipo').value = doc.length === 11 ? 'RUC' : 'DNI';
                document.getElementById('clienteAltaNombre').focus();
            }
        } catch (e) {
            msg.textContent = 'Error al buscar el cliente';
            msg.className = 'cliente-msg error';
        }
    }

    async guardarCliente() {
        const payload = {
            tipoDocumento: document.getElementById('clienteAltaTipo').value,
            numeroDocumento: document.getElementById('clienteBuscarDoc').value.trim(),
            nombre: document.getElementById('clienteAltaNombre').value.trim(),
            telefono: document.getElementById('clienteAltaTelefono').value.trim() || null
        };

        try {
            const resp = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();

            if (data.success) {
                this.setCliente(data.cliente);
                this.cerrarModal('modalCliente');
                this.toast('Cliente registrado: ' + data.cliente.nombre, 'success');
                document.getElementById('clienteAltaNombre').value = '';
                document.getElementById('clienteAltaTelefono').value = '';
            } else {
                const msg = document.getElementById('clienteBuscarMsg');
                msg.textContent = data.message;
                msg.className = 'cliente-msg error';
            }
        } catch (e) {
            this.toast('Error al registrar el cliente', 'error');
        }
    }

    // ==================== HISTORIAL ====================

    cambiarVista(vista) {
        document.getElementById('btnVistaPos').classList.toggle('active', vista === 'pos');
        document.getElementById('btnVistaHistorial').classList.toggle('active', vista === 'historial');
        document.getElementById('vistaPos').classList.toggle('hidden', vista !== 'pos');
        document.getElementById('vistaHistorial').classList.toggle('hidden', vista !== 'historial');

        if (vista === 'historial') {
            this.cargarResumen();
            this.cargarHistorial(true);
            this.cargarEstadoCaja();
        } else {
            this.focusBuscador();
        }
    }

    async cargarResumen() {
        try {
            const resp = await fetch('/api/ventas/resumen-hoy');
            const data = await resp.json();
            if (!data.success) return;

            document.getElementById('statTotalHoy').textContent = this.soles(data.resumen.totalVendido);
            document.getElementById('statVentasHoy').textContent = data.resumen.cantidadVentas;

            const metodos = data.resumen.porMetodoPago || {};
            const partes = Object.entries(metodos).map(([m, v]) => `${m}: ${this.soles(v)}`);
            document.getElementById('statMetodos').textContent = partes.length ? partes.join(' · ') : '—';
        } catch (e) {
            // Silencioso: las stats no bloquean el historial
        }
    }

    async cargarHistorial(soloHoy, page = 0) {
        this.histSoloHoy = soloHoy;
        this.histPage = Math.max(0, page);

        const params = new URLSearchParams();
        params.set('page', this.histPage);
        params.set('size', '20');

        if (soloHoy) {
            params.set('hoy', 'true');
        } else {
            const inicio = document.getElementById('filtroFechaInicio').value;
            const fin = document.getElementById('filtroFechaFin').value;
            if (inicio && fin) {
                params.set('fechaInicio', inicio);
                params.set('fechaFin', fin);
            }
            const estado = document.getElementById('filtroEstado').value;
            if (estado) params.set('estado', estado);
        }

        try {
            const resp = await fetch('/api/ventas?' + params.toString());
            const data = await resp.json();
            if (!data.success) {
                this.toast(data.message || 'Error al cargar el historial', 'error');
                return;
            }
            this.renderHistorial(data.ventas);
            this.renderPaginacion(data);
        } catch (e) {
            this.toast('Error de conexión al cargar el historial', 'error');
        }
    }

    cambiarPagina(delta) {
        this.cargarHistorial(this.histSoloHoy, this.histPage + delta);
    }

    renderPaginacion(data) {
        const barra = document.getElementById('historialPaginacion');
        const totalPages = data.totalPages || 1;
        barra.classList.toggle('hidden', totalPages <= 1);

        document.getElementById('pagInfo').textContent =
            `Página ${(data.page || 0) + 1} de ${totalPages} · ${data.total} venta(s)`;
        document.getElementById('btnPagAnterior').disabled = (data.page || 0) <= 0;
        document.getElementById('btnPagSiguiente').disabled = (data.page || 0) >= totalPages - 1;
    }

    renderHistorial(ventas) {
        const body = document.getElementById('historialBody');
        const empty = document.getElementById('historialEmpty');
        body.innerHTML = '';
        empty.classList.toggle('hidden', ventas.length > 0);

        ventas.forEach(v => {
            const fecha = new Date(v.fecha);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${this.esc(v.codigo)}</strong></td>
                <td>${fecha.toLocaleDateString('es-PE')} ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${this.esc(v.vendedor || '-')}</td>
                <td>${this.esc(v.cliente)}</td>
                <td>${v.detalles.reduce((s, d) => s + d.cantidad, 0)}</td>
                <td><strong>${this.soles(v.total)}</strong></td>
                <td><span class="badge-metodo">${v.metodoPago}</span></td>
                <td><span class="badge-estado badge-${v.estado.toLowerCase()}">${v.estado}</span></td>
                <td>
                    <button class="accion-btn accion-ver" title="Ver ticket"><i class="fas fa-eye"></i></button>
                    ${this.esAdmin && v.estado === 'COMPLETADA'
                        ? '<button class="accion-btn accion-anular" title="Anular venta"><i class="fas fa-ban"></i></button>'
                        : ''}
                </td>
            `;
            tr.querySelector('.accion-ver').addEventListener('click', () => this.mostrarTicket(v, false));
            const btnAnular = tr.querySelector('.accion-anular');
            if (btnAnular) {
                btnAnular.addEventListener('click', () => this.abrirModalAnular(v));
            }
            body.appendChild(tr);
        });
    }

    // ==================== CAJA (APERTURA / CIERRE / ARQUEO) ====================

    mostrarModalAbrirCaja() {
        document.getElementById('cajaMontoInicial').value = '';
        this.abrirModal('modalAbrirCaja');
        setTimeout(() => document.getElementById('cajaMontoInicial').focus(), 100);
    }

    async cargarEstadoCaja() {
        try {
            const resp = await fetch('/api/caja/actual');
            const data = await resp.json();
            if (!data.success) return;
            this.cajaActual = data.caja;
            this.renderEstadoCaja();

            // Cartelito de bienvenida: al entrar al módulo con la caja cerrada,
            // se invita a abrirla antes de empezar a vender (solo una vez)
            if (!this.cajaActual.abierta && !this.cartelCajaMostrado) {
                this.cartelCajaMostrado = true;
                this.mostrarModalAbrirCaja();
            }
        } catch (e) {
            // Si el estado de caja no carga, el backend igual valida al cobrar
        }
    }

    renderEstadoCaja() {
        const caja = this.cajaActual;
        const titulo = document.getElementById('cajaTitulo');
        const detalle = document.getElementById('cajaDetalle');
        const icono = document.getElementById('cajaIcono');
        const btnAbrir = document.getElementById('btnAbrirCaja');
        const btnCerrar = document.getElementById('btnCerrarCaja');

        // Chip del header y aviso del ticket (visibles desde la vista de venta)
        const abierta = caja && caja.abierta;
        document.getElementById('cajaChipTexto').textContent = abierta ? 'Caja abierta' : 'Caja cerrada';
        document.getElementById('cajaChipDot').className =
            'caja-chip-dot ' + (abierta ? 'dot-abierta' : 'dot-cerrada');
        document.getElementById('cajaAviso').classList.toggle('hidden', !!abierta);
        this.actualizarBotonCobrar();

        if (caja && caja.abierta) {
            const desde = new Date(caja.fechaApertura);
            titulo.textContent = 'Caja abierta';
            detalle.textContent =
                `Desde las ${desde.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}` +
                ` por ${caja.usuarioApertura} · ${caja.cantidadVentas} venta(s)` +
                ` · Efectivo esperado: ${this.soles(caja.montoEsperado)}`;
            icono.className = 'pos-stat-icon stat-icon-green';
            btnAbrir.classList.add('hidden');
            btnCerrar.classList.remove('hidden');
        } else {
            titulo.textContent = 'Caja cerrada';
            detalle.textContent = 'Abre la caja al iniciar el turno para controlar el efectivo';
            icono.className = 'pos-stat-icon stat-icon-amber';
            btnAbrir.classList.remove('hidden');
            btnCerrar.classList.add('hidden');
        }
    }

    async abrirCaja() {
        const monto = parseFloat(document.getElementById('cajaMontoInicial').value);
        if (isNaN(monto) || monto < 0) {
            this.toast('Indica el efectivo inicial del cajón', 'error');
            return;
        }

        try {
            const resp = await fetch('/api/caja/abrir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ montoInicial: monto })
            });
            const data = await resp.json();

            if (data.success) {
                this.toast(data.message, 'success');
                this.cerrarModal('modalAbrirCaja');
                this.cargarEstadoCaja();
            } else {
                this.toast(data.message || 'No se pudo abrir la caja', 'error');
            }
        } catch (e) {
            this.toast('Error de conexión al abrir la caja', 'error');
        }
    }

    /** Abre el modal de cierre con el resumen del turno actualizado */
    async prepararCierreCaja() {
        await this.cargarEstadoCaja();
        const caja = this.cajaActual;
        if (!caja || !caja.abierta) {
            this.toast('No hay ninguna caja abierta', 'error');
            return;
        }

        document.getElementById('arqInicial').textContent = this.soles(caja.montoInicial);
        document.getElementById('arqEfectivo').textContent = this.soles(caja.totalEfectivo);
        document.getElementById('arqEsperado').textContent = this.soles(caja.montoEsperado);
        document.getElementById('arqTotalVentas').textContent = this.soles(caja.totalVentas);
        document.getElementById('cajaMontoReal').value = '';
        document.getElementById('cajaObservaciones').value = '';
        this.renderDiferenciaArqueo();

        this.abrirModal('modalCerrarCaja');
        setTimeout(() => document.getElementById('cajaMontoReal').focus(), 100);
    }

    renderDiferenciaArqueo() {
        const esperado = this.cajaActual ? (parseFloat(this.cajaActual.montoEsperado) || 0) : 0;
        const real = parseFloat(document.getElementById('cajaMontoReal').value) || 0;
        const diferencia = real - esperado;

        const monto = document.getElementById('arqDiferencia');
        monto.textContent = (diferencia > 0 ? '+' : '') + this.soles(diferencia).replace('S/ -', '- S/ ');
        monto.className = Math.abs(diferencia) < 0.005 ? 'dif-ok'
            : (diferencia < 0 ? 'dif-faltante' : 'dif-sobrante');
    }

    async cerrarCaja() {
        const montoReal = parseFloat(document.getElementById('cajaMontoReal').value);
        if (isNaN(montoReal) || montoReal < 0) {
            this.toast('Cuenta el efectivo del cajón e ingresa el monto', 'error');
            return;
        }

        try {
            const resp = await fetch('/api/caja/cerrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    montoReal: montoReal,
                    observaciones: document.getElementById('cajaObservaciones').value.trim() || null
                })
            });
            const data = await resp.json();

            if (data.success) {
                const dif = parseFloat(data.arqueo.diferencia) || 0;
                if (Math.abs(dif) < 0.005) {
                    this.toast('Caja cerrada: el efectivo cuadró exacto ✔', 'success');
                } else if (dif < 0) {
                    this.toast(`Caja cerrada con FALTANTE de ${this.soles(Math.abs(dif))}`, 'error');
                } else {
                    this.toast(`Caja cerrada con sobrante de ${this.soles(dif)}`, 'success');
                }
                this.cerrarModal('modalCerrarCaja');
                this.cargarEstadoCaja();
                this.cargarResumen();
            } else {
                this.toast(data.message || 'No se pudo cerrar la caja', 'error');
            }
        } catch (e) {
            this.toast('Error de conexión al cerrar la caja', 'error');
        }
    }

    // ==================== ANULACIÓN ====================

    abrirModalAnular(venta) {
        this.ventaAnular = venta;
        document.getElementById('anularCodigo').textContent = venta.codigo;
        document.getElementById('anularMotivo').value = '';
        this.abrirModal('modalAnular');
        setTimeout(() => document.getElementById('anularMotivo').focus(), 100);
    }

    async confirmarAnulacion() {
        const motivo = document.getElementById('anularMotivo').value.trim();
        if (!motivo) {
            this.toast('Debes indicar el motivo de la anulación', 'error');
            return;
        }

        try {
            const resp = await fetch('/api/ventas/' + this.ventaAnular.id + '/anular', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motivo })
            });
            const data = await resp.json();

            if (data.success) {
                this.toast(data.message, 'success');
                this.cerrarModal('modalAnular');
                this.cargarResumen();
                this.cargarHistorial(true);
            } else {
                this.toast(data.message || 'No se pudo anular la venta', 'error');
            }
        } catch (e) {
            this.toast('Error de conexión al anular', 'error');
        }
    }

    // ==================== PERSISTENCIA DEL CARRITO ====================

    /**
     * Guarda la venta en curso en sessionStorage: un F5 accidental
     * no hace perder el carrito armado
     */
    guardarCarrito() {
        try {
            sessionStorage.setItem('posCarrito', JSON.stringify({
                carrito: this.carrito,
                cliente: this.cliente,
                descuento: document.getElementById('ticketDescuento').value
            }));
        } catch (e) {
            // sessionStorage no disponible: la venta sigue funcionando sin respaldo
        }
    }

    restaurarCarrito() {
        try {
            const guardado = JSON.parse(sessionStorage.getItem('posCarrito') || 'null');
            if (!guardado || !Array.isArray(guardado.carrito) || guardado.carrito.length === 0) return;

            this.carrito = guardado.carrito;
            if (guardado.cliente) {
                this.setCliente(guardado.cliente);
            }
            if (guardado.descuento) {
                document.getElementById('ticketDescuento').value = guardado.descuento;
            }
            this.renderCarrito();
            this.toast('Se recuperó la venta en curso', 'success');
        } catch (e) {
            sessionStorage.removeItem('posCarrito');
        }
    }

    // ==================== UTILIDADES ====================

    abrirModal(id) {
        document.getElementById(id).style.display = 'flex';
    }

    cerrarModal(id) {
        document.getElementById(id).style.display = 'none';
    }

    soles(valor) {
        const n = parseFloat(valor) || 0;
        return 'S/ ' + n.toFixed(2);
    }

    esc(texto) {
        const div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    }

    toast(mensaje, tipo) {
        const cont = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = 'toast toast-' + (tipo || 'success');
        t.innerHTML = `<i class="fas ${tipo === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i> ${this.esc(mensaje)}`;
        cont.appendChild(t);
        setTimeout(() => {
            t.classList.add('hide');
            setTimeout(() => t.remove(), 350);
        }, 3200);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.posManager = new PosManager();
});