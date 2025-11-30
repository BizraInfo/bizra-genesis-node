import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentCard } from '../AgentCard';
import { Agent } from '../../../types/agents';

const mockAgent: Agent = {
    id: '1',
    name: 'Test Agent',
    role: 'Tester',
    status: 'working',
    performance: 0.85,
    currentTask: 'Running tests'
};

describe('AgentCard', () => {
    it('renders agent details correctly', () => {
        render(<AgentCard agent={mockAgent} />);
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
        expect(screen.getByText('Tester')).toBeInTheDocument();
        expect(screen.getByText('WORKING')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('Running tests')).toBeInTheDocument();
    });

    it('calls onToggleStatus when button is clicked', () => {
        const mockToggle = jest.fn();
        render(<AgentCard agent={mockAgent} onToggleStatus={mockToggle} />);

        const button = screen.getByRole('button', { name: /deactivate/i });
        fireEvent.click(button);

        expect(mockToggle).toHaveBeenCalledWith('1');
    });

    it('displays correct status color for idle', () => {
        const idleAgent: Agent = { ...mockAgent, status: 'idle' };
        render(<AgentCard agent={idleAgent} />);
        expect(screen.getByText('IDLE')).toHaveClass('text-yellow-500');
    });
});
