import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi, centresApi } from '../services/api'
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Filter,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

export default function AttendanceAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [centres, setCentres] = useState([])
  const [selectedCentre, setSelectedCentre] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    centresApi.list().then(res => setCentres(res.data))
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [selectedCentre])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await attendanceApi.analytics({ centre_id: selectedCentre || undefined })
      setAnalytics(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !analytics) {
    return <div className="py-24 text-center text-xs text-slate-500">Computing analytical trends...</div>
  }

  const thresholds = analytics?.threshold_counts || { excellent: 0, good: 0, warning: 0, critical: 0 }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Attendance Analytics & Cohort Trends
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical tracking, daily fluctuation graphs, and compliance threshold categorizations.
          </p>
        </div>

        {/* Centre Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedCentre}
            onChange={(e) => setSelectedCentre(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Training Centres</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Threshold Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Excellent (90–100%)
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {thresholds.excellent} <span className="text-xs font-normal text-slate-400">students</span>
          </p>
          <span className="text-[10px] text-slate-400">High engagement</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Good (75–89%)
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {thresholds.good} <span className="text-xs font-normal text-slate-400">students</span>
          </p>
          <span className="text-[10px] text-slate-400">Standard compliant</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
            Warning (60–74%)
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {thresholds.warning} <span className="text-xs font-normal text-slate-400">students</span>
          </p>
          <span className="text-[10px] text-slate-400">Requires follow-up</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
            Critical (&lt;60%)
          </span>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {thresholds.critical} <span className="text-xs font-normal text-slate-400">students</span>
          </p>
          <span className="text-[10px] text-slate-400">Immediate audit required</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Attendance Trend */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Daily Attendance Rate (%)
          </h3>
          <p className="text-xs text-slate-400 mb-4">Moving daily average rate across batches</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.daily_trends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date_str" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <Tooltip />
                <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Batch-wise Performance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Batch-Wise Performance Comparison
          </h3>
          <p className="text-xs text-slate-400 mb-4">Average attendance rate per training batch</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.batch_trends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="batch_code" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <Tooltip />
                <Bar dataKey="average_percentage" name="Attendance %" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Attendance Students Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <ShieldAlert className="h-4 w-4 text-red-500 mr-2" />
              Low Attendance Student Watchlist (&lt;75%)
            </h3>
            <p className="text-xs text-slate-400">Identified students at risk of non-compliance or course dropping</p>
          </div>
          <Link to="/students" className="text-xs text-primary-600 font-semibold hover:underline">
            View All Students
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3">Student Code</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Course & Batch</th>
                <th className="p-3">Attendance Rate</th>
                <th className="p-3">Classes Attended</th>
                <th className="p-3">Risk Status</th>
                <th className="p-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(analytics?.low_attendance_students || []).map((stu) => (
                <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{stu.student_id}</td>
                  <td className="p-3 font-semibold">{stu.name}</td>
                  <td className="p-3 text-slate-500">{stu.course} • Batch {stu.batch}</td>
                  <td className="p-3 font-bold text-red-600">{stu.attendance_rate}%</td>
                  <td className="p-3 text-slate-500">{stu.classes_attended} / {stu.total_classes}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      stu.status_badge === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {stu.status_badge}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link to={`/students/${stu.id}`} className="text-primary-600 font-semibold hover:underline">
                      View Log
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
