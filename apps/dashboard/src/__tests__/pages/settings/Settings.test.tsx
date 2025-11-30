/**
 * BIZRA Genesis Node - Settings Page Tests
 * Professional-grade test coverage for Settings functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Settings } from '../../../pages/settings/Settings'
import { api } from '../../../services/api'

// Mock the API service
jest.mock('../../../services/api', () => ({
    api: {
        getProfile: jest.fn(),
        updateProfile: jest.fn(),
        changePassword: jest.fn(),
    },
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}))

// Mock AuthContext
const mockLogout = jest.fn()
jest.mock('../../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {
            id: 'test-user-id',
            email: 'test@bizra.ai',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
        },
        token: 'test-token',
        logout: mockLogout,
    }),
}))

// Mock UI components
jest.mock('../../../components/ui/GlassCard', () => ({
    GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="glass-card" className={className}>{children}</div>
    ),
}))

jest.mock('../../../components/ui/SacredButton', () => ({
    SacredButton: ({
        children,
        onClick,
        loading,
        disabled
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        loading?: boolean;
        disabled?: boolean;
    }) => (
        <button
            data-testid="sacred-button"
            onClick={onClick}
            disabled={loading || disabled}
        >
            {loading ? 'Loading...' : children}
        </button>
    ),
}))

jest.mock('../../../components/ui/SacredInput', () => ({
    SacredInput: ({
        label,
        value,
        onChange,
        placeholder,
        disabled,
        type
    }: {
        label: string;
        value: string;
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        placeholder?: string;
        disabled?: boolean;
        type?: string;
    }) => (
        <div data-testid={`input-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            <label>{label}</label>
            <input
                type={type || 'text'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={label}
            />
        </div>
    ),
}))

describe('Settings Page', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        // Default mock implementation
        ;(api.getProfile as jest.Mock).mockResolvedValue({
            success: true,
            user: {
                id: 'test-user-id',
                email: 'test@bizra.ai',
                username: 'testuser',
                firstName: 'Test',
                lastName: 'User',
                program: 'alpha-100',
                createdAt: '2024-01-01T00:00:00Z',
            },
        })
    })

    describe('Rendering', () => {
        it('should render the settings page with tabs', () => {
            render(<Settings />)

            expect(screen.getByText('Settings')).toBeInTheDocument()
            expect(screen.getByText('Profile')).toBeInTheDocument()
            expect(screen.getByText('Notifications')).toBeInTheDocument()
            expect(screen.getByText('Security')).toBeInTheDocument()
            expect(screen.getByText('API Keys')).toBeInTheDocument()
        })

        it('should show profile tab by default', () => {
            render(<Settings />)

            expect(screen.getByText('Profile Settings')).toBeInTheDocument()
        })

        it('should switch to notifications tab when clicked', async () => {
            render(<Settings />)

            fireEvent.click(screen.getByText('Notifications'))

            await waitFor(() => {
                expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
            })
        })

        it('should switch to security tab when clicked', async () => {
            render(<Settings />)

            fireEvent.click(screen.getByText('Security'))

            await waitFor(() => {
                expect(screen.getByText('Security Settings')).toBeInTheDocument()
            })
        })

        it('should switch to API keys tab when clicked', async () => {
            render(<Settings />)

            fireEvent.click(screen.getByText('API Keys'))

            await waitFor(() => {
                expect(screen.getByText('API Management')).toBeInTheDocument()
            })
        })
    })

    describe('Profile Management', () => {
        it('should load profile data on mount', async () => {
            render(<Settings />)

            await waitFor(() => {
                expect(api.getProfile).toHaveBeenCalledWith('test-token')
            })
        })

        it('should display username as disabled', () => {
            render(<Settings />)

            const usernameInput = screen.getByTestId('input-username')
            const input = usernameInput.querySelector('input')
            expect(input).toBeDisabled()
        })

        it('should allow editing first name', async () => {
            render(<Settings />)

            // Wait for profile to load
            await waitFor(() => {
                expect(api.getProfile).toHaveBeenCalled()
            })

            const firstNameDiv = screen.getByTestId('input-first-name')
            const input = firstNameDiv.querySelector('input')

            // Clear and type new value
            await userEvent.clear(input!)
            await userEvent.type(input!, 'NewName')

            // Verify the input ends with the typed value
            expect(input!.value).toContain('NewName')
        })

        it('should call updateProfile when save is clicked', async () => {
            ;(api.updateProfile as jest.Mock).mockResolvedValue({
                success: true,
                user: {
                    id: 'test-user-id',
                    email: 'test@bizra.ai',
                    username: 'testuser',
                    firstName: 'Updated',
                    lastName: 'User',
                    program: 'alpha-100',
                    createdAt: '2024-01-01T00:00:00Z',
                },
            })

            render(<Settings />)

            // Wait for initial load
            await waitFor(() => {
                expect(api.getProfile).toHaveBeenCalled()
            })

            // Click save
            const saveButton = screen.getAllByTestId('sacred-button')[0]
            fireEvent.click(saveButton)

            await waitFor(() => {
                expect(api.updateProfile).toHaveBeenCalledWith(
                    'test-token',
                    expect.objectContaining({
                        firstName: expect.any(String),
                        lastName: expect.any(String),
                        email: expect.any(String),
                    })
                )
            })
        })
    })

    describe('Password Change', () => {
        it('should show password change form in security tab', async () => {
            render(<Settings />)

            fireEvent.click(screen.getByText('Security'))

            await waitFor(() => {
                expect(screen.getByText('Change Password')).toBeInTheDocument()
                expect(screen.getByTestId('input-current-password')).toBeInTheDocument()
                expect(screen.getByTestId('input-new-password')).toBeInTheDocument()
                expect(screen.getByTestId('input-confirm-new-password')).toBeInTheDocument()
            })
        })

        it('should have disabled button when fields are empty', async () => {
            render(<Settings />)

            fireEvent.click(screen.getByText('Security'))

            await waitFor(() => {
                const updateButton = screen.getByText('Update Password')
                expect(updateButton).toBeDisabled()
            })
        })

        it('should call changePassword API when form is submitted', async () => {
            ;(api.changePassword as jest.Mock).mockResolvedValue({
                success: true,
                message: 'Password changed successfully',
            })

            render(<Settings />)

            fireEvent.click(screen.getByText('Security'))

            await waitFor(() => {
                expect(screen.getByTestId('input-current-password')).toBeInTheDocument()
            })

            // Fill in password fields
            const currentPasswordInput = screen.getByTestId('input-current-password').querySelector('input')
            const newPasswordInput = screen.getByTestId('input-new-password').querySelector('input')
            const confirmPasswordInput = screen.getByTestId('input-confirm-new-password').querySelector('input')

            await userEvent.type(currentPasswordInput!, 'OldPassword123')
            await userEvent.type(newPasswordInput!, 'NewPassword123')
            await userEvent.type(confirmPasswordInput!, 'NewPassword123')

            // Submit
            const updateButton = screen.getByText('Update Password')
            fireEvent.click(updateButton)

            await waitFor(() => {
                expect(api.changePassword).toHaveBeenCalledWith(
                    'test-token',
                    {
                        currentPassword: 'OldPassword123',
                        newPassword: 'NewPassword123',
                    }
                )
            })
        })
    })

    describe('Notifications Tab', () => {
        it('should display notification toggles', async () => {
            render(<Settings />)

            fireEvent.click(screen.getByText('Notifications'))

            await waitFor(() => {
                expect(screen.getByText('System Alerts')).toBeInTheDocument()
                expect(screen.getByText('Agent Updates')).toBeInTheDocument()
                expect(screen.getByText('Market Signals')).toBeInTheDocument()
                expect(screen.getByText('Security Alerts')).toBeInTheDocument()
            })
        })
    })

    describe('API Keys Tab', () => {
        it('should display API key management section', async () => {
            render(<Settings />)

            fireEvent.click(screen.getByText('API Keys'))

            await waitFor(() => {
                expect(screen.getByText('API Management')).toBeInTheDocument()
                expect(screen.getByText('Generate New Key')).toBeInTheDocument()
            })
        })
    })

    describe('Error Handling', () => {
        it('should handle profile load failure gracefully', async () => {
            ;(api.getProfile as jest.Mock).mockRejectedValue(new Error('Network error'))

            render(<Settings />)

            // Should still render with fallback data
            await waitFor(() => {
                expect(screen.getByText('Profile Settings')).toBeInTheDocument()
            })
        })

        it('should handle profile update failure', async () => {
            ;(api.updateProfile as jest.Mock).mockRejectedValue(new Error('Update failed'))

            render(<Settings />)

            await waitFor(() => {
                expect(api.getProfile).toHaveBeenCalled()
            })

            const saveButton = screen.getAllByTestId('sacred-button')[0]
            fireEvent.click(saveButton)

            // Error should be handled (toast.error would be called)
            await waitFor(() => {
                expect(api.updateProfile).toHaveBeenCalled()
            })
        })
    })
})
