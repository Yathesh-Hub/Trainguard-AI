import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { centresApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react'

export default function TrainingCentres() {
  const { isAdmin } = useAuth()
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const [formData, setFormData] = useState({
    centre_code: '',
    name: '',
    address: '',
    district: '',
    state: 'Karnataka',
    contact_person: '',
    phone: '',
    email: '',
    total_capacity: 100,
    status: 'active'
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCentres()
  }, [search, statusFilter])

  const fetchCentres = async () => {
    setLoading(true)
    try {
      const res = await centresApi.list({ search, status_filter: statusFilter })
      setCentres(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)
    try {
      await centresApi.create(formData)
      setShowAddModal(false)
      setFormData({
        centre_code: '',
        name: '',
        address: '',
        district: '',
        state: 'Karnataka',
        contact_person: '',
        phone: '',
        email: '',
        total_capacity: 100,
        status: 'active'
      })
      fetchCentres()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create training centre.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await centresApi.delete(id)
      setDeleteConfirmId(null)
      fetchCentres()
    } catch (err) {
      alert('Failed to delete centre: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Training Centres
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authorized vocational and IT training locations across regions.
          </p>
        </div>

        {isAdmin() && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Register Centre</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by centre name, code, or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="under_review">Under Review</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Centres Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {centres.map((centre) => (
          <div
            key={centre.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {centre.centre_code}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    centre.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      : centre.status === 'under_review'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {centre.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {centre.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0 text-slate-400" />
                <span className="truncate">{centre.district}, {centre.state}</span>
              </p>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[10px] text-slate-400 font-medium">Students</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{centre.total_students || 20}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[10px] text-slate-400 font-medium">Trainers</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{centre.total_trainers || 3}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                  <p className="text-[10px] text-primary-600 font-medium">Score</p>
                  <p className="text-sm font-bold text-primary-700 dark:text-primary-400">{centre.latest_compliance_score || 85}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link
                to={`/centres/${centre.id}`}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center"
              >
                <span>View Centre Audit</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>

              {isAdmin() && (
                <button
                  onClick={() => setDeleteConfirmId(centre.id)}
                  title="Delete Centre"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Centre Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Register New Training Centre</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Centre Code</label>
                  <input
                    type="text"
                    required
                    placeholder="TC-106"
                    value={formData.centre_code}
                    onChange={(e) => setFormData({...formData, centre_code: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="active">Active</option>
                    <option value="under_review">Under Review</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Centre Name</label>
                <input
                  type="text"
                  required
                  placeholder="National Skills Academy"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Address</label>
                <input
                  type="text"
                  required
                  placeholder="Plot 14, Electronic City Phase 1"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">District</label>
                  <input
                    type="text"
                    required
                    placeholder="Bengaluru Urban"
                    value={formData.district}
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Total Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.total_capacity}
                    onChange={(e) => setFormData({...formData, total_capacity: parseInt(e.target.value) || 100})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    placeholder="Ramesh Rao"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  placeholder="contact@centre.org"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
                >
                  {isSubmitting ? 'Saving...' : 'Register Centre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Training Centre?</h3>
            <p className="text-xs text-slate-500 mt-1">
              This will remove the centre and cascade its student rosters, batches, and records.
            </p>
            <div className="mt-5 flex space-x-2 justify-center">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
