import { useState } from 'react';
import type { Message, UploadedDocument } from '../types';
import supabase from '../utils/supabase';

export function useN8NChat() {
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (
    message: string,
    _conversationHistory: Message[],
    _documents: UploadedDocument[],
    _vectorStoreId?: string,
    onStreamUpdate?: (content: string) => void,
    conversationId?: string
  ): Promise<Message> => {
    setIsLoading(true);
    
    try {
      // Récupérer l'ID de session Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = session?.user?.id;
      
      if (!sessionId) {
        throw new Error('Session utilisateur non trouvée. Veuillez vous reconnecter.');
      }

      console.log('🚀 Envoi du message vers N8N endpoint avec sessionId:', sessionId);

      // Faire la requête avec streaming (POST avec body JSON)
      const response = await fetch('https://zerr0o.app.n8n.cloud/webhook/8a5c9f7b-f0a8-4603-9e07-242221f6add1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          chatInput: message,
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API N8N: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Pas de corps de réponse pour le streaming');
      }

      // Traiter le stream de réponse
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // Décoder le chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Traiter les lignes complètes (séparées par \n)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Garder la dernière ligne incomplète
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                
                if (data.type === 'begin') {
                  console.log('🎬 Début du streaming:', data.metadata);
                } else if (data.type === 'item' && data.content) {
                  assistantContent += data.content;
                  // Appeler le callback de mise à jour si fourni
                  if (onStreamUpdate) {
                    onStreamUpdate(assistantContent);
                  }
                } else if (data.type === 'end') {
                  console.log('🏁 Fin du streaming:', data.metadata);
                }
              } catch (parseError) {
                // Si ce n'est pas du JSON valide, on l'ignore silencieusement
                // car il peut y avoir du contenu non-JSON dans le stream
                console.debug('Ligne non-JSON ignorée:', line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Traiter le buffer restant s'il y en a
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.type === 'item' && data.content) {
            assistantContent += data.content;
            if (onStreamUpdate) {
              onStreamUpdate(assistantContent);
            }
          }
        } catch (parseError) {
          // Ignorer les erreurs de parsing du buffer final
          console.debug('Buffer final non-JSON ignoré:', buffer);
        }
      }

      console.log('✅ Message IA généré:', assistantContent.length, 'caractères');

      // Vérifier qu'on a bien reçu du contenu
      if (!assistantContent.trim()) {
        console.warn('⚠️ Aucun contenu reçu du stream N8N');
        throw new Error('Aucune réponse reçue de l\'assistant IA');
      }

      const responseMessage: Message = {
        id: Date.now().toString(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date()
      };

      return responseMessage;
    } catch (error) {
      console.error('❌ Erreur N8N Chat:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Upload de document vers N8N
  const uploadDocument = async (
    file: File,
    documentType: 'project_doc' | 'user_doc',
    conversationId?: string
  ): Promise<{ success: boolean; content?: string; vectorStoreId?: string; fileId?: string; documents?: UploadedDocument[] }> => {
    setIsLoading(true);
    
    try {
      // Récupérer l'ID utilisateur Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Session utilisateur non trouvée. Veuillez vous reconnecter.');
      }

      console.log(`📄 Upload ${documentType} vers N8N:`, file.name);
      
      // Préparer FormData pour l'upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      formData.append('document_type', documentType);
      
      // Ajouter conversationId si fourni (pour les documents de projet)
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }

      // Faire la requête d'upload
      const response = await fetch('https://zerr0o.app.n8n.cloud/webhook/upload-to-ai', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Erreur upload N8N: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Réponse N8N upload:', result);
      
      const vectorStoreId = conversationId ? `vs_${conversationId}_${Date.now()}` : `user_docs_${userId}`;
      const fileId = result.fileId || `file_${Date.now()}`;
      
      const content = `Document ${file.name} uploadé avec succès.
      
Type: ${documentType === 'user_doc' ? 'Document utilisateur' : 'Document de projet'}
Taille: ${(file.size / 1024).toFixed(2)} KB
Format: ${file.type}
Ajouté le: ${new Date().toLocaleString()}

${documentType === 'user_doc' 
  ? 'Ce document sera disponible pour toutes vos conversations.'
  : 'Ce document est spécifique à cette conversation.'}`;

      console.log('✅ Document uploadé avec succès');
      
      return { 
        success: true, 
        content: content,
        vectorStoreId: vectorStoreId,
        fileId: fileId
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'upload du document:', error);
      return { 
        success: false, 
        content: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue lors de l\'upload du document'}` 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de compatibilité pour les documents de projet (conversation)
  const vectorizeDocument = async (
    file: File,
    conversationId: string,
    existingVectorStoreId?: string
  ): Promise<{ success: boolean; content?: string; vectorStoreId?: string; fileId?: string; documents?: UploadedDocument[] }> => {
    return uploadDocument(file, 'project_doc', conversationId);
  };

  // Fonction de synchronisation simplifiée
  const syncConversationDocuments = async (conversation: any): Promise<UploadedDocument[]> => {
    // Retourner les documents existants (pas de sync réelle avec N8N)
    return conversation.documents || [];
  };

  return {
    sendMessage,
    vectorizeDocument,
    uploadDocument,
    syncConversationDocuments,
    isLoading
  };
}
