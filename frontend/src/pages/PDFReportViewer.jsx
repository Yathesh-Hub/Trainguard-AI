import React, { useState, useEffect } from 'react'
import { reportsApi, centresApi } from '../services/api'
import {
  FileText,
  FileDown,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Loader2
} from 'lucide-react'

export default function PDFReportViewer() {
  const [reportType, setReportType] = useState('centre')
  const [centres, setCentres] = useState([])
  const [selectedCentre, setSelectedCentre] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState(null)
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    centresApi.list().then(res => {
      setCentres(res.data)
      if (res.data.length > 0) setSelectedCentre(res.data[0].id)
    })
  }, [])

  const handleGenerate = async (e) => {
    e.preventDefault()
    setGenerating(true)
    setGeneratedUrl(null)

    try {
      let res
      if (reportType === 'centre') {
        res = await reportsApi.getCentreReport(selectedCentre)
      } else if (reportType === 'attendance') {
        res = await reportsApi.getAttendanceReport({ centre_id: selectedCentre || undefined })
      } else {
        res = await reportsApi.getMonthlyReport({ centre_id: selectedCentre || undefined })
      }

      setGeneratedUrl(res.data.download_url)
      setFileName(res.data.file_name)
    } catch (err) {
      alert('Failed to generate PDF: ' + (err.response?.data?.detail || err.message))
    } finally {
      setGenerating(false)
    }
  }

  const reportsList = [
    { id: 'centre', title: 'Individual Centre Compliance Audit Report', desc: 'Detailed multi-factor scores, identified anomalies, and recommendations for a single centre.' },
    { id: 'attendance', title: 'Student Attendance & Cohort Performance Audit', desc: 'Comprehensive attendance ledger, batch-level comparisons, and critical drop watchlist.' },
    { id: 'monthly', title: 'Overall Monthly Performance & Anomaly Digest', desc: 'Aggregated regional analysis covering trainers, infrastructure compliance, and audit trends.' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Official PDF Report Generation
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Generate formal audit documentation formatted for governmental compliance and institutional review using ReportLab.
        </p>
      </div>

      {/* Generator Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2">Select Report Category</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {reportsList.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setReportType(r.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    reportType === r.id
                      ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 ring-2 ring-primary-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className={`h-5 w-5 mb-2 ${reportType === r.id ? 'text-primary-600' : 'text-slate-400'}`} />
                  <h4 className="text-xs font-bold">{r.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Target Training Centre</label>
              <select
                value={selectedCentre}
                onChange={(e) => setSelectedCentre(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                {centres.map(c => <option key={c.id} value={c.id}>{c.name} ({c.centre_code})</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={generating}
                className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-primary-600/30 transition flex items-center justify-center space-x-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Compiling ReportLab Document...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    <span>Generate & Build PDF Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Generated Report Card & PDF Preview */}
      {generatedUrl && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {fileName}
                </h3>
                <p className="text-xs text-slate-500">Official document ready for archival or distribution.</p>
              </div>
            </div>

            <a
              href={generatedUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <FileDown className="h-4 w-4" />
              <span>Download PDF Document</span>
            </a>
          </div>

          {/* Embedded PDF Preview Frame */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 h-96">
            <iframe
              src={generatedUrl}
              title="PDF Report Preview"
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}
