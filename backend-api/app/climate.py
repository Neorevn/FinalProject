from flask import Blueprint, request, jsonify
import logging
from bson import json_util
import json

from .database import db
from .auth import token_required

climate_bp = Blueprint('climate_bp', __name__)

@climate_bp.route('/api/climate/control', methods=['POST'])
@token_required
def control():
    data = request.get_json()
    if not data:
        logging.warning("No data provided in request.")
        return jsonify({'error': 'No data provided'}), 400
    
    action = data.get('action')
    value = data.get('value')
    if not action:
        logging.warning("No action specified in request.")
        return jsonify({'error': 'No action specified'}), 400
    
    if action == 'set_temperature':
        try:
            temp_value = int(value)
            if not (10 <= temp_value <= 30):
                logging.warning(f"Temperature value out of bounds: {value}")
                return jsonify({'error': 'Temperature must be between 10 and 30.'}), 400           
            db.state.update_one({'_id': 'office'}, {'$set': {'temperature': temp_value}}, upsert=True)
            logging.info(f"Climate: Temperature set to {temp_value}°C")
            return jsonify({'status': 'success', 'message': f"Temperature set to {temp_value}°C"})
        
        except (ValueError, TypeError):
            logging.warning(f"Invalid temperature value provided: {value}")
            return jsonify({'error': 'Invalid temperature value, must be an integer.'}), 400
        
    elif action == 'set_hvac_mode':
        valid_modes = ['heat', 'cool', 'off']
        if value not in valid_modes:
            logging.warning(f"Invalid HVAC mode specified: {value}")
            return jsonify({'error': 'Invalid HVAC mode. Use "heat", "cool", or "off".'}), 400           
        db.state.update_one({'_id': 'office'}, {'$set': {'hvac_mode': value}}, upsert=True)
        logging.info(f"Climate: HVAC mode set to '{value}'")
        message = f"HVAC mode set to {value}."
        return jsonify({'status': 'success', 'message': message})
    
    elif action == 'set_lights':
        if value not in ['on', 'off']:
            logging.warning(f"Invalid light setting specified: {value}")
            return jsonify({'error': 'Invalid light setting. Use "on" or "off".'}), 400         
        db.state.update_one({'_id': 'office'}, {'$set': {'lights_on': (value == 'on')}}, upsert=True)
        message = f"Lights turned {value}"
        logging.info(f"Climate: {message}.")
        return jsonify({'status': 'success', 'message': message})
    
    else:
        logging.warning(f"Invalid action specified: {action}")
        return jsonify({'error': 'Invalid action specified'}), 400

@climate_bp.route('/api/climate/status', methods=['GET'])
@token_required
def status():
    office_state = db.state.find_one({'_id': 'office'})
    if not office_state:
        return jsonify({'error': 'Office state not initialized'}), 500
        
    logging.info(f"Climate: Status requested. Current state: {office_state}")
    # Use json_util to handle MongoDB's ObjectId and other types
    return json.loads(json_util.dumps(office_state))