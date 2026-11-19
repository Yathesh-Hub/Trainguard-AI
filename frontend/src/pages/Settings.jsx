import React from 'react'
import {
  Settings as SettingsIcon,
  Database,
  ShieldCheck,
  Server,
  HardDrive,
  Cpu,
  CheckCircle2,
  Lock
} from 'lucide-react'

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          System Architecture & Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configuration parameters for Supabase PostgreSQL, Storage buckets, and AI detection engines.
        </p>
      </div>

      {/* Supabase Connectivity Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Primary Database: Supabase PostgreSQL
            </h2>
            <p className="text-xs text-slate-500">Managed cloud PostgreSQL with native Row Level Security (RLS)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Supabase Auth Integration</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-1.5" />
              Connected via Supabase JWT
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Row Level Security (RLS)</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-1.5" />
              Active on 15 Database Tables
            </p>
          </div>
        </div>
      </div>

      {/* Storage Buckets Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-primary-600">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Supabase Storage Buckets
            </h2>
            <p className="text-xs text-slate-500">Private buckets with pre-signed URL time-bound access</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">attendance-files</span>
              <p className="text-[11px] text-slate-400">Stores CSV, XLSX, and XLS rosters (15MB Limit)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              Private
            </span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">infrastructure-images</span>
              <p className="text-[11px] text-slate-400">Classroom photos processed by OpenCV CV (10MB Limit)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              Private
            </span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200">reports</span>
              <p className="text-[11px] text-slate-400">ReportLab generated PDF audit certificates (20MB Limit)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              Private
            </span>
          </div>
        </div>
      </div>

      {/* AI Engine Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              AI / ML Inspection Pipelines
            </h2>
            <p className="text-xs text-slate-500">Autonomous processing modules running on backend</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <span className="font-bold text-slate-800 dark:text-slate-200">OpenCV Vision Inspector</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Contour analysis, HSV color masking, luminance measurement for 7 infrastructure facilities.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <span className="font-bold text-slate-800 dark:text-slate-200">Isolation Forest (Scikit-Learn)</span>
            <p className="text-[11px] text-slate-400 mt-1">
              Unsupervised anomaly detection for sudden attendance drops and bulk copy-paste patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
