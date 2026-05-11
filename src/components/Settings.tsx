import React, { useState } from 'react';
import { authService } from '../lib/firestoreService';
import { Save, Image as ImageIcon, User, Wallpaper, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import AdminUserManagement from './AdminUserManagement';

export default function Settings({ user, onUpdate }: { user: any, onUpdate: (u: any) => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'admin'>('profile');
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [loginBg, setLoginBg] = useState(user.loginBackground || '');
  const [appBg, setAppBg] = useState(user.appBackground || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const isAdmin = user.role === 'admin';

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updated = await authService.updateSettings({
        displayName,
        loginBackground: loginBg,
        appBackground: appBg
      });
      onUpdate(updated);
      setMessage('Pengaturan berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage('Gagal: Ukuran file terlalu besar (maksimal 2MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const presets = [
    { name: 'Abstract Blue', url: 'https://images.unsplash.com/photo-1557683316-973673baf926' },
    { name: 'Dark Flow', url: 'https://images.unsplash.com/photo-1519750783826-e2420f4d687f' },
    { name: 'Nature Mist', url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e' },
    { name: 'Golden Hour', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20 p-2 sm:p-0">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight italic">PENGATURAN</h2>
          <p className="text-gray-500 font-medium">Kustomisasi tampilan dan profil sistem Anda.</p>
        </div>
        
        {isAdmin && (
          <div className="flex bg-gray-100 p-1.5 rounded-[24px]">
            <button 
              onClick={() => setActiveSubTab('profile')}
              className={`px-8 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'profile' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Profil & Tampilan
            </button>
            <button 
              onClick={() => setActiveSubTab('admin')}
              className={`px-8 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === 'admin' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'} flex items-center gap-2`}
            >
              <Shield size={14} /> User Manager
            </button>
          </div>
        )}
      </header>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-3xl font-black text-xs uppercase tracking-widest ${message.includes('Gagal') ? 'bg-rose-50 text-rose-500' : 'bg-green-50 text-green-500'}`}
        >
          {message}
        </motion.div>
      )}

      {activeSubTab === 'profile' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profile Section */}
            <section className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 flex flex-col">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
                  <User size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight">Profil Pengguna</h3>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Nama Tampilan</label>
                  <input 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Keluarga Pratama"
                  />
                </div>
              </div>
            </section>

            {/* Login Background */}
            <section className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl">
                  <ImageIcon size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight">Layar Login</h3>
              </div>

              <div className="space-y-6">
                <div className="group relative h-32 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 hover:border-purple-300 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setLoginBg)}
                  />
                  {loginBg ? (
                    <>
                      <img src={loginBg} className="absolute inset-0 w-full h-full object-cover opacity-20" />
                      <div className="relative z-0 text-center">
                        <ImageIcon className="mx-auto mb-2 text-purple-500" size={20} />
                        <span className="block text-[10px] font-black uppercase tracking-widest text-purple-600">Klik untuk Ganti Foto</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="mx-auto mb-2 text-gray-300" size={20} />
                      <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Unggah Foto Login</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Atau gunakan URL</label>
                  <input 
                    value={loginBg}
                    onChange={(e) => setLoginBg(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-purple-500 text-xs"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                  {presets.map(p => (
                    <button 
                      key={p.url}
                      onClick={() => setLoginBg(p.url)}
                      className="h-16 rounded-2xl overflow-hidden relative group"
                    >
                      <img src={p.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-tighter opacity-0 group-hover:opacity-100">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* App Background */}
            <section className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 md:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl">
                  <Wallpaper size={24} />
                </div>
                <h3 className="text-xl font-black tracking-tight">Kustomisasi Dashboard Utama</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="group relative h-48 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 hover:border-pink-300 transition-colors flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setAppBg)}
                    />
                    {appBg ? (
                      <>
                        <img src={appBg} className="absolute inset-0 w-full h-full object-cover opacity-10" />
                        <div className="relative z-0 text-center">
                          <Wallpaper className="mx-auto mb-2 text-pink-500" size={24} />
                          <span className="block text-xs font-black uppercase tracking-widest text-pink-600">Ganti Background App</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <Wallpaper className="mx-auto mb-2 text-gray-300" size={24} />
                        <span className="block text-xs font-black uppercase tracking-widest text-gray-400">Unggah Background App</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Atau gunakan URL</label>
                    <input 
                      value={appBg}
                      onChange={(e) => setAppBg(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-pink-500 text-xs"
                      placeholder="https://..."
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Kosongkan jika ingin menggunakan warna putih minimalis bawaan sistem.</p>
                </div>
                
                <div className="bg-gray-50 rounded-3xl p-6 border border-dashed border-gray-200">
                  <div className="aspect-video rounded-2xl overflow-hidden relative shadow-inner bg-white">
                      {appBg ? (
                        <img src={appBg} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 italic text-xs">Preview dinonaktifkan</div>
                      )}
                      <div className="absolute inset-0 bg-black/5 flex items-end p-4">
                        <div className="w-full h-8 bg-white/20 backdrop-blur-md rounded-lg" />
                      </div>
                  </div>
                  <p className="text-center mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pratinjau Tampilan</p>
                </div>
              </div>
            </section>
          </div>

          <div className="pt-8 flex justify-center">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-12 py-5 bg-black text-white rounded-[32px] font-black uppercase tracking-[0.2em] flex items-center gap-4 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-2xl shadow-black/20"
            >
              {saving ? 'MENYIMPAN...' : 'SIMPAN SEMUA'} <Save size={20} />
            </button>
          </div>
        </>
      ) : (
        <AdminUserManagement />
      )}
    </div>
  );
}
