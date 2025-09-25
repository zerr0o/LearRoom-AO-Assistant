import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { AuthResponse } from '../types';

interface AuthPageProps {
  onAuthSuccess: (email: string) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const WEBHOOK_URL = 'https://zerr0o.app.n8n.cloud/webhook-test/a4235338-8bba-446e-898a-51a2d2875329';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode === 'login' && !password.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Construire le body de la requête
      const requestBody: { email: string; password?: string } = { email };
      if (mode === 'login') {
        requestBody.password = password;
      }
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Erreur de réseau');
      }

      let data: AuthResponse;
      try {
        data = await response.json();
        console.log(data)
      } catch (jsonError) {
        console.error('Erreur parsing JSON:', jsonError);
        if (jsonError instanceof Error && jsonError.message.includes('Unexpected end of JSON input')) {
          setMessage({ type: 'error', text: 'Le serveur a renvoyé une réponse vide ou incomplète. Vérifiez la configuration du webhook.' });
        } else {
          setMessage({ type: 'error', text: 'Le serveur n\'a pas renvoyé de réponse d\'authentification valide. Veuillez réessayer ou contacter l\'administrateur.' });
        }
        return;
      }

      if (data.success) {
        if (mode === 'signup') {
          setMessage({ type: 'success', text: data.message || 'Email envoyé avec succès' });
          // Basculer vers la connexion après inscription réussie
          setTimeout(() => {
            setMode('login');
            setMessage(null);
          }, 2000);
        } else {
          // Connexion réussie
          onAuthSuccess(email);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur inconnue' });
      }
    } catch (error) {
      console.error('Erreur authentification:', error);
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AO Assistant</h1>
          <p className="text-gray-600">Powered by Learn Room</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inscription
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            {/* Password (only for login) */}
            {mode === 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email.trim() || (mode === 'login' && !password.trim())}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Se connecter' : 'S\'inscrire'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Info Text */}
          <div className="mt-6 text-center">
            {mode === 'signup' ? (
              <p className="text-xs text-gray-500">
                Après inscription, vous recevrez un email de confirmation
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Utilisez vos identifiants pour accéder à l'assistant IA
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}