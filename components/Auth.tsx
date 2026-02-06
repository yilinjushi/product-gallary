import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2, Lock, Mail, ArrowLeft } from 'lucide-react';

interface AuthProps {
  onCancel: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Check your email for the login link!' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="w-full max-w-md">
        <button 
          onClick={onCancel}
          className="mb-8 flex items-center text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Public View
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
              <Lock className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isSignUp ? 'Create Admin Account' : 'Admin Login'}
            </h2>
            <p className="text-slate-500 mt-2 text-center text-sm">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};