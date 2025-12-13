from flask import Flask
from flask_cors import CORS
import os
import logging
from werkzeug.security import generate_password_hash
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone

from .database import db

# Import all blueprints
from .auth import auth_bp
from .automation import automation_bp, process_event
from .climate import climate_bp
from .parking import parking_bp
from .meeting_rooms import meeting_rooms_bp
from .wellness import wellness_bp
from .metrics import metrics_bp, before_request_hook, after_request_hook

def initialize_database():
    """Initializes the database with default data if empty."""
    logging.info("Application: Checking database initialization...")

    # Initialize Office State
    if db.state.count_documents({}) == 0:
        logging.info("Application: Initializing office state...")
        db.state.insert_one({'_id': 'office', 'temperature': 21, 'hvac_mode': 'off', 'lights_on': False})

    # Initialize Parking Spots (20 spots)
    if db.parking_spots.count_documents({}) == 0:
        db.parking_spots.insert_many([{'id': i, 'is_available': True} for i in range(1, 21)])

    # Initialize Default Automation Rules
    if db.automation_rules.count_documents({}) == 0:
        default_rules = [
            {'id': 1, 'trigger': {'type': 'motion', 'condition': {'area': 'main_office'}}, 'action': {'type': 'lights_on'}, 'active': True, 'description': "Turn lights on when motion detected."},
            {'id': 2, 'trigger': {'type': 'time', 'condition': {'time': '19:00'}}, 'action': {'type': 'hvac_off'}, 'active': True, 'description': "Turn off HVAC at 7 PM."}
        ]
        db.automation_rules.insert_many(default_rules)

    # Initialize Meeting Rooms
    if db.meeting_rooms.count_documents({}) == 0:
        default_rooms = [
            {'id': 1, 'name': 'Neo', 'capacity': 4, 'equipment': ['Display', 'Whiteboard']},
            {'id': 2, 'name': 'Trinity', 'capacity': 8, 'equipment': ['Video Conf', 'Whiteboard']},
            {'id': 3, 'name': 'Morpheus', 'capacity': 12, 'equipment': ['Projector']},
        ]
        db.meeting_rooms.insert_many(default_rooms)

    # Initialize Default Users
    if db.users.count_documents({}) == 0:
        users = [
            {'username': 'admin', 'password': generate_password_hash('admin123'), 'role': 'admin'},
            {'username': 'user', 'password': generate_password_hash('user123'), 'role': 'user'}
        ]
        db.users.insert_many(users)

    # Initialize Wellness Resources
    if db.mental_health_resources.count_documents({}) == 0:
        resources = [
            {'_id': 'stress', 'resources': ["Breathing exercises", "Take a walk"]},
            {'_id': 'tired', 'resources': ["Drink water", "Coffee break"]},
            {'_id': 'sad', 'resources': ["Call a friend", "Talk to HR"]}
        ]
        db.mental_health_resources.insert_many(resources)
    
    # Create TTL index for wellness checkins (7 days)
    if 'wellness_checkins' not in db.list_collection_names():
        db.create_collection('wellness_checkins')
        db.wellness_checkins.create_index("createdAt", expireAfterSeconds=604800)

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Enable CORS
    CORS(app)
    
    # Logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(automation_bp)
    app.register_blueprint(climate_bp)
    app.register_blueprint(parking_bp)
    app.register_blueprint(meeting_rooms_bp)
    app.register_blueprint(wellness_bp)
    app.register_blueprint(metrics_bp)
    
    # Register Metrics Hooks
    app.before_request(before_request_hook)
    app.after_request(after_request_hook)
    
    # Health Check
    @app.route('/health')
    def health():
        return {'status': 'healthy'}, 200

    # Initialize Database
    with app.app_context():
        initialize_database()

    # Scheduler for Automation & Cleanup
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        def time_trigger():
            with app.app_context():
                process_event('time', {'time': datetime.now().strftime("%H:%M")})

        def cleanup_bookings():
            with app.app_context():
                db.meeting_bookings.delete_many({'end_time': {'$lt': datetime.now(timezone.utc)}})

        scheduler = BackgroundScheduler(daemon=True)
        scheduler.add_job(time_trigger, 'cron', minute='*')
        scheduler.add_job(cleanup_bookings, 'cron', minute='*')
        scheduler.start()
    
    return app