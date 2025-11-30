import * as React from 'react'
import { cn } from '../../lib/utils'

interface SacredInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
}

export const SacredInput = React.forwardRef<HTMLInputElement, SacredInputProps>(
    ({ label, error, className, id, ...props }, ref) => {
        const inputId = id || label.toLowerCase().replace(/\s+/g, '-')

        return (
            <div className="space-y-2">
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-300"
                >
                    {label}
                </label>
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        'w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10',
                        'text-white placeholder-gray-500',
                        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'transition-all duration-200',
                        error && 'border-red-500 focus:ring-red-500',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-red-400">{error}</p>
                )}
            </div>
        )
    }
)

SacredInput.displayName = 'SacredInput'
