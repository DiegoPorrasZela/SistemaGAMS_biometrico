# 🏷️ SISTEMA DE CÓDIGOS DE BARRAS - GAMS

## 📋 ¿QUÉ ES UN CÓDIGO DE BARRAS?

Un código de barras es una representación visual de datos que puede ser leída por un escáner. En el sistema GAMS, cada **variante de producto** puede tener su propio código de barras único.

## 🎯 IMPLEMENTACIÓN EN GAMS

### **Formato Utilizado: EAN-13**
- **13 dígitos numéricos**
- **Estándar internacional** usado en retail
- **Estructura**: `775` + `9 dígitos únicos` + `1 dígito de control`

### **Ejemplo:**
```
7751234567890
└─┬─┘└───┬───┘└┘
  │      │     └─ Dígito de control (calculado automáticamente)
  │      └─────── 9 dígitos únicos (basados en ID + timestamp)
  └────────────── Prefijo de país (775 = Perú)
```

## 🚀 FUNCIONALIDADES IMPLEMENTADAS

### 1. **Generación Automática al Crear Variante** ⚡
- **¡NUEVO!** Al crear una variante, se genera automáticamente un código EAN-13
- Ya no es necesario editar la variante después de crearla
- El código se crea con el prefijo 775 (Perú) + 9 dígitos únicos + dígito de control
- Notificación toast muestra el código generado

### 2. **Generación Manual (Modo Edición)**
- Click en el botón **mágico** (🪄) junto a "Código de Barras"
- Genera un código EAN-13 válido automáticamente
- Incluye dígito de control calculado según estándar EAN-13
- Útil para regenerar códigos si es necesario

### 3. **Visualización Gráfica con Barras** 📊
- **¡NUEVO!** Los códigos se muestran como barras verticales escaneables
- Usa la librería JsBarcode para renderizado profesional
- Formato EAN-13 estándar compatible con cualquier escáner
- Muestra tanto las barras como el número debajo

### 4. **Impresión de Etiquetas** 🖨️
- **¡NUEVO!** Botón "Imprimir" en cada código de barras
- Genera etiqueta profesional con:
  - Nombre del producto
  - Color y Talla
  - Código de barras visual
  - SKU de referencia
- Abre ventana de impresión automáticamente
- Ideal para etiquetar productos físicos

### 5. **Entrada Manual**
- Puedes escribir tu propio código de barras en modo edición
- Máximo 13 dígitos
- Útil si ya tienes códigos de barras físicos

### 6. **Búsqueda por Código de Barras**
El backend ya tiene endpoints para buscar por código de barras:
- `GET /api/productos/variantes/barcode/{codigo}` - Buscar variante específica
- `GET /api/productos/variantes/buscar/{codigo}` - Buscar por SKU o código de barras
- Campo de búsqueda rápida en la interfaz principal

## 🔧 ALGORITMO DE DÍGITO DE CONTROL (EAN-13)

```javascript
// Ejemplo: Calcular dígito de control para 775123456789X
1. Sumar dígitos en posiciones impares multiplicados por 1
   7 + 5 + 2 + 4 + 6 + 8 = 32

2. Sumar dígitos en posiciones pares multiplicados por 3
   (7 + 1 + 3 + 5 + 7 + 9) × 3 = 96

3. Suma total: 32 + 96 = 128

4. Módulo 10: 128 % 10 = 8

5. Dígito de control: 10 - 8 = 2

Código completo: 7751234567892
```

## 📱 USO CON ESCÁNER DE CÓDIGOS DE BARRAS

### **Opción 1: Escáner USB/Bluetooth**
Los escáneres se comportan como teclados:
1. Conectar el escáner
2. Hacer click en el campo de búsqueda
3. Escanear el código de barras
4. El sistema buscará automáticamente la variante

### **Opción 2: Cámara del celular** (Futuro)
Podrías integrar una librería como:
- **QuaggaJS** - JavaScript barcode scanner
- **ZXing** - Multiplataforma
- **HTML5-QRCode** - Para QR y códigos de barras

## 🎨 CÓMO USAR EN EL SISTEMA

### **Para CREAR una variante con código de barras (AUTOMÁTICO):**
1. Gestionar Variantes de un producto
2. Click en "Agregar Variante"
3. Llenar talla, color, stock
4. Click en **"Guardar"**
5. **¡El código de barras se genera automáticamente!** ⚡
6. Recibirás una notificación con el código generado

### **Para VER el código de barras:**
1. Las variantes guardadas muestran el código como **barras visuales**
2. También se muestra el número debajo de las barras
3. Puedes hacer hover sobre el código para ver el botón de impresión

### **Para IMPRIMIR etiquetas:**
1. Busca la variante con código de barras
2. Pasa el mouse sobre el código de barras
3. Click en el botón **"Imprimir"** 🖨️
4. Se abrirá una ventana con la etiqueta lista para imprimir
5. La etiqueta incluye:
   - Nombre del producto
   - Color y Talla
   - Código de barras visual
   - SKU

### **Para REGENERAR un código de barras:**
1. Click en Editar (✏️) de una variante
2. Click en el botón mágico 🪄 junto a "Código de Barras"
3. Se generará un nuevo código
4. Guardar cambios

### **Para BUSCAR por código de barras:**
1. Usa el campo de búsqueda con icono 🏷️ en la pantalla principal
2. Escribe o escanea el código
3. Presiona Enter o completa 13 dígitos
4. El sistema mostrará la variante automáticamente

## 📊 VENTAJAS DE USAR CÓDIGOS DE BARRAS

✅ **Velocidad**: Escaneo instantáneo vs búsqueda manual  
✅ **Precisión**: Elimina errores de digitación  
✅ **Eficiencia**: Ideal para inventarios grandes  
✅ **Trazabilidad**: Cada variante tiene ID único  
✅ **Compatibilidad**: Funciona con cualquier escáner estándar  

## 🔄 PRÓXIMAS MEJORAS SUGERIDAS

1. ~~**Campo de búsqueda rápida por código de barras**~~ ✅ **IMPLEMENTADO**
2. ~~**Visualización gráfica del código de barras**~~ ✅ **IMPLEMENTADO**
3. ~~**Impresión de etiquetas con código de barras**~~ ✅ **IMPLEMENTADO**
4. ~~**Generación automática al crear variantes**~~ ✅ **IMPLEMENTADO**
5. **Impresión masiva de etiquetas** (múltiples variantes a la vez)
6. **Escaneo con cámara web/móvil** (usando QuaggaJS)
7. **Personalización de etiquetas** (tamaños, colores, logos)
8. **Exportar códigos a Excel/PDF**

## 💡 NOTAS TÉCNICAS

- Los códigos generados son únicos (usan timestamp + ID)
- El dígito de control asegura validez del código
- El prefijo 775 corresponde a Perú según el estándar GS1
- Para producción real, contactar GS1 Perú para obtener prefijos oficiales
- Los códigos se almacenan en la columna `codigo_barras` de la tabla `productos_variantes`

---

**¿Necesitas ayuda?** Consulta la documentación o contacta al administrador del sistema.
