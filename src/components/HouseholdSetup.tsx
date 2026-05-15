import { useState, useEffect } from 'react';
import { firestoreService } from '../lib/firestoreService';
import { Plus, Home } from 'lucide-react';

export default function HouseholdSetup({ userId, onSelect }: { userId: string, onSelect: (id: string) => void }) {
  const [households, setHouseholds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const fetchHouseholds = async () => {
      try {
        const data = await firestoreService.getHouseholds();
        setHouseholds(data || []);
      } catch (e) {
        console.error("Fetch households error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchHouseholds();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await firestoreService.createHousehold(newName);
    if (id) onSelect(id);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-sans">Memuat data rumah tangga...</div>;

  return (
    <div className="h-screen flex items-center justify-center bg-[#F5F5F5] font-sans">
      <div className="max-w-xl w-full p-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8 tracking-tight">Pilih Rumah Tangga</h1>
        
        <div className="grid gap-4 mb-8">
          {households.map((h, idx) => (
            <button 
              key={h.id || `household-${idx}`}
              onClick={() => onSelect(h.id)}
              className="p-6 bg-white rounded-2xl border border-gray-100 flex items-center gap-4 hover:border-gray-900 transition-all text-left group shadow-sm active:scale-[0.98]"
            >
              <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100">
                <Home className="text-gray-900" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{h.name}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">Pemilik: Anda</p>
              </div>
            </button>
          ))}
        </div>

        <div className="p-8 bg-white rounded-3xl border border-dashed border-gray-300">
          <p className="text-sm font-medium text-gray-900 mb-4 text-center">Buat Rumah Tangga Baru</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nama Rumah (mis: Keluarga Smith)"
              className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-gray-900 outline-none text-sm transition-all"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button 
              onClick={handleCreate}
              className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
