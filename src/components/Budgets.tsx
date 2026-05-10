import { useState, useEffect, FormEvent } from 'react';
import { firestoreService } from '../lib/firestoreService';
import { Plus, Wallet, Trash2, X, AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Budgets({ householdId }: { householdId: string }) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentPeriod = format(new Date(), 'yyyy-MM');

  const [formData, setFormData] = useState({
    category: 'Makan & Minum',
    amount: '',
    period: currentPeriod
  });

  useEffect(() => {
    const unsubBudgets = firestoreService.subscribeBudgets(householdId, currentPeriod, (b) => setBudgets(b || []));
    const unsubTx = firestoreService.subscribeTransactions(householdId, (txs) => {
      setTransactions((txs || []).filter(tx => tx.date.startsWith(currentPeriod)));
      setLoading(false);
    });

    return () => {
      unsubBudgets();
      unsubTx();
    };
  }, [householdId, currentPeriod]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    await firestoreService.addBudget(householdId, {
      ...formData,
      amount: Number(formData.amount)
    });
    setShowAdd(false);
    setFormData({ ...formData, amount: '' });
  };

  const getSpent = (category: string) => {
    return transactions
      .filter(tx => tx.category === category && tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const categories = [
    'Makan & Minum', 'Transportasi', 'Belanja', 'Kesehatan', 'Pendidikan', 'Hiburan', 'Tagihan', 'Lainnya'
  ];

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-gray-200">
        <Wallet size={40} />
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
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Anggaran Bulanan 🏦</h2>
          <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-wider">Setel batas biar ngga boncos.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-[22px] font-bold text-sm transition-all shadow-lg active:scale-95
            ${showAdd ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-gray-900 text-white shadow-gray-200'}
          `}
        >
          {showAdd ? <><X size={18} /> Tutup</> : <><Plus size={18} /> Buat Baru</>}
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
            <div className="p-8 bg-white rounded-[40px] border border-gray-100 shadow-sm mb-10 text-gray-900">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Batas Maksimal (Rp)</label>
                  <input 
                    required type="number" 
                    placeholder="2000000"
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                  >
                    PASANG ANGGARAN
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget, idx) => {
          const spent = getSpent(budget.category);
          const percent = Math.min((spent / budget.amount) * 100, 100);
          const isWarning = percent > 80;
          const isDanger = percent >= 100;

          return (
            <motion.div 
              key={budget.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-3xl shrink-0 shadow-sm ${isDanger ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}>
                    <Wallet size={22} />
                  </div>
                  <button 
                    onClick={() => confirm('Hapus anggaran ini?') && firestoreService.deleteBudget(householdId, budget.id)}
                    className="p-3 text-gray-100 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="mb-8">
                  <h3 className="font-black text-gray-900 text-xl tracking-tight mb-1">{budget.category}</h3>
                  <div className="flex items-center gap-2">
                     <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${isDanger ? 'bg-rose-100 text-rose-600' : isWarning ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-500'}`}>
                        {isDanger ? 'BONCOS! 🚨' : isWarning ? 'WASPADA! ⚠️' : 'AMAN ✨'}
                     </span>
                     <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{format(new Date(), 'MMMM yyyy')}</span>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                   <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Terpakai</p>
                        <p className={`text-2xl font-black tracking-tight ${isDanger ? 'text-rose-500' : 'text-gray-900'}`}>
                          Rp {spent.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Limit</p>
                        <p className="font-bold text-gray-400">Rp {budget.amount.toLocaleString('id-ID')}</p>
                      </div>
                   </div>

                   <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-gray-900'}`}
                      />
                   </div>
                   
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className={isDanger ? 'text-rose-500' : 'text-gray-400'}>{Math.round(percent)}%</span>
                      <span className="text-gray-400">SISA Rp {(budget.amount - spent).toLocaleString('id-ID')}</span>
                   </div>
                </div>
              </div>

              {/* Decorative subtle patterns */}
              <div className="absolute right-[-20px] top-[-20px] scale-150 rotate-12 opacity-[0.03] group-hover:rotate-45 transition-transform duration-700">
                <Sparkles size={120} />
              </div>
            </motion.div>
          );
        })}

        {budgets.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
             <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="text-gray-200" size={40} />
             </div>
             <h4 className="text-xl font-bold text-gray-900 mb-2">Pasang Budget Yuk! 📈</h4>
             <p className="text-sm text-gray-400 font-medium">Biar gaji ngga cuma numpang lewat doang.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
