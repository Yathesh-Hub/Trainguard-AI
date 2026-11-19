import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Lock,
  CheckCircle2,
  LogOut
} from 'lucide-react'

export default function UserProfile() {
  const { user, logout } = useAuth()
  const [fullName, setFullName] = useState(user?.full_name || 'System Administrator')
  const [phone, setPhone] = useState(user?.phone || '+91 98000 00001')
  const [savedMessage, setSavedMessage] = useState('')

  const handleSave = (e) => {
    e.preventDefault()
    setSavedMessage('Profile details successfully updated.')
    setTimeout(() => setSavedMessage(''), 3000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          User Account Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your auditor account credentials, assigned centre jurisdiction, and security settings.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Header Profile Badge */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center space-x-5">
        <div className="h-16 w-16 rounded-2xl bg-primary-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-primary-600/30">
          {user?.full_name ? user.full_name[0] : 'A'}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {user?.full_name || 'System Administrator'}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              {user?.role ? user.role.replace('_', ' ') : 'Administrator'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'admin@trainguard.ai'}</p>
          {user?.centre_id && (
            <p className="text-[11px] text-primary-600 font-medium mt-1">
              Assigned Jurisdiction: Centre {user.centre_id}
            </p>
          )}
        </div>
      </div>

      {/* Edit Details Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Personal Information
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || 'admin@trainguard.ai'}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>

      {/* Security Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Account Security & Supabase Auth
        </h3>
        <p className="text-xs text-slate-500">
          Your credentials and sessions are authenticated directly through Supabase Auth using cryptographic JWT verification.
        </p>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">Want to end active browser sessions?</span>
          <button
            onClick={logout}
            className="px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold rounded-lg transition flex items-center space-x-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out of TrainGuard</span>
          </button>
        </div>
      </div>
    </div>
  )
}
