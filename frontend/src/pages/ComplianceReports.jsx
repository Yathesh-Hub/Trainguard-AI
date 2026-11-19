import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { complianceApi, centresApi } from '../services/api'
import {
  ShieldCheck,
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  FileDown,
  Layers,
  ChevronRight
} from 'lucide-react'

export default function ComplianceReports() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)

  // Configurable weights
  const [weights, setWeights] = useState({
    attendance: 35,
    trainer: 20,
    infrastructure: 30,
    documentation: 15
  })
  const [weightError, setWeightError] = useState('')

  useEffect(() => {
    fetchCompliance()
  }, [])

  const fetchCompliance = async () => {
    setLoading(true)
    try {
      const res = await complianceApi.getOverview()
      setOverview(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleWeightChange = (key, val) => {
    const num = parseFloat(val) || 0
    const newWeights = { ...weights, [key]: num }
    setWeights(newWeights)

    const sum = Object.values(newWeights).reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 100) > 0.01) {
      setWeightError(`Weights must total 100%. Current total: ${sum}%`)
    } else {
      setWeightError('')
    }
  }

  const handleRecalculate = async () => {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 100) > 0.01) {
      alert('Cannot recalculate: Weights must total exactly 100%.')
      return
    }

    setRecalculating(true)
    try {
      await complianceApi.recalculate({
        weights: {
          attendance: weights.attendance / 100.0,
          trainer: weights.trainer / 100.0,
          infrastructure: weights.infrastructure / 100.0,
          documentation: weights.documentation / 100.0
        }
      })
      await fetchCompliance()
    } catch (err) {
      alert('Recalculation error: ' + (err.response?.data?.detail || err.message))
    } finally {
      setRecalculating(false)
    }
  }

  const resetWeights = () => {
    setWeights({ attendance: 35, trainer: 20, infrastructure: 30, documentation: 15 })
    setWeightError('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Multi-Factor Compliance Scoring Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configurable weighting formula evaluating student attendance, trainer availability, facilities, and records.
        </p>
      </div>

      {/* Top Banner KPI Grid */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-slate-400 font-medium">Average Compliance Index</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{overview.average_score} / 100</p>
            <span className="text-[11px] text-emerald-600 font-medium">Across All Centres</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Excellent (90–100)</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{overview.category_counts?.excellent || 0}</p>
            <span className="text-[11px] text-slate-400">High performing</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Good (75–89)</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{overview.category_counts?.good || 0}</p>
            <span className="text-[11px] text-slate-400">Standard compliant</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs text-red-600 font-bold uppercase tracking-wider">Action Needed (&lt;75)</span>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {(overview.category_counts?.needs_improvement || 0) + (overview.category_counts?.critical || 0)}
            </p>
            <span className="text-[11px] text-red-500">Requires Audit</span>
          </div>
        </div>
      )}

      {/* Configurable Weight Sliders Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
              <Sliders className="h-4 w-4 text-primary-600 mr-2" />
              Evaluation Formula Weightings
            </h3>
            <p className="text-xs text-slate-500">
              Customize relative weights for evaluation criteria. Total must sum to 100%.
            </p>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={resetWeights}
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400"
            >
              Reset Defaults
            </button>
            <button
              onClick={handleRecalculate}
              disabled={recalculating || !!weightError}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              {recalculating ? 'Computing Multi-Factor Scores...' : 'Recalculate All Scores'}
            </button>
          </div>
        </div>

        {weightError && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium">
            {weightError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Attendance Factor</span>
              <span className="text-primary-600">{weights.attendance}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.attendance}
              onChange={(e) => handleWeightChange('attendance', e.target.value)}
              className="w-full accent-primary-600"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Trainer Availability</span>
              <span className="text-blue-600">{weights.trainer}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.trainer}
              onChange={(e) => handleWeightChange('trainer', e.target.value)}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Infrastructure</span>
              <span className="text-amber-600">{weights.infrastructure}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.infrastructure}
              onChange={(e) => handleWeightChange('infrastructure', e.target.value)}
              className="w-full accent-amber-600"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Documentation</span>
              <span className="text-purple-600">{weights.documentation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.documentation}
              onChange={(e) => handleWeightChange('documentation', e.target.value)}
              className="w-full accent-purple-600"
            />
          </div>
        </div>
      </div>

      {/* Centre Scores Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Centre Performance Ranking</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-3.5">Centre Name</th>
                <th className="p-3.5">Attendance</th>
                <th className="p-3.5">Trainers</th>
                <th className="p-3.5">Infrastructure</th>
                <th className="p-3.5">Documents</th>
                <th className="p-3.5">Overall Index</th>
                <th className="p-3.5">Previous</th>
                <th className="p-3.5">Audit Category</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(overview?.all_scores || []).map((sc) => (
                <tr key={sc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white">{sc.centre_name}</td>
                  <td className="p-3.5">{sc.attendance_score}%</td>
                  <td className="p-3.5">{sc.trainer_score}%</td>
                  <td className="p-3.5">{sc.infrastructure_score}%</td>
                  <td className="p-3.5">{sc.documentation_score}%</td>
                  <td className="p-3.5 font-extrabold text-primary-600 text-sm">
                    {sc.overall_score}
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {sc.previous_score ? `${sc.previous_score}` : 'N/A'}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      sc.compliance_category === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                      sc.compliance_category === 'good' ? 'bg-blue-100 text-blue-700' :
                      sc.compliance_category === 'needs_improvement' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {sc.compliance_category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <Link
                      to={`/centres/${sc.centre_id}`}
                      className="inline-flex items-center text-primary-600 font-semibold hover:underline"
                    >
                      <span>Audit View</span>
                      <ChevronRight className="h-3 w-3 ml-0.5" />
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
