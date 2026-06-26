import React from 'react';
import { useParams } from 'react-router-dom';

const MeetingRoom = () => {
  // URL se meeting code extract karna
  const { meetingCode } = useParams();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      <h1>Welcome to the Meeting Room</h1>
      <h2 style={{ color: '#ea580c', letterSpacing: '2px' }}>{meetingCode}</h2>
      <p style={{ marginTop: '20px', color: '#94a3b8' }}>
        Yahan par humara Socket.io aur WebRTC ka connection setup hoga.
      </p>
    </div>
  );
};

export default MeetingRoom;