import React, { useState, useEffect } from 'react'
import { anomaliesApi, centresApi } from '../services/api'
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  FileText,
  ChevronDown,
  X
} from 'lucide-react'

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState([])
  const [centres, setCentres] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCentre, setSelectedCentre] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedAnomaly, setSelectedAnomaly] = useState(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState('under_review')
  const [reviewNotes, setReviewNotes] = useState('')

  useEffect(() => {
    centresApi.list().then(res => setCentres(res.data))
    fetchAnomalies()
  }, [selectedCentre, selectedSeverity, selectedStatus])

  const fetchAnomalies = async () => {
    setLoading(true)
    try {
      const res = await anomaliesApi.list({
        centre_id: selectedCentre || undefined,
        severity: selectedSeverity || undefined,
        review_status: selectedStatus || undefined
      })
      setAnomalies(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenReview = (anom) => {
    setSelectedAnomaly(anom)
    setReviewStatus(anom.review_status)
    setReviewNotes(anom.review_notes || '')
    setReviewModalOpen(true)
  }

  const handleSaveReview = async (e) => {
    e.preventDefault()
    if (!selectedAnomaly) return
    try {
      await anomaliesApi.updateStatus(selectedAnomaly.id, {
        review_status: reviewStatus,
        review_notes: reviewNotes
      })
      setReviewModalOpen(false)
      fetchAnomalies()
    } catch (err) {
      alert('Failed to update status.')
    }
  }

  const counts = {
    total: anomalies.length,
    critical: anomalies.filter(a => a.severity === 'critical').length,
    high: anomalies.filter(a => a.severity === 'high').length,
    open: anomalies.filter(a => a.review_status === 'open').length,
    resolved: anomalies.filter(a => a.review_status === 'resolved').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          AI-Based Anomaly & Irregularity Detector
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Unsupervised Isolation Forest and heuristic auditing engine flagging attendance drops, identical patterns, and faculty discrepancies.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">Total Flagged</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{counts.total}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-red-500 font-medium">Critical Severity</span>
          <p className="text-2xl font-bold text-red-600 mt-1">{counts.critical}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-amber-500 font-medium">High Severity</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.high}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-blue-500 font-medium">Open / Pending Review</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{counts.open}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-emerald-500 font-medium">Audited & Resolved</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.resolved}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedCentre}
          onChange={(e) => setSelectedCentre(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
        >
          <option value="">All Centres</option>
          {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
        >
          <option value="">All Review Statuses</option>
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>
      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        {anomalies.map((anom) => (
          <div
            key={anom.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  anom.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                  anom.severity === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {anom.severity}
                </span>

                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {anom.category.replace('_', ' ').toUpperCase()}
                </span>

                <span className="text-xs text-slate-400">• {anom.centre_name}</span>
                <span className="text-xs text-slate-400">• {anom.anomaly_date}</span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {anom.description}
              </p>

              {anom.evidence && Object.keys(anom.evidence).length > 0 && (
                <div className="inline-block mt-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  Evidence: {JSON.stringify(anom.evidence)}
                </div>
              )}

              {anom.review_notes && (
                <p className="text-[11px] text-slate-500 italic mt-1">
                  Auditor Note: {anom.review_notes}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <span className={`text-[11px] font-bold uppercase px-3 py-1 rounded-lg ${
                anom.review_status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                anom.review_status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                anom.review_status === 'false_positive' ? 'bg-slate-100 text-slate-600' :
                'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {anom.review_status.replace('_', ' ')}
              </span>

              <button
                onClick={() => handleOpenReview(anom)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-600 hover:bg-primary-100 transition"
              >
                Audit Action
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Review Status Modal */}
      {reviewModalOpen && selectedAnomaly && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Review Anomaly Status</h2>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{selectedAnomaly.description}</p>

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Set Audit Review Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="open">Open (Active Investigation)</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved (Corrective Action Taken)</option>
                  <option value="false_positive">False Positive (Explanation Verified)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Auditor Verification Notes</label>
                <textarea
                  rows={3}
                  required
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="State reason for resolution, interview outcome, or justification..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Submit Audit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
