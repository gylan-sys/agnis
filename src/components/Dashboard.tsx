import { useState, useEffect, ReactNode } from 'react';
import { firestoreService } from '../lib/firestoreService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard, ChevronRight, Calendar, ShoppingBag, PieChart, Receipt, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

function StatCard({ label, value, icon, color, trend }: { label: string, value: number, icon: any, color: string, trend?: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${color} p-6 rounded-[32px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group`}
    >
      <div className="absolute -right-2 -top-2 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-45">
        {icon}
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm text-gray-900">
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">
          Rp {value.toLocaleString('id-ID')}
        </h3>
        {trend && (
          <span className={`text-[10px] font-bold ${trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function Dashboard({ householdId, onNavigate }: { householdId: string, onNavigate?: (tab: any) => void }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [planningItems, setPlanningItems] = useState<any[]>([]);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentPeriod = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    const unsubTx = firestoreService.subscribeTransactions(householdId, (txs) => {
      setTransactions([...(txs || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    const unsubPlan = firestoreService.subscribePlanning(householdId, currentPeriod, (items) => {
      setPlanningItems(items || []);
    });

    const unsubGallery = firestoreService.subscribeGallery(householdId, (items) => {
      setGalleryItems((items || []).slice(0, 3));
      setLoading(false);
    });

    // Fallback loading state if gallery takes too long or fails
    const timer = setTimeout(() => setLoading(false), 3000);

    return () => {
      clearTimeout(timer);
      unsubTx();
      unsubPlan();
      unsubGallery();
    };
  }, [householdId, currentPeriod]);

  const stats = (transactions || []).reduce((acc, tx) => {
    if (tx.type === 'income') acc.income += tx.amount;
    else acc.expense += tx.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const totalPlanned = (planningItems || []).reduce((sum, i) => sum + i.amount, 0);
  const totalBoughtInPlan = (planningItems || []).filter(i => i.isBought).reduce((sum, i) => sum + i.amount, 0);

  const currentBalance = stats.income - stats.expense;

  const categoryData = (transactions || [])
    .filter(tx => tx.type === 'expense')
    .reduce((acc: any, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

  const sortedCategories = Object.entries(categoryData)
    .sort(([, a]: any, [, b]: any) => b - a);

  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    return firestoreService.subscribeMembers(householdId, (m) => setMembers(m || []));
  }, [householdId]);

  const chartData = (transactions || []).slice(0, 7).reverse().map(tx => ({
    name: format(parseISO(tx.date), 'dd/MM'),
    amount: tx.type === 'income' ? tx.amount : -tx.amount
  }));

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="text-gray-200"
      >
        <Receipt size={40} />
      </motion.div>
      <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Sabar ya, lagi disiapin...</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Halo, Keluarga! 👋</h2>
          <p className="text-gray-400 text-sm font-medium mt-1 uppercase tracking-wider">Mari kelola keuangan kita hari ini.</p>
        </div>
        <div className="px-5 py-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 w-fit">
          <Calendar size={18} className="text-gray-400" />
          <span className="text-sm font-bold text-gray-600">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: id })}</span>
        </div>
      </header>

      {/* Hero Balance Card (Mobile Focus) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gray-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group"
      >
        <div className="relative z-10">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-3">Sisa Saldo Kamu</p>
          <div className="flex items-baseline gap-1 mb-10">
            <span className="text-xl font-bold opacity-40 mr-1">Rp</span>
            <h3 className="text-3xl sm:text-5xl font-black tracking-tighter">
              {currentBalance.toLocaleString('id-ID')}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pemasukan</span>
              </div>
              <p className="font-bold text-sm sm:text-base">Rp {stats.income.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-rose-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pengeluaran</span>
              </div>
              <p className="font-bold text-sm sm:text-base">Rp {stats.expense.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
        <CreditCard className="absolute -right-8 -top-8 text-white/5 rotate-12 scale-150 transition-transform group-hover:rotate-[20deg]" size={200} />
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[36px] border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <ShoppingBag size={20} />
                    </div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Target</span>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Realisasi Rencana</p>
                  <p className="text-2xl font-black tracking-tight mb-4">Rp {totalBoughtInPlan.toLocaleString('id-ID')}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress Belanja</span>
                    <span className="text-sm font-black text-blue-600">{Math.round((totalBoughtInPlan / (totalPlanned || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(totalBoughtInPlan / (totalPlanned || 1)) * 100}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[36px] border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-6 flex items-center justify-between">
                  <span>Distribusi Kategori</span>
                  <PieChart size={18} className="text-gray-300" />
                </h3>
                <div className="space-y-4">
                  {sortedCategories.slice(0, 4).map(([cat, amt]: any, idx) => (
                    <div key={`cat-${cat || idx}`} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-500 uppercase tracking-widest">{cat}</span>
                        <span className="text-gray-900">Rp {amt.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(amt / stats.expense) * 100}%` }}
                          className={`h-full rounded-full ${['bg-blue-400', 'bg-rose-400', 'bg-amber-400', 'bg-indigo-400'][idx % 4]}`}
                        />
                      </div>
                    </div>
                  ))}
                  {sortedCategories.length === 0 && (
                    <p className="text-xs text-gray-400 italic py-10 text-center">Data belum tersedia.</p>
                  )}
                </div>
              </div>
           </div>

           {/* Recent Transactions List */}
           <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden text-gray-900">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-bold tracking-tight">Transaksi Terakhir</h3>
               <button className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors">Lihat Semua</button>
             </div>
             <div className="space-y-4">
               {transactions.slice(0, 5).map((tx, idx) => (
                 <motion.div 
                   key={tx.id || `tx-${idx}`}
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: idx * 0.05 }}
                   className="flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-50 bg-white shadow-sm sm:shadow-none"
                 >
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                     {tx.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-gray-900 truncate">{tx.description}</p>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tx.category} • {format(parseISO(tx.date), 'dd MMM')}</p>
                   </div>
                   <div className="text-right">
                     <p className={`text-sm font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-gray-900'}`}>
                       {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString('id-ID')}
                     </p>
                   </div>
                 </motion.div>
               ))}
               {transactions.length === 0 && (
                 <p className="text-sm text-gray-400 text-center py-10 italic">Belum ada transaksi.</p>
               )}
             </div>
           </div>
        </div>

        <div className="space-y-8">
          {/* Members Card */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-8">Anggota Keluarga</h3>
            <div className="space-y-6">
              {members.map((member, idx) => (
                <motion.div 
                  key={member.id || `member-${idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-gray-500 uppercase overflow-hidden shadow-sm border-2 border-white ring-1 ring-gray-100">
                      {member.photoURL ? <img src={member.photoURL} alt="p" className="w-full h-full object-cover" /> : member.displayName?.charAt(0) || '?'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{member.displayName || 'Anonim'}</p>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{member.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Gallery Preview Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => onNavigate?.('gallery')}
            className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cursor-pointer group"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Galeri Foto</h3>
              <ImageIcon size={20} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
            </div>

            {galleryItems.length > 0 ? (
              <div className="space-y-4">
                <div className="flex -space-x-4 overflow-hidden">
                  {galleryItems.map((item, i) => (
                     <div key={item.id || `gallery-${i}`} className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-white shadow-sm overflow-hidden shrink-0">
                        {item.type === 'image' ? (
                          <img src={item.url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white/20">
                             <ImageIcon size={16} />
                          </div>
                        )}
                     </div>
                  ))}
                </div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Buka Galeri Keluarga →</p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Belum ada foto momen...</p>
                <button className="mt-4 text-[10px] font-black text-blue-500 uppercase tracking-widest">Klik untuk Tambah</button>
              </div>
            )}
          </motion.div>

          {/* Quick Tip Card */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-amber-50 p-8 rounded-[40px] border-2 border-amber-100 relative overflow-hidden"
          >
            <div className="relative z-10">
              <span className="inline-block p-2 bg-amber-200 text-amber-700 rounded-xl mb-4">
                <Receipt size={16} strokeWidth={3} />
              </span>
              <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2">Tips Hemat</h4>
              <p className="text-sm text-amber-800/80 leading-relaxed font-medium">
                "Coba kurangi jajan kopi di luar minggu ini, lumayan bisa hemat Rp 150rb lho!"
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 text-emerald-500/10 -rotate-12 translate-y-1/4">
              <TrendingDown size={140} />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
