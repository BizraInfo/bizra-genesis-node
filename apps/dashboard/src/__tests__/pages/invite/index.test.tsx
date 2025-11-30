// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE CODE ENTRY PAGE TESTS                        ║
// ║  Unit tests for /invite page - manual code entry functionality           ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import InviteCodePage from '../../../pages/invite/index';
import * as inviteService from '../../../services/invite';

// Mock the invite service
jest.mock('../../../services/invite');

// Mock CSS files
jest.mock('../../../styles/invite.css', () => ({}));

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
    useRouter: () => ({
        push: mockPush,
        pathname: '/invite',
        query: {},
    }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
    const motionProps = [
        'initial', 'animate', 'exit', 'variants', 'whileHover', 'whileTap',
        'whileFocus', 'whileDrag', 'whileInView', 'transition', 'layoutId',
        'layout', 'drag', 'dragConstraints', 'onAnimationStart', 'onAnimationComplete'
    ];

    const filterMotionProps = (props: any) => {
        const filtered: any = {};
        Object.keys(props).forEach(key => {
            if (!motionProps.includes(key)) {
                filtered[key] = props[key];
            }
        });
        return filtered;
    };

    const createMotionComponent = (tag: string) => {
        const Component = React.forwardRef(({ children, ...props }: any, ref: any) => {
            const Tag = tag as keyof JSX.IntrinsicElements;
            const filteredProps = filterMotionProps(props);
            return <Tag ref={ref} {...filteredProps}>{children}</Tag>;
        });
        Component.displayName = `motion.${tag}`;
        return Component;
    };

    return {
        motion: {
            div: createMotionComponent('div'),
            form: createMotionComponent('form'),
            input: createMotionComponent('input'),
            button: createMotionComponent('button'),
            span: createMotionComponent('span'),
            p: createMotionComponent('p'),
            a: createMotionComponent('a'),
            label: createMotionComponent('label'),
            h1: createMotionComponent('h1'),
            h2: createMotionComponent('h2'),
            section: createMotionComponent('section'),
        },
        AnimatePresence: ({ children }: any) => children,
    };
});

const mockedInviteService = inviteService as jest.Mocked<typeof inviteService>;

