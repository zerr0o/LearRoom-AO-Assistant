import React, { useState } from 'react';
import { Upload, FileText, Trash2, Plus, X } from 'lucide-react';
import type { UploadedDocument } from '../types';

interface UserDocumentsProps {
  userDocuments: UploadedDocument[];
  onUploadDocument: (file: File) => Promise<void>;
  onDeleteDocument?: (documentId: string) => void;
  isUploading: boolean;
  uploadProgress?: {
    steps: Array<{ id: string; label: string; status: 'pending' | 'active' | 'completed' | 'error'; icon: React.ReactNode }>;
    currentStep?: string;
    error?: string;
  };
}

export function UserDocuments({ 
  userDocuments, 
  onUploadDocument, 
  onDeleteDocument,
  isUploading,
  uploadProgress 
}: UserDocumentsProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUploadDocument(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadDocument(files[0]);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Documents utilisateur
        </h3>
        <p className="text-sm text-gray-600">
          Ces documents contiennent vos informations d'entreprise (DC1, DC2, nombre d'employés, etc.) 
          et seront disponibles pour toutes vos conversations d'appels d'offres.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">
          Glissez-déposez un document ou{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
            parcourez vos fichiers
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">
          Formats supportés: PDF, DOC, DOCX, TXT
        </p>
      </div>

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-blue-900">Upload en cours...</span>
          </div>
          
          <div className="space-y-2">
            {uploadProgress.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  step.status === 'completed' ? 'bg-green-500' :
                  step.status === 'active' ? 'bg-blue-500' :
                  step.status === 'error' ? 'bg-red-500' :
                  'bg-gray-300'
                }`}>
                  {step.status === 'completed' && <span className="text-white text-xs">✓</span>}
                  {step.status === 'error' && <X className="w-2 h-2 text-white" />}
                </div>
                <span className={`text-sm ${
                  step.status === 'active' ? 'text-blue-700 font-medium' : 'text-gray-600'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          
          {uploadProgress.error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {uploadProgress.error}
            </div>
          )}
        </div>
      )}

      {/* Documents List */}
      {userDocuments.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Documents uploadés ({userDocuments.length})
          </h4>
          <div className="space-y-2">
            {userDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {(doc.size / 1024).toFixed(1)} KB • {doc.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {onDeleteDocument && (
                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Supprimer le document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {userDocuments.length === 0 && !isUploading && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Aucun document utilisateur uploadé pour le moment
          </p>
        </div>
      )}
    </div>
  );
}
