import React from 'react';
import { Upload, FileText, Database, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon: React.ReactNode;
}

interface UploadProgressProps {
  steps: UploadStep[];
  currentStep?: string;
  error?: string;
}

export function UploadProgress({ steps, currentStep, error }: UploadProgressProps) {
  const getStepIcon = (step: UploadStep) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (step.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    if (step.status === 'active') {
      return (
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      );
    }
    return step.icon;
  };

  const getStepClass = (step: UploadStep) => {
    if (step.status === 'completed') return 'text-green-700 bg-green-50 border-green-200';
    if (step.status === 'error') return 'text-red-700 bg-red-50 border-red-200';
    if (step.status === 'active') return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-gray-500 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${getStepClass(step)}`}>
            {getStepIcon(step)}
          </div>
          <div className="flex-1">
            <div className={`text-sm font-medium ${
              step.status === 'completed' ? 'text-green-700' :
              step.status === 'error' ? 'text-red-700' :
              step.status === 'active' ? 'text-blue-700' :
              'text-gray-500'
            }`}>
              {step.label}
            </div>
            {step.status === 'active' && (
              <div className="text-xs text-gray-500 mt-1">En cours...</div>
            )}
          </div>
        </div>
      ))}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}