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
                    <span class="badge badge-success">
                        <i class="fas fa-check"></i> Registrado
                    </span>
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
    document.getElementById("password").required = true;
    document.getElementById("passwordLabel").textContent = "*";

    // Desmarcar todos los roles
    document.querySelectorAll('input[name="roles"]').forEach((cb) => {
      cb.checked = false;
    });

    document.getElementById("modalUsuario").classList.add("active");
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

  async openFaceModal(username) {
    this.currentUsername = username;
    this.captureCount = 0;

    document.getElementById("faceUsername").textContent = username;
    document.getElementById("modalRostro").classList.add("active");

    // Resetear dots
    document.querySelectorAll(".dot").forEach((dot) => {
      dot.classList.remove("active");
    });

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
    this.captureCount = 0;
    const dots = document.querySelectorAll(".dot");

    for (let i = 0; i < 5; i++) {
      await this.sleep(1000);
      await this.captureFace();
      dots[i].classList.add("active");
      this.captureCount++;
    }

    this.showToast("success", "Completado", "Rostro registrado exitosamente");
    closeModal("modalRostro");
  }

  async captureFace() {
    const video = document.getElementById("videoElement");
    const canvas = document.getElementById("canvasElement");
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Obtener blob de la imagen
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );

    try {
      document.getElementById("processingIndicator").classList.add("active");

      console.log("Registrando rostro para:", this.currentUsername);
      console.log("Tamaño imagen:", blob.size, "bytes");

      // Crear FormData correctamente
      const formData = new FormData();
      formData.append("username", this.currentUsername);
      formData.append("image", blob, "face.jpg");

      // IMPORTANTE: No enviar Content-Type header, FormData lo maneja automáticamente
      const response = await fetch("/api/facial-recognition/register", {
        method: "POST",
        body: formData,
        // NO pongas headers aquí, FormData necesita su propio boundary
      });

      console.log("Status:", response.status);
      const data = await response.json();
      console.log("Respuesta:", data);

      if (!data.success) {
        throw new Error(data.message);
      }

      console.log("✓ Rostro registrado correctamente");
    } catch (error) {
      console.error("Error completo:", error);
      this.showToast(
        "error",
        "Error",
        error.message || "Error al procesar el rostro"
      );
      throw error;
    } finally {
      document.getElementById("processingIndicator").classList.remove("active");
    }
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
