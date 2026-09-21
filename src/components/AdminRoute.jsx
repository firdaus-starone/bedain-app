"use client";
import React from 'react';
import { Navigate, Outlet } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import SEO from './SEO';
const AdminRoute = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="spinner"></div>
        <p>Memeriksa akses...</p>
      </div>
    );
  }

  // Jika belum login, tendang ke halaman login admin
  if (!currentUser) {
    return <Navigate to="/admin" replace />;
  }

  // Jika sudah login, render halaman anak (Dashboard, Editor, dll)
  return (
    <>
      <SEO title="Panel Admin" />
      <Outlet />
    </>
  );
};

export default AdminRoute;
