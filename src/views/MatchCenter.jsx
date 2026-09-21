import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { mockMatchData } from '../data/mockMatchData';
import './MatchCenter.css';

function MatchCenter() {
  const [activeTab, setActiveTab] = useState('commentary');
  const [liveData, setLiveData] = useState(null);
  
  // Use mock data as base, and override with live data if available
  const match = liveData ? {
    ...mockMatchData,
    league: liveData.league,
    status: liveData.status,
    minute: liveData.minute,
    homeTeam: {
      ...mockMatchData.homeTeam,
      name: liveData.homeTeam.name,
      score: liveData.homeTeam.score,
      logo: liveData.homeTeam.logo
    },
    awayTeam: {
      ...mockMatchData.awayTeam,
      name: liveData.awayTeam.name,
      score: liveData.awayTeam.score,
      logo: liveData.awayTeam.logo
    }
  } : mockMatchData;

  useEffect(() => {
    const docRef = doc(db, 'live_matches', 'current');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLiveData(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, []);

  const renderCommentary = () => {
    return (
      <div className="mc-commentary-list">
        {match.commentary.map((comm, idx) => (
          <div key={idx} className={`mc-comment-item ${comm.type}`}>
            <div className="mc-comment-minute">{comm.minute}'</div>
            <div className="mc-comment-icon">
              {comm.type === 'goal' && '⚽'}
              {comm.type === 'yellow-card' && '🟨'}
              {comm.type === 'red-card' && '🟥'}
              {comm.type === 'substitution' && '🔄'}
              {comm.type === 'info' && 'ℹ️'}
            </div>
            <div className="mc-comment-text">{comm.text}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="match-center-page">
      <div className="mc-header-bg">
        <div className="container mc-scoreboard-container">
          <div className="mc-league">{match.league}</div>
          <div className="mc-venue">📍 {match.venue}</div>
          
          <div className="mc-scoreboard">
            <div className="mc-team home-team">
              <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="mc-flag" />
              <h2 className="mc-team-name">{match.homeTeam.name}</h2>
              <div className="mc-scorers">
                {match.homeTeam.scorers.map((s, i) => <div key={i}>⚽ {s}</div>)}
              </div>
            </div>
            
            <div className="mc-score-center">
              <div className="mc-status-badge">
                <span className="live-dot"></span> {match.status}
              </div>
              <div className="mc-score">
                {match.homeTeam.score} - {match.awayTeam.score}
              </div>
              <div className="mc-minute">{match.minute}'</div>
            </div>
            
            <div className="mc-team away-team">
              <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="mc-flag" />
              <h2 className="mc-team-name">{match.awayTeam.name}</h2>
              <div className="mc-scorers">
                {match.awayTeam.scorers.map((s, i) => <div key={i}>⚽ {s}</div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mc-content">
        <div className="mc-tabs">
          <button 
            className={`mc-tab ${activeTab === 'commentary' ? 'active' : ''}`}
            onClick={() => setActiveTab('commentary')}
          >
            Live Commentary
          </button>
          <button 
            className={`mc-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistik
          </button>
          <button 
            className={`mc-tab ${activeTab === 'lineups' ? 'active' : ''}`}
            onClick={() => setActiveTab('lineups')}
          >
            Lineups
          </button>
        </div>
        
        <div className="mc-tab-content">
          {activeTab === 'commentary' && renderCommentary()}
          {activeTab === 'stats' && (
            <div className="mc-placeholder-content">
              <h3>Statistik Pertandingan</h3>
              <p>Fitur statistik akan segera hadir setelah integrasi API.</p>
            </div>
          )}
          {activeTab === 'lineups' && (
            <div className="mc-placeholder-content">
              <h3>Susunan Pemain</h3>
              <p>Formasi dan daftar pemain akan segera hadir.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchCenter;
