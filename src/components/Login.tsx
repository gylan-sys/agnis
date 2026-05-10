import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (credentials: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (username && password) await onLogin({ username, password });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full p-8 sm:p-12 text-center bg-white/5 backdrop-blur-xl rounded-[40px] border border-white/10 shadow-2xl">
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-2xl rotate-3">
            <LogIn className="text-black" size={32} />
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">AGNIS</h1>
        <p className="text-gray-400 mb-10 font-medium">Kelola keuangan keluarga secara mandiri.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold uppercase">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            required
            placeholder="Username" 
            className="w-full px-8 py-4 bg-white/10 rounded-3xl border-none focus:ring-2 focus:ring-white/30 font-bold placeholder:text-white/20 transition-all"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input 
            type="password" 
            required
            placeholder="Password" 
            className="w-full px-8 py-4 bg-white/10 rounded-3xl border-none focus:ring-2 focus:ring-white/30 font-bold placeholder:text-white/20 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="submit"
            className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-black/50"
          >
            Masuk Sekarang
          </button>
        </form>
      </div>
    </div>
  );
}
