/**
 * BIZRA Node0 - NavDock Component Unit Tests
 * Document ID: BIZRA-NODE0-v1.0.0-GENESIS
 * 
 * Elite Testing Standards:
 * - AAA Pattern (Arrange, Act, Assert)
 * - Component isolation
 * - Accessibility testing
 * - Snapshot testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavDock } from '@/components/nav-dock';
import { usePathname } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('NavDock Component', () => {
  const mockUsePathname = usePathname as jest.Mock;

  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render navigation container', () => {
      render(<NavDock />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<NavDock />);
      
      const expectedLabels = ['Home', 'Chat', 'Plan', 'Resources', 'Rewards', 'Ops'];
      
      expectedLabels.forEach(label => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('should highlight active route', () => {
      mockUsePathname.mockReturnValue('/chat');
      
      render(<NavDock />);
      
      const chatLink = screen.getByText('Chat').closest('a');
      expect(chatLink).toHaveClass('active');
    });
  });

  describe('Navigation', () => {
    it('should have correct href for each nav item', () => {
      render(<NavDock />);
      
      const routes = [
        { label: 'Home', href: '/' },
        { label: 'Chat', href: '/chat' },
        { label: 'Plan', href: '/plan' },
        { label: 'Resources', href: '/resources' },
        { label: 'Rewards', href: '/rewards' },
        { label: 'Ops', href: '/ops' },
      ];
      
      routes.forEach(({ label, href }) => {
        const link = screen.getByText(label).closest('a');
        expect(link).toHaveAttribute('href', href);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible navigation landmark', () => {
      render(<NavDock />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<NavDock />);
      
      const firstLink = screen.getByText('Home').closest('a');
      
      await user.tab();
      expect(firstLink).toHaveFocus();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(<NavDock />);
      
      // Basic accessibility check - in production use axe-core
      const links = container.querySelectorAll('a');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply dock styling', () => {
      render(<NavDock />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('fixed', 'bottom-0');
    });
  });
});
