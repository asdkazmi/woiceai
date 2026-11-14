import React, { useEffect, useState } from 'react';
import { X, ChevronRight, ChevronDown, Link as LinkIcon, Loader2 } from 'lucide-react';
import urlTreeService, { TreeNode } from '../services/urlTreeService';
import Button from './ui/Button';

interface UrlTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId?: number; // Preferred: MySQL content ID
  rootUrl?: string; // Fallback: The root URL to display the tree for
}

interface TreeNodeWithState extends TreeNode {
  isExpanded: boolean;
}

const UrlTreeModal: React.FC<UrlTreeModalProps> = ({ isOpen, onClose, contentId, rootUrl }) => {
  const [tree, setTree] = useState<TreeNodeWithState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [displayRootUrl, setDisplayRootUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUrlTree();
    } else {
      // Reset state when modal closes
      setTree(null);
      setError(null);
      setTotalPages(0);
      setDisplayRootUrl(null);
    }
  }, [isOpen, contentId, rootUrl]);

  const loadUrlTree = async () => {
    try {
      setLoading(true);
      setError(null);
      let data;
      
      if (contentId) {
        // Preferred: Use content ID to fetch by tree_document_id
        data = await urlTreeService.getUrlTreeById(contentId);
      } else if (rootUrl) {
        // Fallback: Use URL directly
        data = await urlTreeService.getUrlTree(rootUrl);
      } else {
        throw new Error('No content ID or URL provided for URL tree.');
      }
      
      // Convert tree to state with expanded flags
      const treeWithState = addExpandedState(data.tree);
      setTree(treeWithState);
      setTotalPages(data.totalPages);
      setDisplayRootUrl(data.rootUrl);
    } catch (err: any) {
      // Show user-friendly error messages
      const errorMessage = err.response?.data?.message || 'Failed to load URL tree';
      // Convert technical messages to user-friendly ones
      if (errorMessage.includes('tree document') || errorMessage.includes('MongoDB') || errorMessage.includes('document ID')) {
        setError('URL tree has not been created yet. Please wait for the scraping process to complete.');
      } else {
        setError(errorMessage);
      }
      console.error('Error loading URL tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const addExpandedState = (node: TreeNode): TreeNodeWithState => {
    return {
      ...node,
      isExpanded: true, // Expand root by default
      children: node.children.map(child => addExpandedState(child)),
    };
  };

  const toggleNode = (node: TreeNodeWithState) => {
    const toggleNodeRecursive = (n: TreeNodeWithState): TreeNodeWithState => {
      if (n.url === node.url) {
        return { ...n, isExpanded: !n.isExpanded };
      }
      return {
        ...n,
        children: n.children.map(child => toggleNodeRecursive(child as TreeNodeWithState)),
      };
    };

    if (tree) {
      setTree(toggleNodeRecursive(tree));
    }
  };

  const renderTreeNode = (node: TreeNodeWithState, level: number = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const indent = level * 24;
    const isScrapped = node.scrapped === true;
    const isFailed = node.scrapped === false;

    return (
      <div key={node.url} className="select-none">
        <div
          className={`flex items-center py-2 px-3 cursor-pointer group ${
            isScrapped ? 'border-l-2 border-green-500' : 
            isFailed ? 'border-l-2 border-red-500' : ''
          }`}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() => hasChildren && toggleNode(node)}
        >
          {hasChildren ? (
            <div className="flex items-center flex-shrink-0 mr-2">
              {node.isExpanded ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </div>
          ) : (
            <div className="w-6 mr-2" /> // Spacer for alignment
          )}
          <LinkIcon 
            size={14} 
            className={`mr-2 flex-shrink-0 ${
              isScrapped ? 'text-green-600' : 
              isFailed ? 'text-red-600' : 
              'text-gray-400'
            }`} 
          />
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking link
            className={`text-sm hover:underline flex-1 truncate ${
              isScrapped ? 'text-green-700' : 
              isFailed ? 'text-red-700' : 
              'text-primary'
            }`}
            title={node.url}
          >
            {node.url}
          </a>
          {isScrapped && (
            <span className="ml-2 text-xs text-green-600 font-medium">✓</span>
          )}
          {isFailed && (
            <span className="ml-2 text-xs text-red-600 font-medium">✗</span>
          )}
        </div>
        {hasChildren && node.isExpanded && (
          <div>
            {node.children.map((child) => renderTreeNode(child as TreeNodeWithState, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">URL Tree Structure</h2>
            {displayRootUrl && (
              <p className="text-sm text-gray-600 mt-1">
                Showing all scraped pages under: <span className="font-medium text-primary">{displayRootUrl}</span>
              </p>
            )}
            {totalPages > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Total pages: <span className="font-medium">{totalPages}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="text-primary animate-spin" />
              <span className="ml-3 text-gray-600">Loading URL tree...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 mb-4">{error}</div>
              <Button onClick={loadUrlTree} variant="primary">
                Retry
              </Button>
            </div>
          ) : tree ? (
            <div className="space-y-1">
              {/* Root URL */}
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-4">
                <div className="flex items-center">
                  <LinkIcon size={16} className="text-primary mr-2" />
                  <a
                    href={tree.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {tree.url}
                  </a>
                  <span className="ml-2 text-xs text-gray-500">(Root)</span>
                </div>
              </div>
              
              {/* Tree Structure */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                {tree.children.length > 0 ? (
                  tree.children.map((child) => renderTreeNode(child as TreeNodeWithState, 0))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No child pages found for this URL
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UrlTreeModal;

