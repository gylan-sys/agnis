import React, { useState, useEffect } from 'react';
import { adminService } from '../lib/firestoreService';
import { UserPlus, Trash2, Shield, User, Mail, Key } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminUserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    role: 'user'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.saveUser(formData);
      setFormData({ username: '', displayName: '', email: '', password: '', role: 'user' });
      setShowAddForm(false);
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    try {
      await adminService.deleteUser(userId);
      loadUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-gray-50 p-6 rounded-[32px] border border-gray-100">
        <div>
          <h3 className="text-xl font-black tracking-tight">Manajemen User</h3>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mt-1">Total {users.length} Akun Terdaftar</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10"
        >
          <UserPlus size={16} /> {showAddForm ? 'Batal' : 'Tambah User'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 italic">
          Gagal: {error}
        </div>
      )}

      {showAddForm && (
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100"
        >
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  required
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                  placeholder="john_doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Nama Tampilan</label>
              <input 
                required
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                className="w-full px-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Email (Opsional)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  required
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-12 pr-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Role</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full px-6 py-4 bg-gray-50 rounded-3xl border-none focus:ring-2 focus:ring-blue-500 text-sm font-bold appearance-none"
              >
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button 
                type="submit"
                className="px-12 py-5 bg-blue-600 text-white rounded-[32px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-xl shadow-blue-200"
              >
                Simpan User Baru
              </button>
            </div>
          </form>
        </motion.section>
      )}

      <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pengguna</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic">Memuat data user...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic">Belum ada user terdaftar selain admin utama.</td>
                </tr>
              ) : users.map((u, idx) => (
                <tr key={u.id || `user-${idx}`} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-400 uppercase tracking-tighter">
                        {u.username.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 tracking-tight">{u.displayName}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium text-gray-500">{u.email || '-'}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-3 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                      title="Hapus User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
