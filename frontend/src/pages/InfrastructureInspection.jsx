import React, { useState, useEffect } from 'react'
import { infrastructureApi, centresApi } from '../services/api'
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Check,
  X,
  Building2,
  ShieldAlert,
  Info
} from 'lucide-react'

export default function InfrastructureInspection() {
  const [inspections, setInspections] = useState([])
  const [centres, setCentres] = useState([])
  const [selectedCentre, setSelectedCentre] = useState('')
  const [roomName, setRoomName] = useState('Computer Lab 101')
  const [remarks, setRemarks] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [activeInspection, setActiveInspection] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    centresApi.list().then(res => {
      setCentres(res.data)
      if (res.data.length > 0) setSelectedCentre(res.data[0].id)
    })
    fetchInspections()
  }, [])

  const fetchInspections = async () => {
    setLoading(true)
    try {
      const res = await infrastructureApi.listInspections()
      setInspections(res.data)
      if (res.data.length > 0 && !activeInspection) {
        setActiveInspection(res.data[0])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const f = e.target.files[0]
    if (f) {
      setImageFile(f)
      setImagePreview(URL.createObjectURL(f))
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!imageFile || !selectedCentre) {
      alert('Please choose a classroom image and target centre.')
      return
    }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', imageFile)
    fd.append('centre_id', selectedCentre)
    fd.append('room_name', roomName)
    if (remarks) fd.append('remarks', remarks)

    try {
      const res = await infrastructureApi.upload(fd)
      setActiveInspection(res.data)
      setImageFile(null)
      setImagePreview(null)
      fetchInspections()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to analyze classroom image.')
    } finally {
      setUploading(false)
    }
  }

  const handleVerifyFinding = async (findingId, newStatus) => {
    try {
      await infrastructureApi.verifyFinding(findingId, {
        verification_status: newStatus,
        inspector_notes: `Manual audit decision: ${newStatus}`
      })
      fetchInspections()
      if (activeInspection) {
        setActiveInspection(prev => ({
          ...prev,
          findings: prev.findings.map(f => f.id === findingId ? { ...f, verification_status: newStatus, human_verified: true } : f)
        }))
      }
    } catch (err) {
      alert('Failed to update verification status.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Classroom Infrastructure Compliance Audit
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          OpenCV-powered computer vision pipeline for automated facility detection and human auditor verification.
        </p>
      </div>

      {/* Upload & Active Inspection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Form (Left 5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
            <Camera className="h-4 w-4 text-primary-600 mr-2" />
            Upload Classroom Photograph
          </h2>

          <form onSubmit={handleUpload} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Target Centre</label>
              <select
                value={selectedCentre}
                onChange={(e) => setSelectedCentre(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              >
                {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Classroom / Lab Identification</label>
              <input
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Theory Hall 202 or IT Lab 1"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Inspector Remarks</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes regarding classroom inspection..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            {/* Photo Input */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
              <input
                type="file"
                id="infra-img"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="infra-img" className="cursor-pointer block">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-40 mx-auto object-cover rounded-lg shadow-sm" />
                ) : (
                  <div className="py-6">
                    <Camera className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-primary-600 hover:underline">
                      Click to choose classroom image
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">JPEG, PNG, WEBP up to 10MB</p>
                  </div>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!imageFile || uploading}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-primary-600/30 transition flex items-center justify-center space-x-2"
            >
              <span>{uploading ? 'Analyzing via OpenCV AI Engine...' : 'Run Automated Vision Audit'}</span>
            </button>
          </form>
        </div>

        {/* Active Inspection Results (Right 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeInspection ? activeInspection.room_name : 'No Inspection Selected'}
              </h3>
              <p className="text-xs text-slate-500">
                {activeInspection ? `Centre: ${activeInspection.centre_name || 'Assigned Centre'} • ${activeInspection.inspection_date}` : 'Select an inspection below'}
              </p>
            </div>
            {activeInspection && (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                activeInspection.overall_compliance_status === 'compliant' ? 'bg-emerald-100 text-emerald-700' :
                activeInspection.overall_compliance_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {activeInspection.overall_compliance_status}
              </span>
            )}
          </div>

          {activeInspection ? (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start space-x-2">
                <Info className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                <span>
                  <b>Human Verification Rule:</b> Uncertain AI findings are kept pending. Confirm facilities physically present or reject erroneous detections.
                </span>
              </div>

              {/* Findings Checklist */}
              <div className="space-y-2.5">
                {(activeInspection.findings || []).map((finding) => (
                  <div
                    key={finding.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {finding.detected_label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Confidence: {finding.confidence_score ? `${(finding.confidence_score * 100).toFixed(0)}%` : 'Manual'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{finding.inspector_notes}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        finding.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        finding.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {finding.verification_status}
                      </span>

                      {finding.verification_status !== 'verified' && (
                        <button
                          onClick={() => handleVerifyFinding(finding.id, 'verified')}
                          title="Confirm Verified"
                          className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {finding.verification_status !== 'rejected' && (
                        <button
                          onClick={() => handleVerifyFinding(finding.id, 'rejected')}
                          title="Reject Finding"
                          className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              Upload an image or select an inspection from the ledger.
            </div>
          )}
        </div>
      </div>

      {/* Historical Inspections Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inspection Ledger & Archival History</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {inspections.map((ins) => (
            <div
              key={ins.id}
              onClick={() => setActiveInspection(ins)}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{ins.room_name}</p>
                <p className="text-[11px] text-slate-500">{ins.centre_name} • Inspected on {ins.inspection_date}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  ins.overall_compliance_status === 'compliant' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {ins.overall_compliance_status}
                </span>
                <span className="text-xs text-primary-600 font-semibold">Inspect &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
