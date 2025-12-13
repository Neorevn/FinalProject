from flask import Blueprint, request, jsonify
import logging
from bson import json_util
import json

from .database import db
from .auth import admin_required, token_required

automation_bp = Blueprint('automation_bp', __name__)

@automation_bp.route('/api/automation/rules/create', methods=['POST'])
@admin_required
def create_automation_rule():
    data = request.get_json()
    if not data or 'trigger' not in data or 'action' not in data:
        return jsonify({'error': 'Missing trigger or action in request body'}), 400
    
    # Generate a new sequential ID for new rule
    last_rule = db.automation_rules.find_one(sort=[("id", -1)])
    new_id = (last_rule["id"] + 1) if last_rule else 1

    new_rule = {
        'id': new_id,
        'trigger': data['trigger'], # e.g., {'type': 'user_login', 'condition': {'username': 'user1'}}
        'action': data['action'],   # e.g., {'type': 'hvac_off'}
        'active': True,
        'description': data.get('description', 'Custom rule')
    }

    # Validate structure
    if 'type' not in new_rule['trigger'] or 'type' not in new_rule['action']:
        return jsonify({'error': 'Invalid rule structure. Trigger and action must have a type.'}), 400

    db.automation_rules.insert_one(new_rule)
    logging.info(f"Automation: Created new rule: {new_rule}")
    new_rule.pop('_id', None)
    return jsonify(new_rule), 201

@automation_bp.route('/api/automation/rules', methods=['GET'])
@token_required
def get_all_rules():
    rules = list(db.automation_rules.find({}, {'_id': 0}))
    return jsonify(rules)

@automation_bp.route('/api/automation/rules/toggle/<int:rule_id>', methods=['POST'])
@admin_required
def toggle_rule(rule_id):
    rule = db.automation_rules.find_one({'id': rule_id})
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404
    new_active_state = not rule.get('active', False)
    db.automation_rules.update_one(
        {'_id': rule['_id']},
        {'$set': {'active': new_active_state}}
    )
    logging.info(f"Automation: Toggled rule {rule_id} to {'active' if new_active_state else 'inactive'}.")
    rule['active'] = new_active_state
    rule.pop('_id', None)
    return jsonify(rule)

@automation_bp.route('/api/automation/rules/delete/<int:rule_id>', methods=['DELETE'])
@admin_required
def delete_rule(rule_id):
    result = db.automation_rules.delete_one({'id': rule_id})
    
    if result.deleted_count == 0:
        return jsonify({'error': 'Rule not found'}), 404

    logging.info(f"Automation: Rule {rule_id} was deleted by an admin.")
    return jsonify({'status': 'success', 'message': f"Rule #{rule_id} has been deleted."})


@automation_bp.route('/api/automation/scenes/create', methods=['POST'])
@admin_required
def create_environmental_scene():
    data = request.get_json()
    if not data or 'name' not in data or 'settings' not in data:
        return jsonify({'error': 'Missing name or settings for the scene'}), 400
    scene_name = data['name']
    if db.scenes.find_one({'_id': scene_name}):
        return jsonify({'error': f"Scene '{scene_name}' already exists."}), 409
    db.scenes.update_one({'_id': scene_name}, {'$set': {'settings': data['settings']}}, upsert=True)
    logging.info(f"Automation: Created new scene '{scene_name}' with settings: {data['settings']}")
    return jsonify({'status': 'success', 'scene_name': scene_name, 'settings': data['settings']}), 201

def process_event(event_type, event_data={}):
    logging.info(f"Automation: Processing event '{event_type}' with data: {event_data}")
    matching_rules = db.automation_rules.find({
        'trigger.type': event_type,
        'active': True
    })

    triggered_count = 0
    for rule in matching_rules:
        conditions = rule.get('trigger', {}).get('condition', {})
        is_match = True
        # Check if all conditions in the rule are met by the event data
        for key, value in conditions.items():
            # A simple, robust string comparison is sufficient and avoids type issues.
            if str(event_data.get(key)) != str(value):
                is_match = False
                break
        if is_match:
            action = rule.get('action', {})
            if action.get('type'):
                source_description = f"rule #{rule['id']} ('{rule['description']}')"
                _execute_automation_action(action, source_description, event_data)
                triggered_count += 1
    
    if triggered_count > 0:
        logging.info(f"Automation: Event '{event_type}' triggered {triggered_count} rule(s).")


