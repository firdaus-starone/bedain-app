"use client";
import React, { useState, useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Bell, X } from 'lucide-react';
import './PushNotificationPrompt.css';

const PushNotificationPrompt = () => {
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show if supported, permission is default, and user hasn't dismissed it recently
    if (isSupported && permission === 'default') {
      const dismissed = localStorage.getItem('pushPromptDismissed');
      if (!dismissed) {
        // Delay showing prompt so it's not too aggressive
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, permission]);

  const handleSubscribe = async () => {
    const success = await requestPermission();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('pushPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="push-prompt-overlay">
      <div className="push-prompt-card">
        <button className="push-prompt-close" onClick={handleDismiss}>
          <X size={18} />
        </button>
        <div className="push-prompt-icon">
          <Bell size={24} />
        </div>
        <div className="push-prompt-content">
          <h3>Dapatkan Berita Terbaru!</h3>
          <p>Izinkan notifikasi agar tidak ketinggalan berita olahraga terpanas dari Bedain News.</p>
          <div className="push-prompt-actions">
            <button className="btn-later" onClick={handleDismiss}>Nanti Saja</button>
            <button className="btn-allow" onClick={handleSubscribe}>Izinkan Notifikasi</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
