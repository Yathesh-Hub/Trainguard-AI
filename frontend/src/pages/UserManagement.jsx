import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { centresApi } from '../services/api'
import {
  UserCog,
  Plus,
  Search,
  Shield,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react'

export default function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState([
    { id: '1', full_name: 'System Administrator', email: 'admin@trainguard.ai', role: 'admin', centre: 'All Centres', is_active: true },
    { id: '2', full_name: 'Dr. Rajesh Kumar', email: 'manager@apex.trainguard.ai', role: 'centre_manager', centre: 'Apex Skill Academy', is_active: true },
    { id: '3', full_name: 'Sunita Sharma', email: 'manager@horizon.trainguard.ai', role: 'centre_manager', centre: 'Horizon Technical Institute', is_active: true },
    { id: '4', full_name: 'Anand Patil', email: 'manager@pioneer.trainguard.ai', role: 'centre_manager', centre: 'Pioneer Vocational Centre', is_active: true },
    { id: '5', full_name: 'Priya Shetty', email: 'manager@zenith.trainguard.ai', role: 'centre_manager', centre: 'Zenith Digital Training Hub', is_active: true },
    { id: '6', full_name: 'Mahesh Kulkarni', email: 'manager@radiant.trainguard.ai', role: 'centre_manager', centre: 'Radiant Career Institute', is_active: true }
  ])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'centre_manager',
    centre: 'Apex Skill Academy'
  })

  const handleCreate = (e) => {
    e.preventDefault()
    setUsers([...users, { ...formData, id: Date.now().toString(), is_active: true }])
    setShowModal(false)
    setFormData({ full_name: '', email: '', role: 'centre_manager', centre: 'Apex Skill Academy' })
  }

  const toggleStatus = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
  }

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            User & Role Authorization Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage administrative personnel and centre manager permissions linked to Supabase Auth.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Provision User</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search personnel by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3.5">User</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Authorized Centre Jurisdiction</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                      {u.full_name[0]}
                    </div>
                    <span>{u.full_name}</span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">{u.centre}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => toggleStatus(u.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Provision User Account</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="centre_manager">Centre Manager</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-xs rounded-lg border">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
