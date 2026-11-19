import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { studentsApi, centresApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  ChevronRight,
  Trash2,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react'

export default function Students() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCentre, setSelectedCentre] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importCentreId, setImportCentreId] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [isImporting, setIsImporting] = useState(false)

  // Form
  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    email: '',
    phone: '',
    course: 'Full Stack Web Development',
    centre_id: '',
    status: 'active'
  })

  useEffect(() => {
    fetchCentres()
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [search, selectedCentre, selectedCourse])

  const fetchCentres = async () => {
    try {
      const res = await centresApi.list()
      setCentres(res.data)
      if (res.data.length > 0) {
        setImportCentreId(res.data[0].id)
        setFormData(prev => ({ ...prev, centre_id: res.data[0].id }))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await studentsApi.list({
        search,
        centre_id: selectedCentre || undefined,
        course: selectedCourse || undefined
      })
      setStudents(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStudent = async (e) => {
    e.preventDefault()
    try {
      await studentsApi.create(formData)
      setShowAddModal(false)
      fetchStudents()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create student.')
    }
  }

  const handleImport = async (e) => {
    e.preventDefault()
    if (!importFile) return
    setIsImporting(true)
    setImportResult(null)

    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('centre_id', importCentreId)

    try {
      const res = await studentsApi.import(fd)
      setImportResult(res.data.message)
      fetchStudents()
    } catch (err) {
      setImportResult('Import error: ' + (err.response?.data?.detail || err.message))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Student Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Student records, batch assignments, and individual attendance compliance rates.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center space-x-1.5 py-2 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV/Excel</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student ID, name, or email..."
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
          {centres.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
        >
          <option value="">All Courses</option>
          <option value="Full Stack Web Development">Full Stack Web Development</option>
          <option value="Data Analytics & Python">Data Analytics & Python</option>
        </select>
      </div>

      {/* Student Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3.5">Student ID</th>
                <th className="p-3.5">Full Name</th>
                <th className="p-3.5">Centre</th>
                <th className="p-3.5">Course & Batch</th>
                <th className="p-3.5">Attendance Rate</th>
                <th className="p-3.5">Classes</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.map((stu) => {
                const rate = stu.attendance_percentage || 0
                return (
                  <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {stu.student_id}
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900 dark:text-white">{stu.full_name}</p>
                      <p className="text-[11px] text-slate-400">{stu.email || 'No email'}</p>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {stu.centre_name}
                    </td>
                    <td className="p-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{stu.course}</p>
                      <span className="text-[10px] text-slate-400 font-semibold">{stu.batch_code}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${rate >= 75 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {rate}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {stu.total_present} / {stu.total_classes}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 capitalize">
                        {stu.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/students/${stu.id}`}
                        className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        <span>Profile</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <FileSpreadsheet className="h-5 w-5 text-primary-600 mr-2" />
                Bulk Import Students
              </h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {importResult && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-700 text-xs">
                {importResult}
              </div>
            )}

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Target Training Centre</label>
                <select
                  value={importCentreId}
                  onChange={(e) => setImportCentreId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Select Excel or CSV File</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  required
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">Headers expected: Student ID, Full Name, Course, Batch Code</p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-4 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  {isImporting ? 'Importing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Enroll New Student</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Student ID Code</label>
                <input
                  type="text"
                  required
                  placeholder="STU-2024-101"
                  value={formData.student_id}
                  onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Kavita Gowda"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="student@example.org"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 97000 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Training Centre</label>
                <select
                  value={formData.centre_id}
                  onChange={(e) => setFormData({...formData, centre_id: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Course</label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData({...formData, course: e.target.value})}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="Full Stack Web Development">Full Stack Web Development</option>
                  <option value="Data Analytics & Python">Data Analytics & Python</option>
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
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
