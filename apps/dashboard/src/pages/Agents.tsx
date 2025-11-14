// BIZRA Genesis Node - AI Models Page

import React from 'react';
import { Bot, Cpu, Zap } from 'lucide-react';

export default function Agents() {
  const providers = [
    { name: 'Ollama', models: ['llama3:8b', 'mistral', 'mixtral'], status: 'healthy' },
    { name: 'OpenAI', models: ['gpt-4', 'gpt-3.5-turbo'], status: 'healthy' },
    { name: 'Anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'], status: 'healthy' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Model Providers</h1>
        <p className="text-gray-600 mt-1">Manage and monitor model providers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <div key={provider.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">{provider.name}</h3>
              </div>
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1" />
                {provider.status}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Models:</p>
              {provider.models.map((model) => (
                <div key={model} className="flex items-center text-sm text-gray-700">
                  <Bot className="w-4 h-4 text-gray-400 mr-2" />
                  {model}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
