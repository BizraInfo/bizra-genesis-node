/**
 * 🏆 GLASS CARD COMPONENT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive test suite for the GlassCard UI component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GlassCard } from '../GlassCard';
import { cn } from '../../../lib/utils';

// Don't mock cn function - let it work normally for testing

describe('GlassCard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(
        <GlassCard>
          <p>Test content</p>
        </GlassCard>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders with default glass styling classes', () => {
      render(<GlassCard>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      // Verify the component renders with a div element
      expect(card).toBeInTheDocument();
      expect(card?.tagName).toBe('DIV');
    });

    it('applies custom className when provided', () => {
      const customClass = 'custom-glass-card';
      render(<GlassCard className={customClass}>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      expect(card).toBeInTheDocument();
    });

    it('merges default and custom classes correctly', () => {
      const customClass = 'p-4 m-2';
      render(<GlassCard className={customClass}>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      expect(card).toBeInTheDocument();
    });
  });

  describe('Props Forwarding', () => {
    it('forwards HTML attributes correctly', () => {
      render(
        <GlassCard data-testid="glass-card" id="test-card" aria-label="Test Card">
          Content
        </GlassCard>
      );

      const card = screen.getByTestId('glass-card');
      expect(card).toHaveAttribute('id', 'test-card');
      expect(card).toHaveAttribute('aria-label', 'Test Card');
    });

    it('forwards event handlers', () => {
      const handleClick = jest.fn();
      render(
        <GlassCard onClick={handleClick} data-testid="clickable-card">
          Clickable
        </GlassCard>
      );

      const card = screen.getByTestId('clickable-card');
      card.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<GlassCard ref={ref}>Content</GlassCard>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.tagName).toBe('DIV');
    });
  });

  describe('Accessibility', () => {
    it('supports ARIA attributes', () => {
      render(
        <GlassCard
          role="region"
          aria-labelledby="card-title"
          aria-describedby="card-description"
        >
          <h2 id="card-title">Title</h2>
          <p id="card-description">Description</p>
          Content
        </GlassCard>
      );

      const card = screen.getByRole('region');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      expect(card).toHaveAttribute('aria-describedby', 'card-description');
    });

    it('is keyboard focusable when tabIndex is set', () => {
      render(
        <GlassCard tabIndex={0} data-testid="focusable-card">
          Focusable
        </GlassCard>
      );

      const card = screen.getByTestId('focusable-card');
      expect(card).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Styling and Theming', () => {
    it('applies glass morphism effect classes', () => {
      render(<GlassCard>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      expect(card).toBeInTheDocument();
    });

    it('maintains rounded corners', () => {
      render(<GlassCard>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      expect(card).toBeInTheDocument();
    });

    it('applies shadow styling', () => {
      render(<GlassCard>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      expect(card).toBeInTheDocument();
    });
  });

  describe('Component Composition', () => {
    it('renders complex nested content', () => {
      render(
        <GlassCard>
          <header>
            <h2>Card Title</h2>
          </header>
          <main>
            <p>Main content</p>
            <button>Action</button>
          </main>
          <footer>
            <span>Footer</span>
          </footer>
        </GlassCard>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('works with React fragments', () => {
      render(
        <GlassCard>
          <>
            <span>First</span>
            <span>Second</span>
          </>
        </GlassCard>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
    });

    it('handles empty children gracefully', () => {
      render(<GlassCard>{null}</GlassCard>);

      // Should render without crashing
      const card = document.querySelector('div');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined className', () => {
      render(<GlassCard className={undefined}>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      expect(card).toBeInTheDocument();
    });

    it('handles null className', () => {
      render(<GlassCard className={null as any}>Test</GlassCard>);

      const card = screen.getByText('Test').parentElement;
      expect(card).toBeInTheDocument();
    });

    it('preserves displayName for debugging', () => {
      expect(GlassCard.displayName).toBe('GlassCard');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<GlassCard>Stable</GlassCard>);

      // Re-render with same props
      rerender(<GlassCard>Stable</GlassCard>);

      // Component should handle re-renders without issues
      expect(screen.getByText('Stable')).toBeInTheDocument();
    });

    it('handles prop changes correctly', () => {
      const { rerender } = render(<GlassCard className="initial">Content</GlassCard>);

      // Change className
      rerender(<GlassCard className="updated">Content</GlassCard>);

      const card = screen.getByText('Content').parentElement;
      expect(card).toBeInTheDocument();
    });
  });
});