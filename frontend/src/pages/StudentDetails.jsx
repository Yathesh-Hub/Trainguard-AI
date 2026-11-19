import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { studentsApi } from '../services/api'
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  ShieldAlert
} from 'lucide-react'

export default function StudentDetails() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudent()
  }, [id])

  const fetchStudent = async () => {
    setLoading(true)
    try {
      const res = await studentsApi.get(id)
      setStudent(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="py-24 text-center text-xs text-slate-500">Loading student attendance file...</div>
  }

  if (!student) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-600">Student not found.</p>
        <Link to="/students" className="text-xs text-primary-600 font-semibold hover:underline mt-2 inline-block">
          &larr; Return to Student Directory
        </Link>
      </div>
    )
  }

  const rate = student.attendance_percentage || 0

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
        <span>Back to Students</span>
      </Link>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold text-2xl">
            {student.full_name[0]}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {student.student_id}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 capitalize">
                {student.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {student.full_name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{student.course} • Batch {student.batch_code}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center"><Mail className="h-3 w-3 mr-1" />{student.email || 'N/A'}</span>
              <span className="flex items-center"><Phone className="h-3 w-3 mr-1" />{student.phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Rate Gauge Badge */}
        <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance Rate</p>
            <p className={`text-2xl font-extrabold ${rate >= 75 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {rate}%
            </p>
            <p className="text-[10px] text-slate-400">{student.total_present} / {student.total_classes} Sessions</p>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Individual Attendance Records</h3>
          <p className="text-xs text-slate-400">Detailed biometric & uploaded ledger logs</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3">Session Date</th>
                <th className="p-3">Recorded Status</th>
                <th className="p-3">Remarks / Verification Note</th>
                <th className="p-3">Recorded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(student.attendance_history || []).map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{rec.date}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      rec.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                      rec.status === 'absent' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {rec.status === 'present' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      <span>{rec.status}</span>
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{rec.remarks || 'Standard biometric check-in'}</td>
                  <td className="p-3 text-slate-400">{rec.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
