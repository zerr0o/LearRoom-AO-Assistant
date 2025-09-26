import { MessageCircle, Plus, Calendar, Trash2, X, Loader2 } from 'lucide-react';
import type { Conversation } from '../types';

interface ConversationsListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
  isLoading?: boolean;
}

export function ConversationsList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onClose,
  isMobile,
  isLoading
}: ConversationsListProps) {
  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <div className="w-full sm:w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3 lg:hidden">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={() => {
            onCreateConversation();
            if (onClose && isMobile) onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Nouvelle conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">
            <Loader2 className="w-8 h-8 mx-auto mb-3 opacity-50 animate-spin" />
            <p className="text-sm">Chargement des conversations...</p>
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune conversation</p>
          </div>
        ) : (
          <div className="p-2">
            {sortedConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-all hover:bg-gray-50 ${
                  activeConversationId === conversation.id
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : ''
                } relative group`}
              >
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className="flex items-start gap-3 w-full"
                >
                  <MessageCircle className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate text-sm">
                      {conversation.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {conversation.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                    {conversation.documents.length > 0 && (
                      <div className="flex items-center mt-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          {conversation.documents.length} documents
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  className="absolute top-3 right-3 p-1 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer la conversation"
                >
                  <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}