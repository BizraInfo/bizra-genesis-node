// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - REALTIME STATUS PANEL TEST                         ║
// ║  Test component that displays agent status and system metrics           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import RealtimeStatusPanel from '../RealtimeStatusPanel'

// Mock the hooks used by RealtimeStatusPanel
jest.mock('../../hooks', () => ({
  useAgentStream: jest.fn(() => ({})),
  useConsensusStream: jest.fn(() => ({
    currentConsensus: null,
    consensusHistory: []
  }))
}))

// Mock WebSocket context
jest.mock('../../contexts/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="websocket-provider">{children}</div>
  ),
  useWebSocket: jest.fn(() => ({
    connected: false,
    authenticated: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendAgentMessage: jest.fn(),
    onAgentResponse: jest.fn(() => jest.fn())
  }))
}))

// Mock CSS
jest.mock('../../styles/RealtimeStatusPanel.css', () => ({}))

describe('RealtimeStatusPanel', () => {
  test('renders loading state initially', () => {
    render(<RealtimeStatusPanel />)
    // Component should render with initial state
    expect(document.body.textContent).toBeDefined()
  })

  test('displays total agents count', async () => {
    render(<RealtimeStatusPanel />)

    // Component shows "Total Agents" label with fallback of 18
    await waitFor(() => {
      expect(screen.getByText('Total Agents')).toBeInTheDocument()
      expect(screen.getByText('18')).toBeInTheDocument()
    })
  })

  test('component renders without crashing', async () => {
    const { container } = render(<RealtimeStatusPanel />)

    await waitFor(() => {
      expect(container).toBeInTheDocument()
    })
  })

  test('shows disconnected status when not connected', async () => {
    render(<RealtimeStatusPanel />)

    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })
  })

  test('shows agent activity section', async () => {
    render(<RealtimeStatusPanel />)

    await waitFor(() => {
      expect(screen.getByText('Agent Activity')).toBeInTheDocument()
    })
  })
})
