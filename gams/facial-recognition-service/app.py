from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import os
import base64
from PIL import Image
import io
import pickle
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configuración
ENCODINGS_PATH = "face_encodings/encodings.pkl"
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Crear carpeta si no existe
os.makedirs("face_encodings", exist_ok=True)

def load_encodings():
    """Cargar encodings guardados"""
    if os.path.exists(ENCODINGS_PATH):
        with open(ENCODINGS_PATH, 'rb') as f:
            return pickle.load(f)
    return {}

def save_encodings(encodings):
    """Guardar encodings"""
    with open(ENCODINGS_PATH, 'wb') as f:
        pickle.dump(encodings, f)

def decode_image(base64_string):
    """Decodificar imagen base64 a numpy array"""
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        return np.array(image)
    except Exception as e:
        print(f"Error decodificando imagen: {e}")
        return None

def basic_liveness_check(image):
    """
    Liveness detection básico
    Verifica que haya un rostro claro y de buena calidad
    """
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    
    # Verificar nitidez
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Verificar brillo
    brightness = np.mean(gray)
    
    # Verificar contraste
    contrast = gray.std()
    
    # Convertir a bool nativo de Python
    is_live = bool(
        laplacian_var > 100 and
        brightness > 40 and brightness < 220 and
        contrast > 30
    )
    
    return is_live, {
        "sharpness": float(laplacian_var),
        "brightness": float(brightness),
        "contrast": float(contrast),
        "is_live": is_live
    }

