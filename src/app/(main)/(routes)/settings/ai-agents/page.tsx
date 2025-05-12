"use client";

import React, { useState } from 'react';
import { Bot, Plus, Trash2, Settings, PlusCircle } from 'lucide-react';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

const AIAgentsSettingsPage = () => {
  const [agents, setAgents] = useState<AIAgent[]>([
    {
      id: '1',
      name: 'Support Assistant',
      description: 'Handles customer service inquiries with a friendly tone.',
      model: 'gpt-4',
      isActive: true,
      createdAt: '2023-08-15'
    },
    {
      id: '2',
      name: 'Document Analyzer',
      description: 'Extracts and summarizes information from uploaded documents.',
      model: 'gpt-3.5-turbo',
      isActive: false,
      createdAt: '2023-09-22'
    },
    {
      id: '3',
      name: 'Translation Bot',
      description: 'Translates conversations in real-time between multiple languages.',
      model: 'gpt-4',
      isActive: true,
      createdAt: '2023-10-05'
    }
  ]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const toggleAgentStatus = (id: string) => {
    setAgents(agents.map(agent => 
      agent.id === id ? {...agent, isActive: !agent.isActive} : agent
    ));
  };
  
  const handleCreateAgent = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">AI Agents</h2>
          <p className="text-gray-500 mt-1">Manage your AI assistants for different tasks</p>
        </div>
        <button 
          onClick={handleCreateAgent}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create Agent</span>
        </button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <div 
            key={agent.id} 
            className={`border rounded-lg overflow-hidden ${
              agent.isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${agent.isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Bot className={`h-5 w-5 ${agent.isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                    <Settings className="h-4 w-4 text-gray-500" />
                  </button>
                  <button className="p-1.5 rounded-md hover:bg-red-100 hover:text-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold mt-3">{agent.name}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.description}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100">
                  Model: {agent.model}
                </div>
                <div className="text-xs text-gray-500">
                  Created: {agent.createdAt}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border-t bg-white">
              <span className="text-sm text-gray-600">Status: {agent.isActive ? 'Active' : 'Inactive'}</span>
              <button
                onClick={() => toggleAgentStatus(agent.id)}
                className={`
                  text-xs font-medium px-3 py-1 rounded-full 
                  ${agent.isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
              >
                {agent.isActive ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        ))}
        
        {/* Add Agent Card */}
        <div 
          className="border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-6 text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors"
          onClick={handleCreateAgent}
        >
          <Plus className="h-10 w-10 mb-2" />
          <p className="font-medium">Add New Agent</p>
          <p className="text-xs text-center mt-1">Create a custom AI agent for your specific needs</p>
        </div>
      </div>
      
      {/* Create Agent Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">Create New Agent</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure your custom AI agent with specific capabilities.
              </p>
              
              {/* Form fields would go here in a real implementation */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Agent Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Research Assistant"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Description</label>
                  <textarea 
                    placeholder="Describe what this agent does..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium">AI Model</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="claude-3">Claude 3</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgentsSettingsPage; 