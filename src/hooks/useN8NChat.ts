import { useState } from 'react';
import type { Message, UploadedDocument, Conversation } from '../types';
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
      const response = await fetch('https://n8n.srv1030728.hstgr.cloud/webhook/8a5c9f7b-f0a8-4603-9e07-242221f6add1/chat', {
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

      // Calculer la taille en KB
      const documentSizeKB = Math.round(file.size / 1024);
      
      console.log(`📄 Upload ${documentType} vers N8N:`, {
        name: file.name,
        size: `${documentSizeKB} KB`,
        type: file.type,
        conversationId: conversationId || 'N/A'
      });
      
      // Préparer FormData pour l'upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      formData.append('document_type', documentType);
      formData.append('document_size', documentSizeKB.toString());
      formData.append('document_name', file.name);
      
      // Ajouter conversationId si fourni (pour les documents de projet)
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }

      // Faire la requête d'upload
      const response = await fetch('https://n8n.srv1030728.hstgr.cloud/webhook/upload-to-ai', {
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

  // Récupérer tous les documents d'un utilisateur depuis N8N
  const getUserDocuments = async (): Promise<{ success: boolean; documents?: any[]; error?: string }> => {
    try {
      // Récupérer l'ID de session Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = session?.user?.id;
      
      if (!sessionId) {
        throw new Error('Session utilisateur non trouvée. Veuillez vous reconnecter.');
      }

      const url = `https://n8n.srv1030728.hstgr.cloud/webhook/get-user-documents?sessionId=${encodeURIComponent(sessionId)}`;
      console.log('📄 Récupération des documents utilisateur:', sessionId);
      console.log('🔗 URL appelée:', url);

      // Faire la requête pour récupérer les documents (GET pour éviter CORS preflight)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      console.log('📊 Status de la réponse:', response.status, response.statusText);
      console.log('📋 Headers de réponse:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Erreur API N8N: ${response.status} ${response.statusText}`);
      }

      // Vérifier si la réponse a du contenu
      const responseText = await response.text();
      console.log('📄 Réponse brute N8N documents:', responseText);
      console.log('📏 Taille de la réponse:', responseText.length, 'caractères');
      
      if (!responseText || responseText.trim() === '') {
        console.log('ℹ️ Réponse vide - aucun document trouvé');
        return {
          success: true,
          documents: []
        };
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON:', parseError);
        console.error('📄 Contenu de la réponse:', responseText);
        throw new Error(`Réponse JSON invalide: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`);
      }
      
      console.log('✅ Documents récupérés:', data);
      
      // La réponse peut être soit un tableau direct, soit un objet avec une propriété documents
      let documents = [];
      
      if (Array.isArray(data)) {
        // Si c'est déjà un tableau
        documents = data;
      } else if (data.documents && Array.isArray(data.documents)) {
        // Si c'est un objet avec une propriété documents
        documents = data.documents;
      }
      
      return {
        success: true,
        documents: documents
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération des documents'
      };
    }
  };

  // Récupérer toutes les conversations d'un utilisateur depuis N8N
  const getUserConversations = async (): Promise<{ success: boolean; conversations?: any[]; error?: string }> => {
    try {
      // Récupérer l'ID de session Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = session?.user?.id;
      
      if (!sessionId) {
        throw new Error('Session utilisateur non trouvée. Veuillez vous reconnecter.');
      }

      console.log('📋 Récupération des conversations utilisateur:', sessionId);

      // Faire la requête pour récupérer les conversations (GET pour éviter CORS preflight)
      const response = await fetch(`https://n8n.srv1030728.hstgr.cloud/webhook/get-user-conversations?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur API N8N: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ Conversations récupérées:', data);
      
      // La réponse peut être soit un objet conversation unique, soit un tableau, soit un objet avec une propriété conversations
      let conversations = [];
      
      if (Array.isArray(data)) {
        // Si c'est déjà un tableau
        conversations = data;
      } else if (data.conversations && Array.isArray(data.conversations)) {
        // Si c'est un objet avec une propriété conversations
        conversations = data.conversations;
      } else if (data.id) {
        // Si c'est un objet conversation unique
        conversations = [data];
      }
      
      return {
        success: true,
        conversations: conversations
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des conversations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération des conversations'
      };
    }
  };

  // Créer une nouvelle conversation sur N8N
  const createConversation = async (title: string): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
    try {
      // Récupérer l'ID de session Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = session?.user?.id;
      
      if (!sessionId) {
        throw new Error('Session utilisateur non trouvée. Veuillez vous reconnecter.');
      }

      console.log('➕ Création d\'une nouvelle conversation:', title);

      // Faire la requête pour créer la conversation (GET pour éviter CORS preflight)
      const response = await fetch(`https://n8n.srv1030728.hstgr.cloud/webhook/create-conversation?sessionId=${encodeURIComponent(sessionId)}&title=${encodeURIComponent(title)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur API N8N: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ Conversation créée:', data);
      
      return {
        success: true,
        conversationId: data.id
      };

    } catch (error) {
      console.error('❌ Erreur lors de la création de la conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la création de la conversation'
      };
    }
  };

  // Récupérer l'historique de conversation depuis N8N
  const getConversationHistory = async (conversationId: string): Promise<{ success: boolean; messages?: Array<{ human: string; ai: string }>; messagesCount?: number; error?: string }> => {
    try {
      // Récupérer l'ID de session Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = session?.user?.id;
      
      if (!sessionId) {
        throw new Error('Session utilisateur non trouvée. Veuillez vous reconnecter.');
      }

      console.log('📚 Récupération de l\'historique de conversation:', conversationId);

      // Faire la requête pour récupérer l'historique (GET pour éviter CORS preflight)
      const response = await fetch(`https://n8n.srv1030728.hstgr.cloud/webhook/get-conversation-memory?sessionId=${encodeURIComponent(sessionId)}&conversationId=${encodeURIComponent(conversationId)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur API N8N: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ Historique récupéré:', data);
      
      return {
        success: true,
        messages: data.messages || [],
        messagesCount: data.messagesCount || 0
      };

    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'historique:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la récupération de l\'historique'
      };
    }
  };

  // Générer un ID unique pour les messages
  const generateUniqueMessageId = (role: 'user' | 'assistant', index: number, conversationId?: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const convId = conversationId ? conversationId.substring(0, 8) : 'default';
    return `${role}-${convId}-${index}-${timestamp}-${random}`;
  };

  // Convertir l'historique N8N au format de l'application
  const convertN8NHistoryToMessages = (n8nMessages: Array<{ human: string; ai: string }>, conversationId?: string): Message[] => {
    const messages: Message[] = [];
    const baseTimestamp = Date.now();
    
    n8nMessages.forEach((msgPair, index) => {
      // Message utilisateur - ID vraiment unique
      messages.push({
        id: generateUniqueMessageId('user', index, conversationId),
        content: msgPair.human,
        role: 'user',
        timestamp: new Date(baseTimestamp + index * 1000) // Espacement de 1 seconde
      });
      
      // Message assistant - ID vraiment unique
      messages.push({
        id: generateUniqueMessageId('assistant', index, conversationId),
        content: msgPair.ai,
        role: 'assistant',
        timestamp: new Date(baseTimestamp + index * 1000 + 500) // +500ms après le message utilisateur
      });
    });
    
    return messages;
  };

  // Convertir les conversations N8N au format de l'application
  const convertN8NConversationsToApp = (n8nConversations: any[], allDocuments?: any[]): Conversation[] => {
    return n8nConversations.map((n8nConv) => {
      const conversationId = n8nConv.id || n8nConv.conversationId;
      
      // Trouver les documents associés à cette conversation
      let conversationDocuments: UploadedDocument[] = [];
      if (allDocuments) {
        const projectDocs = allDocuments.filter(doc => 
          doc.conversation_id === conversationId && 
          doc.document_type === 'project_doc'
        );
        conversationDocuments = convertN8NDocumentsToApp(projectDocs);
      }
      
      return {
        id: conversationId,
        title: n8nConv.title || 'Nouvelle conversation',
        messages: n8nConv.messages ? convertN8NHistoryToMessages(n8nConv.messages) : [],
        createdAt: n8nConv.created_at ? new Date(n8nConv.created_at) : (n8nConv.createdAt ? new Date(n8nConv.createdAt) : new Date()),
        updatedAt: n8nConv.updated_at ? new Date(n8nConv.updated_at) : (n8nConv.updatedAt ? new Date(n8nConv.updatedAt) : new Date()),
        documents: conversationDocuments,
        vectorStoreId: n8nConv.vectorStoreId
      };
    });
  };

  // Convertir les documents N8N au format de l'application
  const convertN8NDocumentsToApp = (n8nDocuments: any[]): UploadedDocument[] => {
    return n8nDocuments.map((n8nDoc) => ({
      id: n8nDoc.uuid || n8nDoc.id,
      name: n8nDoc.document_name || n8nDoc.name,
      size: n8nDoc.size || 0,
      uploadedAt: n8nDoc.created_at ? new Date(n8nDoc.created_at) : new Date(),
      vectorized: true, // Assumons que les documents N8N sont vectorisés
      documentType: n8nDoc.document_type as 'project_doc' | 'user_doc',
      fileId: n8nDoc.uuid || n8nDoc.id,
      content: `Document ${n8nDoc.document_name || 'sans nom'} (${Math.round((n8nDoc.size || 0) / 1024)} KB)`
    }));
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
    getUserConversations,
    getUserDocuments,
    createConversation,
    getConversationHistory,
    convertN8NHistoryToMessages,
    convertN8NConversationsToApp,
    convertN8NDocumentsToApp,
    syncConversationDocuments,
    isLoading
  };
}
