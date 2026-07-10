import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import AdminContentPage from './pages/AdminContentPage';
import CandidateTranscriptPage from './pages/admin/CandidateTranscriptPage';

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee] text-gray-900">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 animate-pulse">Loading Panel...</div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Admin Protected Routes */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <AdminContentPage />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-content" element={
            <ProtectedRoute role="admin">
              <AdminContentPage />
            </ProtectedRoute>
          } />
          
          <Route path="/recruiter/admin-content" element={
            <ProtectedRoute role="admin">
              <AdminContentPage />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/transcript/:applicationId" element={
            <ProtectedRoute role="admin">
              <CandidateTranscriptPage />
            </ProtectedRoute>
          } />

          {/* Catch-all redirect to Admin Panel */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
