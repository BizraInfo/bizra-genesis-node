// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - INVITE ACCEPTANCE PAGE TESTS                        ║
// ║  Unit tests for /invite/[code] page - invite acceptance & registration   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import InviteAcceptancePage from '../../../pages/invite/[code]';
import { inviteService } from '../../../services/invite';

// Mock the invite service instance methods
jest.mock('../../../services/invite', () => ({
  inviteService: {
    validateInvite: jest.fn(),
    acceptInvite: jest.fn(),
  },
  InviteService: jest.fn(),
}));

// Mock CSS files
jest.mock('../../../styles/invite.css', () => ({}));

// Mock Next.js router
const mockPush = jest.fn();
const mockQuery = { code: 'TEST-CODE-1234' };
jest.mock('next/router', () => ({
    useRouter: () => ({
        push: mockPush,
        pathname: '/invite/[code]',
        query: mockQuery,
        isReady: true,
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

// Test data
const TEST_EMAIL = 'alpha@bizra.ai';
const TEST_PASSWORD = 'SecureP@ssw0rd!';
const TEST_FULL_NAME = 'Alpha Tester';

const MOCK_VALID_INVITE = {
    valid: true,
    status: 'sent',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    email: TEST_EMAIL,
    inviter_notes: 'Welcome to the Alpha-100 program!'
};

const MOCK_EXPIRED_INVITE = {
    valid: false,
    status: 'expired',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    email: TEST_EMAIL,
    inviter_notes: null
};

const MOCK_ACCEPTED_INVITE = {
    valid: false,
    status: 'accepted',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    email: TEST_EMAIL,
    inviter_notes: null
};

const MOCK_NOT_FOUND_INVITE = {
    valid: false,
    status: 'not_found',
    expires_at: new Date().toISOString(),
    email: '',
    inviter_notes: null
};

const MOCK_ACCEPT_SUCCESS = {
    success: true,
    user_id: 'usr_test123',
    email: TEST_EMAIL,
    access_token: 'fake-jwt-token',
    expires_in: 2592000
};

describe('InviteAcceptancePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery.code = 'TEST-CODE-1234';
        // Default to valid invite
        mockedInviteService.validateInvite.mockResolvedValue(MOCK_VALID_INVITE);
    });

    const renderPage = () => {
        return render(
            <MemoryRouter initialEntries={['/invite/TEST-CODE-1234']}>
                <InviteAcceptancePage />
            </MemoryRouter>
        );
    };

    // -------------------------------------------------------------------------
    // Initial Load & Validation Tests
    // -------------------------------------------------------------------------

    describe('Initial Load', () => {
        it('should show loading state initially', () => {
            // Make validation take time
            mockedInviteService.validateInvite.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(MOCK_VALID_INVITE), 1000))
            );

            renderPage();

            expect(screen.getByText(/verifying|loading|checking/i)).toBeInTheDocument();
        });

        it('should call validateInvite with code from URL', async () => {
            renderPage();

            await waitFor(() => {
                expect(mockedInviteService.validateInvite).toHaveBeenCalledWith('TEST-CODE-1234');
            });
        });

        it('should show registration form for valid invite', async () => {
            renderPage();

            await waitFor(() => {
                expect(screen.getByLabelText(/full.*name|name/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
            });
        });

        it('should pre-fill email from invite', async () => {
            renderPage();

            await waitFor(() => {
                const emailInput = screen.getByLabelText(/email/i);
                expect(emailInput).toHaveValue(TEST_EMAIL);
                expect(emailInput).toBeDisabled();
            });
        });

        it('should display inviter notes when present', async () => {
            renderPage();

            await waitFor(() => {
                expect(screen.getByText(/Welcome to the Alpha-100 program/i)).toBeInTheDocument();
            });
        });
    });

    // -------------------------------------------------------------------------
    // Invalid Invite States Tests
    // -------------------------------------------------------------------------

    describe('Invalid Invite States', () => {
        it('should show expired message for expired invite', async () => {
            mockedInviteService.validateInvite.mockResolvedValue(MOCK_EXPIRED_INVITE);

            renderPage();

            await waitFor(() => {
                expect(screen.getByText(/expired/i)).toBeInTheDocument();
            });

            // Form should NOT be visible
            expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
        });

        it('should show already used message for accepted invite', async () => {
            mockedInviteService.validateInvite.mockResolvedValue(MOCK_ACCEPTED_INVITE);

            renderPage();

            await waitFor(() => {
                expect(screen.getByText(/already.*used|accepted|registered/i)).toBeInTheDocument();
            });

            // Should have link to login
            expect(screen.getByRole('link', { name: /login|sign.*in/i })).toBeInTheDocument();
        });

        it('should show invalid code message for not found invite', async () => {
            mockedInviteService.validateInvite.mockResolvedValue(MOCK_NOT_FOUND_INVITE);

            renderPage();

            await waitFor(() => {
                expect(screen.getByText(/invalid|not.*found/i)).toBeInTheDocument();
            });
        });

        it('should handle validation API error', async () => {
            mockedInviteService.validateInvite.mockRejectedValue(new Error('Network error'));

            renderPage();

            await waitFor(() => {
                expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
            });

            // Should have retry button
            expect(screen.getByRole('button', { name: /retry|try.*again/i })).toBeInTheDocument();
        });

        it('should retry validation on retry button click', async () => {
            mockedInviteService.validateInvite
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(MOCK_VALID_INVITE);

            renderPage();

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /retry|try.*again/i })).toBeInTheDocument();
            });

            const retryButton = screen.getByRole('button', { name: /retry|try.*again/i });
            await userEvent.click(retryButton);

            await waitFor(() => {
                expect(mockedInviteService.validateInvite).toHaveBeenCalledTimes(2);
            });
        });
    });

    // -------------------------------------------------------------------------
    // Registration Form Tests
    // -------------------------------------------------------------------------

    describe('Registration Form', () => {
        it('should allow entering full name', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/full.*name|name/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            await user.type(nameInput, TEST_FULL_NAME);

            expect(nameInput).toHaveValue(TEST_FULL_NAME);
        });

        it('should allow entering password', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const passwordInput = screen.getByLabelText(/^password$/i);
            await user.type(passwordInput, TEST_PASSWORD);

            expect(passwordInput).toHaveValue(TEST_PASSWORD);
        });

        it('should toggle password visibility', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
            expect(passwordInput.type).toBe('password');

            const toggleButton = screen.getAllByRole('button', { name: /show|hide.*password/i })[0];
            await user.click(toggleButton);

            expect(passwordInput.type).toBe('text');
        });

        it('should show password strength indicator', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const passwordInput = screen.getByLabelText(/^password$/i);

            // Weak password
            await user.type(passwordInput, 'weak');
            expect(screen.getByText(/weak|too.*short/i)).toBeInTheDocument();

            // Clear and enter strong password
            await user.clear(passwordInput);
            await user.type(passwordInput, TEST_PASSWORD);
            expect(screen.getByText(/strong|good|excellent/i)).toBeInTheDocument();
        });
    });

    // -------------------------------------------------------------------------
    // Form Validation Tests
    // -------------------------------------------------------------------------

    describe('Form Validation', () => {
        it('should require full name', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            // Fill only password
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            // Submit
            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/name.*required|enter.*name/i)).toBeInTheDocument();
            });

            expect(mockedInviteService.acceptInvite).not.toHaveBeenCalled();
        });

        it('should require minimum password length', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, 'short');
            await user.type(confirmInput, 'short');

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/8.*characters|too.*short|minimum/i)).toBeInTheDocument();
            });
        });

        it('should require password confirmation match', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, 'DifferentPassword!');

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/match|same/i)).toBeInTheDocument();
            });
        });

        it('should show real-time password match indicator', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, 'DifferentPassword!');

            // Should show mismatch indicator
            expect(screen.getByText(/match|same/i)).toBeInTheDocument();

            // Fix the mismatch
            await user.clear(confirmInput);
            await user.type(confirmInput, TEST_PASSWORD);

            // Mismatch message should disappear or show match
            await waitFor(() => {
                expect(screen.queryByText(/passwords.*do.*not.*match/i)).not.toBeInTheDocument();
            });
        });
    });

    // -------------------------------------------------------------------------
    // Successful Registration Tests
    // -------------------------------------------------------------------------

    describe('Successful Registration', () => {
        it('should call acceptInvite with correct data', async () => {
            mockedInviteService.acceptInvite.mockResolvedValue(MOCK_ACCEPT_SUCCESS);

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockedInviteService.acceptInvite).toHaveBeenCalledWith(
                    'TEST-CODE-1234',
                    {
                        email: TEST_EMAIL,
                        password: TEST_PASSWORD,
                        full_name: TEST_FULL_NAME,
                    }
                );
            });
        });

        it('should show success message after registration', async () => {
            mockedInviteService.acceptInvite.mockResolvedValue(MOCK_ACCEPT_SUCCESS);

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/success|welcome|account.*created/i)).toBeInTheDocument();
            });
        });

        it('should redirect to dashboard after success', async () => {
            mockedInviteService.acceptInvite.mockResolvedValue(MOCK_ACCEPT_SUCCESS);

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/dashboard');
            }, { timeout: 5000 });
        });

        it('should store access token in localStorage', async () => {
            mockedInviteService.acceptInvite.mockResolvedValue(MOCK_ACCEPT_SUCCESS);

            // Mock localStorage
            const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(setItemSpy).toHaveBeenCalledWith(
                    expect.stringMatching(/token|access_token/i),
                    'fake-jwt-token'
                );
            });

            setItemSpy.mockRestore();
        });
    });

    // -------------------------------------------------------------------------
    // Registration Error Handling Tests
    // -------------------------------------------------------------------------

    describe('Registration Errors', () => {
        it('should handle email mismatch error', async () => {
            mockedInviteService.acceptInvite.mockRejectedValue({
                response: {
                    status: 400,
                    data: {
                        error: 'Email does not match invite',
                        code: 'EMAIL_MISMATCH'
                    }
                }
            });

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/email.*mismatch|does.*not.*match/i)).toBeInTheDocument();
            });
        });

        it('should handle user already exists error', async () => {
            mockedInviteService.acceptInvite.mockRejectedValue({
                response: {
                    status: 409,
                    data: {
                        error: 'User account already exists',
                        code: 'USER_EXISTS'
                    }
                }
            });

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/already.*exists|account.*exists/i)).toBeInTheDocument();
            });

            // Should show login link
            expect(screen.getByRole('link', { name: /login|sign.*in/i })).toBeInTheDocument();
        });

        it('should handle network error', async () => {
            mockedInviteService.acceptInvite.mockRejectedValue(new Error('Network error'));

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/error|failed|try.*again/i)).toBeInTheDocument();
            });
        });
    });

    // -------------------------------------------------------------------------
    // Loading States Tests
    // -------------------------------------------------------------------------

    describe('Loading States', () => {
        it('should show submitting state during registration', async () => {
            mockedInviteService.acceptInvite.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(MOCK_ACCEPT_SUCCESS), 1000))
            );

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            // Should show submitting state
            expect(screen.getByText(/creating|submitting|please.*wait/i)).toBeInTheDocument();

            // Button should be disabled
            expect(submitButton).toBeDisabled();
        });

        it('should disable form inputs during submission', async () => {
            mockedInviteService.acceptInvite.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(MOCK_ACCEPT_SUCCESS), 1000))
            );

            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);
            const confirmInput = screen.getByLabelText(/confirm.*password/i);

            await user.type(nameInput, TEST_FULL_NAME);
            await user.type(passwordInput, TEST_PASSWORD);
            await user.type(confirmInput, TEST_PASSWORD);

            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            // All inputs should be disabled
            expect(nameInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(confirmInput).toBeDisabled();
        });
    });

    // -------------------------------------------------------------------------
    // Accessibility Tests
    // -------------------------------------------------------------------------

    describe('Accessibility', () => {
        it('should have accessible form labels', async () => {
            renderPage();

            await waitFor(() => {
                expect(screen.getByLabelText(/full.*name|name/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
                expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
            });
        });

        it('should be keyboard navigable', async () => {
            renderPage();

            await waitFor(() => {
                expect(screen.getByLabelText(/full.*name|name/i)).toBeInTheDocument();
            });

            const nameInput = screen.getByLabelText(/full.*name|name/i);
            const passwordInput = screen.getByLabelText(/^password$/i);

            // Tab navigation
            nameInput.focus();
            expect(document.activeElement).toBe(nameInput);

            await userEvent.tab();
            expect(document.activeElement).toBe(passwordInput);
        });

        it('should announce errors to screen readers', async () => {
            renderPage();
            const user = userEvent.setup();

            await waitFor(() => {
                expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            });

            // Submit without filling form
            const submitButton = screen.getByRole('button', { name: /create.*account|join|register/i });
            await user.click(submitButton);

            await waitFor(() => {
                const errorElements = screen.getAllByRole('alert');
                expect(errorElements.length).toBeGreaterThan(0);
            });
        });
    });
});
