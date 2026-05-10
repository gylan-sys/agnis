import { useState, useEffect, ReactNode } from 'react';
import { authService, firestoreService } from './lib/firestoreService';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import HouseholdSetup from './components/HouseholdSetup';
import Transactions from './components/Transactions';
import Budgets from './components/Budgets';
import Bills from './components/Bills';
import Planning from './components/Planning';
import Chat from './components/Chat';
import Gallery from './components/Gallery';
import Settings from './components/Settings';
import { LayoutDashboard, Receipt, WalletCards, BellRing, LogOut, ChevronRight, ClipboardList, MessageSquare, Image as ImageIcon, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(localStorage.getItem('householdId'));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'bills' | 'planning' | 'chat' | 'gallery' | 'settings'>('dashboard');

  const checkAuth = async () => {
    const u = await authService.getProfile();
    setUser(u);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (creds: any) => {
    const u = await authService.login(creds);
    setUser(u);
  };

  const handleSelectHousehold = (id: string) => {
    setHouseholdId(id);
    localStorage.setItem('householdId', id);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-sans font-black bg-gray-900 text-white animate-pulse uppercase tracking-[0.3em]">Loading System...</div>;

  if (!user) return <Login onLogin={handleLogin} background={localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).loginBackground : undefined} />;

  if (!householdId) return <HouseholdSetup userId={user.id} onSelect={handleSelectHousehold} />;

  const appBgStyle = user?.appBackground ? {
    backgroundImage: `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.95)), url(${user.appBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  } : {
    backgroundColor: '#FDFCFB'
  };

  return (
    <div className="flex h-screen text-gray-900 font-sans selection:bg-blue-100 transition-all duration-1000" style={appBgStyle}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-100 flex-col shadow-[4px_0_24px_rgba(0,0,0,0,02)] z-20">
        <div className="p-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center text-white rotate-3 shadow-lg">
              <Receipt size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AGNIS</h1>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-none mt-1">Household</p>
            </div>
          </motion.div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2">
          <SidebarItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Beranda"
          />
          <SidebarItem 
            active={activeTab === 'transactions'} 
            onClick={() => setActiveTab('transactions')}
            icon={<Receipt size={20} />}
            label="Transaksi"
          />
          <SidebarItem 
            active={activeTab === 'planning'} 
            onClick={() => setActiveTab('planning')}
            icon={<ClipboardList size={20} />}
            label="Rencana"
          />
          <SidebarItem 
            active={activeTab === 'budgets'} 
            onClick={() => setActiveTab('budgets')}
            icon={<WalletCards size={20} />}
            label="Anggaran"
          />
          <SidebarItem 
            active={activeTab === 'bills'} 
            onClick={() => setActiveTab('bills')}
            icon={<BellRing size={20} />}
            label="Tagihan"
          />
          <SidebarItem 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')}
            icon={<MessageSquare size={20} />}
            label="Chat"
          />
          <SidebarItem 
            active={activeTab === 'gallery'} 
            onClick={() => setActiveTab('gallery')}
            icon={<ImageIcon size={20} />}
            label="Galeri"
          />
          <SidebarItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<SettingsIcon size={20} />}
            label="Pengaturan"
          />
        </nav>

        <div className="p-8 mt-auto border-t border-gray-50">
          <div className="flex items-center gap-3 px-4 py-4 rounded-3xl bg-gray-50/50 mb-4 ring-1 ring-gray-100">
            <img src={user.userPhoto || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-2xl" alt="profile" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user.displayName}</p>
              <button 
                onClick={() => authService.logout()}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 flex items-center gap-1 mt-0.5"
              >
                LOG OUT <LogOut size={10} />
              </button>
            </div>
          </div>
          <button 
            onClick={() => {
              setHouseholdId(null);
              localStorage.removeItem('householdId');
            }}
            className="w-full text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] hover:text-gray-900 transition-colors"
          >
            Switch Household
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-24 lg:pb-0">
        <header className="lg:hidden px-6 py-5 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center text-white rotate-3 shadow-md">
              <Receipt size={16} strokeWidth={3} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">AGNIS</h1>
          </div>
          <div className="flex items-center gap-3">
             <img src={user.userPhoto || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-8 h-8 rounded-xl shadow-sm" alt="profile" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 lg:py-12 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ 
                type: "spring", 
                damping: 30, 
                stiffness: 300,
                mass: 0.5
              }}
              className="max-w-6xl mx-auto"
            >
              {activeTab === 'dashboard' && <Dashboard householdId={householdId} onNavigate={setActiveTab} />}
              {activeTab === 'transactions' && <Transactions householdId={householdId} />}
              {activeTab === 'planning' && <Planning householdId={householdId} />}
              {activeTab === 'budgets' && <Budgets householdId={householdId} />}
              {activeTab === 'bills' && <Bills householdId={householdId} />}
              {activeTab === 'chat' && <Chat householdId={householdId} />}
              {activeTab === 'gallery' && <Gallery householdId={householdId} />}
              {activeTab === 'settings' && <Settings user={user} onUpdate={setUser} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-[32px] p-2 flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50">
        <MobileNavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={20} />} 
        />
        <MobileNavItem 
          active={activeTab === 'transactions'} 
          onClick={() => setActiveTab('transactions')} 
          icon={<Receipt size={20} />} 
        />
        <MobileNavItem 
          active={activeTab === 'planning'} 
          onClick={() => setActiveTab('planning')} 
          icon={<ClipboardList size={20} />} 
        />
        <MobileNavItem 
          active={activeTab === 'chat'} 
          onClick={() => setActiveTab('chat')} 
          icon={<MessageSquare size={20} />} 
        />
        <MobileNavItem 
          active={activeTab === 'gallery'} 
          onClick={() => setActiveTab('gallery')} 
          icon={<ImageIcon size={20} />} 
        />
        <MobileNavItem 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<SettingsIcon size={20} />} 
        />
      </nav>
    </div>
  );
}

function SidebarItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-4 rounded-[22px] transition-all duration-300 group
        ${active ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 translate-x-2' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}
      `}
    >
      <div className="flex items-center gap-4">
        <span className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{icon}</span>
        <span className="text-sm font-bold tracking-tight">{label}</span>
      </div>
      {active && <ChevronRight size={16} className="opacity-50" />}
    </button>
  );
}

function MobileNavItem({ active, icon, onClick }: { active: boolean, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`relative p-4 transition-all duration-300 rounded-2xl
        ${active ? 'text-white translate-y-[-4px]' : 'text-white/40 hover:text-white/60'}
      `}
    >
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute inset-0 bg-white/10 rounded-2xl"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className="relative z-10">{icon}</div>
      {active && (
        <motion.div 
          layoutId="activeDot"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"
        />
      )}
    </button>
  );
}
