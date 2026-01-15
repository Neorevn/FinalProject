import React, { useState, useEffect, useRef } from 'react';

const ChatTab = ({ currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
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
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/chat/messages', {
                headers: headers
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

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ message: newMessage })
            });

            if (response.ok) {
                setNewMessage('');
                fetchMessages(); // Refresh immediately
            } else {
                console.error("Send failed:", response.status, response.statusText);
                alert("Failed to send message. Please try again.");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Error sending message. Check console.");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (messageId) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;

        try {
            const token = localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`/api/chat/messages/${messageId}`, {
                method: 'DELETE',
                headers: headers
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
        <div className="flex flex-col h-full max-w-4xl mx-auto border border-cyan-500/30 rounded-xl bg-black/30 shadow-cyan-glow text-cyan-400">
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {loading && <div className="text-center text-cyan-400 p-5">Loading chat history...</div>}
                {messages.length === 0 && !loading && (
                    <div className="text-center text-gray-400 mt-5 italic">No messages yet. Be the first to say hello!</div>
                )}
                {Array.isArray(messages) && messages.length > 0 && messages.map((msg, index) => (
                    <div key={msg?._id?.$oid || index} className="bg-gray-900/50 p-3 rounded-lg border border-gray-600 shadow-sm">
                        <div className="flex justify-between items-center mb-1 text-sm text-gray-400">
                            <span className="font-bold text-fuchsia-400">{msg?.username}</span>
                            <span className="text-gray-500 text-xs">{new Date(msg?.timestamp).toLocaleString()}</span>
                            {isAdmin && <button className="text-red-500 hover:text-red-400 transition-colors ml-2" onClick={() => handleDelete(msg?._id?.$oid)}>×</button>}
                        </div>
                        <div className="text-gray-200">{msg?.message}</div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-5 border-t border-cyan-500/30 flex gap-3 bg-transparent">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    className="flex-1 p-3 bg-gray-900/50 border-2 border-gray-600 rounded-md text-white focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.5)] outline-none transition-all"
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={sending}
                />
                <button 
                    onClick={handleSend} 
                    disabled={sending}
                    className="bg-transparent border-2 border-fuchsia-400 text-fuchsia-400 font-bold py-2 px-6 rounded-md hover:bg-fuchsia-400 hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sending ? '...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default ChatTab;