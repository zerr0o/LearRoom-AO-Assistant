import React, { useState, useEffect } from 'react';
import { Settings, LogOut, MessageCircle, Menu, X } from 'lucide-react';
import { AuthPage } from './components/AuthPage';
import { ConversationsList } from './components/ConversationsList';
import { ChatInterface } from './components/ChatInterface';
import { ProfileMenu } from './components/ProfileMenu';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useN8NChat } from './hooks/useN8NChat';
import type { Conversation, Message, UploadedDocument, AppSettings } from './types';
import supabase from './utils/supabase';

function App() {
  const [user, setUser] = useState<{ email: string; isAuthenticated: boolean } | null>(null);
  const [conversations, setConversations] = useLocalStorage<Conversation[]>('conversations', []);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [settings, setSettings] = useLocalStorage<AppSettings>('settings', { openaiToken: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ conversationId: string; title: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    steps: Array<{ id: string; label: string; status: 'pending' | 'active' | 'completed' | 'error'; icon: React.ReactNode }>;
    currentStep?: string;
    error?: string;
  } | undefined>();
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [userDocuments, setUserDocuments] = useLocalStorage<UploadedDocument[]>('userDocuments', []);

  const { sendMessage, vectorizeDocument, uploadDocument, syncConversationDocuments, isLoading } = useN8NChat();

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const handleAuthSuccess = (email: string) => {
    setUser({ email, isAuthenticated: true });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
    }
  };

  const createConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: `Conversation ${conversations.length + 1}`,
      messages: [],
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    setIsMobileMenuOpen(false);
  };

  const deleteConversation = (id: string) => {
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      setDeleteDialog({ conversationId: id, title: conversation.title });
    }
  };

  const confirmDeleteConversation = () => {
    if (deleteDialog) {
      setConversations(prev => prev.filter(c => c.id !== deleteDialog.conversationId));
      if (activeConversationId === deleteDialog.conversationId) {
        setActiveConversationId(null);
      }
      setDeleteDialog(null);
    }
  };

  const handleSendMessage = async (message: string, documents: UploadedDocument[]) => {
    if (!activeConversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    const updatedConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, userMessage],
      updatedAt: new Date()
    };

    setConversations(prev =>
      prev.map(c => c.id === activeConversation.id ? updatedConversation : c)
    );

    // Initialiser le message de streaming
    const streamingMsg: Message = {
      id: `streaming-${Date.now()}`,
      content: '',
      role: 'assistant',
      timestamp: new Date()
    };
    setStreamingMessage(streamingMsg);

    try {
      const response = await sendMessage(
        message,
        activeConversation.messages,
        documents,
        activeConversation.vectorStoreId,
        (streamContent: string) => {
          // Callback de mise à jour du streaming
          setStreamingMessage(prev => prev ? { ...prev, content: streamContent } : null);
        },
        activeConversation.id
      );

      // Remplacer le message de streaming par la réponse finale
      setStreamingMessage(null);
      setConversations(prev =>
        prev.map(c =>
          c.id === activeConversation.id
            ? { ...c, messages: [...c.messages, userMessage, response], updatedAt: new Date() }
            : c
        )
      );
    } catch (error) {
      console.error('Erreur envoi message:', error);
      setStreamingMessage(null);
      throw error;
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!activeConversation) return;

    setIsUploading(true);
    setUploadProgress({
      steps: [
        { id: 'upload', label: 'Chargement du fichier', status: 'active', icon: <MessageCircle className="w-4 h-4" /> },
        { id: 'process', label: 'Traitement et vectorisation', status: 'pending', icon: <MessageCircle className="w-4 h-4" /> },
        { id: 'index', label: 'Indexation dans la base', status: 'pending', icon: <MessageCircle className="w-4 h-4" /> }
      ],
      currentStep: 'upload'
    });

    try {
      setUploadProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map(s => 
          s.id === 'upload' ? { ...s, status: 'completed' } :
          s.id === 'process' ? { ...s, status: 'active' } : s
        ),
        currentStep: 'process'
      } : prev);

      const result = await vectorizeDocument(file, activeConversation.id, activeConversation.vectorStoreId);
      
      if (result.success) {
        setUploadProgress(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => 
            s.id === 'process' ? { ...s, status: 'completed' } :
            s.id === 'index' ? { ...s, status: 'active' } : s
          ),
          currentStep: 'index'
        } : prev);

        const newDocument: UploadedDocument = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          vectorized: true,
          content: result.content,
          fileId: result.fileId,
          documentType: 'project_doc'
        };

        const updatedConversation = {
          ...activeConversation,
          documents: [...activeConversation.documents, newDocument],
          vectorStoreId: result.vectorStoreId || activeConversation.vectorStoreId,
          updatedAt: new Date()
        };

        setConversations(prev =>
          prev.map(c => c.id === activeConversation.id ? updatedConversation : c)
        );

        setUploadProgress(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => ({ ...s, status: 'completed' })),
          currentStep: undefined
        } : prev);

        setTimeout(() => {
          setUploadProgress(undefined);
        }, 2000);
      } else {
        throw new Error(result.content || 'Erreur lors de la vectorisation');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      setUploadProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map(s => 
          s.status === 'active' ? { ...s, status: 'error' } : s
        ),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      } : prev);
      
      setTimeout(() => {
        setUploadProgress(undefined);
      }, 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    if (!activeConversation || files.length === 0) return;

    setIsUploading(true);
    let currentVectorStoreId = activeConversation.vectorStoreId;
    const uploadedDocs: UploadedDocument[] = [];

    setUploadProgress({
      steps: [
        { id: 'upload', label: `Chargement de ${files.length} fichiers`, status: 'active', icon: <MessageCircle className="w-4 h-4" /> },
        { id: 'process', label: 'Traitement et vectorisation', status: 'pending', icon: <MessageCircle className="w-4 h-4" /> },
        { id: 'index', label: 'Indexation dans la base', status: 'pending', icon: <MessageCircle className="w-4 h-4" /> }
      ],
      currentStep: 'upload'
    });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadProgress(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => 
            s.id === 'upload' ? { ...s, label: `Chargement ${i + 1}/${files.length}: ${file.name}` } : s
          )
        } : prev);

        const result = await vectorizeDocument(file, activeConversation.id, currentVectorStoreId);
        
        if (result.success) {
          currentVectorStoreId = result.vectorStoreId || currentVectorStoreId;
          
          const newDocument: UploadedDocument = {
            id: `${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            uploadedAt: new Date(),
            vectorized: true,
            content: result.content,
            fileId: result.fileId,
            documentType: 'project_doc'
          };
          
          uploadedDocs.push(newDocument);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setUploadProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map(s => 
          s.id === 'upload' ? { ...s, status: 'completed' } :
          s.id === 'process' ? { ...s, status: 'completed' } :
          s.id === 'index' ? { ...s, status: 'completed' } : s
        )
      } : prev);

      const updatedConversation = {
        ...activeConversation,
        documents: [...activeConversation.documents, ...uploadedDocs],
        vectorStoreId: currentVectorStoreId,
        updatedAt: new Date()
      };

      setConversations(prev =>
        prev.map(c => c.id === activeConversation.id ? updatedConversation : c)
      );

      setTimeout(() => {
        setUploadProgress(undefined);
      }, 2000);
    } catch (error) {
      console.error('Erreur upload batch:', error);
      setUploadProgress(prev => prev ? {
        ...prev,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      } : prev);
      
      setTimeout(() => {
        setUploadProgress(undefined);
      }, 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handleUploadUserDocument = async (file: File) => {
    setIsUploading(true);
    setUploadProgress({
      steps: [
        { id: 'upload', label: 'Upload du document utilisateur', status: 'active', icon: <MessageCircle className="w-4 h-4" /> },
        { id: 'process', label: 'Traitement et indexation', status: 'pending', icon: <MessageCircle className="w-4 h-4" /> },
        { id: 'complete', label: 'Document ajouté au profil', status: 'pending', icon: <MessageCircle className="w-4 h-4" /> }
      ],
      currentStep: 'upload'
    });

    try {
      setUploadProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map(s => 
          s.id === 'upload' ? { ...s, status: 'completed' } :
          s.id === 'process' ? { ...s, status: 'active' } : s
        ),
        currentStep: 'process'
      } : prev);

      const result = await uploadDocument(file, 'user_doc');
      
      if (result.success) {
        setUploadProgress(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => 
            s.id === 'process' ? { ...s, status: 'completed' } :
            s.id === 'complete' ? { ...s, status: 'active' } : s
          ),
          currentStep: 'complete'
        } : prev);

        const newDocument: UploadedDocument = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          vectorized: true,
          content: result.content,
          fileId: result.fileId,
          documentType: 'user_doc'
        };

        setUserDocuments(prev => [...prev, newDocument]);

        setUploadProgress(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => ({ ...s, status: 'completed' })),
          currentStep: undefined
        } : prev);

        setTimeout(() => {
          setUploadProgress(undefined);
        }, 2000);
      } else {
        throw new Error(result.content || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur upload document utilisateur:', error);
      setUploadProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map(s => 
          s.status === 'active' ? { ...s, status: 'error' } : s
        ),
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      } : prev);
      
      setTimeout(() => {
        setUploadProgress(undefined);
      }, 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteUserDocument = (documentId: string) => {
    setUserDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  useEffect(() => {
    if (activeConversation && activeConversation.vectorStoreId) {
      syncConversationDocuments(activeConversation).then((syncedDocs: UploadedDocument[]) => {
        if (syncedDocs.length !== activeConversation.documents.length) {
          setConversations(prev =>
            prev.map(c =>
              c.id === activeConversation.id
                ? { ...c, documents: syncedDocs }
                : c
            )
          );
        }
      });
    }
  }, [activeConversation?.id, syncConversationDocuments]);

  // Supabase auth session handling
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      const email = session?.user?.email || null;
      if (email) {
        setUser({ email, isAuthenticated: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      if (email) {
        setUser({ email, isAuthenticated: true });
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!user?.isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Créer une conversation étendue avec le message de streaming
  const conversationWithStreaming = activeConversation && streamingMessage ? {
    ...activeConversation,
    messages: [...activeConversation.messages, streamingMessage]
  } : activeConversation;

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Overlay pour mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar - responsive */}
      <div className={`${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:relative z-50 lg:z-auto transition-transform duration-300 h-full`}>
        <ConversationsList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={selectConversation}
          onCreateConversation={createConversation}
          onDeleteConversation={deleteConversation}
          onClose={() => setIsMobileMenuOpen(false)}
          isMobile={isMobileMenuOpen}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                title="Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h1 className="text-lg lg:text-xl font-semibold text-gray-900">AO Assistant</h1>
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[150px] lg:max-w-none">{user.email}</span>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Paramètres"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <ChatInterface
          conversation={conversationWithStreaming}
          onSendMessage={handleSendMessage}
          onUploadFile={handleFileUpload}
          onUploadFiles={handleFilesUpload}
          isLoading={isLoading}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>

      {showSettings && (
        <ProfileMenu
          settings={settings}
          userDocuments={userDocuments}
          onUpdateSettings={updateSettings}
          onUploadUserDocument={handleUploadUserDocument}
          onDeleteUserDocument={handleDeleteUserDocument}
          onClose={() => setShowSettings(false)}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {deleteDialog && (
        <DeleteConfirmDialog
          conversationTitle={deleteDialog.title}
          onConfirm={confirmDeleteConversation}
          onCancel={() => setDeleteDialog(null)}
        />
      )}
    </div>
  );
}

export default App;
