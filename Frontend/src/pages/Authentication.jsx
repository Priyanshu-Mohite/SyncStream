import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginUser, registerUser, verifyOtp } from '../services/auth.service';

const Authentication = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Context se login function uthaya

  // UI Flow State
  const [currentView, setCurrentView] = useState('login'); // 'login' | 'register' | 'otp'
  
  // Form Data States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState(''); // Register hone ke baad OTP verify ke liye

  // Loading & Error States (User feedback ke liye)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Helper Functions
  const clearErrors = () => {
    setError('');
    setSuccessMsg('');
  };

  const switchToRegister = () => {
    clearErrors();
    setCurrentView('register');
  };

  const switchToLogin = () => {
    clearErrors();
    setCurrentView('login');
  };

  // ==========================================
  // API HANDLERS
  // ==========================================

  const handleLogin = async (e) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);

    try {
      // auth.service.js ka login function
      const response = await loginUser({ email, password });
      
      // Context state update karo
      login(response); 
      
      // Successfully logged in! Ab dashboard bhej do
      navigate('/dashboard'); 
    } catch (err) {
      // Axios error response ko handle karna
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);

    try {
      await registerUser({ name, email, password });
      
      // Backend ne email bhej diya hoga. Ab OTP screen par jao.
      setPendingEmail(email);
      setSuccessMsg('OTP sent to your email. Please check your inbox.');
      setCurrentView('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearErrors();
    setIsLoading(true);

    try {
      await verifyOtp({ email: pendingEmail, otp });
      
      // OTP Sahi nikla! Ab login screen par bhej do usko bolkar ki login kar le.
      setSuccessMsg('Email verified successfully! You can now login.');
      setCurrentView('login');
      // Thoda safai: OTP state khali kar do agle kisi ke liye
      setOtp(''); 
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // RENDER (UI)
  // ==========================================

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '40px', backgroundColor: '#1e293b', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px' }}>
        
        {/* Error and Success Messages */}
        {error && <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
        {successMsg && <div style={{ backgroundColor: '#22c55e', color: 'white', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{successMsg}</div>}

        {/* --- VIEW 1: LOGIN --- */}
        {currentView === 'login' && (
          <form onSubmit={handleLogin}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#f8fafc' }}>Login to Socket Meet</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
              />
            </div>

            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
              Don't have an account? <span onClick={switchToRegister} style={{ color: '#ea580c', cursor: 'pointer', textDecoration: 'underline' }}>Register here</span>
            </p>
          </form>
        )}

        {/* --- VIEW 2: REGISTER --- */}
        {currentView === 'register' && (
          <form onSubmit={handleRegister}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#f8fafc' }}>Create an Account</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }}
              />
            </div>

            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isLoading ? 'Registering...' : 'Register'}
            </button>

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
              Already have an account? <span onClick={switchToLogin} style={{ color: '#ea580c', cursor: 'pointer', textDecoration: 'underline' }}>Login here</span>
            </p>
          </form>
        )}

        {/* --- VIEW 3: OTP --- */}
        {currentView === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#f8fafc' }}>Verify Email</h2>
            <p style={{ textAlign: 'center', marginBottom: '25px', fontSize: '14px', color: '#94a3b8' }}>
              Enter the 6-digit code sent to <br/><strong style={{color: '#ea580c'}}>{pendingEmail}</strong>
            </p>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#94a3b8' }}>OTP Code</label>
              <input 
                type="text" 
                required 
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', textAlign: 'center', fontSize: '20px', letterSpacing: '4px' }}
              />
            </div>

            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
              Entered wrong email? <span onClick={switchToRegister} style={{ color: '#ea580c', cursor: 'pointer', textDecoration: 'underline' }}>Go back</span>
            </p>
          </form>
        )}

      </div>
    </div>
  );
};

export default Authentication;