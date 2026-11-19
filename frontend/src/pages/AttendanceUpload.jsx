import React, { useState, useEffect } from 'react'
import { attendanceApi, centresApi } from '../services/api'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  Building2,
  ArrowRight
} from 'lucide-react'

export default function AttendanceUpload() {
  const [file, setFile] = useState(null)
  const [centreId, setCentreId] = useState('')
  const [centres, setCentres] = useState([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    centresApi.list().then(res => {
      setCentres(res.data)
      if (res.data.length > 0) {
        setCentreId(res.data[0].id)
      }
    })
  }, [])

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase()
      if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        setError('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.')
        setFile(null)
        return
      }
      if (selected.size > 15 * 1024 * 1024) {
        setError('File exceeds the 15MB size limit.')
        setFile(null)
        return
      }
      setError('')
      setFile(selected)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !centreId) {
      setError('Please select both a training centre and a valid attendance file.')
      return
    }

    setUploading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('centre_id', centreId)

    try {
      const res = await attendanceApi.upload(formData)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Attendance upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Attendance Data Ingestion Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Upload periodic biometric ledgers, Excel sheets, or CSV rosters to update records and trigger AI anomaly detection.
        </p>
      </div>

      {/* Main Upload Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleUpload} className="space-y-6">
          {/* Centre Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Destination Training Centre
            </label>
            <select
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            >
              {centres.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.centre_code}) - {c.district}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Area */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 rounded-2xl p-8 text-center transition bg-slate-50 dark:bg-slate-950/40">
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-primary-600 flex items-center justify-center mb-3">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Click to select or drag and drop attendance document'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports CSV, XLSX, or XLS (Max 15MB)
              </p>
              {file && (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                  <span>Ready for parsing ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </label>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400 flex items-center space-x-1">
              <Info className="h-3.5 w-3.5" />
              <span>Files automatically archived to private Supabase <code>attendance-files</code> bucket</span>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-primary-600/30 transition flex items-center space-x-2"
            >
              <span>{uploading ? 'Processing & Auditing...' : 'Ingest Attendance File'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Results Card */}
      {result && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Processing & Audit Completed Successfully
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">{result.message}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Rows</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">{result.total_records}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
              <p className="text-[10px] text-emerald-600 font-semibold uppercase">Inserted Records</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{result.inserted_records}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Duplicates Skipped</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{result.duplicate_records}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-center">
              <p className="text-[10px] text-amber-600 font-semibold uppercase">AI Anomalies Flagged</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">{result.anomalies_detected}</p>
            </div>
          </div>

          {result.unknown_students && result.unknown_students.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <p className="font-bold mb-1">Unrecognized Student IDs in uploaded batch:</p>
              <p className="text-[11px]">{result.unknown_students.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
