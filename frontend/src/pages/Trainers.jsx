import React, { useState, useEffect } from 'react'
import { trainersApi, centresApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  Calendar,
  X,
  Phone,
  Mail,
  Building2
} from 'lucide-react'

export default function Trainers() {
  const { isAdmin } = useAuth()
  const [trainers, setTrainers] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCentre, setSelectedCentre] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const [formData, setFormData] = useState({
    trainer_id: '',
    name: '',
    email: '',
    phone: '',
    subject: 'Full Stack Web',
    assigned_centre_id: '',
    employment_status: 'active'
  })

  useEffect(() => {
    fetchData()
  }, [selectedCentre])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [tRes, aRes, cRes] = await Promise.all([
        trainersApi.list({ centre_id: selectedCentre || undefined }),
        trainersApi.analytics({ centre_id: selectedCentre || undefined }),
        centresApi.list()
      ])
      setTrainers(tRes.data)
      setAnalytics(aRes.data)
      setCentres(cRes.data)
      if (cRes.data.length > 0 && !formData.assigned_centre_id) {
        setFormData(prev => ({ ...prev, assigned_centre_id: cRes.data[0].id }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await trainersApi.create(formData)
      setShowAddModal(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add trainer.')
    }
  }

  const filteredTrainers = trainers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.trainer_id.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Trainer Management & Faculty Roster
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor trainer assignments, scheduled session delivery, and availability rates.
          </p>
        </div>

        {isAdmin() && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Appoint Trainer</span>
          </button>
        )}
      </div>

      {/* Analytics KPIs */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">Faculty Availability</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {analytics.average_availability}%
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">Avg Across Centres</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">Sessions Conducted</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {analytics.total_sessions_completed}
            </p>
            <span className="text-[11px] text-blue-600 font-medium">Completed Deliveries</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">Instruction Hours</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {analytics.total_teaching_hours} hrs
            </p>
            <span className="text-[11px] text-slate-400">Classroom Time</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">Leave Instances</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {analytics.leave_count}
            </p>
            <span className="text-[11px] text-slate-400">Recorded Absences</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by trainer name, ID, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={selectedCentre}
          onChange={(e) => setSelectedCentre(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
        >
          <option value="">All Centres</option>
          {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Trainers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3.5">Trainer ID</th>
                <th className="p-3.5">Name & Contact</th>
                <th className="p-3.5">Domain Subject</th>
                <th className="p-3.5">Assigned Centre</th>
                <th className="p-3.5">Availability</th>
                <th className="p-3.5">Hours Taught</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTrainers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                    {t.trainer_id}
                  </td>
                  <td className="p-3.5">
                    <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-[11px] text-slate-400">{t.email} • {t.phone}</p>
                  </td>
                  <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                    {t.subject}
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    {t.centre_name}
                  </td>
                  <td className="p-3.5 font-bold text-emerald-600">
                    {t.attendance_percentage}%
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {t.total_hours_taught} hrs ({t.total_sessions_conducted} sessions)
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 capitalize">
                      {t.employment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Trainer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Appoint New Trainer</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Trainer ID Code</label>
                <input
                  type="text"
                  required
                  placeholder="TRN-016"
                  value={formData.trainer_id}
                  onChange={(e) => setFormData({...formData, trainer_id: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Prof. Rajesh Varma"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="trainer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98111 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Domain Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Cloud Computing & DevOps"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Assigned Centre</label>
                <select
                  value={formData.assigned_centre_id}
                  onChange={(e) => setFormData({...formData, assigned_centre_id: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Save Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
