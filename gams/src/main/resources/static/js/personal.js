/**
 * GAMS S.A.C - Gestión de Personal
 */

class PersonalManager {
  constructor() {
    this.usuarios = [];
    this.roles = [];
    this.filteredUsuarios = [];
    this.currentPage = 1;
    this.itemsPerPage = 8;
    this.currentStream = null;
    this.captureCount = 0;
    this.currentUsername = "";
    this.isEditing = false;
    this.editingUserId = null;

    this.init();
  }

  async init() {
    await this.loadRoles();
    await this.loadUsuarios();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Botón nuevo usuario
    document.getElementById("btnNuevoUsuario").addEventListener("click", () => {
      this.openCreateModal();
    });

    // Formulario de usuario
    document.getElementById("formUsuario").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveUsuario();
    });

    // Búsqueda
    document.getElementById("searchInput").addEventListener("input", () => {
      this.filterUsuarios();
    });

    // Filtros
    document.getElementById("filterRol").addEventListener("change", () => {
      this.filterUsuarios();
    });

    document.getElementById("filterEstado").addEventListener("change", () => {
      this.filterUsuarios();
    });

    // Captura de rostro
    document.getElementById("btnStartCapture").addEventListener("click", () => {
      this.startFaceCapture();
    });

    // Generación automática de username
    document.getElementById("nombre").addEventListener("input", () => {
      if (!this.isEditing) this.generateUsername();
      this.clearFieldError("nombre");
    });

    document.getElementById("apellidos").addEventListener("input", () => {
      if (!this.isEditing) this.generateUsername();
      this.clearFieldError("apellidos");
    });

    // Validación manual del username cuando el usuario lo edita
    document.getElementById("username").addEventListener("input", () => {
      this.clearFieldError("username");
      if (!this.isEditing) {
        clearTimeout(this.usernameValidationTimeout);
        this.usernameValidationTimeout = setTimeout(() => {
          this.validateUsernameManually();
        }, 500);
      }
    });

    // Limpiar error de email al escribir
    document.getElementById("email").addEventListener("input", () => {
      this.clearFieldError("email");
    });

    // Limpiar error de password al escribir
    document.getElementById("password").addEventListener("input", () => {
      this.clearFieldError("password");
    });

    // Bloquear letras en teléfono y limitar a 9 dígitos
    document.getElementById("telefono").addEventListener("keypress", (e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });
    document.getElementById("telefono").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 9);
      this.clearFieldError("telefono");
    });

    // Bloquear números en nombre y apellidos
    document.getElementById("nombre").addEventListener("keypress", (e) => {
      if (/[0-9]/.test(e.key)) e.preventDefault();
    });
    document.getElementById("apellidos").addEventListener("keypress", (e) => {
      if (/[0-9]/.test(e.key)) e.preventDefault();
    });

    // Validación al salir de cada campo obligatorio (blur)
    ["username", "email", "nombre", "apellidos"].forEach((id) => {
      document.getElementById(id).addEventListener("blur", () => {
        this.validateField(id);
      });
    });
    document.getElementById("password").addEventListener("blur", () => {
      if (!this.isEditing) this.validateField("password");
    });
    document.getElementById("telefono").addEventListener("blur", () => {
      this.validateTelefono();
    });
  }

  // ── Helpers de validación visual ──────────────────────────────────────────

  showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorSpan = document.getElementById(fieldId + "Error");
    if (input) input.classList.add("field-error");
    if (errorSpan) {
      errorSpan.textContent = message;
      errorSpan.classList.add("visible");
    }
  }

  clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorSpan = document.getElementById(fieldId + "Error");
    if (input) input.classList.remove("field-error");
    if (errorSpan) {
      errorSpan.textContent = "";
      errorSpan.classList.remove("visible");
    }
  }

  clearAllErrors() {
    ["username", "email", "nombre", "apellidos", "telefono", "password", "roles"].forEach((id) => {
      this.clearFieldError(id);
    });
    document.getElementById("rolesCheckboxes").classList.remove("field-error");
  }

  validateField(fieldId) {
    const value = document.getElementById(fieldId).value.trim();
    if (!value) {
      const labels = {
        username: "El username es obligatorio",
        email: "El email es obligatorio",
        nombre: "El nombre es obligatorio",
        apellidos: "Los apellidos son obligatorios",
        password: "La contraseña es obligatoria",
      };
      this.showFieldError(fieldId, labels[fieldId] || "Campo obligatorio");
      return false;
    }
    if (fieldId === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      this.showFieldError("email", "Ingresa un email válido");
      return false;
    }
    this.clearFieldError(fieldId);
    return true;
  }

  validateTelefono() {
    const value = document.getElementById("telefono").value.trim();
    if (value && value.length !== 9) {
      this.showFieldError("telefono", "El teléfono debe tener exactamente 9 dígitos");
      return false;
    }
    this.clearFieldError("telefono");
    return true;
  }

  validateForm() {
    let valid = true;

    // Campos de texto obligatorios
    const requiredFields = ["username", "email", "nombre", "apellidos"];
    requiredFields.forEach((id) => {
      if (!this.validateField(id)) valid = false;
    });

    // Contraseña obligatoria solo al crear
    if (!this.isEditing) {
      if (!this.validateField("password")) valid = false;
    }

    // Teléfono: opcional pero si se ingresa debe tener 9 dígitos
    if (!this.validateTelefono()) valid = false;

    // Roles: al menos uno seleccionado
    const rolesSeleccionados = document.querySelectorAll('input[name="roles"]:checked').length;
    const rolesBox = document.getElementById("rolesCheckboxes");
    if (rolesSeleccionados === 0) {
      rolesBox.classList.add("field-error");
      const rolesError = document.getElementById("rolesError");
      if (rolesError) {
        rolesError.textContent = "Selecciona al menos un rol";
        rolesError.classList.add("visible");
      }
      valid = false;
    } else {
      rolesBox.classList.remove("field-error");
      const rolesError = document.getElementById("rolesError");
      if (rolesError) {
        rolesError.textContent = "";
        rolesError.classList.remove("visible");
      }
    }

    return valid;
  }

  async loadRoles() {
    try {
      const response = await fetch("/api/usuarios/roles");
      const data = await response.json();

      if (data.success) {
        this.roles = data.roles;
        this.renderRolesCheckboxes();
      }
    } catch (error) {
      console.error("Error cargando roles:", error);
    }
  }

  renderRolesCheckboxes() {
    const container = document.getElementById("rolesCheckboxes");
    container.innerHTML = "";

    this.roles.forEach((rol) => {
      const div = document.createElement("div");
      div.innerHTML = `
                <label class="checkbox-container">
                    <input type="checkbox" name="roles" value="${rol.nombre}">
                    <span class="checkmark"></span>
                    ${rol.nombre} - ${rol.descripcion || ""}
                </label>
            `;
      container.appendChild(div);
    });
  }

  async loadUsuarios() {
    try {
      this.showLoading(true);
      const response = await fetch("/api/usuarios");
      const data = await response.json();

      if (data.success) {
        this.usuarios = data.usuarios;
        this.renderUsuarios(this.usuarios);
      } else {
        this.showToast("error", "Error", data.message);
      }
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      this.showToast("error", "Error", "No se pudo cargar los usuarios");
    } finally {
      this.showLoading(false);
    }
  }

  renderUsuarios(usuarios) {
    this.filteredUsuarios = usuarios;
    this.currentPage = 1;
    this.renderPage();
  }

  renderPage() {
    const tbody = document.getElementById("usersTableBody");

    if (this.filteredUsuarios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No hay usuarios registrados</td>
        </tr>
      `;
      document.getElementById("paginationBar").classList.add("hidden");
      return;
    }

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const pageUsers = this.filteredUsuarios.slice(start, start + this.itemsPerPage);

    tbody.innerHTML = pageUsers.map((u) => {
      const initials = this.getInitials(u.nombre, u.apellidos);
      const avatarClass = this.getAvatarColorClass(u.roles[0]);
      const roleBadges = u.roles.map((r) => this.getRoleBadge(r)).join(" ");
      const estadoTitle = u.activo ? "Activo — clic para desactivar" : "Inactivo — clic para activar";

      return `
        <tr>
          <td>
            <div class="employee-cell">
              <div class="employee-avatar ${avatarClass}">${initials}</div>
              <div class="employee-info">
                <span class="employee-name">${u.nombre} ${u.apellidos}</span>
                <span class="employee-username">@${u.username}</span>
              </div>
            </div>
          </td>
          <td>${u.email}</td>
          <td>${roleBadges}</td>
          <td>
            <label class="toggle-switch" title="${estadoTitle}">
              <input type="checkbox" class="toggle-input" ${u.activo ? "checked" : ""}
                     onchange="personalManager.toggleEstado(${u.id}, this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-view" onclick="personalManager.showDetalle(${u.id})" title="Ver más">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn-action btn-edit" onclick="personalManager.editUsuario(${u.id})" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-action btn-face" onclick="personalManager.openFaceModal('${u.username}')" title="Registrar Rostro">
                <i class="fas fa-camera"></i>
              </button>
              <button class="btn-action btn-delete" onclick="personalManager.confirmDelete(${u.id}, '${u.username}')" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    this.renderPagination();
  }

  renderPagination() {
    const total = this.filteredUsuarios.length;
    const totalPages = Math.ceil(total / this.itemsPerPage);
    const bar = document.getElementById("paginationBar");

    if (totalPages <= 1) {
      bar.classList.add("hidden");
      return;
    }

    bar.classList.remove("hidden");

    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, total);
    document.getElementById("paginationInfo").textContent = `${start}–${end} de ${total} empleados`;
    document.getElementById("btnPrevPage").disabled = this.currentPage === 1;
    document.getElementById("btnNextPage").disabled = this.currentPage === totalPages;

    // Construir lista de páginas con ellipsis
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    document.getElementById("pageNumbers").innerHTML = pages.map((p) => {
      if (p === "...") return `<span class="page-ellipsis">…</span>`;
      if (p === this.currentPage) return `<span class="page-num active">${p}</span>`;
      return `<button class="page-num" onclick="personalManager.goToPage(${p})">${p}</button>`;
    }).join("");
  }

  goToPage(page) {
    const totalPages = Math.ceil(this.filteredUsuarios.length / this.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    this.currentPage = page;
    this.renderPage();
  }

  getInitials(nombre, apellidos) {
    const n = nombre ? nombre.charAt(0).toUpperCase() : "";
    const a = apellidos ? apellidos.charAt(0).toUpperCase() : "";
    return n + a;
  }

  getAvatarColorClass(rol) {
    if (!rol) return "avatar-default";
    const map = { ADMIN: "avatar-admin", VENDEDOR: "avatar-vendedor", ALMACEN: "avatar-almacen" };
    return map[rol.toUpperCase()] || "avatar-default";
  }

  getRoleBadge(rol) {
    const map = {
      ADMIN:    { cls: "badge-role-admin",    label: "Admin" },
      VENDEDOR: { cls: "badge-role-vendedor", label: "Vendedor" },
      ALMACEN:  { cls: "badge-role-almacen",  label: "Almacén" },
    };
    const cfg = map[rol.toUpperCase()] || { cls: "badge-role-default", label: rol };
    return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
  }

  async toggleEstado(id, nuevoEstado) {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (!usuario) return;

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usuario.username,
          email: usuario.email,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          telefono: usuario.telefono,
          activo: nuevoEstado,
          roles: usuario.roles,
        }),
      });
      const result = await response.json();
      if (result.success) {
        usuario.activo = nuevoEstado;
        this.showToast(
          "success",
          "Estado actualizado",
          nuevoEstado ? "Usuario activado correctamente" : "Usuario desactivado correctamente"
        );
      } else {
        this.renderPage();
        this.showToast("error", "Error", result.message || "No se pudo cambiar el estado");
      }
    } catch (error) {
      console.error("Error toggle estado:", error);
      this.renderPage();
      this.showToast("error", "Error", "No se pudo cambiar el estado");
    }
  }

  showDetalle(id) {
    const u = this.usuarios.find((usr) => usr.id === id);
    if (!u) return;

    const initials = this.getInitials(u.nombre, u.apellidos);
    const avatarClass = this.getAvatarColorClass(u.roles[0]);

    let biometricoTexto, biometricoIcon, biometricoColor;
    if (u.fotosRegistradas >= 3) {
      biometricoTexto = "Registrado (3/3)";
      biometricoIcon = "fa-check-circle";
      biometricoColor = "#10b981";
    } else if (u.fotosRegistradas > 0) {
      biometricoTexto = `Parcial (${u.fotosRegistradas}/3)`;
      biometricoIcon = "fa-clock";
      biometricoColor = "#f59e0b";
    } else {
      biometricoTexto = "Sin registro";
      biometricoIcon = "fa-times-circle";
      biometricoColor = "#ef4444";
    }

    document.getElementById("detalleBody").innerHTML = `
      <div class="detalle-header">
        <div class="employee-avatar detalle-avatar ${avatarClass}">${initials}</div>
        <div>
          <h4 class="detalle-nombre">${u.nombre} ${u.apellidos}</h4>
          <p class="detalle-username">@${u.username}</p>
        </div>
      </div>
      <div class="detalle-info">
        <div class="detalle-item">
          <i class="fas fa-envelope"></i>
          <div>
            <label>Email</label>
            <span>${u.email}</span>
          </div>
        </div>
        <div class="detalle-item">
          <i class="fas fa-phone"></i>
          <div>
            <label>Teléfono</label>
            <span>${u.telefono || "No registrado"}</span>
          </div>
        </div>
        <div class="detalle-item">
          <i class="fas fa-id-badge"></i>
          <div>
            <label>Rol(es)</label>
            <span>${u.roles.map((r) => this.getRoleBadge(r)).join(" ")}</span>
          </div>
        </div>
        <div class="detalle-item">
          <i class="fas fa-camera" style="color: ${biometricoColor}"></i>
          <div>
            <label>Biométrico</label>
            <span>
              <i class="fas ${biometricoIcon}" style="color: ${biometricoColor}; margin-right: 4px;"></i>
              ${biometricoTexto}
            </span>
          </div>
        </div>
        <div class="detalle-item">
          <i class="fas fa-clock"></i>
          <div>
            <label>Último acceso</label>
            <span>${u.ultimoAcceso ? this.formatDate(u.ultimoAcceso) : "Nunca"}</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modalDetalle").classList.add("active");
  }

  filterUsuarios() {
    const searchTerm = document
      .getElementById("searchInput")
      .value.toLowerCase();
    const filterRol = document.getElementById("filterRol").value;
    const filterEstado = document.getElementById("filterEstado").value;

    let filtered = this.usuarios.filter((usuario) => {
      const matchSearch =
        usuario.nombre.toLowerCase().includes(searchTerm) ||
        usuario.apellidos.toLowerCase().includes(searchTerm) ||
        usuario.username.toLowerCase().includes(searchTerm) ||
        usuario.email.toLowerCase().includes(searchTerm);

      const matchRol = !filterRol || usuario.roles.includes(filterRol);
      const matchEstado =
        !filterEstado || usuario.activo.toString() === filterEstado;

      return matchSearch && matchRol && matchEstado;
    });

    this.renderUsuarios(filtered);
  }

  openCreateModal() {
    this.isEditing = false;
    this.editingUserId = null;

    document.getElementById("modalTitle").textContent = "Nuevo Empleado";
    document.getElementById("formUsuario").reset();
    document.getElementById("userId").value = "";
    document.getElementById("username").disabled = false;
    document.getElementById("username").readOnly = false;
    document.getElementById("passwordLabel").textContent = "*";

    // Limpiar estado del username
    const usernameStatus = document.getElementById("usernameStatus");
    usernameStatus.textContent = "";
    usernameStatus.className = "username-status";

    // Desmarcar todos los roles
    document.querySelectorAll('input[name="roles"]').forEach((cb) => {
      cb.checked = false;
    });

    this.clearAllErrors();
    document.getElementById("modalUsuario").classList.add("active");
  }
  
  /**
   * Genera username automáticamente basado en nombre y apellidos
   * Formato: primeraLetraNombre + apellido (ej: jperez)
   */
  async generateUsername() {
    const nombre = document.getElementById("nombre").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    
    if (!nombre || !apellidos) {
      document.getElementById("username").value = "";
      document.getElementById("usernameStatus").textContent = "";
      return;
    }
    
    // Generar username base: primera letra del nombre + primer apellido
    const nombreParts = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const apellidoParts = apellidos.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(" ");
    
    const primeraLetra = nombreParts.charAt(0);
    const primerApellido = apellidoParts[0];
    
    let baseUsername = primeraLetra + primerApellido;
    baseUsername = baseUsername.replace(/[^a-z0-9]/g, ""); // Remover caracteres especiales
    
    // Verificar disponibilidad y agregar número si es necesario
    let username = baseUsername;
    let counter = 1;
    let isAvailable = false;
    
    while (!isAvailable && counter < 100) {
      const available = await this.checkUsernameAvailability(username);
      
      if (available) {
        isAvailable = true;
        document.getElementById("username").value = username;
        this.updateUsernameStatus(true, "Disponible ✓");
      } else {
        counter++;
        username = baseUsername + counter;
      }
    }
    
    if (!isAvailable) {
      document.getElementById("username").value = baseUsername + Math.floor(Math.random() * 1000);
      this.updateUsernameStatus(false, "Username generado con número aleatorio");
    }
  }
  
  /**
   * Verifica si un username está disponible
   */
  async checkUsernameAvailability(username) {
    try {
      const response = await fetch(`/api/usuarios/check-username/${encodeURIComponent(username)}`);
      const data = await response.json();
      
      if (data.success) {
        return data.available;
      }
      return false;
    } catch (error) {
      console.error("Error verificando username:", error);
      return false;
    }
  }
  
  /**
   * Valida manualmente el username cuando el usuario lo edita
   */
  async validateUsernameManually() {
    const username = document.getElementById("username").value.trim();
    
    if (!username) {
      document.getElementById("usernameStatus").textContent = "";
      document.getElementById("usernameStatus").className = "username-status";
      return;
    }
    
    const available = await this.checkUsernameAvailability(username);
    
    if (available) {
      this.updateUsernameStatus(true, "Disponible ✓");
    } else {
      this.updateUsernameStatus(false, "No disponible ✗");
    }
  }
  
  /**
   * Actualiza el indicador visual del estado del username
   */
  updateUsernameStatus(available, message) {
    const statusElement = document.getElementById("usernameStatus");
    statusElement.textContent = message;
    
    if (available) {
      statusElement.className = "username-status available";
    } else {
      statusElement.className = "username-status taken";
    }
  }

  async editUsuario(id) {
    try {
      const response = await fetch(`/api/usuarios/${id}`);
      const data = await response.json();

      if (data.success) {
        const usuario = data.usuario;

        this.isEditing = true;
        this.editingUserId = id;

        document.getElementById("modalTitle").textContent = "Editar Empleado";
        document.getElementById("userId").value = usuario.id;
        document.getElementById("username").value = usuario.username;
        document.getElementById("username").disabled = true;
        document.getElementById("email").value = usuario.email;
        document.getElementById("nombre").value = usuario.nombre;
        document.getElementById("apellidos").value = usuario.apellidos;
        document.getElementById("telefono").value = usuario.telefono || "";
        document.getElementById("password").value = "";
        document.getElementById("password").required = false;
        document.getElementById("passwordLabel").textContent =
          "(dejar vacío para mantener)";
        // Marcar roles
        document.querySelectorAll('input[name="roles"]').forEach((cb) => {
          cb.checked = usuario.roles.includes(cb.value);
        });

        this.clearAllErrors();
        document.getElementById("modalUsuario").classList.add("active");
      }
    } catch (error) {
      console.error("Error cargando usuario:", error);
      this.showToast("error", "Error", "No se pudo cargar el usuario");
    }
  }

  async saveUsuario() {
    if (!this.validateForm()) return;

    try {
      const formData = {
        username: document.getElementById("username").value.trim(),
        email: document.getElementById("email").value.trim(),
        nombre: document.getElementById("nombre").value.trim(),
        apellidos: document.getElementById("apellidos").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        activo: this.isEditing
          ? (this.usuarios.find((u) => u.id === this.editingUserId)?.activo ?? true)
          : true,
        roles: Array.from(
          document.querySelectorAll('input[name="roles"]:checked')
        ).map((cb) => cb.value),
      };

      const password = document.getElementById("password").value;
      if (password) {
        formData.password = password;
      }

      const url = this.isEditing
        ? `/api/usuarios/${this.editingUserId}`
        : "/api/usuarios";
      const method = this.isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        this.showToast("success", "Éxito", data.message);
        closeModal("modalUsuario");
        await this.loadUsuarios();
      } else {
        this.showToast("error", "Error", data.message);
      }
    } catch (error) {
      console.error("Error guardando usuario:", error);
      this.showToast("error", "Error", "No se pudo guardar el usuario");
    }
  }

  confirmDelete(id, username) {
    this.deletingUserId = id;
    document.getElementById("deleteUsername").textContent = username;
    document.getElementById("modalConfirmar").classList.add("active");

    document.getElementById("btnConfirmarEliminar").onclick = () => {
      this.deleteUsuario(id);
    };
  }

  async deleteUsuario(id) {
    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        this.showToast("success", "Éxito", data.message);
        closeModal("modalConfirmar");
        await this.loadUsuarios();
      } else {
        this.showToast("error", "Error", data.message);
      }
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      this.showToast("error", "Error", "No se pudo eliminar el usuario");
    }
  }

  /**
   * Muestra el modal estilizado de confirmación para re-registrar rostro.
   * Devuelve una Promise<boolean>: true si el usuario confirmó, false si canceló.
   */
  mostrarConfirmRostro(username, fotosRegistradas) {
    return new Promise((resolve) => {
      const modal = document.getElementById("modalConfirmarRostro");
      document.getElementById("reRegisterMessage").textContent =
        `${username} ya tiene ${fotosRegistradas} foto(s) registrada(s).`;

      const btnConfirmar = document.getElementById("btnConfirmarReRegistrar");
      const btnCancelar  = document.getElementById("btnCancelarReRegistrar");
      const btnCerrar    = document.getElementById("btnCerrarConfirmarRostro");

      // Clonar botones para eliminar listeners anteriores
      const nuevoConfirmar = btnConfirmar.cloneNode(true);
      const nuevoCancelar  = btnCancelar.cloneNode(true);
      const nuevoCerrar    = btnCerrar.cloneNode(true);
      btnConfirmar.replaceWith(nuevoConfirmar);
      btnCancelar.replaceWith(nuevoCancelar);
      btnCerrar.replaceWith(nuevoCerrar);

      const cerrar = (valor) => {
        modal.classList.remove("active");
        resolve(valor);
      };

      nuevoConfirmar.addEventListener("click", () => cerrar(true));
      nuevoCancelar.addEventListener("click",  () => cerrar(false));
      nuevoCerrar.addEventListener("click",    () => cerrar(false));

      modal.classList.add("active");
    });
  }

  async openFaceModal(username) {
    this.currentUsername = username;
    this.captureCount = 0;

    // ── 1. Verificar si ya tiene fotos registradas ─────────────────────────
    try {
      const statusResp = await fetch(
        `/api/facial-recognition/status/${encodeURIComponent(username)}`
      );
      const statusData = await statusResp.json();

      if (statusData.success && statusData.fotos_registradas > 0) {
        // Mostrar modal estilizado en lugar del confirm() nativo
        const confirmar = await this.mostrarConfirmRostro(
          username,
          statusData.fotos_registradas
        );

        if (!confirmar) return; // El usuario canceló — no abrir el modal

        // Borrar encodings existentes antes de volver a registrar
        const deleteResp = await fetch(
          `/api/facial-recognition/encodings/${encodeURIComponent(username)}`,
          { method: "DELETE" }
        );
        const deleteData = await deleteResp.json();
        if (!deleteData.success) {
          this.showToast("error", "Error", "No se pudo eliminar el registro anterior");
          return;
        }
      }
    } catch (error) {
      console.warn("No se pudo verificar estado del rostro:", error);
      // Continuar de todos modos si el servicio Python no está disponible
    }

    // ── 2. Abrir modal y cámara ────────────────────────────────────────────
    document.getElementById("faceUsername").textContent = username;
    document.getElementById("modalRostro").classList.add("active");

    // Resetear estado visual del modal
    document.querySelectorAll(".dot").forEach(d => d.className = "dot");
    document.getElementById("captureStatus").textContent = "";
    const btn = document.getElementById("btnStartCapture");
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-camera"></i> Iniciar Captura';
    btn.onclick = null; // restaurar al listener original del setupEventListeners

    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      document.getElementById("videoElement").srcObject = this.currentStream;
    } catch (error) {
      console.error("Error accediendo a cámara:", error);
      this.showToast("error", "Error", "No se pudo acceder a la cámara");
      closeModal("modalRostro");
    }
  }

  async startFaceCapture() {
    const TOTAL_FOTOS       = 3;  // debe coincidir con MAX_FOTOS en app.py
    const MAX_REINTENTOS    = 3;  // intentos por cada foto antes de rendirse

    const btn  = document.getElementById("btnStartCapture");
    const dots = document.querySelectorAll(".dot");

    // Resetear estado visual
    dots.forEach(d => d.className = "dot");
    this.captureCount = 0;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Capturando...';

    for (let i = 0; i < TOTAL_FOTOS; i++) {
      let capturado = false;
      let intentos  = 0;

      this.updateCaptureStatus(`Foto ${i + 1} de ${TOTAL_FOTOS}... Mantén el rostro centrado`);

      while (!capturado && intentos < MAX_REINTENTOS) {
        // Pausa entre capturas (un poco más larga en reintentos para que el usuario se recoloque)
        await this.sleep(intentos === 0 ? 1200 : 2000);

        const exito = await this.captureFace();

        if (exito) {
          dots[i].classList.add("active");
          this.captureCount++;
          capturado = true;
        } else {
          intentos++;
          if (intentos < MAX_REINTENTOS) {
            dots[i].classList.add("retrying");
            this.updateCaptureStatus(
              `Foto ${i + 1}: no se detectó bien — reintentando (${intentos}/${MAX_REINTENTOS})...`
            );
          } else {
            // Agotamos los reintentos para esta foto — parar sin perder las anteriores
            dots[i].classList.add("error");
            this.updateCaptureStatus("");
            this.showToast(
              "error",
              `Foto ${i + 1} fallida`,
              "No se pudo capturar. Mejora la iluminación y presiona 'Reintentar'."
            );
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Reintentar';
            // El botón retomará desde la foto i (ya no desde la 1)
            btn.onclick = () => this.reanudarCaptura(i, TOTAL_FOTOS, MAX_REINTENTOS);
            return;
          }
        }
      }
    }

    // Todas las fotos OK
    this.updateCaptureStatus("Registro completado");
    btn.innerHTML = '<i class="fas fa-check"></i> Completado';
    this.showToast("success", "Listo", "Rostro registrado exitosamente");
    setTimeout(() => closeModal("modalRostro"), 1500);
  }

  /**
   * Reanuda la captura desde la foto `desdeIndex` sin resetear las ya capturadas.
   */
  async reanudarCaptura(desdeIndex, totalFotos, maxReintentos) {
    const btn  = document.getElementById("btnStartCapture");
    const dots = document.querySelectorAll(".dot");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Capturando...';
    // Limpiar estado de error del dot que vamos a reintentar
    dots[desdeIndex].className = "dot";

    for (let i = desdeIndex; i < totalFotos; i++) {
      let capturado = false;
      let intentos  = 0;

      this.updateCaptureStatus(`Foto ${i + 1} de ${totalFotos}... Mantén el rostro centrado`);

      while (!capturado && intentos < maxReintentos) {
        await this.sleep(intentos === 0 ? 1200 : 2000);

        const exito = await this.captureFace();

        if (exito) {
          dots[i].classList.remove("retrying", "error");
          dots[i].classList.add("active");
          this.captureCount++;
          capturado = true;
        } else {
          intentos++;
          if (intentos < maxReintentos) {
            dots[i].classList.add("retrying");
            this.updateCaptureStatus(
              `Foto ${i + 1}: reintentando (${intentos}/${maxReintentos})...`
            );
          } else {
            dots[i].classList.add("error");
            this.updateCaptureStatus("");
            this.showToast(
              "error",
              `Foto ${i + 1} fallida`,
              "No se pudo capturar. Mejora la iluminación y presiona 'Reintentar'."
            );
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-redo"></i> Reintentar';
            btn.onclick = () => this.reanudarCaptura(i, totalFotos, maxReintentos);
            return;
          }
        }
      }
    }

    this.updateCaptureStatus("Registro completado");
    btn.innerHTML = '<i class="fas fa-check"></i> Completado';
    this.showToast("success", "Listo", "Rostro registrado exitosamente");
    setTimeout(() => closeModal("modalRostro"), 1500);
  }

  /**
   * Captura un frame de la cámara y lo envía al backend Python vía el proxy Java.
   * Devuelve true si el rostro fue aceptado, false si no (sin lanzar excepción).
   */
  async captureFace() {
    const video   = document.getElementById("videoElement");
    const canvas  = document.getElementById("canvasElement");
    const context = canvas.getContext("2d");

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );

    try {
      document.getElementById("processingIndicator").classList.add("active");

      const formData = new FormData();
      formData.append("username", this.currentUsername);
      formData.append("image", blob, "face.jpg");

      const response = await fetch("/api/facial-recognition/register", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        console.warn("Captura rechazada:", data.message);
        return false;
      }

      console.log(`Foto registrada: ${data.fotos_registradas}/${data.fotos_requeridas}`);
      return true;

    } catch (error) {
      console.error("Error en captureFace:", error);
      return false;
    } finally {
      document.getElementById("processingIndicator").classList.remove("active");
    }
  }

  /** Actualiza el texto de estado debajo de los dots */
  updateCaptureStatus(message) {
    const el = document.getElementById("captureStatus");
    if (el) el.textContent = message;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  showLoading(show) {
    const spinner = document.getElementById("loadingSpinner");
    if (show) {
      spinner.classList.add("active");
    } else {
      spinner.classList.remove("active");
    }
  }

  showToast(type, title, message) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };

    toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${iconMap[type]}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
}

// Funciones globales
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove("active");

  // Detener stream si es modal de rostro
  if (modalId === "modalRostro" && personalManager.currentStream) {
    personalManager.currentStream.getTracks().forEach((track) => track.stop());
    personalManager.currentStream = null;
  }
}

function togglePassword() {
  const passwordInput = document.getElementById("password");
  const icon = event.target.closest("button").querySelector("i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

// Inicializar
let personalManager;
document.addEventListener("DOMContentLoaded", () => {
  personalManager = new PersonalManager();
});
