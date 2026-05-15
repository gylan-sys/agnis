import { useState, useEffect, FormEvent } from 'react';
import { firestoreService } from '../lib/firestoreService';
import { Plus, BellRing, Trash2, X, CheckCircle2, Clock, Calendar, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';

export default function Bills({ householdId }: { householdId: string }) {
  const [bills, setBills] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    category: 'Bulanan'
  });

  useEffect(() => {
    return firestoreService.subscribeBills(householdId, (data) => {
      setBills([...(data || [])].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setLoading(false);
    });
  }, [householdId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;
    
    await firestoreService.addBill(householdId, {
      ...formData,
      amount: Number(formData.amount),
      isPaid: false
    });
    setShowAdd(false);
    setFormData({ ...formData, name: '', amount: '' });
  };

  const togglePaid = (id: string, current: boolean) => {
    firestoreService.updateBill(householdId, id, { isPaid: !current });
  };

  const categories = ['Bulanan', 'Listrik', 'Air', 'Internet', 'Kost/Cicilan', 'Lainnya'];

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-gray-200">
        <BellRing size={40} />
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
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tagihan Rutin 🔔</h2>
          <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-wider">Jangan sampai lupa bayar ya!</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-[22px] font-bold text-sm transition-all shadow-lg active:scale-95
            ${showAdd ? 'bg-rose-50 text-rose-500 shadow-rose-100' : 'bg-gray-900 text-white shadow-gray-200'}
          `}
        >
          {showAdd ? <><X size={18} /> Tutup</> : <><Plus size={18} /> Tambah Tagihan</>}
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
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Tagihan</label>
                  <input 
                    required type="text" placeholder="Listrik, Wifi, dll..."
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jumlah (Rp)</label>
                  <input 
                    required type="number" placeholder="350000"
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jatuh Tempo</label>
                  <input 
                    required type="date"
                    className="w-full px-5 py-3.5 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-gray-900 font-bold text-sm"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                  >
                    SIMPAN
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bills.map((bill, idx) => (
          <motion.div 
            key={bill.id || `bill-${idx}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-white rounded-[40px] border-2 transition-all overflow-hidden flex flex-col group
              ${bill.isPaid ? 'border-emerald-50 bg-emerald-50/10 opacity-70' : 'border-white shadow-sm hover:shadow-xl hover:-translate-y-1'}
            `}
          >
            <div className="p-8 flex items-start gap-6">
               <div className={`w-16 h-16 rounded-[32px] flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-6 transition-transform
                 ${bill.isPaid ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'}
               `}>
                 {bill.isPaid ? <CheckCircle2 size={32} /> : <Clock size={32} />}
               </div>
               
               <div className="flex-1 min-w-0 py-1">
                 <div className="flex justify-between items-start">
                   <h3 className={`text-xl font-black tracking-tight truncate ${bill.isPaid ? 'text-emerald-900 line-through' : 'text-gray-900'}`}>
                     {bill.name}
                   </h3>
                   <button 
                    onClick={() => confirm('Hapus tagihan ini?') && firestoreService.deleteBill(householdId, bill.id)}
                    className="p-2 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
                 
                 <div className="flex flex-wrap gap-4 mt-3">
                   <div className="flex items-center gap-1.5">
                     <Calendar size={14} className="text-gray-300" />
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       Batas {format(parseISO(bill.dueDate), 'dd MMM yyyy')}
                     </p>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <Wallet size={14} className="text-gray-300" />
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       {bill.category || 'Tagihan'}
                     </p>
                   </div>
                 </div>
               </div>
            </div>

            <div className={`mt-auto p-8 flex items-center justify-between border-t transition-colors
              ${bill.isPaid ? 'border-emerald-100 bg-emerald-50/30' : 'border-gray-50 bg-gray-50/30'}
            `}>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nominal Bayar</p>
                <p className={`text-2xl font-black tracking-tighter ${bill.isPaid ? 'text-emerald-600' : 'text-gray-900'}`}>
                  Rp {bill.amount.toLocaleString('id-ID')}
                </p>
              </div>
              
              <button 
                onClick={() => togglePaid(bill.id, bill.isPaid)}
                className={`px-8 py-3 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-md active:scale-95
                  ${bill.isPaid 
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                  }
                `}
              >
                {bill.isPaid ? 'Lunas 🎉' : 'Bayar Sekarang'}
              </button>
            </div>
          </motion.div>
        ))}

        {bills.length === 0 && (
          <div className="col-span-1 md:col-span-2 p-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
             <div className="w-20 h-20 bg-gray-50 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                <BellRing className="text-gray-200" size={40} />
             </div>
             <h4 className="text-xl font-bold text-gray-900 mb-2">Belum ada tagihan? 🏖️</h4>
             <p className="text-sm text-gray-400 font-medium">Wah asik dong bebas tagihan! Tapi cek lagi ya.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
