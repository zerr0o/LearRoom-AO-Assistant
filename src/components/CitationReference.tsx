import React from 'react';
import type { Citation } from '../types';

interface CitationReferenceProps {
  citation: Citation;
  index: number;
}

export function CitationReference({ citation, index }: CitationReferenceProps) {
  const handleClick = () => {
    // Dans une vraie implémentation, ceci ouvrirait le PDF à la page/position spécifiée
    alert(`Référence ${index}: "${citation.text}" - ${citation.filename} (page ${citation.page})`);
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors ml-1 align-super"
      title={`${citation.source} - Page ${citation.page}`}
    >
      {index}
    </button>
  );
}