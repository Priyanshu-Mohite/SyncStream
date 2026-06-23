import { useState } from 'react'
import './App.css'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Authentication from './pages/Authentication'

function App() {

  return (
    <>
      <Routes>
        {/* <Route path="/" element={} /> */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Authentication />} />
      </Routes>
    </>
  )
}

export default App
