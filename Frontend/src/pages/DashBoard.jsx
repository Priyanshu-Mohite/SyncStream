import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { createMeeting, joinMeeting } from '../services/meeting.service.js';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. CREATE MEETING HANDLER
  const handleCreateMeeting = async () => {
    setIsLoading(true);
    setError('');
    
    try {   
      const data = await createMeeting();
      navigate(`/meeting/${data.meetingCode}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create a new meeting.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. JOIN MEETING HANDLER
  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a valid meeting code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await joinMeeting(joinCode);
      navigate(`/meeting/${data.meetingCode}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join. Invalid code or meeting ended.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* NAVBAR */}
      <nav style={{ width: '100%', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#ea580c' }}>Socket Meet</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>Welcome, <strong>{user?.name || 'Guest'}</strong></span>
          <button 
            onClick={logout}
            style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#f8fafc', border: '1px solid #64748b', borderRadius: '6px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div style={{ marginTop: '80px', display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center', padding: '20px' }}>
        
        {/* CREATE MEETING CARD */}
        <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', width: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <h2 style={{ marginBottom: '15px' }}>Start a New Meeting</h2>
          <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '14px' }}>Create a secure room and invite others to join you.</p>
          <button 
            onClick={handleCreateMeeting}
            disabled={isLoading}
            style={{ width: '100%', padding: '14px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            {isLoading ? 'Creating Room...' : '+ New Meeting'}
          </button>
        </div>

        {/* JOIN MEETING CARD */}
        <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', width: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <h2 style={{ marginBottom: '15px' }}>Join a Meeting</h2>
          <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '14px' }}>Enter the meeting code provided by the host.</p>
          
          <form onSubmit={handleJoinMeeting}>
            <input 
              type="text" 
              placeholder="e.g. abc-defg-hij" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', marginBottom: '15px', textAlign: 'center', letterSpacing: '1px' }}
            />
            <button 
              type="submit"
              disabled={isLoading || !joinCode}
              style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#ea580c', border: '2px solid #ea580c', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: (isLoading || !joinCode) ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>

      </div>

      {/* ERROR BANNER */}
      {error && (
        <div style={{ marginTop: '30px', padding: '15px 30px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px' }}>
          {error}
        </div>
      )}

    </div>
  );
};

export default Dashboard;