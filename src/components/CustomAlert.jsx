"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import './CustomAlert.css';

const CustomAlert = () => {
  const [alertData, setAlertData] = useState(null);

  const handleClose = useCallback(() => {
    setAlertData(null);
  }, []);

  useEffect(() => {
    // Override window.alert globally across the entire app
    window.alert = (message, title = null, type = null) => {
      const msgStr = typeof message === 'string' ? message : (message?.message || JSON.stringify(message));
      const lowerMsg = msgStr.toLowerCase();

      // Auto-detect type if not explicitly provided
      let detectedType = type;
      if (!detectedType) {
        if (
          lowerMsg.includes('berhasil') ||
          lowerMsg.includes('selamat') ||
          lowerMsg.includes('terima kasih') ||
          lowerMsg.includes('🎉') ||
          lowerMsg.includes('disalin') ||
          lowerMsg.includes('tersimpan') ||
          lowerMsg.includes('diberikan')
        ) {
          detectedType = 'success';
        } else if (
          lowerMsg.includes('gagal') ||
          lowerMsg.includes('error') ||
          lowerMsg.includes('maaf') ||
          lowerMsg.includes('ditolak') ||
          lowerMsg.includes('belum mendukung') ||
          lowerMsg.includes('tidak ditemukan') ||
          lowerMsg.includes('wajib diisi')
        ) {
          detectedType = 'error';
        } else {
          detectedType = 'info';
        }
      }

      // Auto-detect title based on type and message
      let detectedTitle = title;
      if (!detectedTitle) {
        if (detectedType === 'success') {
          detectedTitle = lowerMsg.includes('terima kasih') ? 'Terima Kasih!' : 'Berhasil!';
        } else if (detectedType === 'error') {
          detectedTitle = 'Perhatian';
        } else {
          detectedTitle = 'Notifikasi Bedain News';
        }
      }

      setAlertData({
        message: msgStr,
        title: detectedTitle,
        type: detectedType,
        timestamp: Date.now()
      });
    };

    // Also attach helper to window for explicit custom notifications
    window.showCustomAlert = window.alert;

    // Listen for Escape and Enter keys to close the alert
    const handleKeyDown = (e) => {
      if (alertData && (e.key === 'Escape' || e.key === 'Enter')) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertData, handleClose]);

  // Auto-close success/info toasts smoothly after 4.5 seconds
  useEffect(() => {
    if (!alertData) return;
    
    // We only auto-close success or info alerts so user has time to read errors
    if (alertData.type === 'success' || alertData.type === 'info') {
      const timer = setTimeout(() => {
        handleClose();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [alertData, handleClose]);

  if (!alertData) return null;

  return (
    <div className="custom-alert-overlay" onClick={handleClose}>
      <div className="custom-alert-card" onClick={(e) => e.stopPropagation()}>
        <div className={`custom-alert-icon-badge ${alertData.type}`}>
          {alertData.type === 'success' && <CheckCircle2 size={30} strokeWidth={2.2} />}
          {alertData.type === 'error' && <AlertCircle size={30} strokeWidth={2.2} />}
          {alertData.type === 'info' && <Bell size={30} strokeWidth={2.2} />}
        </div>

        <h3 className="custom-alert-title">{alertData.title}</h3>
        <p className="custom-alert-message">{alertData.message}</p>

        <button 
          type="button" 
          className="custom-alert-btn" 
          onClick={handleClose}
          autoFocus
        >
          Mengerti
        </button>

        {(alertData.type === 'success' || alertData.type === 'info') && (
          <div key={alertData.timestamp} className="custom-alert-progress-bar" />
        )}
      </div>
    </div>
  );
};

export default CustomAlert;
