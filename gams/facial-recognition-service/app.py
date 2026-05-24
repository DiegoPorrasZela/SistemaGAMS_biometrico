from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import numpy as np
import base64
import json
import mysql.connector
from PIL import Image
import io
from datetime import datetime

app = Flask(__name__)
CORS(app)

MAX_FOTOS = 3       # fotos requeridas por usuario
THRESHOLD  = 0.50   # distancia máxima aceptada (0 = perfecto, 1 = muy diferente)

DB_CONFIG = {
    "host":     "localhost",
    "port":     3306,
    "database": "gams_db",
    "user":     "root",
    "password": "diegoporras"
}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def get_db():
    """Abre y devuelve una conexión MySQL."""
    return mysql.connector.connect(**DB_CONFIG)


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


def detect_single_face(image):
    """
    Detecta rostros con upsample=2 para mayor sensibilidad.
    Devuelve (face_locations, error_message).
    error_message es None si todo está bien.
    """
    face_locations = face_recognition.face_locations(
        image, model="hog", number_of_times_to_upsample=2
    )
    if len(face_locations) == 0:
        return None, "No se detectó ningún rostro. Asegúrate de estar bien iluminado y centrado."
    if len(face_locations) > 1:
        return None, "Se detectaron varios rostros. Debe haber solo uno en cámara."
    return face_locations, None


def get_encoding(image, face_locations):
    """
    Extrae el vector de 128 dimensiones del rostro.
    Devuelve (encoding, error_message).
    """
    encodings = face_recognition.face_encodings(image, face_locations)
    if not encodings:
        return None, "No se pudo extraer el encoding del rostro."
    return encodings[0], None


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":    "ok",
        "service":   "Face Recognition Service — dlib + face_recognition",
        "storage":   "MySQL (rostros_biometricos)",
        "max_fotos": MAX_FOTOS,
        "threshold": THRESHOLD,
        "timestamp": datetime.now().isoformat()
    })


@app.route("/register", methods=["POST"])
def register_face():
    """
    Registra una foto del rostro de un usuario en la base de datos.
    Body JSON: { "username": "...", "image": "<base64>" }
    Se deben llamar MAX_FOTOS veces para completar el registro.
    """
    try:
        data         = request.get_json()
        username     = data.get("username")
        image_base64 = data.get("image")

        if not username or not image_base64:
            return jsonify({"success": False, "message": "username e imagen son requeridos"}), 400

        image = decode_image(image_base64)
        if image is None:
            return jsonify({"success": False, "message": "Error al decodificar la imagen"}), 400

        face_locations, error = detect_single_face(image)
        if error:
            return jsonify({"success": False, "message": error}), 400

        encoding, error = get_encoding(image, face_locations)
        if error:
            return jsonify({"success": False, "message": error}), 400

        conn   = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM rostros_biometricos WHERE username = %s", (username,)
            )
            count = cursor.fetchone()[0]

            if count >= MAX_FOTOS:
                return jsonify({
                    "success": False,
                    "message": (
                        f"El usuario ya tiene {MAX_FOTOS} fotos registradas. "
                        "Elimínalas y vuelve a registrar si deseas actualizarlas."
                    )
                }), 400

            foto_numero   = count + 1
            encoding_json = json.dumps(encoding.tolist())

            cursor.execute(
                "INSERT INTO rostros_biometricos (username, foto_numero, encoding) VALUES (%s, %s, %s)",
                (username, foto_numero, encoding_json)
            )
            conn.commit()
            new_count = count + 1

        finally:
            cursor.close()
            conn.close()

        print(f"[REGISTER] {username}: foto {new_count}/{MAX_FOTOS}")

        return jsonify({
            "success":          True,
            "message":          f"Foto {new_count}/{MAX_FOTOS} registrada para {username}",
            "username":         username,
            "fotos_registradas": new_count,
            "fotos_requeridas": MAX_FOTOS,
            "registro_completo": new_count >= MAX_FOTOS
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

        face_locations, error = detect_single_face(image)
        if error:
            return jsonify({"success": False, "message": error}), 400

        unknown_encoding, error = get_encoding(image, face_locations)
        if error:
            return jsonify({"success": False, "message": error}), 400

        # Cargar todos los encodings registrados desde MySQL
        conn   = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT username, encoding FROM rostros_biometricos")
            rows = cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

        if not rows:
            return jsonify({"success": False, "message": "No hay rostros registrados en el sistema."}), 400

        # Agrupar encodings por usuario
        known = {}
        for username, encoding_json in rows:
            if username not in known:
                known[username] = []
            known[username].append(np.array(json.loads(encoding_json)))

        # Buscar la menor distancia entre todos los usuarios
        best_match    = None
        best_distance = float("inf")

        for username, enc_list in known.items():
            distances = face_recognition.face_distance(enc_list, unknown_encoding)
            min_dist  = float(np.min(distances))
            print(f"[RECOGNIZE] {username}: distancia mínima = {min_dist:.4f}")

            if min_dist < best_distance:
                best_distance = min_dist
                best_match    = username

        print(f"[RECOGNIZE] Mejor match: {best_match} | distancia: {best_distance:.4f} | umbral: {THRESHOLD}")

        if best_distance <= THRESHOLD:
            confidence = round((1 - best_distance) * 100, 2)
            return jsonify({
                "success":    True,
                "message":    "Rostro reconocido",
                "username":   best_match,
                "confidence": confidence,
                "distance":   round(best_distance, 4)
            })
        else:
            return jsonify({
                "success":   False,
                "message":   "Rostro no reconocido. Intenta en mejor iluminación.",
                "distance":  round(best_distance, 4),
                "threshold": THRESHOLD
            })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "message": f"Error interno: {str(e)}"}), 500


