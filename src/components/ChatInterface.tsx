import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, RotateCcw } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { FileUpload } from './FileUpload';
import type { Conversation, UploadedDocument } from '../types';

interface ChatInterfaceProps {
  conversation: Conversation | null;
  onSendMessage: (message: string, documents: UploadedDocument[]) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  onUploadFiles?: (files: File[]) => Promise<void>;
  onSyncHistory?: (conversationId: string) => Promise<void>;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress?: {
    steps: Array<{ id: string; label: string; status: 'pending' | 'active' | 'completed' | 'error'; icon: React.ReactNode }>;
    currentStep?: string;
    error?: string;
  };
}

export function ChatInterface({
  conversation,
  onSendMessage,
  onUploadFile,
  onUploadFiles,
  onSyncHistory,
  isLoading,
  isUploading,
  uploadProgress
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || !conversation || isLoading) return;

    const messageText = message.trim();
    setMessage('');
    
    try {
      await onSendMessage(messageText, conversation.documents);
    } catch (error) {
      console.error('Erreur:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi du message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSyncHistory = async () => {
    if (!conversation || !onSyncHistory || isSyncingHistory) return;
    
    setIsSyncingHistory(true);
    try {
      await onSyncHistory(conversation.id);
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    } finally {
      setIsSyncingHistory(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bienvenue dans votre assistant IA
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Créez une nouvelle conversation pour commencer à discuter avec l'IA. 
            Vous pourrez uploader des documents PDF pour des réponses contextuelles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 lg:p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 text-sm lg:text-base truncate">{conversation.title}</h2>
            <p className="text-xs lg:text-sm text-gray-500">
              {conversation.messages.length} messages • {conversation.documents.length} documents
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {onSyncHistory && (
              <button
                onClick={handleSyncHistory}
                disabled={isSyncingHistory}
                className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                title="Synchroniser l'historique depuis N8N"
              >
                {isSyncingHistory ? (
                  <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 lg:w-5 lg:h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className={`p-2 rounded-lg transition-colors ${
                showFileUpload
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Gérer les documents"
            >
              <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* File Upload Panel */}
      {showFileUpload && (
        <div className="bg-white border-b border-gray-200 p-3 lg:p-4 max-h-[50vh] overflow-y-auto">
          <FileUpload
            onFileUpload={onUploadFile}
            onFilesUpload={onUploadFiles}
            documents={conversation.documents}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 min-h-0">
        <div className="max-w-4xl mx-auto">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Démarrez votre conversation
              </h3>
              <p className="text-gray-600">
                Posez une question ou uploadez des documents PDF pour commencer
              </p>
            </div>
          ) : (
            conversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-3 lg:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 lg:gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                className="w-full px-3 lg:px-4 py-2 lg:py-3 text-sm lg:text-base border border-gray-200 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 transition-all"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="p-2 lg:p-3 bg-blue-600 text-white rounded-xl lg:rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 lg:w-5 lg:h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}