describe('InviteCodePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderPage = () => {
        return render(
            <MemoryRouter initialEntries={['/invite']}>
                <InviteCodePage />
            </MemoryRouter>
        );
    };

    // -------------------------------------------------------------------------
    // Render Tests
    // -------------------------------------------------------------------------

    describe('Rendering', () => {
        it('should render the invite code entry page', () => {
            renderPage();

            // Should have heading
            expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

            // Should have code input
            expect(screen.getByPlaceholderText(/enter.*code|invite.*code/i)).toBeInTheDocument();

            // Should have submit button
            expect(screen.getByRole('button', { name: /continue|verify|submit/i })).toBeInTheDocument();
        });

        it('should display welcome/instruction text', () => {
            renderPage();

            // Should explain what the page is for
            expect(screen.getByText(/invite|alpha|genesis/i)).toBeInTheDocument();
        });

        it('should have BIZRA branding', () => {
            renderPage();

            // Logo or BIZRA text should be present
            expect(screen.getByText(/bizra/i)).toBeInTheDocument();
        });
    });

    // -------------------------------------------------------------------------
    // Form Interaction Tests
    // -------------------------------------------------------------------------

    describe('Form Interactions', () => {
        it('should allow typing invite code', async () => {
            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'TEST-CODE-1234');

            expect(codeInput).toHaveValue('TEST-CODE-1234');
        });

        it('should format code with uppercase', async () => {
            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'test-code-1234');

            // Code should be converted to uppercase
            expect(codeInput).toHaveValue('TEST-CODE-1234');
        });

        it('should trim whitespace from code', async () => {
            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, '  TEST-CODE-1234  ');
            
            // Blur to trigger formatting
            await user.click(document.body);

            // Value should be trimmed
            expect(codeInput).toHaveValue('TEST-CODE-1234');
        });
    });

    // -------------------------------------------------------------------------
    // Validation Tests
    // -------------------------------------------------------------------------

    describe('Validation', () => {
        it('should show error when submitting empty code', async () => {
            renderPage();
            const user = userEvent.setup();

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            // Should show validation error
            await waitFor(() => {
                expect(screen.getByText(/required|enter.*code|cannot.*be.*empty/i)).toBeInTheDocument();
            });
        });

        it('should show error for invalid code format', async () => {
            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'a');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            // Should show format error
            await waitFor(() => {
                expect(screen.getByText(/invalid|format|characters/i)).toBeInTheDocument();
            });
        });

        it('should not call API with invalid input', async () => {
            renderPage();
            const user = userEvent.setup();

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            // API should not be called
            expect(mockedInviteService.validateInvite).not.toHaveBeenCalled();
        });
    });

    // -------------------------------------------------------------------------
    // API Integration Tests
    // -------------------------------------------------------------------------

    describe('API Integration', () => {
        it('should call validateInvite on valid submission', async () => {
            mockedInviteService.validateInvite.mockResolvedValue({
                valid: true,
                status: 'sent',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                email: 'test@bizra.ai',
                inviter_notes: null
            });

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'TEST-CODE-1234');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockedInviteService.validateInvite).toHaveBeenCalledWith('TEST-CODE-1234');
            });
        });

        it('should redirect to invite acceptance page on valid code', async () => {
            mockedInviteService.validateInvite.mockResolvedValue({
                valid: true,
                status: 'sent',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                email: 'test@bizra.ai',
                inviter_notes: null
            });

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'TEST-CODE-1234');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/invite/TEST-CODE-1234');
            });
        });

        it('should show error for invalid code from API', async () => {
            mockedInviteService.validateInvite.mockResolvedValue({
                valid: false,
                status: 'not_found',
                expires_at: new Date().toISOString(),
                email: '',
                inviter_notes: null
            });

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'INVALID-CODE');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/invalid|not.*found|does.*not.*exist/i)).toBeInTheDocument();
            });
        });

        it('should show error for expired code from API', async () => {
            mockedInviteService.validateInvite.mockResolvedValue({
                valid: false,
                status: 'expired',
                expires_at: new Date(Date.now() - 86400000).toISOString(),
                email: 'test@bizra.ai',
                inviter_notes: null
            });

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'EXPIRED-CODE');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/expired/i)).toBeInTheDocument();
            });
        });

        it('should handle API errors gracefully', async () => {
            mockedInviteService.validateInvite.mockRejectedValue(new Error('Network error'));

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'TEST-CODE-1234');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/error|failed|try.*again/i)).toBeInTheDocument();
            });
        });
    });

    // -------------------------------------------------------------------------
    // Loading State Tests
    // -------------------------------------------------------------------------

    describe('Loading States', () => {
        it('should show loading state while validating', async () => {
            // Make API call take some time
            mockedInviteService.validateInvite.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    valid: true,
                    status: 'sent',
                    expires_at: new Date(Date.now() + 86400000).toISOString(),
                    email: 'test@bizra.ai',
                    inviter_notes: null
                }), 1000))
            );

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'TEST-CODE-1234');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            // Should show loading indicator
            expect(screen.getByText(/verifying|loading|checking/i)).toBeInTheDocument();

            // Button should be disabled
            expect(submitButton).toBeDisabled();
        });

        it('should disable input while loading', async () => {
            mockedInviteService.validateInvite.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve({
                    valid: true,
                    status: 'sent',
                    expires_at: new Date(Date.now() + 86400000).toISOString(),
                    email: 'test@bizra.ai',
                    inviter_notes: null
                }), 1000))
            );

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'TEST-CODE-1234');

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            // Input should be disabled during loading
            expect(codeInput).toBeDisabled();
        });
    });

    // -------------------------------------------------------------------------
    // Accessibility Tests
    // -------------------------------------------------------------------------

    describe('Accessibility', () => {
        it('should have accessible form labels', () => {
            renderPage();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            
            // Input should have accessible label (either aria-label or associated label)
            expect(codeInput).toHaveAttribute('aria-label') || 
                expect(screen.getByLabelText(/code/i)).toBeInTheDocument();
        });

        it('should have accessible error messages', async () => {
            renderPage();
            const user = userEvent.setup();

            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });
            await user.click(submitButton);

            await waitFor(() => {
                // Error should be announced to screen readers
                const errorElement = screen.getByText(/required|enter.*code|cannot.*be.*empty/i);
                expect(errorElement).toHaveAttribute('role', 'alert') ||
                    expect(errorElement.closest('[role="alert"]')).toBeInTheDocument();
            });
        });

        it('should be keyboard navigable', async () => {
            renderPage();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            const submitButton = screen.getByRole('button', { name: /continue|verify|submit/i });

            // Focus should start on input
            codeInput.focus();
            expect(document.activeElement).toBe(codeInput);

            // Tab should move to button
            await userEvent.tab();
            expect(document.activeElement).toBe(submitButton);
        });

        it('should allow form submission with Enter key', async () => {
            mockedInviteService.validateInvite.mockResolvedValue({
                valid: true,
                status: 'sent',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                email: 'test@bizra.ai',
                inviter_notes: null
            });

            renderPage();
            const user = userEvent.setup();

            const codeInput = screen.getByPlaceholderText(/enter.*code|invite.*code/i);
            await user.type(codeInput, 'TEST-CODE-1234');
            await user.keyboard('{Enter}');

            await waitFor(() => {
                expect(mockedInviteService.validateInvite).toHaveBeenCalled();
            });
        });
    });
});
