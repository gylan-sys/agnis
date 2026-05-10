import React, { useState, useEffect } from 'react';
import { firestoreService } from '../lib/firestoreService';
import { Plus, Check, ShoppingBag, Trash2, ListChecks, ChevronDown, ChevronRight, X, Save, ExternalLink, Store, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { PlanningItem } from '../types';

export default function Planning({ householdId }: { householdId: string }) {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<PlanningItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  
  const currentPeriod = format(new Date(), 'yyyy-MM');
  
  const [newItem, setNewItem] = useState({
    name: '',
    amount: '',
    group: 'Dapur',
    period: currentPeriod,
    productUrl: '',
    storeNote: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    amount: '',
    group: 'Dapur',
    productUrl: '',
    storeNote: ''
  });

  useEffect(() => {
    return firestoreService.subscribePlanning(householdId, currentPeriod, (data) => {
      const itemsList = data || [];
      setItems(itemsList);
      setLoading(false);
      // Expand all groups by default Initially
      const groups = Array.from(new Set(itemsList.map(i => i.group)));
      const initialExpanded: Record<string, boolean> = {};
      groups.forEach(g => { initialExpanded[g] = true; });
      setExpandedGroups(prev => ({ ...initialExpanded, ...prev }));
    });
  }, [householdId, currentPeriod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.amount) return;
    
    await firestoreService.addPlanningItem(householdId, {
      ...newItem,
      amount: Number(newItem.amount)
    });
    setNewItem({ ...newItem, name: '', amount: '', productUrl: '', storeNote: '' });
    setShowAdd(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editForm.name || !editForm.amount) return;
    
    await firestoreService.updatePlanningItem(householdId, editingItem.id, {
      ...editForm,
      amount: Number(editForm.amount)
    });
    setEditingItem(null);
  };

  const openEdit = (item: PlanningItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      amount: item.amount.toString(),
      group: item.group,
      productUrl: item.productUrl || '',
      storeNote: item.storeNote || ''
    });
  };

  const toggleBought = (id: string, current: boolean) => {
    firestoreService.updatePlanningItem(householdId, id, { isBought: !current });
  };

  const deleteItem = (id: string) => {
    if (confirm('Hapus item rencana ini?')) {
      firestoreService.deletePlanningItem(householdId, id);
    }
  };

  const groups = [
    'Dapur', 'Kamar Mandi', 'Kebutuhan Anak', 'Peliharaan', 'Perbaikan Rumah', 'Bulanan', 'Elektronik', 'Lainnya'
  ];

  const groupedItems = (items || []).reduce((acc: any, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-gray-200">
        <ShoppingBag size={40} />
      </motion.div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-32"
    >
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Rencana Belanja 🧺</h2>
          <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-wider">Biar ngga kalap kalau ke supermarket.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-[22px] font-bold text-sm transition-all shadow-lg active:scale-95
            ${showAdd ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-gray-900 text-white shadow-gray-200'}
          `}
        >
          {showAdd ? <><X size={18} /> Tutup</> : <><Plus size={18} /> Tambah Item</>}
        </button>
      </header>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm mb-10">
               <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nama Barang</label>
                      <input 
                        required type="text" placeholder="Beras 5kg..."
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 text-sm font-bold transition-all"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Estimasi Harga</label>
                      <input 
                        required type="number" placeholder="75000"
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 text-sm font-bold transition-all"
                        value={newItem.amount}
                        onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Grup / Kategori</label>
                      <select 
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 text-sm font-bold appearance-none transition-all"
                        value={newItem.group}
                        onChange={(e) => setNewItem({ ...newItem, group: e.target.value })}
                      >
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Rekomendasi Toko</label>
                      <input 
                        type="text" placeholder="Superindo, Tokopedia..."
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 text-sm font-bold transition-all"
                        value={newItem.storeNote}
                        onChange={(e) => setNewItem({ ...newItem, storeNote: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">URL Produk (Opsional)</label>
                      <input 
                        type="url" placeholder="https://..."
                        className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 text-sm font-bold transition-all"
                        value={newItem.productUrl}
                        onChange={(e) => setNewItem({ ...newItem, productUrl: e.target.value })}
                      />
                    </div>
                    <div className="pt-6">
                      <button 
                        type="submit"
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                      >
                        MASUKKAN KE RENCANA
                      </button>
                    </div>
                  </div>
               </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {Object.entries(groupedItems).map(([group, groupItems]) => {
          const items = groupItems as PlanningItem[];
          const boughtItems = items.filter(i => i.isBought);
          const progress = (boughtItems.length / items.length) * 100;

          return (
            <motion.div 
              key={group} 
              layout
              className="bg-white rounded-[40px] border border-gray-50 shadow-sm overflow-hidden"
            >
              <button 
                onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))}
                className="w-full px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 transition-all text-left"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className={`p-4 rounded-3xl shrink-0 shadow-sm ${progress === 100 ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'}`}>
                    {group === 'Dapur' ? <ShoppingBag size={22} strokeWidth={2} /> : <ListChecks size={22} strokeWidth={2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-black text-gray-900 text-xl tracking-tight truncate">{group}</h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black tracking-widest">
                        {boughtItems.length}/{items.length} ITEM
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
                          />
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{Math.round(progress)}% SELESAI</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estimasi Total</p>
                    <p className="font-black text-gray-900">Rp {(items || []).reduce((sum, i) => sum + i.amount, 0).toLocaleString('id-ID')}</p>
                  </div>
                  {expandedGroups[group] ? <ChevronDown size={24} className="text-gray-300" /> : <ChevronRight size={24} className="text-gray-300" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedGroups[group] && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-gray-50/20"
                  >
                    <div className="p-4 sm:p-6 space-y-2">
                       {items.map((item, idx) => (
                         <motion.div 
                           key={item.id}
                           initial={{ x: -10, opacity: 0 }}
                           animate={{ x: 0, opacity: 1 }}
                           transition={{ delay: idx * 0.05 }}
                           onClick={() => openEdit(item)}
                           className={`group flex items-center gap-4 p-4 rounded-[28px] border-2 transition-all cursor-pointer 
                             ${item.isBought 
                               ? 'bg-white/50 border-transparent opacity-60' 
                               : 'bg-white border-transparent hover:border-gray-900/5 shadow-sm hover:shadow-md'
                             }`}
                         >
                           <button 
                             onClick={(e) => { e.stopPropagation(); toggleBought(item.id, item.isBought); }}
                             className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-sm
                               ${item.isBought 
                                 ? 'bg-emerald-500 text-white rotate-[360deg]' 
                                 : 'bg-gray-50 text-gray-300 hover:text-gray-900 border border-gray-100'
                               }`}
                           >
                             {item.isBought ? <Check size={18} strokeWidth={3} /> : <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />}
                           </button>

                           <div className="flex-1 min-w-0">
                             <p className={`font-bold transition-all truncate ${item.isBought ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                               {item.name}
                             </p>
                             <div className="flex items-center gap-3 mt-0.5">
                               {item.storeNote && (
                                 <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded">
                                   <Store size={10} /> {item.storeNote}
                                 </span>
                               )}
                               {item.productUrl && !item.isBought && (
                                 <a 
                                   href={item.productUrl} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   onClick={(e) => e.stopPropagation()}
                                   className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100"
                                 >
                                   <ExternalLink size={10} /> LINK PRODUK
                                 </a>
                               )}
                             </div>
                           </div>

                           <div className="text-right shrink-0">
                             <p className={`font-black tracking-tight ${item.isBought ? 'text-gray-300' : 'text-gray-900'}`}>
                               Rp {item.amount.toLocaleString('id-ID')}
                             </p>
                           </div>

                           <button 
                             onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                             className="p-3 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 hidden sm:block"
                           >
                             <Trash2 size={18} />
                           </button>
                         </motion.div>
                       ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {items.length === 0 && (
          <div className="p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
             <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                <ClipboardList className="text-gray-200" size={40} />
             </div>
             <h4 className="text-xl font-bold text-gray-900 mb-2">Yuk, bikin rencana! 📝</h4>
             <p className="text-sm text-gray-400 font-medium">Biar belanjanya teratur dan ngga mubazir.</p>
          </div>
        )}
      </div>

      {/* Edit Modal Refined */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative w-full max-w-lg bg-white rounded-[48px] shadow-[0_32px_120px_rgba(0,0,0,0.4)] overflow-hidden"
            >
              <div className="p-8 sm:p-12">
                <header className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Detail Rencana</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Sesuaikan biar pas!</p>
                  </div>
                  <button onClick={() => setEditingItem(null)} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all">
                    <X size={24} />
                  </button>
                </header>

                <form onSubmit={handleEditSubmit} className="space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nama Barang</label>
                        <input 
                          required type="text"
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold transition-all"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Grup / Lokasi</label>
                        <select 
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold appearance-none transition-all"
                          value={editForm.group}
                          onChange={(e) => setEditForm(prev => ({ ...prev, group: e.target.value }))}
                        >
                          {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Estimasi Harga (Rp)</label>
                      <input 
                        required type="number"
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-black text-xl tracking-tight transition-all"
                        value={editForm.amount}
                        onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Rekomendasi Toko</label>
                      <input 
                        type="text"
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold transition-all font-sans italic"
                        value={editForm.storeNote}
                        onChange={(e) => setEditForm(prev => ({ ...prev, storeNote: e.target.value }))}
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">URL Produk</label>
                      <input 
                        type="url"
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold transition-all text-blue-500"
                        value={editForm.productUrl}
                        onChange={(e) => setEditForm(prev => ({ ...prev, productUrl: e.target.value }))}
                      />
                   </div>

                   <div className="pt-8 flex gap-4">
                      <button 
                        type="button" 
                        onClick={() => deleteItem(editingItem.id)}
                        className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center"
                      >
                        <Trash2 size={24} />
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-4 bg-gray-900 text-white rounded-[28px] font-black text-sm shadow-2xl active:scale-95 transition-all"
                      >
                        SIMPAN PERUBAHAN
                      </button>
                   </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
