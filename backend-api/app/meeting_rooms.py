from flask import Blueprint, request, jsonify, g
import logging
from datetime import datetime, timedelta, timezone
import uuid

from .database import db
from .auth import token_required

meeting_rooms_bp = Blueprint('meeting_rooms_bp', __name__)

def serialize_booking(booking):
    """Converts datetime objects in a booking to ISO 8601 strings for JSON serialization."""
    if not booking:
        return None
    # Create a copy to avoid modifying the original dictionary-like object from DB
    serialized = dict(booking)
    if '_id' in serialized:
        serialized.pop('_id') # Remove the ObjectId which is not JSON serializable
    if 'start_time' in serialized and isinstance(serialized['start_time'], datetime):
        serialized['start_time'] = serialized['start_time'].isoformat()
    if 'end_time' in serialized and isinstance(serialized['end_time'], datetime):
        serialized['end_time'] = serialized['end_time'].isoformat()
    return serialized

@meeting_rooms_bp.route('/api/rooms/status', methods=['GET'])
@token_required
def get_all_rooms_status():
    try:
        rooms = list(db.meeting_rooms.find({}, {'_id': 0}))
        now = datetime.now(timezone.utc)

        for room in rooms:
            # Find the current or next booking for the room
            current_booking = db.meeting_bookings.find_one({
                'room_id': room['id'],
                'start_time': {'$lte': now},
                'end_time': {'$gt': now}
            }, sort=[('start_time', 1)])

            if current_booking:
                room['status'] = 'booked'
                room['booking'] = {
                    'booking_id': current_booking['booking_id'],
                    'username': current_booking['username'],
                    'start_time': current_booking['start_time'].isoformat(),
                    'end_time': current_booking['end_time'].isoformat()
                }
            else:
                room['status'] = 'available'
                room['booking'] = None

        return jsonify(rooms)
    except Exception as e:
        logging.error(f"MeetingRooms: Error fetching room status: {e}")
        return jsonify({'error': 'An internal error occurred'}), 500

@meeting_rooms_bp.route('/api/rooms/book', methods=['POST'])
@token_required
def book_room():
    data = request.get_json()
    if not data or 'room_id' not in data or 'duration_minutes' not in data or 'start_time' not in data:
        return jsonify({'error': 'Missing room_id, start_time, or duration_minutes'}), 400

    room_id = data['room_id']
    duration = data['duration_minutes']
    username = g.current_user['username']

    try:
        # The 'Z' in javascript's toISOString isn't always parsed correctly, so we replace it.
        start_time = datetime.fromisoformat(data['start_time'].replace('Z', '+00:00'))
    except ValueError:
        return jsonify({'error': 'Invalid start_time format. Use ISO 8601 format.'}), 400

    end_time = start_time + timedelta(minutes=duration)

    # Check for booking conflicts
    conflict = db.meeting_bookings.find_one({
        'room_id': room_id,
        '$or': [
            {'start_time': {'$lt': end_time, '$gte': start_time}},
            {'end_time': {'$gt': start_time, '$lte': end_time}},
            {'$and': [{'start_time': {'$lte': start_time}}, {'end_time': {'$gte': end_time}}]}
        ]
    })

    if conflict:
        return jsonify({'error': 'Booking conflict: This room is already booked for the requested time slot.'}), 409

    new_booking = {
        'booking_id': str(uuid.uuid4()),
        'room_id': room_id,
        'username': username,
        'start_time': start_time,
        'end_time': end_time
    }
    db.meeting_bookings.insert_one(new_booking)
    logging.info(f"MeetingRooms: Room {room_id} booked by '{username}' until {end_time.isoformat()}")

    return jsonify({
        'status': 'success', 
        'message': f'Room {room_id} booked successfully.',
        'booking': serialize_booking(new_booking)
    }), 201

@meeting_rooms_bp.route('/api/rooms/cancel/<booking_id>', methods=['POST'])
@token_required
def cancel_booking(booking_id):
    booking = db.meeting_bookings.find_one({'booking_id': booking_id})
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404

    # Admins can cancel any booking, users can only cancel their own
    if g.current_user['role'] != 'admin' and booking['username'] != g.current_user['username']:
        return jsonify({'error': 'You can only cancel your own bookings.'}), 403

    db.meeting_bookings.delete_one({'booking_id': booking_id})
    logging.info(f"MeetingRooms: Booking {booking_id} was cancelled by '{g.current_user['username']}'.")
    return jsonify({'status': 'success', 'message': 'Booking cancelled successfully.'})

@meeting_rooms_bp.route('/api/rooms/my-bookings', methods=['GET'])
@token_required
def get_my_bookings():
    username = g.current_user['username']
    now = datetime.now(timezone.utc)

    # Find active or future bookings for the user
    bookings = db.meeting_bookings.find({
        'username': username,
        'end_time': {'$gt': now}
    }).sort('start_time', 1)

    return jsonify([serialize_booking(b) for b in bookings])

@meeting_rooms_bp.route('/api/rooms/bookings-for-week', methods=['GET'])
@token_required
def get_bookings_for_week():
    start_of_week_str = request.args.get('start_date')
    if not start_of_week_str:
        return jsonify({'error': 'start_date parameter is required'}), 400

    try:
        # The start_date from the client is the start of Monday in the user's local time, converted to UTC.
        # We need to ensure we query for the full week from that point.
        start_of_view = datetime.fromisoformat(start_of_week_str.replace('Z', '+00:00'))
        # The view ends exactly 7 days after it starts to cover the whole week.
        end_of_view = start_of_view + timedelta(days=7) # Query for 7 days to catch bookings that might span the weekend
    except ValueError:
        return jsonify({'error': 'Invalid date format for start_date'}), 400

    # Correct query to find all bookings that *overlap* with the selected week.
    # A booking overlaps if it starts before the week ends AND ends after the week starts.
    bookings = db.meeting_bookings.find({
        'start_time': {'$lt': end_of_view},
        'end_time': {'$gt': start_of_view}
    }).sort('start_time', 1)

    return jsonify([serialize_booking(b) for b in bookings])