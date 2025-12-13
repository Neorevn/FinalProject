from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import os
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from Backend.climate import climate_bp
from Backend.database import db
from Backend.parking import parking_bp
from Backend.automation import automation_bp, process_event
from Backend.auth import auth_bp
from Backend.meeting_rooms import meeting_rooms_bp
from Backend.wellness import wellness_bp

# Load environment variables from .env file.
load_dotenv()


# Initializes the entire database for first startup
def initialize_database():
    logging.info("Application: Checking database initialization...")

    # Initialize Office State
    if db.state.count_documents({}) == 0:
        logging.info("Application: Initializing office state...")
        db.state.insert_one({
            '_id': 'office',
            'temperature': 21,
            'hvac_mode': 'off',
            'lights_on': False
        })

    # Initialize Parking Spots
    if db.parking_spots.count_documents({}) == 0:
        logging.info("Application: Initializing 20 parking spots...")
        db.parking_spots.insert_many([{'id': i, 'is_available': True} for i in range(1, 21)])

    # Initialize default Automation Rules
    if db.automation_rules.count_documents({}) == 0:
        logging.info("Application: Initializing default automation rules...")
        default_rules = [
            {
                'id': 1, 
                'trigger': {'type': 'motion', 'condition': {'area': 'main_office'}}, 
                'action': {'type': 'lights_on'}, 
                'active': True, 
                'description': "When motion is detected in the Main Office, turn the lights on."
            },
            {
                'id': 2, 
                'trigger': {'type': 'motion', 'condition': {'area': 'meeting_room_empty'}}, 
                'action': {'type': 'lights_off'}, 
                'active': True, 
                'description': "When meeting room is empty (simulated via motion trigger), turn lights off."
            },
            {
                'id': 3, 'trigger': {'type': 'time', 'condition': {'time': '19:00'}}, 
                'action': {'type': 'hvac_off'}, 'active': False, 'description': "Turn off HVAC after business hours (7 PM)."
            }
        ]
        db.automation_rules.insert_many(default_rules)

    # Initialize Meeting Rooms
    if db.meeting_rooms.count_documents({}) == 0:
        logging.info("Application: Initializing meeting rooms...")
        default_rooms = [
            {'id': 1, 'name': 'Neo', 'capacity': 4, 'equipment': ['55" Display', 'Whiteboard']},
            {'id': 2, 'name': 'Trinity', 'capacity': 8, 'equipment': ['75" Display', 'Whiteboard', 'Video Conferencing']},
            {'id': 3, 'name': 'Morpheus', 'capacity': 12, 'equipment': ['Projector', 'Whiteboard', 'Conference Phone']},
            {'id': 4, 'name': 'Smith', 'capacity': 4, 'equipment': ['55" Display', 'Whiteboard']},
        ]
        db.meeting_rooms.insert_many(default_rooms)
        # Bookings collection will be created on first insert.

    # Initialize default Users
    if db.users.count_documents({}) == 0:
        logging.info("Application: Initializing users...")
        users_to_create = [
            # Admins
            {'username': 'admin1', 'password': generate_password_hash('adminpass1'), 'role': 'admin'},
            # Users
            {'username': 'user1', 'password': generate_password_hash('userpass1'), 'role': 'user'}
        ]
        db.users.insert_many(users_to_create)

    # Initialize Wellness Collections
    # Check if the collection exists before trying to create it
    if 'wellness_checkins' not in db.list_collection_names():
        logging.info("Application: Creating 'wellness_checkins' collection with TTL index...")
        wellness_checkins = db.create_collection('wellness_checkins')
        # Create a TTL index to automatically delete documents after 7 days (604800 seconds)
        wellness_checkins.create_index("createdAt", expireAfterSeconds=604800)

    if db.mental_health_resources.count_documents({}) == 0:
        logging.info("Application: Initializing mental health resources...")
        default_resources = [
            {
                '_id': 'stress',
                'resources': [
                    "Breathing exercises",
                    "5-minute meditation",
                    "Meeting with counselor"
                ]
            },
            {
                '_id': 'tired',
                'resources': [
                    "Take a break",
                    "Go outside for fresh air",
                    "Drink water"
                ]
            },
            {
                '_id': 'sad',
                'resources': ["Talk to a friend", "Call emergency line: 1201", "Request meeting with psychologist"]
            }
        ]
        db.mental_health_resources.insert_many(default_resources)

    logging.info("Application: Database initialization check complete.")

def create_app():
    app = Flask(__name__, static_folder='dist', static_url_path='')
    CORS(app)

    # Set the secret key required for JWT signing
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    if not app.config['SECRET_KEY']:
        raise ValueError("FATAL: SECRET_KEY environment variable not set. Please set it in your .env file.")

    # Serverside logger
    logging.basicConfig(level=logging.INFO,
                        format='%(asctime)s - %(levelname)s - %(message)s')

    # Register Blueprints
    app.register_blueprint(climate_bp)
    app.register_blueprint(parking_bp)
    app.register_blueprint(automation_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(meeting_rooms_bp)
    app.register_blueprint(wellness_bp)

    # This error handler is the key to integrating the React SPA.
    # If a route is not found by the server (i.e., it's not an API route and not a static file),
    # this handler will serve the main index.html. React Router will then take over on the client-side.
    @app.errorhandler(404)
    def not_found_error(error):
        if not request.path.startswith('/api/'):
            return app.send_static_file('index.html')
        return jsonify(error='Not Found'), 404

    # A specific route for the root URL to serve the app.
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    @app.route('/health')
    def health_check():
        logging.info("Application: Health check successful.")
        return jsonify({"status": "OK"}), 200

    # This check is important to prevent the scheduler from running multiple times in debug mode.
    if app.config.get('SCHEDULER_RUNNING'):
        return app

    # --- Scheduler Setup ---
    # We define the jobs here so they have access to the 'app' context.
    def time_trigger_job():
        """Fires every minute to trigger time-based automations."""
        with app.app_context():
            current_time = datetime.now().strftime("%H:%M")
            process_event('time', {'time': current_time})

    def cleanup_old_bookings_job():
        """Removes meeting room bookings that have already ended."""
        with app.app_context():
            now = datetime.now(timezone.utc)
            result = db.meeting_bookings.delete_many({'end_time': {'$lt': now}})
            if result.deleted_count > 0:
                logging.info(f"Scheduler: Cleaned up {result.deleted_count} old meeting room booking(s).")

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(time_trigger_job, 'cron', minute='*')
    # Run cleanup job every minute for more responsive calendar updates
    scheduler.add_job(cleanup_old_bookings_job, 'cron', minute='*')
    scheduler.start()
    app.config['SCHEDULER_RUNNING'] = True
    logging.info("Application: Background scheduler started.")

    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        initialize_database()
    
    logging.warning("Application: Starting Officer application on port 5000...")    
    # Use debug=False to prevent the app from running twice (which duplicates scheduler jobs)
    app.run(host='0.0.0.0', port=5000, debug=False)