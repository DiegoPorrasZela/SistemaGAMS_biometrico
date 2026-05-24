from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
import os
import base64
from PIL import Image
import io
import pickle
from datetime import datetime

app = Flask(__name__)
CORS(app)

ENCODINGS_PATH = "face_encodings/encodings.pkl"
MAX_FOTOS = 3          # fotos a capturar por usuario
THRESHOLD  = 0.50      # distancia maxima aceptada (0=perfecto, 1=muy diferente)

os.makedirs("face_encodings", exist_ok=True)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def load_encodings():
    if os.path.exists(ENCODINGS_PATH):
        with open(ENCODINGS_PATH, "rb") as f:
            return pickle.load(f)
    return {}


def save_encodings(encodings):
    with open(ENCODINGS_PATH, "wb") as f:
        pickle.dump(encodings, f)


def decode_image(base64_string):
    """Convierte base64 → numpy array RGB (formato que espera face_recognition)."""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        return np.array(image)
    except Exception as e:
        print(f"Error decodificando imagen: {e}")
        return None


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "Face Recognition Service — dlib + face_recognition",
        "max_fotos": MAX_FOTOS,
        "threshold": THRESHOLD,
        "timestamp": datetime.now().isoformat()
    })


@app.route("/register", methods=["POST"])
def register_face():
    """
    Registra una foto del rostro de un usuario.
    Body JSON: { "username": "...", "image": "<base64>" }
    Se deben llamar MAX_FOTOS veces para completar el registro.
    """
    try:
        data          = request.get_json()
        username      = data.get("username")
        image_base64  = data.get("image")

        if not username or not image_base64:
            return jsonify({"success": False, "message": "username e imagen son requeridos"}), 400

        image = decode_image(image_base64)
        if image is None:
            return jsonify({"success": False, "message": "Error al decodificar la imagen"}), 400

        # ── Detectar rostros ──────────────────────────────
        face_locations = face_recognition.face_locations(image, model="hog")

        if len(face_locations) == 0:
            return jsonify({
                "success": False,
                "message": "No se detectó ningún rostro. Asegúrate de estar bien iluminado y centrado."
            }), 400

        if len(face_locations) > 1:
            return jsonify({
                "success": False,
                "message": "Se detectaron varios rostros. Debe haber solo uno en cámara."
            }), 400

        # ── Obtener encoding (vector 128-d) ───────────────
        encodings_detected = face_recognition.face_encodings(image, face_locations)
        if not encodings_detected:
            return jsonify({"success": False, "message": "No se pudo extraer el encoding del rostro."}), 400

        face_encoding = encodings_detected[0]

        # ── Guardar ───────────────────────────────────────
        all_encodings = load_encodings()
        if username not in all_encodings:
            all_encodings[username] = []

        if len(all_encodings[username]) >= MAX_FOTOS:
            return jsonify({
                "success": False,
                "message": f"El usuario ya tiene {MAX_FOTOS} fotos registradas. Elimina y vuelve a registrar si deseas actualizarlas."
            }), 400

        all_encodings[username].append(face_encoding.tolist())
        save_encodings(all_encodings)

        count = len(all_encodings[username])
        print(f"[REGISTER] {username}: foto {count}/{MAX_FOTOS}")

        return jsonify({
            "success": True,
            "message": f"Foto {count}/{MAX_FOTOS} registrada para {username}",
            "username": username,
            "fotos_registradas": count,
            "fotos_requeridas": MAX_FOTOS,
            "registro_completo": count >= MAX_FOTOS
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500


@app.route("/recognize", methods=["POST"])
def recognize_face():
    """
    Reconoce el rostro en la imagen y devuelve el username si hay coincidencia.
    Body JSON: { "image": "<base64>" }
    """
    try:
        data         = request.get_json()
        image_base64 = data.get("image")

        if not image_base64:
            return jsonify({"success": False, "message": "Imagen requerida"}), 400

        image = decode_image(image_base64)
        if image is None:
            return jsonify({"success": False, "message": "Error al decodificar la imagen"}), 400

        # ── Detectar rostros ──────────────────────────────
        face_locations = face_recognition.face_locations(image, model="hog")

        if len(face_locations) == 0:
            return jsonify({
                "success": False,
                "message": "No se detectó ningún rostro. Asegúrate de estar bien iluminado y centrado."
            }), 400

        if len(face_locations) > 1:
            return jsonify({
                "success": False,
                "message": "Se detectaron varios rostros. Solo debe haber una persona en cámara."
            }), 400

        # ── Encoding del rostro capturado ─────────────────
        unknown_encodings = face_recognition.face_encodings(image, face_locations)
        if not unknown_encodings:
            return jsonify({"success": False, "message": "No se pudo extraer el encoding del rostro."}), 400

        unknown_encoding = unknown_encodings[0]

        # ── Comparar con usuarios registrados ─────────────
        known_encodings = load_encodings()
        if not known_encodings:
            return jsonify({"success": False, "message": "No hay rostros registrados en el sistema."}), 400

        best_match    = None
        best_distance = float("inf")

        for username, encoding_list in known_encodings.items():
            known_array = [np.array(enc) for enc in encoding_list]
            distances   = face_recognition.face_distance(known_array, unknown_encoding)
            min_dist    = float(np.min(distances))
            print(f"[RECOGNIZE] {username}: distancia minima = {min_dist:.4f}")

            if min_dist < best_distance:
                best_distance = min_dist
                best_match    = username

        print(f"[RECOGNIZE] Mejor match: {best_match} | distancia: {best_distance:.4f} | umbral: {THRESHOLD}")

        if best_distance <= THRESHOLD:
            confidence = round((1 - best_distance) * 100, 2)
            return jsonify({
                "success": True,
                "message": "Rostro reconocido",
                "username": best_match,
                "confidence": confidence,
                "distance": round(best_distance, 4)
            })
        else:
            return jsonify({
                "success": False,
                "message": "Rostro no reconocido. Intenta en mejor iluminación.",
                "distance": round(best_distance, 4),
                "threshold": THRESHOLD
            })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500


@app.route("/list-users", methods=["GET"])
def list_users():
    """Lista todos los usuarios con rostro registrado."""
    try:
        encodings  = load_encodings()
        users_info = [
            {
                "username": u,
                "fotos_registradas": len(e),
                "fotos_requeridas": MAX_FOTOS,
                "registro_completo": len(e) >= MAX_FOTOS
            }
            for u, e in encodings.items()
        ]
        return jsonify({"success": True, "users": users_info, "total": len(encodings)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/delete-user/<username>", methods=["DELETE"])
def delete_user(username):
    """Elimina el registro biométrico de un usuario."""
    try:
        encodings = load_encodings()
        if username not in encodings:
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404
        del encodings[username]
        save_encodings(encodings)
        print(f"[DELETE] Encodings eliminados para: {username}")
        return jsonify({"success": True, "message": f"Registro biométrico de {username} eliminado"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    print("=" * 50)
    print("  Face Recognition Service")
    print("  Libreria : dlib + face_recognition")
    print(f"  Max fotos: {MAX_FOTOS} por usuario")
    print(f"  Threshold: {THRESHOLD}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)
