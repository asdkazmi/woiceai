import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { knowledgeBaseService, KnowledgeBase, PaginationMeta } from '../services/knowledgeBaseService';
import CreateKnowledgeBaseModal from './CreateKnowledgeBaseModal';
import KnowledgeBaseDetail from './KnowledgeBaseDetail';
import { Search, Plus, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Pagination from './ui/Pagination';
import Spinner from './ui/Spinner';
import CircularProgress from './ui/CircularProgress';

const KnowledgeBaseList: React.FC = () => {
  const { kbId } = useParams<{ kbId?: string }>();
  const navigate = useNavigate();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | undefined>();
  const perPage = 12;

  useEffect(() => {
    loadKnowledgeBases();
  }, [currentPage, searchQuery]);

  // Auto-select KB if kbId is in URL
  useEffect(() => {
    if (kbId && knowledgeBases.length > 0) {
      const kb = knowledgeBases.find(k => k.id === parseInt(kbId));
      if (kb) {
        setSelectedKB(kb);
      } else {
        navigate('/knowledge-bases');
      }
    } else if (!kbId) {
      setSelectedKB(null);
    }
  }, [kbId, knowledgeBases, navigate]);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await knowledgeBaseService.getAll({
        page: currentPage,
        perPage,
        search: searchQuery || undefined,
      });
      setKnowledgeBases(result.knowledgeBases);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load knowledge bases');
      console.error('Error loading knowledge bases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    loadKnowledgeBases();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadKnowledgeBases();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getContentStats = (kb: KnowledgeBase) => {
    // Use contentStats from backend if available, otherwise fallback to calculating from contents
    if (kb.contentStats) {
      return kb.contentStats;
    }
    const contents = kb.knowledgeBaseContents || [];
    const completed = contents.filter(c => c.status === 'completed').length;
    const pending = contents.filter(c => c.status === 'pending').length;
    const queued = contents.filter(c => c.status === 'queued').length;
    const processing = contents.filter(c => c.status === 'processing').length;
    const failed = contents.filter(c => c.status === 'failed').length;
    return { completed, pending, queued, processing, failed, total: contents.length };
  };

  const hasIndexingInProgress = (kb: KnowledgeBase) => {
    const stats = getContentStats(kb);
    return stats.pending > 0 || stats.queued > 0 || stats.processing > 0;
  };

  if (selectedKB) {
    return (
      <KnowledgeBaseDetail
        knowledgeBase={selectedKB}
        onBack={() => {
          setSelectedKB(null);
          navigate('/knowledge-bases');
        }}
        onUpdate={loadKnowledgeBases}
        onDelete={(id: number) => {
          if (selectedKB?.id === id) {
            setSelectedKB(null);
            navigate('/knowledge-bases');
          }
          loadKnowledgeBases();
        }}
      />
    );
  }

  if (loading && knowledgeBases.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Knowledge Bases</h2>
          <p className="text-base text-gray-600">Manage your knowledge bases and content</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          icon={Plus}
          iconPosition="left"
        >
          Create Knowledge Base
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="max-w-md">
        <Input
          type="text"
          placeholder="Search knowledge bases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
        />
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button
            onClick={loadKnowledgeBases}
            className="ml-4 text-red-700 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {knowledgeBases.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md p-12 text-center">
          <div className="p-4 rounded-md bg-gray-100 inline-block mb-4">
            <AlertCircle size={48} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No knowledge bases yet</h3>
          <p className="text-base text-gray-600 mb-6">Create your first knowledge base to get started</p>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
            iconPosition="left"
          >
            Create Knowledge Base
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {knowledgeBases.map((kb) => {
              const stats = getContentStats(kb);
              const isIndexing = hasIndexingInProgress(kb);
              
              return (
                <div
                  key={kb.id}
                  className="bg-white border border-gray-200 rounded-md p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 hover:text-primary">
                        {kb.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <CircularProgress
                        completed={stats.completed}
                        pending={stats.pending}
                        queued={stats.queued}
                        processing={stats.processing}
                        failed={stats.failed}
                        total={stats.total}
                        size={28}
                        isAnimating={isIndexing}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{stats.total} items</span>
                    {kb.createdAt && (
                      <span>Created: {new Date(kb.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateKnowledgeBaseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default KnowledgeBaseList;
