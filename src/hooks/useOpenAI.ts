import { useState } from 'react';
import type { Message, UploadedDocument, Citation } from '../types';

interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: {
    filename?: string;
    page?: number;
  };
}

export function useOpenAI(apiToken: string) {
  const [isLoading, setIsLoading] = useState(false);

  // Créer ou récupérer un assistant avec file_search
  const getOrCreateAssistant = async (vectorStoreId: string): Promise<string> => {
    console.log('🤖 Création/récupération de l\'assistant avec vector store:', vectorStoreId);
    
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        name: 'Document Assistant',
        instructions: 'Tu es un assistant IA utile et précis dédié à l annalyse d apel d offre. Tu peux rechercher dans les documents PDF uploadés pour répondre aux questions. Tu cherches toujours une solution en priorité dans les documents grace à file search. ',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        }
      })
    });

    if (!assistantResponse.ok) {
      const error = await assistantResponse.json();
      throw new Error(`Erreur création assistant: ${error.error?.message || 'Erreur inconnue'}`);
    }

    const assistant = await assistantResponse.json();
    console.log('✅ Assistant créé:', assistant.id);
    return assistant.id;
  };

  const sendMessage = async (
    message: string,
    conversationHistory: Message[],
    documents: UploadedDocument[],
    vectorStoreId?: string
  ): Promise<Message> => {
    if (!apiToken) {
      throw new Error('Token OpenAI requis. Veuillez le configurer dans les paramètres.');
    }

    setIsLoading(true);
    
    try {
      if (!vectorStoreId) {
        // Si pas de vector store, utiliser chat/completions classique
        const messages = [
          { role: 'system', content: `Tu es un assistant IA utile et précis. Documents disponibles : ${documents.map(d => d.name).join(', ')}` },
          ...conversationHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: message }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 1500
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Erreur API OpenAI');
        }

        const data = await response.json();
        const assistantContent = data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';

        return {
          id: Date.now().toString(),
          content: assistantContent,
          role: 'assistant',
          timestamp: new Date()
        };
      }

      // Utiliser l'API Assistants avec file_search
      console.log('🚀 Utilisation de l\'API Assistants avec file_search');
      
      // Étape 1: Créer un assistant
      const assistantId = await getOrCreateAssistant(vectorStoreId);
      
      // Étape 2: Créer un thread
      console.log('📝 Création du thread...');
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      });

      if (!threadResponse.ok) {
        const error = await threadResponse.json();
        throw new Error(`Erreur création thread: ${error.error?.message || 'Erreur inconnue'}`);
      }

      const thread = await threadResponse.json();
      console.log('✅ Thread créé:', thread.id);
      
      // Étape 3: Ajouter les messages de l'historique au thread
      for (const historyMsg of conversationHistory.slice(-5)) {
        await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            role: historyMsg.role,
            content: historyMsg.content
          })
        });
      }
      
      // Étape 4: Ajouter le message utilisateur
      console.log('💬 Ajout du message utilisateur...');
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      if (!messageResponse.ok) {
        const error = await messageResponse.json();
        throw new Error(`Erreur ajout message: ${error.error?.message || 'Erreur inconnue'}`);
      }
      
      // Étape 5: Lancer l'exécution
      console.log('⚡ Lancement de l\'exécution...');
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        })
      });

      if (!runResponse.ok) {
        const error = await runResponse.json();
        throw new Error(`Erreur lancement run: ${error.error?.message || 'Erreur inconnue'}`);
      }

      const run = await runResponse.json();
      console.log('🏃 Run lancé:', run.id);
      
      // Étape 6: Attendre la completion
      let runStatus = 'queued';
      let attempts = 0;
      const maxAttempts = 60; // 60 secondes max
      
      while (!['completed', 'failed', 'cancelled', 'expired'].includes(runStatus) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          runStatus = status.status;
          console.log(`📊 Statut du run (${attempts}/60):`, runStatus);
        }
      }
      
      if (runStatus !== 'completed') {
        throw new Error(`Le run ne s'est pas terminé correctement: ${runStatus}`);
      }
      
      // Étape 7: Récupérer les messages
      console.log('📨 Récupération des messages...');
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (!messagesResponse.ok) {
        const error = await messagesResponse.json();
        throw new Error(`Erreur récupération messages: ${error.error?.message || 'Erreur inconnue'}`);
      }
      
      const messagesData = await messagesResponse.json();
      const lastMessage = messagesData.data[0]; // Le dernier message (réponse de l'assistant)
      console.log(lastMessage)
      let assistantContent = '';
      const citations: Citation[] = [];
      
      if (lastMessage && lastMessage.content && lastMessage.content.length > 0) {
        const content = lastMessage.content[0];
        assistantContent = content.text.value;
        
        // Extraire les citations des annotations
        if (content.text.annotations && content.text.annotations.length > 0) {
          // Trier les annotations par position pour traitement séquentiel
          const sortedAnnotations = [...content.text.annotations]
            .filter((annotation: any) => annotation.type === 'file_citation')
            .sort((a: any, b: any) => a.start_index - b.start_index);

          sortedAnnotations.forEach((annotation: any, index: number) => {
            if (annotation.type === 'file_citation') {
              // Récupérer le nom du fichier depuis l'annotation si disponible
              const filename = annotation.text?.match(/†([^】]+)】$/)?.[1] || 'Document PDF';
              
              citations.push({
                id: `${Date.now()}-${index}`,
                text: annotation.text || `Citation ${index + 1}`,
                source: annotation.file_citation?.file_id || 'Document PDF',
                filename: filename,
                page: 1, // On n'a pas l'info de page dans l'API
                position: annotation.start_index,
                startIndex: annotation.start_index,
                endIndex: annotation.end_index
              });
            }
          });
          
          // Remplacer le texte avec les références numérotées
          let processedText = assistantContent;
          let offset = 0;
          
          sortedAnnotations.forEach((annotation: any, index: number) => {
            const citationReference = `【${index + 1}:0†source】`;
            const start = annotation.start_index + offset;
            const end = annotation.end_index + offset;
            const originalLength = end - start;
            
            processedText = processedText.slice(0, start) + 
                          citationReference + 
                          processedText.slice(end);
            
            // Ajuster l'offset pour les remplacements suivants
            offset += citationReference.length - originalLength;
          });
          
          assistantContent = processedText;
        }
      }
      
      console.log('✅ Message IA généré avec', citations.length, 'citations');

      const responseMessage: Message = {
        id: Date.now().toString(),
        content: assistantContent || 'Désolé, je n\'ai pas pu générer une réponse.',
        role: 'assistant',
        timestamp: new Date(),
        citations: citations.length > 0 ? citations : undefined
      };

      return responseMessage;
    } catch (error) {
      console.error('Erreur OpenAI:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const vectorizeDocument = async (
    file: File,
    conversationId: string,
    existingVectorStoreId?: string
  ): Promise<{ success: boolean; content?: string; vectorStoreId?: string; fileId?: string; documents?: UploadedDocument[] }> => {
    if (!apiToken) {
      throw new Error('Token OpenAI requis pour la vectorisation.');
    }

    setIsLoading(true);
    
    try {
      console.log('🚀 Début de la vectorisation du document:', file.name);
      
      let vectorStoreId = existingVectorStoreId;

      // Étape 1: Créer un vector store seulement s'il n'existe pas
      if (!vectorStoreId) {
        console.log('📦 Création du vector store...');
        const vectorStoreResponse = await fetch('https://api.openai.com/v1/vector_stores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            name: `Documents-${conversationId}`,
            expires_after: {
              anchor: 'last_active_at',
              days: 7
            }
          })
        });

        if (!vectorStoreResponse.ok) {
          const error = await vectorStoreResponse.json();
          console.error('❌ Erreur création vector store:', error);
          throw new Error(`Erreur création vector store: ${error.error?.message || 'Erreur inconnue'}`);
        }

        const vectorStore = await vectorStoreResponse.json();
        vectorStoreId = vectorStore.id;
        console.log('✅ Vector store créé:', vectorStoreId);
      } else {
        console.log('♻️ Utilisation du vector store existant:', vectorStoreId);
      }

      // Étape 2: Upload du fichier
      console.log('📤 Upload du fichier...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');

      const uploadResponse = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        console.error('❌ Erreur upload fichier:', error);
        throw new Error(`Erreur upload: ${error.error?.message || 'Erreur inconnue'}`);
      }

      const uploadedFile = await uploadResponse.json();
      console.log('✅ Fichier uploadé:', uploadedFile.id);

      // Étape 3: Ajouter le fichier au vector store
      console.log('🔗 Ajout du fichier au vector store...');
      const addFileResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          file_id: uploadedFile.id
        })
      });

      if (!addFileResponse.ok) {
        const error = await addFileResponse.json();
        console.error('❌ Erreur ajout fichier au vector store:', error);
        throw new Error(`Erreur ajout au vector store: ${error.error?.message || 'Erreur inconnue'}`);
      }

      const vectorStoreFile = await addFileResponse.json();
      console.log('✅ Fichier ajouté au vector store:', vectorStoreFile.id);

      // Étape 4: Attendre que le fichier soit traité
      console.log('⏳ Attente du traitement du fichier...');
      let fileStatus = 'in_progress';
      let attempts = 0;
      const maxAttempts = 30; // 30 secondes max

      while (fileStatus === 'in_progress' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const statusResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${vectorStoreFile.id}`, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (statusResponse.ok) {
          const status = await statusResponse.json();
          fileStatus = status.status;
          console.log(`📊 Statut du fichier (${attempts}/30):`, fileStatus);
        }
      }

      if (fileStatus !== 'completed') {
        console.warn('⚠️ Le fichier n\'a pas été complètement traité, mais on continue...');
      }

      // Simulation de contenu extrait pour l'affichage
      const simulatedContent = `Contenu du document ${file.name} vectorisé et indexé dans OpenAI Vector Store.
      
Ce document a été traité et ses embeddings sont maintenant disponibles pour les recherches sémantiques.
Les informations contenues peuvent être interrogées via des requêtes en langage naturel.

Vector Store ID: ${vectorStoreId}
Fichier ID: ${uploadedFile.id}
Statut: ${fileStatus}`;

      console.log('🎉 Vectorisation terminée avec succès!');
      
      // Récupérer la liste mise à jour des fichiers du vector store
      const updatedDocuments = await listVectorStoreFiles(vectorStoreId!);
      
      return { 
        success: true, 
        content: simulatedContent,
        vectorStoreId: vectorStoreId,
        fileId: uploadedFile.id,
        documents: updatedDocuments
      };

    } catch (error) {
      console.error('💥 Erreur lors de la vectorisation:', error);
      return { 
        success: false, 
        content: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue lors de la vectorisation'}` 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const listVectorStoreFiles = async (vectorStoreId: string): Promise<UploadedDocument[]> => {
    if (!apiToken) {
      throw new Error('Token OpenAI requis.');
    }

    try {
      console.log('📋 Récupération de la liste des fichiers du vector store:', vectorStoreId);
      
      const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erreur récupération fichiers vector store:', error);
        throw new Error(`Erreur récupération fichiers: ${error.error?.message || 'Erreur inconnue'}`);
      }

      const data = await response.json();
      console.log('📄 Fichiers du vector store récupérés:', data.data?.length || 0);
      
      const documents: UploadedDocument[] = [];
      
      if (data.data) {
        // Pour chaque fichier dans le vector store, récupérer ses détails
        for (const vectorFile of data.data) {
          try {
            const fileResponse = await fetch(`https://api.openai.com/v1/files/${vectorFile.id}`, {
              headers: {
                'Authorization': `Bearer ${apiToken}`
              }
            });

            if (fileResponse.ok) {
              const fileData = await fileResponse.json();
              documents.push({
                id: vectorFile.id,
                name: fileData.filename || 'Document inconnu',
                size: fileData.bytes || 0,
                uploadedAt: new Date(vectorFile.created_at * 1000),
                vectorized: vectorFile.status === 'completed',
                content: `Document vectorisé dans Vector Store ${vectorStoreId}`,
                fileId: vectorFile.id,
                vectorStoreFileId: vectorFile.id
              });
            }
          } catch (fileError) {
            console.error('❌ Erreur récupération détails fichier:', vectorFile.id, fileError);
          }
        }
      }
      
      console.log('✅ Documents synchronisés:', documents.length);
      return documents;
    } catch (error) {
      console.error('💥 Erreur lors de la récupération des fichiers:', error);
      return [];
    }
  };

  const syncConversationDocuments = async (conversation: Conversation): Promise<UploadedDocument[]> => {
    if (!conversation.vectorStoreId) {
      return [];
    }
    
    return listVectorStoreFiles(conversation.vectorStoreId);
  };

  return {
    sendMessage,
    vectorizeDocument,
    syncConversationDocuments,
    isLoading
  };
}