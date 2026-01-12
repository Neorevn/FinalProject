from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from bson import json_util
from bson.objectid import ObjectId
import json
from .database import db
from .auth import token_required, admin_required

chat_bp = Blueprint('chat_bp', __name__)

@chat_bp.route('/api/chat/messages', methods=['GET'])
@token_required
def get_messages():
    # Get last 50 messages, sorted by timestamp descending (newest first)
    # Then reverse them to send oldest first to the client
    cursor = db.chat_messages.find({}).sort('timestamp', -1).limit(50)
    messages = list(cursor)
    return json.loads(json_util.dumps(messages[::-1]))

@chat_bp.route('/api/chat/send', methods=['POST'])
@token_required
def send_message():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'Message content is required'}), 400

    new_message = {
        'username': g.current_user['username'],
        'message': data['message'],
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    
    db.chat_messages.insert_one(new_message)
    
    return json.loads(json_util.dumps(new_message)), 201

@chat_bp.route('/api/chat/messages/<message_id>', methods=['DELETE'])
@admin_required
def delete_message(message_id):
    try:
        result = db.chat_messages.delete_one({'_id': ObjectId(message_id)})
        if result.deleted_count > 0:
            return jsonify({'message': 'Message deleted successfully'}), 200
        return jsonify({'error': 'Message not found'}), 404
    except Exception:
        return jsonify({'error': 'Invalid message ID'}), 400