import React, { useState } from 'react'
import { GlassCard } from '../../ui/GlassCard'
import { MarkdownRenderer } from '../../MarkdownRenderer'
import { Search, Book, FileText, HelpCircle } from 'lucide-react'

export const HelpCenter: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedArticle, setSelectedArticle] = useState<string | null>(null)

    const articles = [
        {
            id: 'getting-started',
            title: 'Getting Started with Genesis',
            category: 'Basics',
            content: `Welcome to the BIZRA Genesis Node.
      
This node is your gateway to the hivemind. It allows you to:
- Monitor system activity via the Block Stream
- Manage your personal agentic team
- Track your impact metrics

To get started, navigate to the Command Center and initialize your first agent.`
        },
        {
            id: 'agents',
            title: 'Managing Agents',
            category: 'Advanced',
            content: `Agents are autonomous units that perform tasks on your behalf.
      
You can deploy agents for:
- Data analysis
- Market research
- Content generation

Monitor their performance in the Command Center.`
        },
        {
            id: 'security',
            title: 'Security Best Practices',
            category: 'Security',
            content: `Your node is secured by advanced cryptography.
      
Recommendations:
- Enable 2FA (coming soon)
- regularly rotate your API keys
- Monitor the Block Stream for suspicious activity`
        }
    ]

    const filteredArticles = articles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Help Center</h1>
                    <p className="text-gray-400">Documentation and support for your Genesis Node.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar / Search */}
                <div className="lg:col-span-4 space-y-6">
                    <GlassCard className="p-4 border-blue-500/20">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search documentation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/50 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            />
                        </div>
                    </GlassCard>

                    <div className="space-y-2">
                        {filteredArticles.map(article => (
                            <GlassCard
                                key={article.id}
                                className={`p-4 cursor-pointer transition-colors hover:bg-white/5 ${selectedArticle === article.id ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800'}`}
                                onClick={() => setSelectedArticle(article.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    <FileText size={18} className="text-blue-400" />
                                    <div>
                                        <h3 className="font-medium text-white">{article.title}</h3>
                                        <p className="text-xs text-gray-500">{article.category}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-8">
                    <GlassCard className="p-8 min-h-[600px] border-blue-500/20">
                        {selectedArticle ? (
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <Book className="text-blue-400" size={24} />
                                    <h2 className="text-2xl font-bold text-white">
                                        {articles.find(a => a.id === selectedArticle)?.title}
                                    </h2>
                                </div>
                                <MarkdownRenderer
                                    content={articles.find(a => a.id === selectedArticle)?.content || ''}
                                    className="text-gray-300"
                                />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                                    <HelpCircle size={32} className="text-blue-500/50" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white">Select an article</h3>
                                    <p>Choose a topic from the sidebar to view documentation.</p>
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    )
}
