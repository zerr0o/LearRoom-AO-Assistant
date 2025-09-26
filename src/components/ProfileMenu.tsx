import React, { useState } from 'react';
import { User, X, FileText, Key } from 'lucide-react';
import { UserDocuments } from './UserDocuments';
import type { AppSettings, UploadedDocument } from '../types';

interface ProfileMenuProps {
  settings: AppSettings;
  userDocuments: UploadedDocument[];
  onUpdateSettings: (settings: AppSettings) => void;
  onUploadUserDocument: (file: File) => Promise<void>;
  onDeleteUserDocument?: (documentId: string) => void;
  onClose: () => void;
  isUploading: boolean;
  uploadProgress?: {
    steps: Array<{ id: string; label: string; status: 'pending' | 'active' | 'completed' | 'error'; icon: React.ReactNode }>;
    currentStep?: string;
    error?: string;
  };
}

export function ProfileMenu({ 
  settings, 
  userDocuments,
  onUpdateSettings, 
  onUploadUserDocument,
  onDeleteUserDocument,
  onClose,
  isUploading,
  uploadProgress
}: ProfileMenuProps) {
  const [activeTab, setActiveTab] = useState<'documents' | 'settings'>('documents');
  const [tokenInput, setTokenInput] = useState(settings.openaiToken);

  const handleSaveSettings = () => {
    onUpdateSettings({ openaiToken: tokenInput });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" style={{ zIndex: 99999 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto my-auto max-h-[90vh] flex flex-col" style={{ position: 'relative', zIndex: 100000 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Profil utilisateur</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Documents d'entreprise
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Key className="w-4 h-4" />
              Configuration
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeTab === 'documents' && (
              <UserDocuments
                userDocuments={userDocuments}
                onUploadDocument={onUploadUserDocument}
                onDeleteDocument={onDeleteUserDocument}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Configuration API
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Gérez les paramètres de connexion aux services externes.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token API OpenAI (Optionnel)
                  </label>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="sk-... (optionnel)"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    L'application utilise maintenant un système IA personnalisé. Ce token n'est plus requis.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
