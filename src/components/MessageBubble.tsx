import React from 'react';
import { User, Bot } from 'lucide-react';
import { markdown } from 'markdown';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  // Fonction pour traiter le contenu avec citations et markdown
  const processContentWithMarkdown = (content: string): string => {
    let processedContent = content;
    
    // Traiter les citations si elles existent
    if (message.citations && message.citations.length > 0) {
      // Remplacer les citations par des spans cliquables
      const citationRegex = /【(\d+):0†source】/g;
      processedContent = processedContent.replace(citationRegex, (match, citationNumber) => {
        const citationIndex = parseInt(citationNumber) - 1;
        const citation = message.citations![citationIndex];
        
        if (citation) {
          return `**(${citationNumber})**`;
        }
        return match;
      });
    }
    
    // Convertir le markdown en HTML
    let htmlContent = markdown.toHTML(processedContent);
    
        
    return htmlContent;
  };

  // Fonction pour gérer les clics sur les citations
  const handleCitationClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('citation-ref')) {
      const citationIndex = parseInt(target.dataset.citationIndex || '0');
      const citationNumber = parseInt(target.dataset.citationNumber || '1');
      
      if (message.citations && message.citations[citationIndex]) {
        const citation = message.citations[citationIndex];
        return `**^CITATION_${citationIndex}_${citationNumber}^**`;
      }
    }
  };

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
          }`}
        >
          <div className="text-sm leading-relaxed prose prose-sm max-w-none">
            {isUser ? (
              <div className="whitespace-pre-wrap text-white">
                {message.content}
              </div>
            ) : (
              <div 
                className="text-gray-900 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-2 [&_p]:last:mb-0 [&_ul]:mb-2 [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:pl-4 [&_li]:mb-1 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-gray-100 [&_pre]:p-2 [&_pre]:rounded [&_pre]:mt-2 [&_pre]:mb-2 [&_pre]:overflow-x-auto [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-1 [&_strong]:font-bold [&_em]:italic [&_a]:text-blue-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: processContentWithMarkdown(message.content) }}
                onClick={handleCitationClick}
              />
            )}
          </div>
        </div>
        
        <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span>{message.timestamp.toLocaleTimeString()}</span>
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-bold text-gray-700 mb-2">Sources</h4>
            <div className="space-y-2">
              {message.citations.map((citation, index) => (
                <div key={citation.id} className="text-xs text-gray-600">
                  <span className="font-bold">[{index + 1}]</span> {citation.text}
                  <div className="text-gray-500 mt-1">
                    <strong>{citation.filename || 'Document PDF'}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}