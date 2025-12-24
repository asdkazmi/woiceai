import React, { useEffect, useState } from 'react';
import { connectorService, Connector, ConnectorUser, ConnectorModel } from '../services/connectorService';
import { Plug, Key, Eye, EyeOff, X } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import IconButton from './ui/IconButton';
import ConfirmModal from './ui/ConfirmModal';
import Spinner from './ui/Spinner';

const ConnectorsList: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [connectorToDisconnect, setConnectorToDisconnect] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const connectorsData = await connectorService.getAll();
      setConnectors(connectorsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load connectors');
      console.error('Error loading connectors:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConnectorDisplayName = (connector: Connector) => {
    if (connector.llmName === 'qwen') {
      return 'Woice AI Qwen';
    }
    return connector.llmName.toUpperCase();
  };

  const isConnectorActive = (connector: Connector) => {
    if (connector.llmName === 'qwen') {
      return true;
    }
    return connector.users && connector.users.length > 0
      ? connector.users.some((u) => u.pivot.is_active === 1)
      : false;
  };

  const getExistingApiKey = (connector: Connector) => {
    if (!connector.users || connector.users.length === 0) return null;
    const user = connector.users[0];
    return user.pivot.api_key;
  };

  const getActiveModel = (connector: Connector): ConnectorModel | null => {
    if (!connector.models) return null;
    const activeModel = connector.models.find((m) => m.is_active === 1);
    return activeModel || null;
  };

  const handleToggle = async (connector: Connector) => {
    const isActive = isConnectorActive(connector);
    const existingApiKey = getExistingApiKey(connector);

    if (!isActive && !existingApiKey && connector.llmName !== 'qwen') {
      setSelectedConnector(connector);
      setApiKey('');
      setShowApiKeyModal(true);
      return;
    }

    if (connector.llmName === 'qwen' || existingApiKey) {
      if (isActive) {
        setConnectorToDisconnect(connector.id!);
        setShowDisconnectModal(true);
      } else {
        await handleConnect(connector, existingApiKey || undefined);
      }
    }
  };

  const handleConnect = async (connector: Connector, apiKey?: string) => {
    try {
      await connectorService.connect({ 
        connectorId: connector.id!,
        apiKey: apiKey,
      });
      await loadData();
      setSuccessMessage('Connector connected successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect connector');
      console.error('Error connecting connector:', err);
    }
  };

  const handleDisconnect = async () => {
    if (!connectorToDisconnect) return;

    try {
      await connectorService.disconnect(connectorToDisconnect);
      await loadData();
      setShowDisconnectModal(false);
      setConnectorToDisconnect(null);
      setSuccessMessage('Connector disconnected successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disconnect connector');
      console.error('Error disconnecting connector:', err);
    }
  };

  const handleSubmitApiKey = async () => {
    if (!selectedConnector || !apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    try {
      const isActive = isConnectorActive(selectedConnector);
      if (isActive) {
        await connectorService.updateConnection(selectedConnector.id!, {
          apiKey: apiKey.trim(),
        });
        setSuccessMessage('API key updated successfully');
      } else {
        await connectorService.connect({
          connectorId: selectedConnector.id!,
          apiKey: apiKey.trim(),
        });
        setSuccessMessage('Connector connected successfully');
      }
      setShowApiKeyModal(false);
      setApiKey('');
      setSelectedConnector(null);
      setShowApiKey(false);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect connector');
      console.error('Error connecting connector:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Connectors</h2>
        <p className="text-base text-gray-600">Manage your LLM connectors and models</p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button
            onClick={loadData}
            className="ml-4 text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {connectors.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
          <div className="p-4 rounded-md bg-gray-100 inline-block mb-4">
            <Plug size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No connectors available</h3>
          <p className="text-base text-gray-600">Connectors will appear here once they are configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => {
            const isActive = isConnectorActive(connector);
            const activeModel = getActiveModel(connector);

            return (
              <div key={connector.id} className="bg-white border border-gray-200 rounded-md p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-md ${isActive ? 'bg-green-50' : 'bg-gray-100'}`}>
                        <Plug size={20} className={isActive ? 'text-green-600' : 'text-gray-600'} />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">{getConnectorDisplayName(connector)}</h3>
                    </div>
                    {connector.description && (
                      <p className="text-sm text-gray-600 mb-2">{connector.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : connector.llmName === 'qwen' ? (
                        <Badge variant="primary">Default</Badge>
                      ) : (
                        <Badge variant="gray">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {connector.models && connector.models.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Available Models:</h4>
                    <div className="space-y-1">
                      {connector.models.map((model) => {
                        const isModelActive = isActive && activeModel?.model === model.model;
                        return (
                          <div key={model.id} className="flex items-center justify-between text-sm">
                            <span className={isModelActive ? 'text-primary font-medium' : 'text-gray-600'}>
                              {model.model}
                            </span>
                            {isModelActive && (
                              <Badge variant="success" size="sm">Active</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  {connector.llmName === 'qwen' ? (
                    <div className="text-sm text-gray-600">
                      <Badge variant="primary">Default Model</Badge>
                      <p className="mt-1 text-xs">Always enabled, no API key required</p>
                    </div>
                  ) : (
                    <>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggle(connector)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <span className="text-sm text-gray-700">{isActive ? 'Enabled' : 'Disabled'}</span>
                      {isActive && (
                        <IconButton
                          icon={Key}
                          onClick={() => {
                            const existingApiKey = getExistingApiKey(connector);
                            setSelectedConnector(connector);
                            setApiKey(existingApiKey || '');
                            setShowApiKeyModal(true);
                          }}
                          tooltip="Update API Key"
                          variant="secondary"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && selectedConnector && (
        <div
          className="hs-overlay fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto bg-black bg-opacity-50"
          onClick={() => {
            setShowApiKeyModal(false);
            setApiKey('');
            setSelectedConnector(null);
            setShowApiKey(false);
          }}
        >
          <div className="hs-overlay-open:mt-7 hs-overlay-open:opacity-100 hs-overlay-open:duration-500 mt-0 opacity-0 ease-out transition-all sm:max-w-lg sm:w-full m-3 sm:m-auto">
            <div className="bg-white border border-gray-200 rounded-md shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  {isConnectorActive(selectedConnector)
                    ? `Update API Key for ${selectedConnector.llmName.toUpperCase()}`
                    : `Connect ${selectedConnector.llmName.toUpperCase()}`}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setApiKey('');
                    setSelectedConnector(null);
                    setShowApiKey(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-4">
                  {isConnectorActive(selectedConnector)
                    ? `Update your API key for ${selectedConnector.llmName}:`
                    : `Please enter your API key for ${selectedConnector.llmName}:`}
                </p>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    label="API Key"
                    placeholder="Enter API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    icon={Key}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
                {error && (
                  <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                    {error}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setApiKey('');
                    setSelectedConnector(null);
                    setShowApiKey(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmitApiKey}
                >
                  {isConnectorActive(selectedConnector) ? 'Update' : 'Connect'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => {
          setShowDisconnectModal(false);
          setConnectorToDisconnect(null);
        }}
        onConfirm={handleDisconnect}
        title="Disconnect Connector"
        message="Are you sure you want to disconnect this connector?"
        confirmText="Disconnect"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

export default ConnectorsList;
