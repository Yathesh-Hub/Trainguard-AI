import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { centresApi, complianceApi, reportsApi, infrastructureApi, anomaliesApi } from '../services/api'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Users,
  GraduationCap,
  FileDown,
  ShieldCheck,
  AlertTriangle,
  Camera,
  Layers,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react'

export default function CentreDetails() {
  const { id } = useParams()
  const [centre, setCentre] = useState(null)
  const [compliance, setCompliance] = useState(null)
  const [inspections, setInspections] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [downloadingReport, setDownloadingReport] = useState(false)

  useEffect(() => {
    fetchCentreData()
  }, [id])

  const fetchCentreData = async () => {
    setLoading(true)
    try {
      const [centreRes, compRes, inspRes, anomRes] = await Promise.all([
        centresApi.get(id),
        complianceApi.getCentre(id),
        infrastructureApi.listInspections({ centre_id: id }),
        anomaliesApi.list({ centre_id: id })
      ])
      setCentre(centreRes.data)
      setCompliance(compRes.data)
      setInspections(inspRes.data || [])
      setAnomalies(anomRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    setDownloadingReport(true)
    try {
      const res = await reportsApi.getCentreReport(id)
      if (res.data?.download_url) {
        window.open(res.data.download_url, '_blank')
      }
    } catch (err) {
      alert('Failed to generate report: ' + err.message)
    } finally {
      setDownloadingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-500">
        Loading centre audit information...
      </div>
    )
  }

  if (!centre) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-600">Training centre not found.</p>
        <Link to="/centres" className="text-xs text-primary-600 font-semibold hover:underline mt-2 inline-block">
          &larr; Return to Centres
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to="/centres" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          <span>Back to Training Centres</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {centre.centre_code}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              {centre.status}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {centre.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
            <span>{centre.address}, {centre.district}, {centre.state}</span>
          </p>

          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center">
              <User className="h-3.5 w-3.5 mr-1 text-slate-400" />
              {centre.contact_person}
            </span>
            <span className="flex items-center">
              <Phone className="h-3.5 w-3.5 mr-1 text-slate-400" />
              {centre.phone}
            </span>
            <span className="flex items-center">
              <Mail className="h-3.5 w-3.5 mr-1 text-slate-400" />
              {centre.email}
            </span>
          </div>
        </div>

        {/* Action Button & Compliance Badge */}
        <div className="flex flex-col items-end space-y-3">
          <div className="flex items-center space-x-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 px-4 py-2.5 rounded-xl">
            <ShieldCheck className="h-7 w-7 text-primary-600" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Compliance Index</p>
              <p className="text-xl font-extrabold text-primary-700 dark:text-primary-400">
                {compliance?.overall_score || 85.0} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={downloadingReport}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <FileDown className="h-4 w-4" />
            <span>{downloadingReport ? 'Building PDF...' : 'Download Audit PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex space-x-6 text-xs font-semibold">
        {['overview', 'batches', 'trainers', 'inspections', 'anomalies'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition relative ${
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {tab}
            {tab === 'anomalies' && anomalies.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-red-100 text-red-600 text-[10px] rounded-full font-bold">
                {anomalies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Factor Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Multi-Factor Score Analysis</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Student Attendance Score (Weight: 35%)</span>
                  <span className="font-bold">{compliance?.attendance_score || 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${compliance?.attendance_score || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Trainer Availability Score (Weight: 20%)</span>
                  <span className="font-bold">{compliance?.trainer_score || 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${compliance?.trainer_score || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Infrastructure Compliance Score (Weight: 30%)</span>
                  <span className="font-bold">{compliance?.infrastructure_score || 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${compliance?.infrastructure_score || 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Documentation Score (Weight: 15%)</span>
                  <span className="font-bold">{compliance?.documentation_score || 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${compliance?.documentation_score || 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Auditor Recommendations</h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              {compliance?.recommendations && compliance.recommendations.length > 0 ? (
                compliance.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-400">No active corrective recommendations.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3">Batch Code</th>
                <th className="p-3">Course Name</th>
                <th className="p-3">Schedule Timing</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(centre.batches || []).map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{b.batch_code}</td>
                  <td className="p-3">{b.course_name}</td>
                  <td className="p-3 text-slate-500">{b.timing}</td>
                  <td className="p-3 text-slate-500">{b.start_date} to {b.end_date}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'trainers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(centre.trainers || []).map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                  {t.name[0]}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.name}</h4>
                  <p className="text-[11px] text-slate-500">{t.subject}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                <p>Phone: {t.phone}</p>
                <p>Email: {t.email}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'inspections' && (
        <div className="space-y-4">
          {inspections.map((ins) => (
            <div key={ins.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ins.room_name}</h4>
                  <p className="text-xs text-slate-500">Inspected on {ins.inspection_date}</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  ins.overall_compliance_status === 'compliant' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {ins.overall_compliance_status}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{ins.remarks}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="space-y-3">
          {anomalies.map((an) => (
            <div key={an.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    an.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {an.severity}
                  </span>
                  <span className="text-xs font-semibold">{an.category.replace('_', ' ').toUpperCase()}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{an.description}</p>
              </div>
              <span className="text-[11px] font-bold uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                {an.review_status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
