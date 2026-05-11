import React, { useState, useEffect, useRef } from 'react';
import { LogIn, Image as ImageIcon, Chrome, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { animate, stagger } from 'animejs';
import { authService } from '../lib/firestoreService';

const presets = [
  { name: 'Abstract Blue', url: 'https://images.unsplash.com/photo-1557683316-973673baf926' },
  { name: 'Dark Flow', url: 'https://images.unsplash.com/photo-1519750783826-e2420f4d687f' },
  { name: 'Modern Sky', url: 'https://images.unsplash.com/photo-1534067783941-51c9c23ecefd' },
  { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa' }
];

const GeometricBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous if any
    containerRef.current.innerHTML = '';
    
    const count = 40;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'absolute bg-white/5 border border-white/10 rounded-full pointer-events-none';
      const size = Math.random() * 50 + 5;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      containerRef.current.appendChild(el);
    }

    animate(containerRef.current.querySelectorAll('div'), {
      translateX: () => (Math.random() - 0.5) * 200,
      translateY: () => (Math.random() - 0.5) * 200,
      scale: [0, () => Math.random() * 1.5 + 0.5],
      opacity: [0, 0.3, 0],
      duration: () => Math.random() * 5000 + 3000,
      delay: () => Math.random() * 5000,
      loop: true,
      direction: 'alternate',
      ease: 'inOutQuad'
    });
  }, []);

  return <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none opacity-50" />;
};

export default function Login({ onLogin, background }: { onLogin: (credentials: any) => void, background?: string }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [currentBg, setCurrentBg] = useState(background);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Staggered entrance
    animate('.login-stagger-item', {
      translateY: [20, 0],
      opacity: [0, 1],
      delay: stagger(100, { start: 300 }),
      ease: 'outExpo'
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (username && password) await onLogin({ username, password });
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali username dan password Anda.');
      
      // Shake animation on error
      animate(cardRef.current, {
        translateX: [-10, 10, -10, 10, 0],
        duration: 400,
        ease: 'inOutSine'
      });
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
    background: 'radial-gradient(circle at top right, #111827, #000000)'
  };

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 transition-all duration-700 relative overflow-hidden" style={bgStyle}>
      <GeometricBackground />
      
      <motion.div 
        ref={cardRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md w-full p-8 sm:p-12 text-center bg-white/5 backdrop-blur-2xl rounded-[48px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-pulse" />
        
        <div className="login-stagger-item mb-6 flex justify-center">
          <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer">
            <LogIn className="text-black" size={36} />
          </div>
        </div>
        
        <div className="login-stagger-item">
          <h1 className="text-5xl font-black tracking-tighter mb-1 text-white italic drop-shadow-lg">AGNIS</h1>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-px w-4 bg-white/20" />
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.3em]">Smart Family Finance</p>
            <div className="h-px w-4 bg-white/20" />
          </div>
        </div>
        
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-8 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-[10px] font-black uppercase tracking-widest leading-relaxed shadow-lg shadow-rose-900/20"
          >
            ❌ {error}
          </motion.div>
        )}

        <div className="login-stagger-item mb-8">
           <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-[24px] border border-white/20 font-bold flex items-center justify-center gap-3 transition-all mb-4 disabled:opacity-50 group/google"
          >
            <div className="bg-white p-1 rounded-lg">
              <Chrome size={18} className="text-blue-600" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">Masuk dengan Google</span>
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Atau Username</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 login-stagger-item">
          <div className="relative group/input">
            <input 
              type="text" 
              required
              placeholder="Username" 
              className="w-full px-8 py-5 bg-black/40 text-white rounded-[28px] border border-white/5 focus:border-blue-500/50 focus:ring-8 focus:ring-blue-500/5 font-bold placeholder:text-white/10 transition-all outline-none text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="relative group/input">
            <input 
              type="password" 
              required
              placeholder="Password" 
              className="w-full px-8 py-5 bg-black/40 text-white rounded-[28px] border border-white/5 focus:border-blue-500/50 focus:ring-8 focus:ring-blue-500/5 font-bold placeholder:text-white/10 transition-all outline-none text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-white text-black rounded-[28px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/20 mt-6 disabled:opacity-50 disabled:scale-100 group"
          >
            {loading ? 'Processing...' : 'Authentication'} 
            <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="login-stagger-item mt-10 border-t border-white/5 pt-8">
          <button 
            onClick={() => setShowPersonalize(!showPersonalize)}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/70 transition-all flex items-center justify-center gap-2 mx-auto group/p"
          >
            <Sparkles size={14} className="group-hover/p:rotate-45 transition-transform" /> 
            Personalize Visuals
          </button>

          <AnimatePresence>
            {showPersonalize && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-6"
              >
                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  {presets.map(p => (
                    <button 
                      key={p.url}
                      onClick={() => selectPreset(p.url)}
                      className="w-10 h-10 rounded-2xl border-2 border-white/10 hover:border-white/40 transition-all overflow-hidden hover:scale-110 active:scale-95 shadow-lg"
                      title={p.name}
                    >
                      <img src={p.url} className="w-full h-full object-cover" alt={p.name} />
                    </button>
                  ))}
                  <div className="relative w-10 h-10 rounded-2xl border-2 border-dashed border-white/10 hover:border-white/40 transition-all flex items-center justify-center bg-white/5 cursor-pointer hover:scale-110">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <ImageIcon size={16} className="text-white/40" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-8 text-white/10 text-[10px] font-black uppercase tracking-[0.4em] italic login-stagger-item">
          Secure Terminal Access
        </p>
      </motion.div>
    </div>
  );
}
