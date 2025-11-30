import React from 'react'

interface MarkdownRendererProps {
    content: string
    className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    // Simple renderer for now, replacing newlines with <br /> and handling basic formatting
    // In a real app, we'd use react-markdown or similar

    const renderContent = (text: string) => {
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                <br />
            </React.Fragment>
        ))
    }

    return (
        <div className={`prose prose-invert max-w-none ${className}`}>
            {renderContent(content)}
        </div>
    )
}
