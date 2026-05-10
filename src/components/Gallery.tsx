import React, { useState, useEffect, useRef } from 'react';
import { firestoreService } from '../lib/firestoreService';
import { GalleryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Image as ImageIcon, Video, Trash2, X, Maximize2, ExternalLink, Download, Upload, Loader2, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Gallery({ householdId }: { householdId: string }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    url: '',
    type: 'image' as 'image' | 'video'
  });

  useEffect(() => {
    const unsubscribe = firestoreService.subscribeGallery(householdId, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [householdId]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension for 1MB limit safety
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Output compressed base64
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        throw new Error('Hanya file gambar atau video yang diperbolehkan.');
      }

      // 1MB limit check for non-compressed or large files
      if (file.size > 1024 * 1024 && isVideo) {
        throw new Error('Video terlalu besar. Maksimal 1MB untuk saat ini.');
      }

      let fileUrl = '';
      if (isImage) {
        fileUrl = await compressImage(file);
      } else {
        // For video, we just read as base64 but warn about size
        const reader = new FileReader();
        fileUrl = await new Promise((resolve) => {
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      setNewItem(prev => ({
        ...prev,
        url: fileUrl,
        type: isImage ? 'image' : 'video'
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengupload file.');
    } finally {
      setUploading(false);
    }
  };

  const downloadItem = async (item: GalleryItem) => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = item.type === 'image' ? 'jpg' : 'mp4';
      a.download = `${item.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Gagal mendownload file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.url) return;
    
    setLoading(true);
    await firestoreService.addGalleryItem(householdId, newItem);
    setNewItem({ title: '', description: '', url: '', type: 'image' });
    setShowAddModal(false);
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus kenangan ini?')) {
      await firestoreService.deleteGalleryItem(householdId, id);
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-4 border-gray-100 border-t-gray-900 rounded-full"
      />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-20"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Galeri Keluarga 📸</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">Arsip momen berharga kita</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-gray-900 text-white px-8 py-4 rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gray-200"
        >
          <Plus size={20} strokeWidth={3} />
          Tambah Momen
        </button>
      </header>

      {items.length === 0 ? (
        <div className="bg-white rounded-[40px] border-2 border-dashed border-gray-100 p-20 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6">
            <ImageIcon size={48} className="text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900">Belum ada dokumentasi</h3>
          <p className="text-gray-400 font-medium mt-2 max-w-xs">Mulai kumpulkan foto dan video kegiatan keluarga di sini!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -8 }}
                onClick={() => setSelectedItem(item)}
                className="group relative bg-white rounded-[32px] overflow-hidden border border-gray-50 shadow-sm cursor-pointer"
              >
                <div className="aspect-[4/5] relative overflow-hidden bg-gray-100">
                  {item.type === 'image' ? (
                    <img 
                      src={item.url} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-900">
                      <Video size={48} className="text-white/20" />
                      <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">Video Moment</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                    <p className="text-white font-black text-lg leading-tight">{item.title}</p>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Oleh {item.userName}</p>
                  </div>

                  <div className="absolute top-4 right-4 flex gap-2 translate-y-[-20px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadItem(item);
                      }}
                      className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-colors"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white hover:bg-rose-500 hover:border-rose-500 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* View Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10 bg-gray-900/95 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl w-full bg-white rounded-[48px] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-full max-h-[85vh]"
            >
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 z-10 w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-gray-900 shadow-xl"
              >
                <X size={24} strokeWidth={3} />
              </button>

              <div className="lg:w-2/3 bg-gray-100 flex items-center justify-center overflow-hidden h-1/2 lg:h-full">
                {selectedItem.type === 'image' ? (
                  <img 
                    src={selectedItem.url} 
                    className="w-full h-full object-contain"
                    alt={selectedItem.title}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <video 
                    src={selectedItem.url} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="lg:w-1/3 p-10 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                      {selectedItem.type}
                    </span>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      {format(parseISO(selectedItem.timestamp), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 leading-tight mb-4">{selectedItem.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">{selectedItem.description || 'Tidak ada deskripsi momen.'}</p>
                </div>

                <div className="pt-8 mt-8 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 font-black">
                      {selectedItem.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-gray-900 font-black text-sm">{selectedItem.userName}</p>
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Kontributor</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadItem(selectedItem)}
                      className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 hover:bg-emerald-100 transition-all"
                      title="Download"
                    >
                      <Download size={20} />
                    </button>
                    <a 
                      href={selectedItem.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all"
                      title="Lihat Original"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.9 }}
              className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 text-gray-300 hover:text-gray-900 transition-colors"
              >
                <X size={24} strokeWidth={3} />
              </button>

              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-8">Tambah Momen Baru</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-tight"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload Media</label>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-32 rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
                      ${newItem.url ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100 hover:border-gray-200'}
                      ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={24} className="text-gray-400 animate-spin" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Memproses...</span>
                      </>
                    ) : newItem.url ? (
                      <>
                        <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                          <ImageIcon size={20} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Media Siap Diupload</span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="text-gray-300" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Klik untuk Pilih File</span>
                        <span className="text-[8px] font-medium text-gray-300 uppercase">Maksimal 1MB (Utuk Video/Foto HD)</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Judul Momen</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Liburan ke Bali 2024..."
                    className="w-full px-6 py-4 bg-gray-50 rounded-[20px] border-none focus:ring-2 focus:ring-gray-900 font-bold"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Deskripsi (Opsional)</label>
                  <textarea 
                    rows={2}
                    placeholder="Ceritakan sedikit tentang momen ini..."
                    className="w-full px-6 py-4 bg-gray-50 rounded-[20px] border-none focus:ring-2 focus:ring-gray-900 font-bold resize-none"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={!newItem.url || uploading}
                  className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 disabled:opacity-50 disabled:scale-100"
                >
                  Simpan ke Galeri
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