def extract_face_features(face_roi):
    """
    Extrae características mejoradas del rostro usando HOG
    HOG es más robusto que histograma simple
    """
    try:
        # Normalizar tamaño
        resized = cv2.resize(face_roi, (128, 128))
        gray_face = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
        
        # Configurar HOG descriptor
        win_size = (128, 128)
        block_size = (16, 16)
        block_stride = (8, 8)
        cell_size = (8, 8)
        nbins = 9
        
        hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
        
        # Calcular características HOG
        hog_features = hog.compute(gray_face)
        
        if hog_features is not None:
            return hog_features.flatten()
        else:
            # Fallback: usar histograma simple
            hist = cv2.calcHist([gray_face], [0], None, [256], [0, 256])
            return cv2.normalize(hist, hist).flatten()
            
    except Exception as e:
        print(f"Error extrayendo características HOG: {e}")
        # Fallback: histograma simple
        gray_face = cv2.cvtColor(cv2.resize(face_roi, (100, 100)), cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray_face], [0], None, [256], [0, 256])
        return cv2.normalize(hist, hist).flatten()

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de salud"""
    return jsonify({
        "status": "ok",
        "service": "Face Recognition Service (OpenCV + HOG)",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/register', methods=['POST'])
def register_face():
    """
    Registrar un nuevo rostro
    Body: {"username": "admin", "image": "base64_encoded_image"}
    """
    try:
        data = request.get_json()
        username = data.get('username')
        image_base64 = data.get('image')
        
        if not username or not image_base64:
            return jsonify({
                "success": False,
                "message": "Username e imagen son requeridos"
            }), 400
        
        # Decodificar imagen
        image = decode_image(image_base64)
        if image is None:
            return jsonify({
                "success": False,
                "message": "Error al decodificar la imagen"
            }), 400
        
        # Verificar liveness
        is_live, liveness_metrics = basic_liveness_check(image)
        if not is_live:
            return jsonify({
                "success": False,
                "message": "Imagen no válida. Use una foto en tiempo real con buena iluminación.",
                "metrics": liveness_metrics
            }), 400
        
        # Detectar rostros
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = FACE_CASCADE.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return jsonify({
                "success": False,
                "message": "No se detectó ningún rostro en la imagen"
            }), 400
        
        if len(faces) > 1:
            return jsonify({
                "success": False,
                "message": "Se detectaron múltiples rostros. Solo debe haber uno."
            }), 400
        
        # Extraer el rostro
        (x, y, w, h) = faces[0]
        face_roi = image[y:y+h, x:x+w]
        
        # Extraer características mejoradas (HOG)
        face_encoding = extract_face_features(face_roi)
        
        # Cargar encodings existentes
        all_encodings = load_encodings()
        
        # Si el usuario ya existe, agregar a su lista de encodings
        if username not in all_encodings:
            all_encodings[username] = []
        
        all_encodings[username].append(face_encoding.tolist())
        
        # Limitar a máximo 5 encodings por usuario
        if len(all_encodings[username]) > 5:
            all_encodings[username] = all_encodings[username][-5:]
        
        save_encodings(all_encodings)
        
        print(f"✓ Registrado encoding {len(all_encodings[username])} para {username}")
        
        return jsonify({
            "success": True,
            "message": f"Rostro de {username} registrado exitosamente ({len(all_encodings[username])}/5)",
            "username": username,
            "encodings_count": len(all_encodings[username]),
            "liveness_metrics": liveness_metrics
        })
        
    except Exception as e:
        print(f"Error en register_face: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error interno: {str(e)}"
        }), 500

@app.route('/recognize', methods=['POST'])
def recognize_face():
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({
                "success": False,
                "message": "Imagen es requerida"
            }), 400
        
        # Decodificar imagen
        image = decode_image(image_base64)
        if image is None:
            return jsonify({
                "success": False,
                "message": "Error al decodificar la imagen"
            }), 400
        
        # Verificar liveness
        is_live, liveness_metrics = basic_liveness_check(image)
        if not is_live:
            return jsonify({
                "success": False,
                "message": "Detección de vida fallida. Use una foto en tiempo real.",
                "metrics": liveness_metrics
            }), 400
        
        # Detectar rostros
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = FACE_CASCADE.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return jsonify({
                "success": False,
                "message": "No se detectó ningún rostro"
            }), 400
        
        if len(faces) > 1:
            return jsonify({
                "success": False,
                "message": "Se detectaron múltiples rostros. Solo debe haber una persona."
            }), 400
        
        # Extraer el rostro
        (x, y, w, h) = faces[0]
        face_roi = image[y:y+h, x:x+w]
        
        # Extraer características
        unknown_encoding = extract_face_features(face_roi)
        
        # Cargar encodings registrados
        known_encodings = load_encodings()
        
        if not known_encodings:
            return jsonify({
                "success": False,
                "message": "No hay rostros registrados en el sistema"
            }), 400
        
        # Comparar con todos los rostros conocidos
        best_match = None
        best_distance = float('inf')
        
        print(f"\n=== RECONOCIMIENTO FACIAL (HOG) ===")
        
        for username, encoding_list in known_encodings.items():
            # Calcular distancia euclidiana con cada encoding del usuario
            distances = []
            for known_encoding in encoding_list:
                distance = np.linalg.norm(unknown_encoding - np.array(known_encoding))
                distances.append(distance)
            
            # Tomar la distancia mínima (mejor match)
            min_distance = min(distances)
            avg_distance = np.mean(distances)
            
            print(f"Usuario: {username}, Dist Min: {min_distance:.2f}, Dist Prom: {avg_distance:.2f}")
            
            if min_distance < best_distance:
                best_distance = min_distance
                best_match = username
        
        # Umbral más estricto (menor distancia = mayor similitud)
        # Con HOG, distancias típicas: mismo usuario ~50-150, diferentes ~200-500
        DISTANCE_THRESHOLD = 180
        
        print(f"Mejor match: {best_match}, Distancia: {best_distance:.2f}, Umbral: {DISTANCE_THRESHOLD}")
        
        if best_distance < DISTANCE_THRESHOLD:
            # Convertir distancia a confianza (inversa)
            confidence = max(0, 100 - (best_distance / 5))
            print(f"✓ ACCESO CONCEDIDO para {best_match}")
            return jsonify({
                "success": True,
                "message": "Rostro reconocido",
                "username": best_match,
                "confidence": round(confidence, 2),
                "distance": round(best_distance, 2),
                "liveness_metrics": liveness_metrics
            })
        else:
            print(f"✗ ACCESO DENEGADO - Distancia muy alta")
            return jsonify({
                "success": False,
                "message": "Rostro no reconocido. No hay suficiente similitud.",
                "best_match": best_match,
                "distance": round(best_distance, 2),
                "threshold": DISTANCE_THRESHOLD
            })
        
    except Exception as e:
        print(f"Error en recognize_face: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error interno: {str(e)}"
        }), 500

@app.route('/list-users', methods=['GET'])
def list_users():
    """Listar usuarios registrados"""
    try:
        encodings = load_encodings()
        users_info = []
        for username, encoding_list in encodings.items():
            users_info.append({
                "username": username,
                "encodings_count": len(encoding_list)
            })
        return jsonify({
            "success": True,
            "users": users_info,
            "count": len(encodings)
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/delete-user/<username>', methods=['DELETE'])
def delete_user(username):
    """Eliminar usuario"""
    try:
        encodings = load_encodings()
        if username in encodings:
            del encodings[username]
            save_encodings(encodings)
            return jsonify({
                "success": True,
                "message": f"Usuario {username} eliminado"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Usuario no encontrado"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Iniciando Face Recognition Service...")
    print(f"📁 Encodings path: {ENCODINGS_PATH}")
    print("🎯 Usando OpenCV + HOG Descriptor")
    print("⚡ Algoritmo mejorado para mejor precisión")
    app.run(host='0.0.0.0', port=5000, debug=True)