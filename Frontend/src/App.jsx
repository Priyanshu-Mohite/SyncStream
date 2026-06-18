import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Authentication from './pages/Authentication'

function App() {
  const [count, setCount] = useState(0)

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
