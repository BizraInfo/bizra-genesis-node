import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OnboardingProvider } from './contexts/OnboardingContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import MainLayout from './layouts/MainLayout'
import Login from './pages/login'
import Register from './pages/register'
import Dashboard from './pages/dashboard'
import Agents from './pages/agents'
import Synthesis from './pages/synthesis'
import Monitoring from './pages/monitoring'
import Settings from './pages/settings'
import Admin from './pages/Admin'
import Achievements from './pages/achievements'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import ProtectedRoute from './components/ProtectedRoute'
import TelemetryPlayground from './pages/TelemetryPlayground'
import Landing from './pages/Landing'
import PerformanceCommandCenter from './pages/PerformanceCommandCenter'

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

          {/* Performance Command Center - APEX & SNR Dashboard */}
          <Route path="/performance" element={<PerformanceCommandCenter />} />
          <Route path="/command-center" element={<PerformanceCommandCenter />} />

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