@app.route("/list-users", methods=["GET"])
def list_users():
    """Lista todos los usuarios con al menos una foto registrada."""
    try:
        conn   = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT username, COUNT(*) AS fotos
                FROM rostros_biometricos
                GROUP BY username
                ORDER BY username
            """)
            rows = cursor.fetchall()
        finally:
            cursor.close()
            conn.close()

        users_info = [
            {
                "username":         u,
                "fotos_registradas": f,
                "fotos_requeridas": MAX_FOTOS,
                "registro_completo": f >= MAX_FOTOS
            }
            for u, f in rows
        ]
        return jsonify({"success": True, "users": users_info, "total": len(users_info)})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/delete-user/<username>", methods=["DELETE"])
def delete_user(username):
    """Elimina todos los registros biométricos de un usuario."""
    try:
        conn   = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM rostros_biometricos WHERE username = %s", (username,)
            )
            count = cursor.fetchone()[0]

            if count == 0:
                return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

            cursor.execute(
                "DELETE FROM rostros_biometricos WHERE username = %s", (username,)
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        print(f"[DELETE] Encodings eliminados para: {username}")
        return jsonify({"success": True, "message": f"Registro biométrico de {username} eliminado"})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/status/<username>", methods=["GET"])
def status_user(username):
    """Devuelve cuántas fotos tiene registradas un usuario."""
    try:
        conn   = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COUNT(*) FROM rostros_biometricos WHERE username = %s", (username,)
            )
            fotos = cursor.fetchone()[0]
        finally:
            cursor.close()
            conn.close()

        return jsonify({
            "success":          True,
            "username":         username,
            "fotos_registradas": fotos,
            "fotos_requeridas": MAX_FOTOS,
            "registro_completo": fotos >= MAX_FOTOS
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    print("=" * 50)
    print("  Face Recognition Service")
    print("  Librería : dlib + face_recognition")
    print("  Storage  : MySQL (gams_db.rostros_biometricos)")
    print(f"  Max fotos: {MAX_FOTOS} por usuario")
    print(f"  Threshold: {THRESHOLD}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)