# Action Handlers
def _action_lights_on(params, event_data):
        db.state.update_one({'_id': 'office'}, {'$set': {'lights_on': True}})
        logging.info("Automation: Lights turned ON by rule.")

def _action_lights_off(params, event_data):
        db.state.update_one({'_id': 'office'}, {'$set': {'lights_on': False}})
        logging.info("Automation: Lights turned OFF by rule.")

def _action_hvac_off(params, event_data):
        db.state.update_one({'_id': 'office'}, {'$set': {'hvac_mode': 'off'}})
        logging.info("Automation: HVAC turned OFF by rule.")

def _action_reserve_parking(params, event_data):
    spot_id = params.get('spot_id')
    username = event_data.get('username')
    if not spot_id or not username:
        logging.warning("Automation: 'reserve_parking' action missing spot_id or username context.")
        return

    spot = db.parking_spots.find_one({'id': int(spot_id)})
    if spot and spot.get('is_available'):
        db.parking_spots.update_one({'id': int(spot_id)}, {'$set': {'is_available': False}})
        db.reservations.insert_one({'id': int(spot_id), 'name': username})
        logging.info(f"Automation: Reserved parking spot {spot_id} for '{username}' via rule.")
    else:
        logging.warning(f"Automation: Could not reserve spot {spot_id} for '{username}'. Spot not found or not available.")

def _action_clear_parking(params, event_data):
    spot_id = params.get('spot_id')
    if not spot_id:
        logging.warning("Automation: 'clear_parking' action missing spot_id.")
        return
    spot_id = int(spot_id)
    db.checkins.delete_one({'id': spot_id})
    db.reservations.delete_many({'id': spot_id})
    db.parking_spots.update_one({'id': spot_id}, {'$set': {'is_available': True}})
    logging.info(f"Automation: Cleared parking spot {spot_id} via rule.")

ACTION_HANDLERS = {
    'lights_on': _action_lights_on,
    'lights_off': _action_lights_off,
    'hvac_off': _action_hvac_off,
    'reserve_parking': _action_reserve_parking,
    'clear_parking': _action_clear_parking,
}

def _execute_automation_action(action, source_description, event_data={}):
    action_type = action.get('type')
    action_params = action.get('parameters', {})
    logging.info(f"Automation: {source_description} triggered action: '{action_type}' with params {action_params}.")
    handler = ACTION_HANDLERS.get(action_type)
    if handler:
        handler(action_params, event_data)
        return True
    logging.warning(f"Automation: Unknown action '{action_type}' requested by {source_description}.")
    return False

@automation_bp.route('/api/automation/triggers/motion', methods=['POST'])
def trigger_motion():
    data = request.get_json()
    area = data.get('area', 'general') if data else 'general'    
    process_event('motion', {'area': area})
    return jsonify({'message': f"Motion event in '{area}' processed."}), 200

@automation_bp.route('/api/automation/rules/test/<int:rule_id>', methods=['POST'])
@admin_required
def test_rule(rule_id):
    rule = db.automation_rules.find_one({'id': rule_id})
    if not rule:
        return jsonify({'error': 'Rule not found'}), 404
    if not rule.get('active', True):
        return jsonify({'message': f"Rule {rule_id} is inactive. Test not run."}), 200
    action = rule.get('action', {})
    source_description = f"Test for rule #{rule_id}"
    _execute_automation_action(action, source_description, {})
    return jsonify({'message': f"Test triggered for rule #{rule_id}. Action '{action.get('type')}' executed."}), 200

@automation_bp.route('/api/automation/energy-savings', methods=['GET'])
@token_required
def get_energy_savings():
    # In a real app, this would be calculated. For now, we'll just return the placeholder.
    energy_savings = db.energy_savings.find_one({'_id': 'office'})
    if not energy_savings:
        db.energy_savings.insert_one({'_id': 'office', 'hvac_runtime_reduced_hours': 0, 'lights_off_hours': 0})
        energy_savings = db.energy_savings.find_one({'_id': 'office'})

    logging.info("Automation: Energy savings data requested.")
    return json.loads(json_util.dumps(energy_savings))
    energy_savings.pop('_id', None)
    return jsonify(energy_savings)