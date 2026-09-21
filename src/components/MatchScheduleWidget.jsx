"use client";
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './MatchScheduleWidget.css';

function MatchScheduleWidget() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'live_matches', 'schedule');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSchedule(data.matches || []);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching match schedule:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="schedule-widget-skeleton">Loading Schedule...</div>;
  }

  const displaySchedule = schedule.length > 0 ? schedule : [
    {
      id: "sch_2", league: "SEMIFINAL WORLD CUP 2026", date: "2026-07-14T19:00:00Z", timestamp: 1784055600,
      homeTeam: { name: "Inggris", shortName: "ENG", logo: "https://media.api-sports.io/football/teams/10.png" },
      awayTeam: { name: "Argentina", shortName: "ARG", logo: "https://media.api-sports.io/football/teams/26.png" }
    },
    {
      id: "sch_3", league: "FINAL WORLD CUP 2026", date: "2026-07-19T19:00:00Z", timestamp: 1784487600,
      homeTeam: { name: "TBD", shortName: "TBD", logo: "https://media.api-sports.io/football/teams/1.png" },
      awayTeam: { name: "TBD", shortName: "TBD", logo: "https://media.api-sports.io/football/teams/1.png" }
    }
  ];

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };
  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  return (
    <div className="match-schedule-widget">
      <div className="msw-header">
        <h4>UPCOMING MATCHES</h4>
      </div>
      <div className="msw-slider">
        {displaySchedule.map((match, idx) => (
          <div key={match.id || idx} className="msw-card">
            <div className="msw-league">{match.league}</div>
            <div className="msw-datetime">
              <span className="msw-date">{formatDate(match.date)}</span>
              <span className="msw-time">{formatTime(match.date)}</span>
            </div>
            <div className="msw-teams">
              <div className="msw-team">
                <img src={match.homeTeam.logo} alt={match.homeTeam.shortName} className="msw-logo" />
                <span className="msw-shortname">{match.homeTeam.shortName}</span>
              </div>
              <div className="msw-vs">VS</div>
              <div className="msw-team">
                <span className="msw-shortname">{match.awayTeam.shortName}</span>
                <img src={match.awayTeam.logo} alt={match.awayTeam.shortName} className="msw-logo" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MatchScheduleWidget;
