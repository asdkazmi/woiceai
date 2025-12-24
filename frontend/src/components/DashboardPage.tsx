import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Bot, Plus } from 'lucide-react';
import Button from './ui/Button';

const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Dashboard</h2>
        <p className="text-base text-gray-600">
          Welcome to your Woice AI dashboard. Here you can get an overview of your knowledge bases and connectors.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Knowledge Bases Card */}
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-md bg-blue-50">
              <Database size={24} className="text-primary" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Knowledge Bases</h3>
          <p className="text-sm text-gray-600 mb-4">Manage your knowledge bases</p>
          <Link to="/knowledge-bases">
            <Button variant="secondary" size="sm" className="w-full">
              View All
            </Button>
          </Link>
        </div>

        {/* Chat AIs Card */}
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-md bg-purple-50">
              <Bot size={24} className="text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">AI Agents</h3>
          <p className="text-sm text-gray-600 mb-4">Create and manage AI agents</p>
          <Link to="/knowledge-bases">
            <Button variant="secondary" size="sm" className="w-full">
              Create Agent
            </Button>
          </Link>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-md bg-green-50">
              <Plus size={24} className="text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Quick Actions</h3>
          <p className="text-sm text-gray-600 mb-4">Get started quickly</p>
          <div className="space-y-2">
            <Link to="/knowledge-bases" className="block">
              <Button variant="primary" size="sm" className="w-full" icon={Plus} iconPosition="left">
                Create Knowledge Base
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white border border-gray-200 rounded-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
        <p className="text-base text-gray-600">No recent activity to display.</p>
      </div>
    </div>
  );
};

export default DashboardPage;
