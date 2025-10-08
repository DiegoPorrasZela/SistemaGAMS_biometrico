# 🔐 SistemaGAMS Biométrico

> Sistema de inventarios y ventas con autenticación facial para tiendas de ropa

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen?style=for-the-badge&logo=spring)
![Python](https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

## 📋 Descripción

Sistema integral de gestión que combina la automatización de inventarios y ventas con tecnología de reconocimiento facial para autenticación biométrica. Desarrollado para optimizar la operación de tiendas de ropa mediante una solución moderna y segura.

## ✨ Características

- 🎯 Gestión de inventarios en tiempo real
- 💰 Sistema de ventas integrado
- 👤 Login con reconocimiento facial
- 🔒 Autenticación biométrica segura
- 📊 Reportes y estadísticas

## 🛠️ Tecnologías

### ⚙️ Backend
- **☕Java 21** - JDK principal
- **🌱Spring Boot** - Framework de aplicación
- **🐍Python 3.11+** - Servicio de reconocimiento facial

### 🤖Librerías de IA
- **🧩OpenCV** - Procesamiento de imágenes
- **😎Face Recognition** - Detección y reconocimiento facial
- **🔢NumPy** - Procesamiento numérico
- **🌐Flask** - API del servicio biométrico

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- ✅ **Python 3.11.x** o superior (versiones estables)
- ✅ **JDK 21**
- ✅ **Visual Studio Code** con las siguientes extensiones:
  - Java Extension Pack (Microsoft)
  - Spring Boot Extension Pack
  - Python Extension Pack (Microsoft)
- ✅ Base de datos configurada e importada

## 🚀 Instalación

### 1️⃣ Clonar el repositorio

git clone https://github.com/tu-usuario/SistemaGAMS_biometrico.git
cd SistemaGAMS_biometrico

### 2️⃣ Configurar el servicio de reconocimiento facial

Navega a la carpeta del servicio Python:
cd gams/facial-recognition-service
Instala las dependencias:
pip install -r requirements.txt
Nota: Si encuentras problemas, instala manualmente:
pip install flask opencv-python numpy face-recognition

### 3️⃣ Configurar la base de datos

Importa el archivo SQL incluido en el repositorio
Configura las credenciales en application.properties

## ▶️ Ejecución

### Iniciar el backend (Spring Boot)
#### Abre el proyecto en VS Code
 - Ejecuta GamsApplication.java

### Iniciar el servicio de reconocimiento facial
cd gams/facial-recognition-service
python app.py

¡Listo! El sistema estará corriendo en:

🌐 Backend: http://localhost:8080
🤖 Servicio Facial: http://localhost:5000


## 📁 Estructura del Proyecto

<img width="451" height="746" alt="image" src="https://github.com/user-attachments/assets/3dd73823-c1c4-434f-a808-5f19190e862c" />



# 🤝 Contribuciones
Las contribuciones son bienvenidas. Este proyecto se comparte con la comunidad porque el conocimiento es para todos.


# 📝 Licencia
Este proyecto es de código abierto y está disponible para toda la comunidad.
# 👨‍💻 Autor
Porras Zela, Diego Arturo

GitHub: [@DiegoPorrasZela](https://github.com/DiegoPorrasZela)


⭐ Si este proyecto te fue útil, no olvides darle una estrella

💡 El conocimiento se comparte - Siéntete libre de usar y mejorar este código
