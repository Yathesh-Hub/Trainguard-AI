import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

import DashboardLayout from './layouts/DashboardLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TrainingCentres from './pages/TrainingCentres'
import CentreDetails from './pages/CentreDetails'
import Students from './pages/Students'
import StudentDetails from './pages/StudentDetails'
import Trainers from './pages/Trainers'
import AttendanceUpload from './pages/AttendanceUpload'
import AttendanceAnalytics from './pages/AttendanceAnalytics'
import InfrastructureInspection from './pages/InfrastructureInspection'
import AnomalyDetection from './pages/AnomalyDetection'
import ComplianceReports from './pages/ComplianceReports'
import PDFReportViewer from './pages/PDFReportViewer'
import UserManagement from './pages/UserManagement'
import Settings from './pages/Settings'
import UserProfile from './pages/UserProfile'

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-xs text-slate-400">
        Authenticating TrainGuard session...
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/centres" element={<TrainingCentres />} />
            <Route path="/centres/:id" element={<CentreDetails />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:id" element={<StudentDetails />} />
            <Route path="/trainers" element={<Trainers />} />
            <Route path="/attendance/upload" element={<AttendanceUpload />} />
            <Route path="/attendance/analytics" element={<AttendanceAnalytics />} />
            <Route path="/infrastructure" element={<InfrastructureInspection />} />
            <Route path="/anomalies" element={<AnomalyDetection />} />
            <Route path="/compliance" element={<ComplianceReports />} />
            <Route path="/reports" element={<PDFReportViewer />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute adminOnly>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<UserProfile />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
