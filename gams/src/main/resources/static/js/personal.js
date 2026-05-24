/**
 * GAMS S.A.C - Gestión de Personal
 */

class PersonalManager {
  constructor() {
    this.usuarios = [];
    this.roles = [];
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
    document.getElementById("searchInput").addEventListener("input", (e) => {
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
      if (!this.isEditing) {
        this.generateUsername();
      }
    });
    
    document.getElementById("apellidos").addEventListener("input", () => {
      if (!this.isEditing) {
        this.generateUsername();
      }
    });
    
    // Validación manual del username cuando el usuario lo edita
    document.getElementById("username").addEventListener("input", () => {
      if (!this.isEditing) {
        clearTimeout(this.usernameValidationTimeout);
        this.usernameValidationTimeout = setTimeout(() => {
          this.validateUsernameManually();
        }, 500); // Esperar 500ms después de que el usuario deje de escribir
      }
    });
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
    const tbody = document.getElementById("usersTableBody");

    if (usuarios.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center">No hay usuarios registrados</td>
                </tr>
            `;
      return;
    }

    tbody.innerHTML = usuarios
      .map(
        (usuario) => `
            <tr>
                <td>${usuario.id}</td>
                <td><strong>${usuario.username}</strong></td>
                <td>${usuario.nombre} ${usuario.apellidos}</td>
                <td>${usuario.email}</td>
                <td>${usuario.telefono || "-"}</td>
                <td>
                    ${usuario.roles
                      .map(
                        (rol) =>
                          `<span class="badge badge-primary">${rol}</span>`
                      )
                      .join(" ")}
                </td>
                <td>
                    ${usuario.fotosRegistradas >= 3
                        ? `<span class="badge badge-success"><i class="fas fa-check"></i> Registrado</span>`
                        : usuario.fotosRegistradas > 0
                            ? `<span class="badge badge-warning"><i class="fas fa-clock"></i> Parcial (${usuario.fotosRegistradas}/3)</span>`
                            : `<span class="badge badge-error"><i class="fas fa-times"></i> Sin registro</span>`
                    }
                </td>
                <td>
                    <div class="status-badge">
                        <span class="status-dot ${
                          usuario.activo ? "status-active" : "status-inactive"
                        }"></span>
                        ${usuario.activo ? "Activo" : "Inactivo"}
                    </div>
                </td>
                <td>${
                  usuario.ultimoAcceso
                    ? this.formatDate(usuario.ultimoAcceso)
                    : "Nunca"
                }</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="personalManager.editUsuario(${
                          usuario.id
                        })" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-face" onclick="personalManager.openFaceModal('${
                          usuario.username
                        }')" title="Registrar Rostro">
                            <i class="fas fa-camera"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="personalManager.confirmDelete(${
                          usuario.id
                        }, '${usuario.username}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `
      )
      .join("");
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
    document.getElementById("password").required = true;
    document.getElementById("passwordLabel").textContent = "*";
    
    // Limpiar estado del username
    const usernameStatus = document.getElementById("usernameStatus");
    usernameStatus.textContent = "";
    usernameStatus.className = "username-status";

    // Desmarcar todos los roles
    document.querySelectorAll('input[name="roles"]').forEach((cb) => {
      cb.checked = false;
    });

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
        document.getElementById("activo").checked = usuario.activo;

        // Marcar roles
        document.querySelectorAll('input[name="roles"]').forEach((cb) => {
          cb.checked = usuario.roles.includes(cb.value);
        });

        document.getElementById("modalUsuario").classList.add("active");
      }
    } catch (error) {
      console.error("Error cargando usuario:", error);
      this.showToast("error", "Error", "No se pudo cargar el usuario");
    }
  }

  async saveUsuario() {
    try {
      const formData = {
        username: document.getElementById("username").value,
        email: document.getElementById("email").value,
        nombre: document.getElementById("nombre").value,
        apellidos: document.getElementById("apellidos").value,
        telefono: document.getElementById("telefono").value,
        activo: document.getElementById("activo").checked,
        roles: Array.from(
          document.querySelectorAll('input[name="roles"]:checked')
        ).map((cb) => cb.value),
      };

      const password = document.getElementById("password").value;
      if (password) {
        formData.password = password;
      }

      // Validar que tenga al menos un rol
      if (formData.roles.length === 0) {
        this.showToast(
          "warning",
          "Advertencia",
          "Debe seleccionar al menos un rol"
        );
        return;
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
