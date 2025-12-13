from flask import Blueprint, jsonify
from sqlalchemy import text

health_bp = Blueprint('health', __name__)

# Placeholder for SQLAlchemy db object.
# This will be set by the create_app function in app/__init__.py
# when the blueprint is registered.
db = None

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check."""
    return jsonify({"status": "UP"}), 200

@health_bp.route('/health/ready', methods=['GET'])
def readiness_probe():
    """Readiness probe: Checks if the application is ready to serve traffic.
    This includes checking the database connection.
    """
    try:
        # Attempt to connect to the database using SQLAlchemy
        if db: # Ensure db object is initialized
            db.session.execute(text('SELECT 1'))
            return jsonify({"status": "READY", "database": "connected"}), 200
        return jsonify({"status": "NOT_READY", "error": "Database not initialized"}), 503
    except Exception as e:
        return jsonify({"status": "NOT_READY", "error": str(e)}), 503

@health_bp.route('/health/live', methods=['GET'])
def liveness_probe():
    """Liveness probe: Checks if the application is alive."""
    return jsonify({"status": "LIVE"}), 200