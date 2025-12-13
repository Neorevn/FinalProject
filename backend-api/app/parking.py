from flask import Blueprint, request, jsonify, g
import logging
from bson import json_util
import json

from .database import db
from .automation import process_event
from .auth import token_required, admin_required

parking_bp = Blueprint('parking_bp', __name__)

def find_spot_by_id(spot_id):
    return db.parking_spots.find_one({'id': spot_id})

@parking_bp.get('/api/parking/spots/available')
@token_required
def spots_available():
    logging.info("Parking: Available spots requested.")
    available_spots_cursor = db.parking_spots.find({'is_available': True})
    all_available = [spot['id'] for spot in available_spots_cursor]
    return jsonify(all_available)

@parking_bp.get('/api/parking/all-spots')
@token_required
def get_all_spots():
    detailed_spots = []
    for spot in db.parking_spots.find():
        spot_details = spot.copy()
        spot_id = spot_details['id']
        
        checked_in_user = db.checkins.find_one({'id': spot_id})
        reservation_info = db.reservations.find_one({'id': spot_id})

        if checked_in_user:
            spot_details['status'] = 'occupied'
            spot_details['user'] = checked_in_user['name']
        elif reservation_info:
            spot_details['status'] = 'reserved'
            spot_details['user'] = reservation_info['name']
        else:
            spot_details['status'] = 'available'
            spot_details['user'] = None
        logging.debug("Parking: All spots status requested.")
        detailed_spots.append(spot_details)
    return json.loads(json_util.dumps(detailed_spots))

def _reserve_spot(spot_id, name):
    spot = find_spot_by_id(spot_id)
    if not spot:
        return 'Parking spot does not exist', 404

    if not spot['is_available']:
        return 'Parking spot is not available. Cannot reserve', 409
    db.parking_spots.update_one({'id': spot_id}, {'$set': {'is_available': False}})
    reservation = {'id': spot_id, 'name': name}
    db.reservations.insert_one(reservation)
    logging.info(f"Parking: Spot {spot_id} reserved for '{name}'.")
    return f'Parking spot {spot_id} is reserved for {name}', 201

@parking_bp.post('/api/parking/reserve')
@token_required
def reserve():
    data = request.get_json()
    if not data or 'id' not in data:
        return 'Missing id in request body', 400
    
    message, status_code = _reserve_spot(data['id'], g.current_user['username'])
    return message, status_code

@parking_bp.post('/api/parking/guest-pass')
@token_required
def guest_pass():
    data = request.get_json()
    if not data or 'id' not in data:
        return 'Missing id in request body', 400
    
    message, status_code = _reserve_spot(data['id'], "guest")
    return message, status_code

@parking_bp.post('/api/parking/my-reservations')
@token_required
def my_reservations():
    name = g.current_user['username']
    my_reservations_cursor = db.reservations.find({'name': name})
    my_res_ids = [r['id'] for r in my_reservations_cursor]
    logging.info(f"Parking: Reservations requested for '{name}'. Found: {my_res_ids}")
    return jsonify(my_res_ids)

@parking_bp.post('/api/parking/clear-spot/<int:spot_id>')
@admin_required
def clear_spot(spot_id):
    # Remove check-ins
    checkin_deleted = db.checkins.delete_one({'id': spot_id})

    # Remove reservations
    reservations_deleted = db.reservations.delete_many({'id': spot_id})

    # Make the spot available
    db.parking_spots.update_one({'id': spot_id}, {'$set': {'is_available': True}})

    admin_user = g.current_user['username']
    logging.info(f"Parking: Spot {spot_id} was manually cleared by admin '{admin_user}'.")
    
    if checkin_deleted.deleted_count > 0 or reservations_deleted.deleted_count > 0:
        return jsonify({'status': 'success', 'message': f'Spot {spot_id} has been cleared and is now available.'})
    else:
        return jsonify({'status': 'success', 'message': f'Spot {spot_id} is now available.'})

@parking_bp.post('/api/parking/unreserve')
@token_required
def unreserve():
    data = request.get_json()
    if not data or 'id' not in data:
        return jsonify({'error': 'Missing id in request body'}), 400
    spot_id = data['id']
    name = g.current_user['username']

    # Find the reservation
    reservation = db.reservations.find_one({'id': spot_id, 'name': name})
    if not reservation:
        return jsonify({'error': 'No reservation found for you at this spot to unreserve.'}), 404

    # Remove the reservation
    db.reservations.delete_one({'id': spot_id, 'name': name})

    # Make the spot available again, but only if no one is checked in
    # and no other reservations exist for this spot.
    is_checked_in = db.checkins.find_one({'id': spot_id})
    other_reservations = db.reservations.find_one({'id': spot_id})

    if not is_checked_in and not other_reservations:
        db.parking_spots.update_one({'id': spot_id}, {'$set': {'is_available': True}})
        logging.info(f"Parking: Spot {spot_id} is now available after un-reservation by '{name}'.")

    logging.info(f"Parking: Spot {spot_id} unreserved by '{name}'.")
    return jsonify({'status': 'success', 'message': f'Reservation for spot {spot_id} has been cancelled.'}), 200

@parking_bp.post('/api/parking/checkin')
@token_required
def checkin():
    data = request.get_json()
    if not data or 'id' not in data:
        return 'Missing id in request body', 400
    name = g.current_user['username']
    id_to_checkin = data['id']

    is_reserved = db.reservations.find_one({'name': name, 'id': id_to_checkin})
    if not is_reserved:
        return jsonify({'error': 'Cannot check-in. No reservation found for you at this spot.'}), 403

    is_already_checked_in = db.checkins.find_one({'id': id_to_checkin})
    if is_already_checked_in:
        return jsonify({'error': 'Cannot check-in. Spot is already occupied.'}), 409

    db.checkins.insert_one({'id': id_to_checkin, 'name': name})
    logging.info(f"Parking: '{name}' checked into spot {id_to_checkin}.")
    # Trigger automation event for parking check-in
    process_event('parking_checkin', {'spot_id': id_to_checkin})

    return 'Checked in successfully', 201

@parking_bp.get('/api/parking/violations')
@admin_required
def violations():
    spots_with_reservations = {}
    for r in db.reservations.find():
        spots_with_reservations.setdefault(r['id'], set()).add(r['name'])

    all_violations = []
    for spot_id, users in spots_with_reservations.items():
        if len(users) > 1:
            violation_doc = {
                    'id': spot_id,
                    'violation': 'Reserved by multiple people',
                    'users': list(users)
                }
            all_violations.append(violation_doc)

    logging.info(f"Parking: Violations check ran. Found {len(all_violations)} violations.")
    return jsonify(all_violations)