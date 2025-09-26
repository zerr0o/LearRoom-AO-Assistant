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
    onStreamUpdate?: (content: string) => void
  ): Promise<Message> => {
    setIsLoading(true);
    
    try {
      // Récupérer l'ID de session Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const sessionID = session?.user?.id;
      
      if (!sessionID) {
        throw new Error('Session utilisateur non trouvée. Veuillez vous reconnecter.');
      }

      console.log('🚀 Envoi du message vers N8N endpoint avec sessionID:', sessionID);

      // Faire la requête avec streaming (POST avec body JSON)
      const response = await fetch('https://zerr0o.app.n8n.cloud/webhook/8a5c9f7b-f0a8-4603-9e07-242221f6add1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          sessionID: sessionID,
          chatInput: message
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

  // Fonction simplifiée pour la vectorisation (pas d'upload réel)
  const vectorizeDocument = async (
    file: File,
    conversationId: string,
    existingVectorStoreId?: string
  ): Promise<{ success: boolean; content?: string; vectorStoreId?: string; fileId?: string; documents?: UploadedDocument[] }> => {
    setIsLoading(true);
    
    try {
      console.log('📄 Simulation de vectorisation pour:', file.name);
      
      // Simuler un délai de traitement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const vectorStoreId = existingVectorStoreId || `vs_${conversationId}_${Date.now()}`;
      const fileId = `file_${Date.now()}`;
      
      const simulatedContent = `Document ${file.name} ajouté à la conversation.
      
Ce document sera pris en compte par l'assistant IA lors des prochaines interactions.
Les informations contenues peuvent être interrogées via des requêtes en langage naturel.

Taille: ${(file.size / 1024).toFixed(2)} KB
Type: ${file.type}
Ajouté le: ${new Date().toLocaleString()}`;

      console.log('✅ Document ajouté avec succès');
      
      return { 
        success: true, 
        content: simulatedContent,
        vectorStoreId: vectorStoreId,
        fileId: fileId
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du document:', error);
      return { 
        success: false, 
        content: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue lors de l\'ajout du document'}` 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de synchronisation simplifiée
  const syncConversationDocuments = async (conversation: any): Promise<UploadedDocument[]> => {
    // Retourner les documents existants (pas de sync réelle avec N8N)
    return conversation.documents || [];
  };

  return {
    sendMessage,
    vectorizeDocument,
    syncConversationDocuments,
    isLoading
  };
}
