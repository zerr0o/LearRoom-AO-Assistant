import React, { useRef, useState } from 'react';
import { Upload, File, Check, AlertCircle, Folder, FileText } from 'lucide-react';
import { UploadProgress } from './UploadProgress';
import type { UploadedDocument } from '../types';

// Types de fichiers autorisés selon les spécifications
const ALLOWED_FILE_TYPES = {
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.cs': 'text/x-csharp',
  '.css': 'text/css',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.go': 'text/x-golang',
  '.html': 'text/html',
  '.java': 'text/x-java',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.php': 'text/x-php',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.sh': 'application/x-sh',
  '.tex': 'text/x-tex',
  '.ts': 'application/typescript',
  '.txt': 'text/plain'
};

const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES);

// Fonction pour vérifier si un fichier est autorisé
const isAllowedFileType = (filename: string): boolean => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(extension);
};

const getFileExtension = (filename: string): string => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  onFilesUpload?: (files: File[]) => Promise<void>;
  documents: UploadedDocument[];
  isUploading: boolean;
  uploadProgress?: {
    steps: Array<{ id: string; label: string; status: 'pending' | 'active' | 'completed' | 'error'; icon: React.ReactNode }>;
    currentStep?: string;
    error?: string;
  };
}

export function FileUpload({ onFileUpload, onFilesUpload, documents, isUploading, uploadProgress }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'folder'>('file');

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Convertir FileList en Array pour plus de flexibilité
    const fileArray = Array.from(files);
    
    // Filtrer les fichiers autorisés
    const allowedFiles = fileArray.filter(file => isAllowedFileType(file.name));
    const rejectedFiles = fileArray.filter(file => !isAllowedFileType(file.name));
    
    if (rejectedFiles.length > 0) {
      const rejectedExtensions = [...new Set(rejectedFiles.map(f => getFileExtension(f.name)))];
      console.warn(`📋 Fichiers ignorés (types non supportés): ${rejectedExtensions.join(', ')}`);
    }
    
    if (allowedFiles.length === 0) {
      alert(`Aucun fichier supporté trouvé. Types autorisés: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }
    
    // Afficher les statistiques
    console.log(`📁 Traitement dossier: ${allowedFiles.length} fichiers autorisés sur ${fileArray.length} total`);
    
    // Utiliser la fonction batch si disponible, sinon fallback sur la fonction individuelle
    if (onFilesUpload && allowedFiles.length > 1) {
      console.log(`🗂️ Upload batch - Utilisation du même Vector Store pour tous les fichiers`);
      await onFilesUpload(allowedFiles);
    } else if (allowedFiles.length === 1) {
      console.log(`📄 Upload fichier unique`);
      await onFileUpload(allowedFiles[0]);
    } else if (allowedFiles.length > 1) {
      // Fallback: traitement séquentiel un par un
      console.log(`📄 Upload séquentiel (pas de batch disponible)`);
      for (const file of allowedFiles) {
        await onFileUpload(file);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    // Pour le drag & drop, traiter comme des fichiers individuels
    if (e.dataTransfer.items) {
      // Utiliser DataTransferItemList si disponible (plus moderne)
      const files = Array.from(e.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile()!)
        .filter(file => file !== null);
      handleFileSelect({ ...files, length: files.length } as FileList);
    } else {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleModeSwitch = (mode: 'file' | 'folder') => {
    setUploadMode(mode);
    if (mode === 'file') {
      fileInputRef.current?.click();
    } else {
      folderInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => handleModeSwitch('file')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isUploading}
          >
            <FileText className="w-4 h-4" />
            Fichier(s)
          </button>
          <button
            onClick={() => handleModeSwitch('folder')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={isUploading}
          >
            <Folder className="w-4 h-4" />
            Dossier
          </button>
        </div>
        
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
        
      </div>

      {/* Input pour fichiers individuels */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Input pour sélection de dossier */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Progress indicator */}
      {isUploading && uploadProgress && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Traitement en cours</h4>
          <UploadProgress 
            steps={uploadProgress.steps}
            currentStep={uploadProgress.currentStep}
            error={uploadProgress.error}
          />
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Documents uploadés</h4>
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  {getFileExtension(doc.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                <p className="text-xs text-gray-500">
                  {doc.size > 1024 * 1024 
                    ? `${(doc.size / (1024 * 1024)).toFixed(1)} MB` 
                    : `${(doc.size / 1024).toFixed(1)} KB`} • {doc.uploadedAt.toLocaleDateString()}
                </p>
              </div>
              {doc.vectorized ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}