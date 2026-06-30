import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const SERVER_URL = "http://localhost:8080";

const MeetingRoom = () => {
  const { meetingCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // User data for future use

  // Sockets & State
  const socketRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null); // Auto-scroll ke liye

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ==========================================
  // SOCKET.IO CONNECTION & LIFECYCLE
  // ==========================================
  useEffect(() => {
    // 1. Initialize Socket Connection
    socketRef.current = io(SERVER_URL, {
      withCredentials: true, // Backend cors credentials match karne ke liye
    });

    // 2. Join the Specific Meeting Room
    socketRef.current.emit("join-call", meetingCode);

    // 3. Listen for Incoming Chat Messages
    // Backend se aane wala messageData: { sender: socket.id, text: message, time: ... }
    socketRef.current.on("chat-message", (messageData) => {
      setMessages((prevMessages) => [...prevMessages, messageData]);
    });

    // 4. Listen for User Joined/Left (System Messages)
    socketRef.current.on("user-joined", (socketId, allUsersInRoom) => {
      console.log(`User ${socketId} joined. Total users:`, allUsersInRoom);
      // Optional: UI me system notification add kar sakte hain
    });

    socketRef.current.on("user-left", (socketId) => {
      console.log(`User ${socketId} left the room.`);
    });

    // 5. Cleanup on Unmount (Sabse important step memory leaks rokne ke liye)
    return () => {
      socketRef.current.disconnect();
    };
  }, [meetingCode]);

  // ==========================================
  // MESSAGE SENDER LOGIC
  // ==========================================
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Backend ko 'chat-message' event emit karo
    socketRef.current.emit("chat-message", meetingCode, newMessage);
    
    // Note: Hum manually setMessages update nahi kar rahe hain.
    // Backend us message ko sabko (including sender) wapas bhejega 'chat-message' event ke through.
    setNewMessage("");
  };

  const handleLeaveMeeting = () => {
    navigate('/dashboard');
  };

  // ==========================================
  // UI RENDER
  // ==========================================
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* LEFT SIDE: VIDEO GRID AREA (Placeholder for Phase 5) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#1e293b', padding: '15px 25px', borderRadius: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Room: <span style={{ color: '#ea580c' }}>{meetingCode}</span></h2>
          <button 
            onClick={handleLeaveMeeting}
            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Leave Call
          </button>
        </div>

        {/* Video Grid Placeholder */}
        <div style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px dashed #334155' }}>
          <h3 style={{ color: '#94a3b8' }}>WebRTC Video Streams Will Appear Here</h3>
        </div>

      </div>

      {/* RIGHT SIDE: TEXT CHAT AREA */}
      <div style={{ width: '350px', backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', fontWeight: 'bold', fontSize: '18px' }}>
          Meeting Chat
        </div>

        {/* Chat Messages Display */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg, index) => {
            const isMyMessage = msg.sender === socketRef.current?.id;
            return (
              <div key={index} style={{ alignSelf: isMyMessage ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px', textAlign: isMyMessage ? 'right' : 'left' }}>
                  {isMyMessage ? 'You' : `User (${msg.sender.substring(0, 4)})`} • {msg.time}
                </div>
                <div style={{ 
                  backgroundColor: isMyMessage ? '#ea580c' : '#334155', 
                  padding: '12px 16px', 
                  borderRadius: isMyMessage ? '15px 15px 0px 15px' : '15px 15px 15px 0px',
                  wordWrap: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} /> {/* Auto-scroll target */}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid #334155', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
          />
          <button type="submit" disabled={!newMessage.trim()} style={{ padding: '0 20px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
            Send
          </button>
        </form>

      </div>

    </div>
  );
};

export default MeetingRoom;