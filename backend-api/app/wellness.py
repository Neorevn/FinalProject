from flask import Blueprint, request, jsonify, g
import random
from datetime import datetime, timezone

from .auth import token_required
from .database import db

wellness_bp = Blueprint('wellness_bp', __name__)

@wellness_bp.route('/api/wellness/checkin', methods=['POST'])
@token_required
def checkin():
    info = request.json
    if not info or 'mood' not in info or 'energy' not in info or 'stress' not in info:
        return jsonify({'error': 'Missing mood, energy, or stress level'}), 400
    
    username = g.current_user['username']
    mood = info['mood']
    energy = info['energy']
    stress = info['stress']

    record = {
        'username': username,
        'mood': mood,
        'energy': energy,
        'stress': stress,
        'createdAt': datetime.now(timezone.utc) # Use UTC for consistency and TTL index
    }
    db.wellness_checkins.insert_one(record)

    # Give advice and check for mental health triggers
    advice = []
    identified_problems = []
    support_resources = {}

    if stress > 7:
        advice.append("High stress detected. Consider taking a short break or a walk.")
        identified_problems.append('stress')
    if energy < 4:
        advice.append("Low energy. A quick coffee or some fresh air might help.")
        identified_problems.append('tired')
    if mood < 5:
        advice.append("Feeling down? Reaching out to a friend or colleague can make a difference.")
        identified_problems.append('sad')

    # If any problems were identified, fetch the corresponding support resources
    if identified_problems:
        for problem in identified_problems:
            resource_doc = db.mental_health_resources.find_one({'_id': problem})
            if resource_doc and 'resources' in resource_doc:
                support_resources[problem] = resource_doc['resources']

    return jsonify({
        'message': 'Thank you! Your check-in has been recorded.',
        'advice': advice,
        'support_resources': support_resources
    })


@wellness_bp.route('/api/wellness/air-quality', methods=['GET'])
@token_required
def air_quality():
    # Generate random numbers (instead of real sensors)
    office_state = db.state.find_one({'_id': 'office'}) or {}

    co2 = random.randint(400, 1000)
    # Get real temperature and humidity from the climate system state
    temp = office_state.get('temperature', 21)
    humidity = random.randint(40, 70) # Humidity sensor is not in climate system, so it remains random

    status = "Good"
    if co2 > 800:
        status = "Poor - High CO2 levels"
    if temp > 25:
        status = "Too hot"

    return jsonify({
        'co2': co2,
        'temperature': temp,
        'humidity': humidity,
        'status': status
    })


@wellness_bp.route('/api/wellness/noise-levels', methods=['GET'])
@token_required
def noise():
    noise_level = random.randint(30, 80)

    if noise_level < 50:
        status = "Quiet - Good for work"
    elif noise_level < 70:
        status = "Moderate"
    else:
        status = "Too noisy!"

    return jsonify({
        'noise_db': noise_level,
        'status': status
    })


@wellness_bp.route('/api/wellness/break-reminder', methods=['POST'])
@token_required
def break_reminder():
    info = request.json
    name = g.current_user['username']
    minutes = info.get('minutes', 60)

    return jsonify({
        'message': f"Hi {name}! I'll remind you to take a break every {minutes} minutes",
        'tips': [
            "Stand up and walk around",
            "Drink water",
            "Do some stretches"
        ]
    })


@wellness_bp.route('/api/wellness/ergonomics/check', methods=['GET'])
@token_required
def ergonomics():
    chair_ok = random.choice([True, False])
    desk_height_ok = random.choice([True, False])
    screen_distance_ok = random.choice([True, False])

    problems = []
    if not chair_ok:
        problems.append("Chair is not at the right height")
    if not desk_height_ok:
        problems.append("Desk is too high or too low")
    if not screen_distance_ok:
        problems.append("Screen is too close or too far")

    if not problems:
        problems.append("Everything looks good!")

    return jsonify({
        'problems': problems,
        'tips': [
            "Sit with straight back",
            "Keep feet on floor",
            "Screen at eye level"
        ]
    })


@wellness_bp.route('/api/wellness/mental-health/support', methods=['POST'])
@token_required
def mental_health():
    info = request.json
    name = g.current_user['username']
    problem = info.get('problem', 'general')

    # Fetch resources from the database
    resource_doc = db.mental_health_resources.find_one({'_id': problem})

    if resource_doc and 'resources' in resource_doc:
        help_options = resource_doc['resources']
    else:
        # Fallback to a generic message if the specific problem is not found
        help_options = [
            "We are here for you.",
            "Please contact HR for support options."
        ]

    return jsonify({
        'message': f"Hi {name}, we are here to help!",
        'help': help_options,
        'emergency': "In emergency call: 100 or 1201"
    })
