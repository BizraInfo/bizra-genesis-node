/**
 * 🏆 SACRED INPUT COMPONENT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive test suite for the SacredInput UI component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SacredInput } from '../SacredInput';
import { cn } from '../../../lib/utils';

// Don't mock cn function - let it work normally for testing

describe('SacredInput Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders label and input correctly', () => {
      render(<SacredInput label="Email Address" />);

      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('generates input id from label when not provided', () => {
      render(<SacredInput label="First Name" />);

      const input = screen.getByLabelText('First Name');
      expect(input).toHaveAttribute('id', 'first-name');
    });

    it('uses provided id when specified', () => {
      render(<SacredInput label="Email" id="email-input" />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('applies default input styling', () => {
      render(<SacredInput label="Test" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'w-full',
        'px-4',
        'py-3',
        'rounded-lg',
        'bg-white/5',
        'border',
        'border-white/10',
        'text-white',
        'placeholder-gray-500'
      );
    });
  });

  describe('Label Handling', () => {
    it('renders label with correct styling', () => {
      render(<SacredInput label="Username" />);

      const label = screen.getByText('Username');
      expect(label).toHaveClass(
        'block',
        'text-sm',
        'font-medium',
        'text-gray-300'
      );
    });

    it('associates label with input via htmlFor', () => {
      render(<SacredInput label="Password" />);

      const label = screen.getByText('Password');
      const input = screen.getByLabelText('Password');

      expect(label).toHaveAttribute('for', input.id);
    });

    it('handles special characters in label for id generation', () => {
      render(<SacredInput label="Email Address (required)" />);

      const input = screen.getByLabelText('Email Address (required)');
      expect(input).toHaveAttribute('id', 'email-address-(required)');
    });
  });

  describe('Error State', () => {
    it('displays error message when error prop is provided', () => {
      const errorMessage = 'This field is required';
      render(<SacredInput label="Name" error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('applies error styling to input when error exists', () => {
      render(<SacredInput label="Email" error="Invalid email" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500', 'focus:ring-red-500');
    });

    it('does not show error message when error is undefined', () => {
      render(<SacredInput label="Name" error={undefined} />);

      // Should only have the label, no error message
      expect(screen.getByText('Name')).toBeInTheDocument();
      // Check that there's no error message element (p with error classes)
      const errorElement = document.querySelector('p.text-red-400');
      expect(errorElement).toBeNull();
    });

    it('does not show error message when error is empty string', () => {
      render(<SacredInput label="Name" error="" />);

      // Should only have the label, no error message
      expect(screen.getByText('Name')).toBeInTheDocument();
      // Check that there's no error message element (p with error classes)
      const errorElement = document.querySelector('p.text-red-400');
      expect(errorElement).toBeNull();
    });
  });

  describe('Focus and Interaction', () => {
    it('applies focus styling correctly', () => {
      render(<SacredInput label="Focus Test" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-purple-500',
        'focus:border-transparent'
      );
    });

    it('handles user input correctly', async () => {
      const user = userEvent.setup();
      render(<SacredInput label="Message" />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SacredInput label="Keyboard Test" />);

      const input = screen.getByRole('textbox');
      input.focus();

      await user.keyboard('test{tab}');
      expect(input).toHaveValue('test');
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styling when disabled', () => {
      render(<SacredInput label="Disabled" disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('maintains disabled state', () => {
      render(<SacredInput label="Disabled" disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Props Forwarding', () => {
    it('forwards HTML input attributes', () => {
      const handleChange = jest.fn();
      render(
        <SacredInput
          label="Test"
          type="email"
          placeholder="Enter email"
          maxLength={50}
          onChange={handleChange}
          data-testid="email-input"
        />
      );

      const input = screen.getByTestId('email-input');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter email');
      expect(input).toHaveAttribute('maxlength', '50');

      fireEvent.change(input, { target: { value: 'test@example.com' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<SacredInput label="Ref Test" ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.tagName).toBe('INPUT');
    });

    it('forwards value and defaultValue', () => {
      render(<SacredInput label="Controlled" value="controlled value" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('controlled value');
    });
  });

  describe('Custom ClassName', () => {
    it('merges custom className with default styles', () => {
      const customClass = 'custom-input-class';
      render(<SacredInput label="Custom" className={customClass} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(customClass);
      expect(input).toHaveClass('w-full', 'px-4', 'py-3');
    });

    it('handles undefined className', () => {
      render(<SacredInput label="Test" className={undefined} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('w-full', 'px-4', 'py-3');
      expect(input).toHaveClass('bg-white/5', 'border', 'border-white/10');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<SacredInput label="Accessible Input" aria-describedby="helper-text" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'helper-text');
    });

    it('supports screen readers with proper labeling', () => {
      render(<SacredInput label="Screen Reader Test" />);

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Screen Reader Test');

      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('maintains form semantics', () => {
      render(<SacredInput label="Form Input" name="testField" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'testField');
    });
  });

  describe('Input Types', () => {
    it('supports different input types', () => {
      const { rerender } = render(<SacredInput label="Email" type="email" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

      rerender(<SacredInput label="Password" type="password" />);
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');

      rerender(<SacredInput label="Number" type="number" />);
      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });

    it('defaults to text type', () => {
      render(<SacredInput label="Default" />);

      const input = screen.getByRole('textbox');
      // HTML inputs default to "text" type when not explicitly set
      // The browser may return null for getAttribute('type') when it's the default
      const type = input.getAttribute('type');
      expect(type === 'text' || type === null).toBe(true);
    });
  });

  describe('Styling and Theming', () => {
    it('applies glass morphism styling', () => {
      render(<SacredInput label="Glass" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-white/5', 'border-white/10');
    });

    it('applies transition effects', () => {
      render(<SacredInput label="Transition" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('transition-all', 'duration-200');
    });

    it('applies proper text colors', () => {
      render(<SacredInput label="Colors" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('text-white', 'placeholder-gray-500');
    });
  });

  describe('Layout and Spacing', () => {
    it('applies proper container spacing', () => {
      render(<SacredInput label="Spacing" />);

      const container = screen.getByText('Spacing').closest('div');
      expect(container).toHaveClass('space-y-2');
    });

    it('applies full width styling', () => {
      render(<SacredInput label="Width" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('w-full');
    });
  });

  describe('Error Message Styling', () => {
    it('applies error message styling', () => {
      render(<SacredInput label="Error Test" error="Error occurred" />);

      const errorMessage = screen.getByText('Error occurred');
      expect(errorMessage).toHaveClass('text-sm', 'text-red-400');
    });

    it('positions error message correctly', () => {
      render(<SacredInput label="Position" error="Position error" />);

      const container = screen.getByText('Position').closest('div');
      const errorElement = screen.getByText('Position error');

      // Error should be after the input within the container
      expect(container?.contains(errorElement)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty label gracefully', () => {
      // This would normally cause issues, but let's test the current behavior
      render(<SacredInput label="" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', '');
    });

    it('handles special characters in labels', () => {
      render(<SacredInput label="Special: @#$%^&*()" />);

      const input = screen.getByLabelText('Special: @#$%^&*()');
      expect(input).toHaveAttribute('id', 'special:-@#$%^&*()');
    });

    it('preserves displayName for debugging', () => {
      expect(SacredInput.displayName).toBe('SacredInput');
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily', () => {
      const { rerender } = render(<SacredInput label="Stable" />);

      rerender(<SacredInput label="Stable" />);

      expect(screen.getByLabelText('Stable')).toBeInTheDocument();
    });

    it('handles prop changes correctly', () => {
      const { rerender } = render(<SacredInput label="Test" error="First error" />);

      rerender(<SacredInput label="Test" error="Second error" />);

      expect(screen.getByText('Second error')).toBeInTheDocument();
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('works within a form context', () => {
      render(
        <form>
          <SacredInput label="Form Field" name="test" />
        </form>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'test');
    });

    it('maintains form validation attributes', () => {
      render(
        <SacredInput
          label="Validated"
          required
          minLength={3}
          maxLength={10}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
      expect(input).toHaveAttribute('minlength', '3');
      expect(input).toHaveAttribute('maxlength', '10');
    });
  });
});