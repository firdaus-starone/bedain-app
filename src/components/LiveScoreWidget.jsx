"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { mockMatchData } from '../data/mockMatchData';
import { isMobileDevice } from '../lib/shareHelper';
import './LiveScoreWidget.css';

function LiveScoreWidget() {
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    const docRef = doc(db, 'live_matches', 'current');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLiveData(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, []);

  const match = liveData ? {
    ...mockMatchData,
    league: liveData.league,
    status: liveData.status,
    minute: liveData.minute,
    homeTeam: {
      ...mockMatchData.homeTeam,
      name: liveData.homeTeam.name,
      shortName: liveData.homeTeam.shortName || liveData.homeTeam.name.substring(0,3).toUpperCase(),
      score: liveData.homeTeam.score,
      logo: liveData.homeTeam.logo
    },
    awayTeam: {
      ...mockMatchData.awayTeam,
      name: liveData.awayTeam.name,
      shortName: liveData.awayTeam.shortName || liveData.awayTeam.name.substring(0,3).toUpperCase(),
      score: liveData.awayTeam.score,
      logo: liveData.awayTeam.logo
    }
  } : mockMatchData;

  const handleShare = async () => {
    const shareText = `LIVE SCORE: ${match.homeTeam.name} ${match.homeTeam.score} - ${match.awayTeam.score} ${match.awayTeam.name} (Menit ${match.minute}'). Ikuti jalannya pertandingan di Bedain News Match Center!`;
    const shareUrl = window.location.origin + '/match-center';
    
    if (isMobileDevice() && navigator.share) {
      try {
        await navigator.share({
          title: 'Live Score Bedain News',
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Teks skor berhasil disalin! Silakan paste di medsos kawan.');
    }
  };

  return (
    <div className="live-score-widget-compact">
      <div className="lswc-content">
        <div className="lswc-status">
          <span className="live-pulse"></span>
          <span className="live-text">LIVE</span>
          <span className="live-minute">{match.minute}'</span>
        </div>
        
        <div className="lswc-teams">
          <div className="lswc-team lswc-home">
            <span className="lswc-name">{match.homeTeam.shortName}</span>
            <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="lswc-logo" />
          </div>
          
          <div className="lswc-score">
            {match.homeTeam.score} - {match.awayTeam.score}
          </div>
          
          <div className="lswc-team lswc-away">
            <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="lswc-logo" />
            <span className="lswc-name">{match.awayTeam.shortName}</span>
          </div>
        </div>

        <div className="lswc-action" style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleShare} className="lswc-share-btn" title="Bagikan Skor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-tertiary, #334155)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'var(--color-bg-tertiary, #334155)'}>
            <Share2 size={18} />
          </button>
          <Link href="/match-center" className="lswc-btn">Match Center</Link>
        </div>
      </div>
    </div>
  );
}

export default LiveScoreWidget;
