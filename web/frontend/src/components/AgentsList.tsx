import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentService, Agent } from '../services/agentService';
import { Search, Plus, Edit, Trash2, MessageSquare, Power } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Spinner from './ui/Spinner';
import ConfirmModal from './ui/ConfirmModal';

const AgentsList: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentService.getAll();
      setAgents(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load agents');
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate('/agents/new');
  };

  const handleEdit = (id: number) => {
    navigate(`/agents/${id}`);
  };

  const handleChat = (id: number) => {
    navigate(`/agents/${id}/chat`);
  };

  const handleDelete = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;

    try {
      setDeletingId(agentToDelete.id);
      await agentService.delete(agentToDelete.id);
      setShowDeleteModal(false);
      setAgentToDelete(null);
      await loadAgents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete agent');
      console.error('Error deleting agent:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePublish = async (agent: Agent) => {
    try {
      await agentService.togglePublish(agent.id);
      await loadAgents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle publish status');
      console.error('Error toggling publish:', err);
    }
  };

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Agents</h1>
        <Button onClick={handleCreate} icon={Plus} iconPosition="left" variant="primary">
          Create Agent
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-md">
          <p className="text-gray-600">
            {searchQuery ? 'No agents found matching your search.' : 'No agents yet. Create your first agent to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white border border-gray-200 rounded-md p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{agent.name}</h3>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agent.isPublished || false}
                      onChange={() => handleTogglePublish(agent)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {agent.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
              )}

              <div className="flex items-center gap-2 mt-4">
                <Button
                  onClick={() => handleEdit(agent.id)}
                  variant="secondary"
                  size="sm"
                  icon={Edit}
                  iconPosition="left"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleChat(agent.id)}
                  variant="secondary"
                  size="sm"
                  icon={MessageSquare}
                  iconPosition="left"
                >
                  Chat
                </Button>
                <Button
                  onClick={() => handleDelete(agent)}
                  variant="secondary"
                  size="sm"
                  icon={Trash2}
                  iconPosition="left"
                  disabled={deletingId === agent.id}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAgentToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Agent"
        message={`Are you sure you want to delete "${agentToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="warning"
        isLoading={deletingId !== null}
      />
    </div>
  );
};

export default AgentsList;

