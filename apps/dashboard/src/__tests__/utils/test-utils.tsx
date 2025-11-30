import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

// Add any other providers here (Toast, Tooltip, etc.)
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
        </ThemeProvider>
    );
};

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Minimal test to satisfy Jest requirement
describe('test-utils', () => {
    test('customRender is a function', () => {
        expect(typeof customRender).toBe('function');
    });
});
