import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import supabase from '../utils/supabase';

interface AuthPageProps {
  onAuthSuccess: (email: string) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);

  // Removed webhook URL - now using Supabase Auth

  // Detect recovery (password reset) link
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery')) {
        setIsRecovery(true);
        setMode('login');
        setMessage({ type: 'success', text: 'Veuillez saisir un nouveau mot de passe.' });
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!password.trim()) return;
    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (isRecovery) {
        // User came from recovery link: update password
        const { error } = await supabase.auth.updateUser({ password: password.trim() });
        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          setMessage({ type: 'success', text: 'Mot de passe mis à jour. Vous pouvez maintenant vous connecter.' });
          setIsRecovery(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'signup') {
        // Inscription avec Supabase
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          // If user already exists
          const msg = error.message || '';
          if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already')) {
            setMessage({ type: 'error', text: 'Un compte existe déjà avec cet email. Utilisez la connexion ou réinitialisez votre mot de passe.' });
          } else {
            setMessage({ type: 'error', text: error.message });
          }
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Email de confirmation envoyé ! Vérifiez votre boîte mail.' 
          });
          // Basculer vers la connexion après inscription réussie
          setTimeout(() => {
            setMode('login');
            setMessage(null);
          }, 3000);
        }
      } else {
        // Connexion avec Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else if (data.user) {
          // Connexion réussie
          onAuthSuccess(email);
        }
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

            {/* Password (required for both login and signup) */}
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

            {/* Confirm Password (signup or recovery) */}
            {(mode === 'signup' || isRecovery) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmez le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
              disabled={
                isLoading ||
                !email.trim() ||
                !password.trim() ||
                ((mode === 'signup' || isRecovery) && password !== confirmPassword)
              }
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isRecovery ? 'Mettre à jour le mot de passe' : mode === 'login' ? 'Se connecter' : 'S\'inscrire'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Forgot password link (login mode) */}
            {!isRecovery && mode === 'login' && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={async () => {
                    if (!email.trim()) {
                      setMessage({ type: 'error', text: 'Veuillez saisir votre email pour réinitialiser le mot de passe.' });
                      return;
                    }
                    setIsLoading(true);
                    setMessage(null);
                    try {
                      const redirectTo = `${window.location.origin}${window.location.pathname}`; // revient sur la même page
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
                      if (error) {
                        setMessage({ type: 'error', text: error.message });
                      } else {
                        setMessage({ type: 'success', text: 'Email de réinitialisation envoyé. Vérifiez votre boîte mail.' });
                      }
                    } catch (err) {
                      setMessage({ type: 'error', text: 'Erreur lors de la demande de réinitialisation.' });
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
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