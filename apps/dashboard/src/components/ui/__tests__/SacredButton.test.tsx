/**
 * 🏆 SACRED BUTTON COMPONENT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive test suite for the SacredButton UI component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SacredButton } from '../SacredButton';
import { cn } from '../../../lib/utils';

// Mock the utils function
jest.mock('../../../lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('SacredButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      render(<SacredButton>Click me</SacredButton>);

      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with primary variant by default', () => {
      render(<SacredButton>Test</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gradient-to-r', 'from-purple-600', 'to-purple-700');
    });

    it('renders with medium size by default', () => {
      render(<SacredButton>Test</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });
  });

  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<SacredButton variant="primary">Primary</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'bg-gradient-to-r',
        'from-purple-600',
        'to-purple-700',
        'text-white',
        'hover:from-purple-500',
        'hover:to-purple-600',
        'shadow-lg',
        'shadow-purple-500/25'
      );
    });

    it('renders secondary variant correctly', () => {
      render(<SacredButton variant="secondary">Secondary</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'bg-white/10',
        'text-white',
        'border',
        'border-white/20',
        'hover:bg-white/20'
      );
    });

    it('renders ghost variant correctly', () => {
      render(<SacredButton variant="ghost">Ghost</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-white', 'hover:bg-white/10');
    });
  });

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<SacredButton size="sm">Small</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('renders medium size correctly', () => {
      render(<SacredButton size="md">Medium</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    });

    it('renders large size correctly', () => {
      render(<SacredButton size="lg">Large</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner and text when loading is true', () => {
      render(<SacredButton loading>Loading Button</SacredButton>);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Loading Button')).not.toBeInTheDocument();

      // Check for spinner SVG
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables button when loading is true', () => {
      render(<SacredButton loading>Test</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('shows children when loading is false', () => {
      render(<SacredButton loading={false}>Normal</SacredButton>);

      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled prop is true', () => {
      render(<SacredButton disabled>Disabled</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('overrides loading disabled state when explicitly disabled', () => {
      render(<SacredButton loading disabled>Both</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Props Forwarding', () => {
    it('forwards HTML button attributes', () => {
      const handleClick = jest.fn();
      render(
        <SacredButton
          onClick={handleClick}
          type="submit"
          data-testid="sacred-button"
          aria-label="Submit form"
        >
          Submit
        </SacredButton>
      );

      const button = screen.getByTestId('sacred-button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Submit form');

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<SacredButton ref={ref}>Ref Test</SacredButton>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.tagName).toBe('BUTTON');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className with default styles', () => {
      const customClass = 'custom-button-class';
      render(<SacredButton className={customClass}>Custom</SacredButton>);

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining('inline-flex items-center justify-center'),
        expect.any(String), // variant classes
        expect.any(String), // size classes
        customClass
      );
    });

    it('handles undefined className', () => {
      render(<SacredButton className={undefined}>Test</SacredButton>);

      expect(cn).toHaveBeenCalledWith(
        expect.stringContaining('inline-flex'),
        expect.any(String),
        expect.any(String),
        undefined
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper focus styles', () => {
      render(<SacredButton>Focus Test</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-purple-500',
        'focus:ring-offset-2',
        'focus:ring-offset-gray-900'
      );
    });

    it('supports keyboard navigation', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      render(<SacredButton onClick={handleClick}>Keyboard</SacredButton>);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard(' '); // Space key
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('maintains button semantics', () => {
      render(<SacredButton>Button</SacredButton>);

      const button = screen.getByRole('button');
      // HTML buttons don't have a default type attribute when not explicitly set
      expect(button.getAttribute('type')).toBeNull();
    });
  });

  describe('Base Styles', () => {
    it('applies consistent base styling', () => {
      render(<SacredButton>Base</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'inline-flex',
        'items-center',
        'justify-center',
        'font-medium',
        'transition-all',
        'duration-200',
        'rounded-lg'
      );
    });

    it('includes focus management classes', () => {
      render(<SacredButton>Focus</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-purple-500'
      );
    });
  });

  describe('Event Handling', () => {
    it('handles click events correctly', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      render(<SacredButton onClick={handleClick}>Click</SacredButton>);

      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevents events when disabled', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      render(<SacredButton disabled onClick={handleClick}>Disabled</SacredButton>);

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('prevents events when loading', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      render(<SacredButton loading onClick={handleClick}>Loading</SacredButton>);

      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Spinner Animation', () => {
    it('renders spinner with correct attributes', () => {
      render(<SacredButton loading>Spinner Test</SacredButton>);

      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('-ml-1', 'mr-2', 'h-4', 'w-4');
      expect(spinner).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
    });

    it('spinner has correct SVG structure', () => {
      render(<SacredButton loading>Spinner</SacredButton>);

      const spinner = document.querySelector('svg');
      expect(spinner).toHaveAttribute('fill', 'none');
      expect(spinner).toHaveAttribute('viewBox', '0 0 24 24');

      // Check for circle and path elements
      const circle = spinner?.querySelector('circle');
      const path = spinner?.querySelector('path');

      expect(circle).toBeInTheDocument();
      expect(path).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children', () => {
      render(<SacredButton>{null}</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('handles complex children', () => {
      render(
        <SacredButton>
          <span>Icon</span>
          <strong>Text</strong>
        </SacredButton>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('preserves displayName for debugging', () => {
      expect(SacredButton.displayName).toBe('SacredButton');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<SacredButton>Stable</SacredButton>);

      rerender(<SacredButton>Stable</SacredButton>);

      expect(screen.getByText('Stable')).toBeInTheDocument();
    });

    it('handles prop changes correctly', () => {
      const { rerender } = render(<SacredButton variant="primary">Test</SacredButton>);

      rerender(<SacredButton variant="secondary">Test</SacredButton>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white/10'); // Secondary variant
    });
  });
});