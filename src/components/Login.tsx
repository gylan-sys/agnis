import React, { useState } from 'react';
import { LogIn, Image as ImageIcon, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from '../lib/firestoreService';

const presets = [
  { name: 'Abstract Blue', url: 'https://images.unsplash.com/photo-1557683316-973673baf926' },
  { name: 'Dark Flow', url: 'https://images.unsplash.com/photo-1519750783826-e2420f4d687f' },
  { name: 'Modern Sky', url: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd' },
  { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa' }
];

export default function Login({ onLogin, background }: { onLogin: (credentials: any) => void, background?: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [currentBg, setCurrentBg] = useState(background);

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

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await authService.loginWithGoogle();
      onLogin(u);
    } catch (err: any) {
      setError(err.message || 'Login Google gagal.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Ukuran file terlalu besar (maksimal 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentBg(result);
        localStorage.setItem('lastLoginBg', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPreset = (url: string) => {
    setCurrentBg(url);
    localStorage.setItem('lastLoginBg', url);
  };

  const bgStyle = currentBg ? {
    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${currentBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {
    background: 'radial-gradient(circle at top right, #374151, #111827)'
  };

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 transition-all duration-700" style={bgStyle}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-8 sm:p-12 text-center bg-white/10 backdrop-blur-3xl rounded-[48px] border border-white/20 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
        
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-6 transition-transform duration-500">
            <LogIn className="text-black" size={32} />
          </div>
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter mb-1 text-white italic">AGNIS</h1>
        <p className="text-gray-300 mb-8 font-medium text-xs tracking-wide">SMART FAMILY FINANCE HUB</p>
        
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-8 p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-rose-300 text-[10px] font-black uppercase tracking-widest leading-relaxed"
          >
            ❌ {error}
          </motion.div>
        )}

        <div className="mb-6 p-3 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 leading-relaxed">
          Pilih metode masuk di bawah ini <br/> atau gunakan <span className="text-white/60">admin / admin</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-[24px] border border-white/20 font-bold flex items-center justify-center gap-3 transition-all mb-4 disabled:opacity-50"
        >
          <Chrome size={20} className="text-blue-400" />
          Masuk dengan Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Atau</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group/input">
            <input 
              type="text" 
              required
              placeholder="Username" 
              className="w-full px-8 py-4 bg-black/20 text-white rounded-[24px] border border-white/10 focus:border-white/30 focus:ring-4 focus:ring-white/5 font-bold placeholder:text-white/20 transition-all outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="relative group/input">
            <input 
              type="password" 
              required
              placeholder="Password" 
              className="w-full px-8 py-4 bg-black/20 text-white rounded-[24px] border border-white/10 focus:border-white/30 focus:ring-4 focus:ring-white/5 font-bold placeholder:text-white/20 transition-all outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20 mt-4 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Memproses...' : 'Masuk'} <LogIn size={18} strokeWidth={3} />
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <button 
            onClick={() => setShowPersonalize(!showPersonalize)}
            className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <ImageIcon size={14} /> Personalize Background
          </button>

          <AnimatePresence>
            {showPersonalize && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4"
              >
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {presets.map(p => (
                    <button 
                      key={p.url}
                      onClick={() => selectPreset(p.url)}
                      className="w-8 h-8 rounded-full border-2 border-white/20 hover:border-white/50 transition-all overflow-hidden"
                      title={p.name}
                    >
                      <img src={p.url} className="w-full h-full object-cover" alt={p.name} />
                    </button>
                  ))}
                  <div className="relative w-8 h-8 rounded-full border-2 border-dashed border-white/20 hover:border-white/50 transition-all flex items-center justify-center">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <ImageIcon size={12} className="text-white/40" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-white/20 text-[9px] font-bold uppercase tracking-widest">
          Sistem Keuangan Mandiri v2.0
        </p>
      </motion.div>
    </div>
  );
}
