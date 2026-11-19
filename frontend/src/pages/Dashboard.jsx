import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  centresApi,
  studentsApi,
  trainersApi,
  attendanceApi,
  complianceApi,
  anomaliesApi
} from '../services/api'
import {
  Building2,
  Users,
  GraduationCap,
  CalendarCheck,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Filter,
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedCentre, setSelectedCentre] = useState('')
  const [centres, setCentres] = useState([])
  
  const [kpis, setKpis] = useState({
    totalCentres: 0,
    totalStudents: 0,
    totalTrainers: 0,
    averageAttendance: 0,
    averageCompliance: 0,
    activeAnomalies: 0,
  })

  const [attendanceData, setAttendanceData] = useState([])
  const [complianceData, setComplianceData] = useState([])
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState([])
  const [recentAnomalies, setRecentAnomalies] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])

  const COLORS = ['#16A34A', '#DC2626', '#F59E0B', '#2563EB']

  useEffect(() => {
    fetchDashboardData()
  }, [selectedCentre])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [centresRes, attAnalyticsRes, compOverviewRes, anomaliesRes, studentsRes, trainersRes] = await Promise.all([
        centresApi.list(),
        attendanceApi.analytics({ centre_id: selectedCentre || undefined }),
        complianceApi.getOverview(),
        anomaliesApi.list({ centre_id: selectedCentre || undefined, review_status: 'open' }),
        studentsApi.list({ centre_id: selectedCentre || undefined }),
        trainersApi.list({ centre_id: selectedCentre || undefined }),
      ])

      const centresList = centresRes.data || []
      setCentres(centresList)

      const attAnalytics = attAnalyticsRes.data || {}
      const compOverview = compOverviewRes.data || {}
      const openAnomalies = anomaliesRes.data || []
      const studentsList = studentsRes.data || []
      const trainersList = trainersRes.data || []

      setKpis({
        totalCentres: centresList.length,
        totalStudents: studentsList.length,
        totalTrainers: trainersList.length,
        averageAttendance: attAnalytics.overall_percentage || 0,
        averageCompliance: compOverview.average_score || 0,
        activeAnomalies: openAnomalies.length,
      })

      // Attendance Daily Trends
      setAttendanceData(attAnalytics.daily_trends || [])
      setLowAttendanceStudents(attAnalytics.low_attendance_students || [])

      // Centre Compliance Bar Chart
      const compScores = (compOverview.all_scores || []).map(s => ({
        name: s.centre_name?.split(' ')[0] || s.centre_id.slice(0, 5),
        overall: s.overall_score,
        attendance: s.attendance_score,
        infrastructure: s.infrastructure_score
      }))
      setComplianceData(compScores)

      // Category breakdown for pie
      const cats = attAnalytics.category_breakdown || {}
      setCategoryBreakdown([
        { name: 'Present', value: cats.present || 0 },
        { name: 'Absent', value: cats.absent || 0 },
        { name: 'Late', value: cats.late || 0 },
        { name: 'Excused', value: cats.excused || 0 },
      ])

      setRecentAnomalies(openAnomalies.slice(0, 5))
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time performance metrics and AI compliance insights across training centres.
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
              <option key={c.id} value={c.id}>
                {c.name} ({c.centre_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Centres */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Centres</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-primary-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.totalCentres}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-2">Active</span>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Students</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.totalStudents}</span>
            <span className="text-[11px] text-slate-500 ml-2">Enrolled</span>
          </div>
        </div>

        {/* Total Trainers */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Trainers</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.totalTrainers}</span>
            <span className="text-[11px] text-emerald-600 font-medium ml-2">Assigned</span>
          </div>
        </div>

        {/* Average Attendance */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg Attendance</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.averageAttendance}%</span>
            <span className={`text-[11px] font-medium ml-2 ${kpis.averageAttendance >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {kpis.averageAttendance >= 75 ? 'Compliant' : 'Warning'}
            </span>
          </div>
        </div>

        {/* Average Compliance Score */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Compliance Index</span>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{kpis.averageCompliance}</span>
            <span className="text-[11px] text-slate-500 ml-1">/ 100</span>
          </div>
        </div>

        {/* Active Anomalies */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Anomalies</span>
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis.activeAnomalies}</span>
            <span className="text-[11px] text-red-500 font-medium ml-2">Needs Audit</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Line Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Timeline Trends</h3>
              <p className="text-xs text-slate-500">Daily cohort attendance % over active academic cycle</p>
            </div>
            <Link to="/attendance/analytics" className="text-xs text-primary-600 font-semibold hover:underline flex items-center">
              Detailed Analytics <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date_str" tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} stroke="#94A3B8" />
                <Tooltip />
                <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Distribution</h3>
            <p className="text-xs text-slate-500">Breakdown of recorded statuses</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend textAnchor="middle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Centre-wise Compliance Comparison Bar Chart */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Centre Compliance Benchmarks</h3>
            <p className="text-xs text-slate-500">Multi-factor composite scoring comparison across centres</p>
          </div>
          <Link to="/compliance" className="text-xs text-primary-600 font-semibold hover:underline flex items-center">
            Compliance Engine <ChevronRight className="h-3 w-3 ml-0.5" />
          </Link>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complianceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="overall" name="Overall Compliance" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="attendance" name="Attendance Factor" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="infrastructure" name="Infrastructure Score" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lower Widgets: Critical Anomalies & Low Attendance Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Anomalies Widget */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              Active Irregularities & Anomalies
            </h3>
            <Link to="/anomalies" className="text-xs text-primary-600 font-semibold hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentAnomalies.length > 0 ? (
              recentAnomalies.map((anom) => (
                <div key={anom.id} className="py-3 flex items-start justify-between">
                  <div className="pr-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        anom.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                        anom.severity === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {anom.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {anom.category.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {anom.description}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {anom.anomaly_date}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No open anomalies detected across training centres.
              </div>
            )}
          </div>
        </div>

        {/* Low Attendance Students Watchlist */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <Users className="h-4 w-4 text-amber-500 mr-2" />
              Low Attendance Watchlist (&lt;75%)
            </h3>
            <Link to="/students" className="text-xs text-primary-600 font-semibold hover:underline">
              Student Directory
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lowAttendanceStudents.slice(0, 5).map((stu) => (
              <div key={stu.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {stu.name} <span className="text-slate-400 font-normal">({stu.student_id})</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {stu.course} • Batch {stu.batch}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${stu.attendance_rate < 60 ? 'text-red-600' : 'text-amber-600'}`}>
                    {stu.attendance_rate}%
                  </span>
                  <p className="text-[10px] text-slate-400">{stu.classes_attended}/{stu.total_classes} classes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
