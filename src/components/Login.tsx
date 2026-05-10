import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login({ onLogin, background }: { onLogin: (credentials: any) => void, background?: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (username && password) await onLogin({ username, password });
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const bgStyle = background ? {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {
    background: 'radial-gradient(circle at top right, #374151, #111827)'
  };

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 transition-all duration-1000" style={bgStyle}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-8 sm:p-12 text-center bg-white/10 backdrop-blur-3xl rounded-[48px] border border-white/20 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
        
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-6 transition-transform duration-500">
            <LogIn className="text-black" size={40} />
          </div>
        </div>
        
        <h1 className="text-5xl font-black tracking-tighter mb-2 text-white italic">AGNIS</h1>
        <p className="text-gray-300 mb-10 font-medium text-sm tracking-wide">SMART FAMILY FINANCE HUB</p>
        
        <div className="mb-6 p-3 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
          Gunakan apa pun untuk mendaftar otomatis <br/> atau login dengan <span className="text-white/60">admin / admin</span>
        </div>
        
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-300 text-[10px] font-black uppercase tracking-widest"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group/input">
            <input 
              type="text" 
              required
              placeholder="Username" 
              className="w-full px-8 py-5 bg-black/20 text-white rounded-3xl border border-white/10 focus:border-white/30 focus:ring-4 focus:ring-white/5 font-bold placeholder:text-white/20 transition-all outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="relative group/input">
            <input 
              type="password" 
              required
              placeholder="Password" 
              className="w-full px-8 py-5 bg-black/20 text-white rounded-3xl border border-white/10 focus:border-white/30 focus:ring-4 focus:ring-white/5 font-bold placeholder:text-white/20 transition-all outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-white text-black rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20 mt-6 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Memproses...' : 'Masuk'} <LogIn size={18} strokeWidth={3} />
          </button>
        </form>

        <p className="mt-8 text-white/30 text-[10px] font-bold uppercase tracking-widest">
          Sistem Keuangan Mandiri v2.0
        </p>
      </motion.div>
    </div>
  );
}
