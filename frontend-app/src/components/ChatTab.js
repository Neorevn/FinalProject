import React, { useState, useEffect, useRef } from 'react';
import './ChatTab.css';

const ChatTab = ({ currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        fetchMessages();
        
        // Poll for new messages every 3 seconds
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chat/messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: newMessage })
            });

            if (response.ok) {
                setNewMessage('');
                fetchMessages(); // Refresh immediately
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleDelete = async (messageId) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/chat/messages/${messageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchMessages();
            } else {
                alert("Failed to delete message");
            }
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    };

    return (
        <div className="chat-container">
            <div className="chat-messages">
                {loading && <div className="loading">Loading chat history...</div>}
                {messages.length === 0 && !loading && (
                    <div className="no-messages">No messages yet. Be the first to say hello!</div>
                )}
                {messages.map((msg, index) => (
                    <div key={msg._id?.$oid || index} className="chat-message">
                        <div className="message-header">
                            <span className="username">{msg.username}</span>
                            <span className="timestamp">{new Date(msg.timestamp).toLocaleString()}</span>
                            {isAdmin && <button className="delete-btn" onClick={() => handleDelete(msg._id.$oid)}>×</button>}
                        </div>
                        <div className="message-body">{msg.message}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-area">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

export default ChatTab;