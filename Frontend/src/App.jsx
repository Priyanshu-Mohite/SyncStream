import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Authentication from './pages/Authentication'
import ProtectedRoute from './components/ProtectedRoute' // Bouncer import kiya
import Dashboard from './pages/DashBoard' 
import PublicRoute from './components/PublicRoute'
import MeetingRoom from './pages/MeetingRoom'

function App() {
  return (
    <>
      <Routes>
        {/* ==========================================
            PUBLIC ROUTES (Sirf Logged-out users ke liye)
        ========================================== */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/auth" 
          element={
            <PublicRoute>
              <Authentication />
            </PublicRoute>
          } 
        />

        {/* ==========================================
            PROTECTED ROUTES (Sirf Logged-in users ke liye)
        ========================================== */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/meeting/:meetingCode" 
          element={
            <ProtectedRoute>
              <MeetingRoom />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </>
  )
}

export default App