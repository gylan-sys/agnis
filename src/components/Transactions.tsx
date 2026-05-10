import { useState, useEffect, FormEvent } from 'react';
import { firestoreService } from '../lib/firestoreService';
import { Plus, Search, Filter, Download, MoreVertical, Trash2, ArrowUpRight, ArrowDownLeft, X, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';

export default function Transactions({ householdId }: { householdId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    amount: '',
    category: 'Makan & Minum',
    description: '',
    type: 'expense' as 'income' | 'expense',
    receiptUrl: ''
  });

  useEffect(() => {
    return firestoreService.subscribeTransactions(householdId, (txs) => {
      const filtered = (txs || []).filter(tx => 
        tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.category.toLowerCase().includes(search.toLowerCase())
      );
      setTransactions([...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });
  }, [householdId, search]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    
    await firestoreService.addTransaction(householdId, {
      ...formData,
      amount: Number(formData.amount)
    });
    setShowAdd(false);
    setFormData({ ...formData, amount: '', description: '', receiptUrl: '' });
  };

  const handleExport = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Tanggal', 'Kategori', 'Keterangan', 'Tipe', 'Jumlah'];
    const csvData = transactions.map(tx => [
      format(parseISO(tx.date), 'yyyy-MM-dd HH:mm'),
      tx.category,
      tx.description,
      tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      tx.amount
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transaksi_agnis_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = [
    'Makan & Minum', 'Transportasi', 'Belanja', 'Kesehatan', 'Pendidikan', 'Hiburan', 'Tagihan', 'Lainnya'
  ];

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-gray-200">
        <Receipt size={40} />
      </motion.div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-10"
    >
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Transaksi Kita 💸</h2>
          <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-wider">Catat biar ngga nyesel nanti.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-[22px] font-bold text-sm transition-all shadow-lg active:scale-95
            ${showAdd ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-gray-900 text-white shadow-gray-200'}
          `}
        >
          {showAdd ? <><X size={18} /> Tutup Form</> : <><Plus size={18} /> Catat Baru</>}
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
            <div className="p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal</label>
                  <input 
                    required type="datetime-local" 
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jumlah (Rp)</label>
                  <input 
                    required type="number" 
                    placeholder="50000"
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kategori</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm appearance-none"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipe</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-2xl">
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'expense' })}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'expense' ? 'bg-white shadow-sm text-rose-500' : 'text-gray-400'}`}
                    >
                      Keluar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'income' })}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === 'income' ? 'bg-white shadow-sm text-emerald-500' : 'text-gray-400'}`}
                    >
                      Masuk
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan</label>
                  <input 
                    required type="text" 
                    placeholder="Makan siang mantap..."
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all text-gray-900"
                  >
                    Simpan Transaksi
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Cari belanjamu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-5 py-4 bg-white rounded-[26px] border border-gray-100 focus:border-gray-900 outline-none transition-all text-sm font-bold shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-6 py-4 bg-white rounded-[26px] border border-gray-100 text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2 group shadow-sm"
          >
            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Ekspor</span>
          </button>
          <button className="p-4 bg-white rounded-[26px] border border-gray-100 text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {transactions.map((tx, idx) => (
          <motion.div 
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white p-5 rounded-[32px] border border-gray-50 shadow-sm hover:shadow-md transition-all group relative overflow-hidden text-gray-900"
          >
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                {tx.type === 'income' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{tx.description}</h4>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {tx.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     {format(parseISO(tx.date), 'dd MMMM yyyy, HH:mm')}
                   </p>
                   {tx.receiptUrl && (
                      <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-blue-500 hover:underline uppercase tracking-widest bg-blue-50 px-1.5 rounded">
                        LIHAT STRUK
                      </a>
                   )}
                </div>
              </div>

              <div className="text-right flex items-center gap-4">
                <p className={`text-lg font-black tracking-tighter shrink-0 ${tx.type === 'income' ? 'text-emerald-500' : 'text-gray-900'}`}>
                  {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('id-ID')}
                </p>
                <button 
                  onClick={() => confirm('Hapus transaksi ini?') && firestoreService.deleteTransaction(householdId, tx.id)}
                  className="p-3 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 hidden sm:block"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {transactions.length === 0 && (
          <div className="p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
              <Receipt className="text-gray-200" size={40} />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Masih Bersih! ✨</h4>
            <p className="text-sm text-gray-400 font-medium">Belum ada transaksi yang tercatat hari ini.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
