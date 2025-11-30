import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OnboardingProvider } from './contexts/OnboardingContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Synthesis from './pages/Synthesis'
import Monitoring from './pages/Monitoring'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import Achievements from './pages/Achievements'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import ProtectedRoute from './components/ProtectedRoute'
import TelemetryPlayground from './pages/TelemetryPlayground'
import Landing from './pages/Landing'

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <OnboardingProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="synthesis" element={<Synthesis />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<Admin />} />
          </Route>

          {/* Onboarding */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingWizard />
            </ProtectedRoute>
          } />

          {/* Telemetry Playground - Public route for validation testing */}
          <Route path="/telemetry-playground" element={<TelemetryPlayground />} />

          {/* Landing Page - Public showcase route */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/genesis" element={<Landing />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </OnboardingProvider>
      </WebSocketProvider>
    </AuthProvider>
  )
}

export default App
