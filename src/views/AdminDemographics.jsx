"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MapPin, ArrowLeft } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const AdminDemographics = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const q = query(collection(db, 'articles'));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setArticles(data);
      } catch (err) {
        console.error("Error fetching articles:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  const cityStatsFull = useMemo(() => {
    const map = {};
    let defaultSampleCities = {
      'Jakarta': 420,
      'Surabaya': 210,
      'Bandung': 180,
      'Medan': 150,
      'Makassar': 95,
      'Lainnya': 120
    };

    let hasRealCityData = false;
    articles.forEach(art => {
      if (art.cities && typeof art.cities === 'object') {
        Object.entries(art.cities).forEach(([city, count]) => {
          if (!map[city]) map[city] = 0;
          map[city] += Number(count) || 0;
          hasRealCityData = true;
        });
      }
    });

    const sourceMap = hasRealCityData ? map : defaultSampleCities;
    const totalCityViews = Object.values(sourceMap).reduce((acc, val) => acc + val, 0) || 1;

    return Object.entries(sourceMap)
      .map(([city, count]) => ({
        name: city,
        views: count,
        percentage: Math.round((count / totalCityViews) * 100)
      }))
      .sort((a, b) => b.views - a.views);
  }, [articles]);

  if (loading) {
    return <div className="admin-loading-screen"><div className="spinner"></div><p>Memuat Demografi...</p></div>;
  }

  return (
    <div className="admin-layout">
      <main className="admin-main" style={{ padding: '32px 40px', background: 'var(--admin-bg)', minHeight: '100vh' }}>
        
        <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <Link href="/admin/dashboard" style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            width: '40px', height: '40px', borderRadius: '12px', 
            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-card-border)',
            color: 'var(--admin-text-primary)', textDecoration: 'none', transition: 'all 0.2s'
          }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} /> ANALITIK KOTA PENGUNJUNG
              </span>
            </div>
            <h1 className="admin-header-title" style={{ fontWeight: 800, color: 'var(--admin-text-primary)', margin: 0 }}>
              Semua Kota Pengunjung
            </h1>
          </div>
        </header>

        <div style={{
          background: 'var(--admin-card-bg)',
          border: '1px solid var(--admin-card-border)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '800px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {cityStatsFull.map((item, index) => (
              <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--admin-text-primary)' }}>
                    {index + 1}. {item.name}
                  </span>
                  <span style={{ color: 'var(--admin-text-secondary)', fontWeight: 700 }}>
                    {item.views.toLocaleString('id-ID')} <span style={{ opacity: 0.6 }}>({item.percentage}%)</span>
                  </span>
                </div>
                <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${item.percentage}%`,
                    height: '100%',
                    background: COLORS[index % COLORS.length] || '#3b82f6',
                    borderRadius: '6px'
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};

export default AdminDemographics;
