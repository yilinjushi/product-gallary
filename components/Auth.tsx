import React, { useState } from 'react';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';

interface AuthProps {
  onCancel: () => void;
  onAuth: (token: string, expiresAt: number) => void;
}

export const Auth: React.FC<AuthProps> = ({ onCancel, onAuth }) => {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('服务器返回异常，请稍后重试');
      }

      if (!res.ok) {
        throw new Error(data.error || '登录失败');
      }

      // Pass token to parent
      onAuth(data.token, data.expiresAt);
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
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
          返回
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-slate-900/20">
              <Lock className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">管理后台</h2>
            <p className="text-slate-500 mt-2 text-center text-sm">
              请输入管理密码
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};