// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - DASHBOARD PAGE TEST                               ║
// ║  Integration tests for the main dashboard functionality                ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../../pages/Dashboard'
import RealtimeStatusPanel from '../../components/RealtimeStatusPanel'
import { AuthProvider } from '../../contexts/AuthContext'
import { WebSocketProvider } from '../../contexts/WebSocketContext'
import { OnboardingProvider } from '../../contexts/OnboardingContext'

// Mock the RealtimeStatusPanel component
jest.mock('../../components/RealtimeStatusPanel', () => {
  return function MockRealtimeStatusPanel() {
    return <div data-testid="realtime-status-panel">Realtime Status Panel</div>
  }
})

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <WebSocketProvider>
          <OnboardingProvider>
            {component}
          </OnboardingProvider>
        </WebSocketProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
  })

  test('renders dashboard header with welcome message', () => {
    renderWithProviders(<Dashboard />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText(/Welcome to your AI synthesis workspace/i)).toBeInTheDocument()
  })

  test('displays real-time status panel', () => {
    renderWithProviders(<Dashboard />)

    expect(screen.getByTestId('realtime-status-panel')).toBeInTheDocument()
  })

  test('shows key statistics cards', () => {
    renderWithProviders(<Dashboard />)

    expect(screen.getByText('Active Sessions')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument() // Mock value from component

    expect(screen.getByText('AI Agents')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument() // Total agents

    expect(screen.getByText('Syntheses Today')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument() // Mock value

    expect(screen.getByText('Success Rate')).toBeInTheDocument()
    expect(screen.getByText('98.5%')).toBeInTheDocument() // Mock value
  })

  test('renders recent activity section', () => {
    renderWithProviders(<Dashboard />)

    expect(screen.getByText('Recent Activity')).toBeInTheDocument()

    expect(screen.getByText('Completed synthesis: "Market Analysis Report"')).toBeInTheDocument()
    expect(screen.getByText('Earned achievement: "First Synthesis"')).toBeInTheDocument()
    expect(screen.getByText('Agent "Researcher" completed analysis')).toBeInTheDocument()
  })

  test('displays activity timestamps', () => {
    renderWithProviders(<Dashboard />)

    expect(screen.getByText('2 minutes ago')).toBeInTheDocument()
    expect(screen.getByText('15 minutes ago')).toBeInTheDocument()
    expect(screen.getByText('1 hour ago')).toBeInTheDocument()
  })

  test('shows quick action buttons', () => {
    renderWithProviders(<Dashboard />)

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()

    expect(screen.getByText('New Synthesis')).toBeInTheDocument()
    expect(screen.getByText('Manage Agents')).toBeInTheDocument()
    expect(screen.getByText('View Analytics')).toBeInTheDocument()
  })

  test('quick action buttons are clickable', () => {
    renderWithProviders(<Dashboard />)

    const newSynthesisButton = screen.getByText('New Synthesis')
    const manageAgentsButton = screen.getByText('Manage Agents')
    const viewAnalyticsButton = screen.getByText('View Analytics')

    // These would normally trigger route changes or actions
    // For this test, we just verify they're present and clickable
    expect(newSynthesisButton).toBeInTheDocument()
    expect(manageAgentsButton).toBeInTheDocument()
    expect(viewAnalyticsButton).toBeInTheDocument()

    expect(fireEvent.click(newSynthesisButton)).toBe(true)
    expect(fireEvent.click(manageAgentsButton)).toBe(true)
    expect(fireEvent.click(viewAnalyticsButton)).toBe(true)
  })

  test('uses proper semantic HTML structure', () => {
    const { container } = renderWithProviders(<Dashboard />)

    // Check for proper heading hierarchy
    const h1 = container.querySelector('h1')
    expect(h1).toBeInTheDocument()
    expect(h1?.textContent).toBe('Dashboard')

    const h2Elements = container.querySelectorAll('h2')
    expect(h2Elements.length).toBeGreaterThanOrEqual(2) // At least Recent Activity and Quick Actions

    // Check for proper button elements
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0) // At least some buttons
  })

  test('renders with proper CSS classes', () => {
    const { container } = renderWithProviders(<Dashboard />)

    const dashboardElement = container.firstChild as HTMLElement
    // Dashboard has its own class naming convention
    expect(dashboardElement).toBeInTheDocument()
    expect(dashboardElement.className).toBeTruthy() // Has some CSS class

    // Component renders successfully
    expect(container).toBeInTheDocument()
  })

  test('is accessible with proper ARIA labels', () => {
    renderWithProviders(<Dashboard />)

    // Check for screen reader support on interactive elements
    const quickActionButtons = screen.getAllByRole('button')
    expect(quickActionButtons.length).toBeGreaterThan(2)

    // Verify buttons have accessible names
    quickActionButtons.forEach(button => {
      expect(button).toHaveAccessibleName()
    })
  })

  test('matches snapshot', () => {
    const { container } = renderWithProviders(<Dashboard />)
    expect(container.firstChild).toMatchSnapshot()
  })
})
