import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Trash2, Save, Zap, Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const TEAM_LOGOS = [
  { name: 'Prancis', logo: 'https://media.api-sports.io/football/teams/2.png', code: 'FRA' },
  { name: 'Spanyol', logo: 'https://media.api-sports.io/football/teams/9.png', code: 'ESP' },
  { name: 'Inggris', logo: 'https://media.api-sports.io/football/teams/10.png', code: 'ENG' },
  { name: 'Argentina', logo: 'https://media.api-sports.io/football/teams/26.png', code: 'ARG' },
  { name: 'Brazil', logo: 'https://media.api-sports.io/football/teams/6.png', code: 'BRA' },
  { name: 'Jerman', logo: 'https://media.api-sports.io/football/teams/25.png', code: 'GER' },
  { name: 'Portugal', logo: 'https://media.api-sports.io/football/teams/27.png', code: 'POR' },
  { name: 'Belanda', logo: 'https://media.api-sports.io/football/teams/1118.png', code: 'NED' },
  { name: 'Kroasia', logo: 'https://media.api-sports.io/football/teams/3.png', code: 'CRO' },
  { name: 'Maroko', logo: 'https://media.api-sports.io/football/teams/1.png', code: 'MAR' },
  { name: 'Indonesia', logo: 'https://media.api-sports.io/football/teams/290.png', code: 'IDN' },
  { name: 'USA', logo: 'https://media.api-sports.io/football/teams/37.png', code: 'USA' },
];

const STATUS_OPTIONS = ['LIVE', 'HT', 'FT', 'BELUM MULAI', 'TUNDA'];

const defaultLive = {
  league: 'SEMIFINAL WORLD CUP 2026',
  status: 'LIVE',
  minute: 45,
  venue: 'Allianz Arena, Munich',
  homeTeam: { name: 'Prancis', shortName: 'FRA', score: 0, logo: 'https://media.api-sports.io/football/teams/2.png' },
  awayTeam: { name: 'Spanyol', shortName: 'ESP', score: 1, logo: 'https://media.api-sports.io/football/teams/9.png' },
};

const defaultScheduleMatch = () => ({
  id: `sch_${Date.now()}`,
  league: 'WORLD CUP 2026',
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  homeTeam: { name: 'TBD', shortName: 'TBD', logo: 'https://media.api-sports.io/football/teams/1.png' },
  awayTeam: { name: 'TBD', shortName: 'TBD', logo: 'https://media.api-sports.io/football/teams/1.png' },
});

function Toast({ message, type }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: type === 'success' ? '#16a34a' : '#dc2626',
      color: '#fff', padding: '14px 20px', borderRadius: '10px',
      display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.3)', fontWeight: 600,
      animation: 'slideInRight 0.3s ease'
    }}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {message}
    </div>
  );
}

export default function AdminMatchCenter() {
  const [liveForm, setLiveForm] = useState(defaultLive);
  const [schedule, setSchedule] = useState([]);
  const [saving, setSaving] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('live');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  // Load live data
  useEffect(() => {
    const docRef = doc(db, 'live_matches', 'current');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) setLiveForm(snap.data());
    });
    return () => unsub();
  }, []);

  // Load schedule
  useEffect(() => {
    const docRef = doc(db, 'live_matches', 'schedule');
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) setSchedule(snap.data().matches || []);
      else setSchedule([]);
    });
    return () => unsub();
  }, []);

  // Save live score
  const saveLive = async () => {
    setSaving('live');
    try {
      await setDoc(doc(db, 'live_matches', 'current'), liveForm);
      showToast('Live score berhasil diperbarui! Widget langsung sinkron.', 'success');
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, 'error');
    }
    setSaving('');
  };

  // Save schedule
  const saveSchedule = async () => {
    setSaving('schedule');
    try {
      await setDoc(doc(db, 'live_matches', 'schedule'), { matches: schedule });
      showToast('Jadwal pertandingan berhasil diperbarui!', 'success');
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message, 'error');
    }
    setSaving('');
  };

  const updateTeam = (side, field, value) => {
    const logo = TEAM_LOGOS.find(t => t.name === value)?.logo || liveForm[side].logo;
    const shortName = TEAM_LOGOS.find(t => t.name === value)?.code || value.substring(0, 3).toUpperCase();
    setLiveForm(prev => ({
      ...prev,
      [side]: {
        ...prev[side],
        [field]: value,
        ...(field === 'name' ? { logo, shortName } : {}),
      }
    }));
  };

  const addScheduleMatch = () => setSchedule(prev => [...prev, defaultScheduleMatch()]);

  const removeScheduleMatch = (id) => setSchedule(prev => prev.filter(m => m.id !== id));

  const updateScheduleMatch = (id, path, value) => {
    setSchedule(prev => prev.map(m => {
      if (m.id !== id) return m;
      const keys = path.split('.');
      if (keys.length === 1) return { ...m, [keys[0]]: value };
      return { ...m, [keys[0]]: { ...m[keys[0]], [keys[1]]: value } };
    }));
  };

  const updateScheduleTeam = (id, side, name) => {
    const found = TEAM_LOGOS.find(t => t.name === name);
    setSchedule(prev => prev.map(m => {
      if (m.id !== id) return m;
      return {
        ...m,
        [side]: {
          ...m[side],
          name,
          shortName: found?.code || name.substring(0, 3).toUpperCase(),
          logo: found?.logo || m[side].logo,
        }
      };
    }));
  };

  const sectionStyle = {
    background: '#1a1a22', borderRadius: '16px', padding: '28px',
    border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px'
  };
  const labelStyle = { fontSize: '12px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' };
  const inputStyle = { width: '100%', background: '#0d0d12', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  const selectStyle = { ...inputStyle };

  return (
    <div className="admin-layout">
            <main className="admin-main">
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(60px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .mc-tab-btn { padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s; }
          .mc-tab-btn.active { background: var(--color-accent, #e63946); color: #fff; }
          .mc-tab-btn:not(.active) { background: rgba(255,255,255,0.06); color: #aaa; }
          .mc-tab-btn:not(.active):hover { background: rgba(255,255,255,0.1); color: #fff; }
          .score-btn { width: 40px; height: 40px; border-radius: 8px; border: none; cursor: pointer; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: transform 0.1s; }
          .score-btn:active { transform: scale(0.9); }
          .score-btn.plus { background: #16a34a; color: #fff; }
          .score-btn.minus { background: #dc2626; color: #fff; }
          .schedule-card { background: #0d0d12; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
        `}</style>

        <Toast message={toast.message} type={toast.type} />

        <div style={{ padding: '32px 24px', maxWidth: '860px' }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: 0 }}>
              <Zap size={24} style={{ color: '#e63946', marginRight: '10px', verticalAlign: 'middle' }} />
              Match Center Admin
            </h1>
            <p style={{ color: '#aaa', marginTop: '6px', fontSize: '14px' }}>
              Update Live Score & Jadwal Pertandingan secara real-time
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <button className={`mc-tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
              <Zap size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Live Score
            </button>
            <button className={`mc-tab-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
              <Calendar size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Jadwal Pertandingan
            </button>
          </div>

          {/* ===== LIVE SCORE TAB ===== */}
          {activeTab === 'live' && (
            <>
              {/* Preview */}
              <div style={{ ...sectionStyle, background: '#0d0d12', borderColor: '#e63946' }}>
                <div style={{ fontSize: '11px', color: '#e63946', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Preview Live Widget</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <img src={liveForm.homeTeam.logo} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                    <div style={{ color: '#fff', fontWeight: 800, marginTop: '6px' }}>{liveForm.homeTeam.shortName}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e63946', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                      <span style={{ color: '#e63946', fontSize: '12px', fontWeight: 800 }}>{liveForm.status}</span>
                      <span style={{ color: '#aaa', fontSize: '12px' }}>{liveForm.minute}'</span>
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                      {liveForm.homeTeam.score} – {liveForm.awayTeam.score}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '12px', marginTop: '6px' }}>{liveForm.league}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <img src={liveForm.awayTeam.logo} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                    <div style={{ color: '#fff', fontWeight: 800, marginTop: '6px' }}>{liveForm.awayTeam.shortName}</div>
                  </div>
                </div>
              </div>

              {/* Info Umum */}
              <div style={sectionStyle}>
                <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 20px' }}>Info Pertandingan</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Nama Kompetisi/Liga</label>
                    <input style={inputStyle} value={liveForm.league} onChange={e => setLiveForm(p => ({ ...p, league: e.target.value }))} placeholder="SEMIFINAL WORLD CUP 2026" />
                  </div>
                  <div>
                    <label style={labelStyle}>Venue/Stadion</label>
                    <input style={inputStyle} value={liveForm.venue} onChange={e => setLiveForm(p => ({ ...p, venue: e.target.value }))} placeholder="Allianz Arena, Munich" />
                  </div>
                  <div>
                    <label style={labelStyle}>Status Pertandingan</label>
                    <select style={selectStyle} value={liveForm.status} onChange={e => setLiveForm(p => ({ ...p, status: e.target.value }))}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Menit</label>
                    <input style={inputStyle} type="number" min={0} max={120} value={liveForm.minute} onChange={e => setLiveForm(p => ({ ...p, minute: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              {/* Skor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Home */}
                <div style={sectionStyle}>
                  <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 16px' }}>Tim Tuan Rumah</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Pilih Tim</label>
                    <select style={selectStyle} value={liveForm.homeTeam.name} onChange={e => updateTeam('homeTeam', 'name', e.target.value)}>
                      {TEAM_LOGOS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      <option value={liveForm.homeTeam.name}>{liveForm.homeTeam.name} (custom)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Nama Manual</label>
                    <input style={inputStyle} value={liveForm.homeTeam.name} onChange={e => updateTeam('homeTeam', 'name', e.target.value)} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>URL Logo</label>
                    <input style={inputStyle} value={liveForm.homeTeam.logo} onChange={e => updateTeam('homeTeam', 'logo', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Skor</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button className="score-btn minus" onClick={() => updateTeam('homeTeam', 'score', Math.max(0, liveForm.homeTeam.score - 1))}>−</button>
                      <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', minWidth: '40px', textAlign: 'center' }}>{liveForm.homeTeam.score}</span>
                      <button className="score-btn plus" onClick={() => updateTeam('homeTeam', 'score', liveForm.homeTeam.score + 1)}>+</button>
                    </div>
                  </div>
                </div>

                {/* Away */}
                <div style={sectionStyle}>
                  <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 16px' }}>Tim Tamu</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Pilih Tim</label>
                    <select style={selectStyle} value={liveForm.awayTeam.name} onChange={e => updateTeam('awayTeam', 'name', e.target.value)}>
                      {TEAM_LOGOS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      <option value={liveForm.awayTeam.name}>{liveForm.awayTeam.name} (custom)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>Nama Manual</label>
                    <input style={inputStyle} value={liveForm.awayTeam.name} onChange={e => updateTeam('awayTeam', 'name', e.target.value)} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>URL Logo</label>
                    <input style={inputStyle} value={liveForm.awayTeam.logo} onChange={e => updateTeam('awayTeam', 'logo', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Skor</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button className="score-btn minus" onClick={() => updateTeam('awayTeam', 'score', Math.max(0, liveForm.awayTeam.score - 1))}>−</button>
                      <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', minWidth: '40px', textAlign: 'center' }}>{liveForm.awayTeam.score}</span>
                      <button className="score-btn plus" onClick={() => updateTeam('awayTeam', 'score', liveForm.awayTeam.score + 1)}>+</button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={saveLive}
                disabled={saving === 'live'}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e63946', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 800, cursor: saving === 'live' ? 'not-allowed' : 'pointer', opacity: saving === 'live' ? 0.7 : 1, transition: 'all 0.2s' }}
              >
                {saving === 'live' ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
                {saving === 'live' ? 'Menyimpan...' : 'Simpan & Update Live Score'}
              </button>
            </>
          )}

          {/* ===== SCHEDULE TAB ===== */}
          {activeTab === 'schedule' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>Jadwal Pertandingan</div>
                  <div style={{ color: '#aaa', fontSize: '13px' }}>{schedule.length} pertandingan tersimpan</div>
                </div>
                <button onClick={addScheduleMatch} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  <Plus size={16} /> Tambah Pertandingan
                </button>
              </div>

              {schedule.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
                  <Calendar size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div style={{ fontWeight: 700 }}>Belum ada jadwal tersimpan</div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>Klik "Tambah Pertandingan" untuk menambahkan jadwal.</div>
                </div>
              )}

              {schedule.map((match, idx) => (
                <div key={match.id} className="schedule-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ color: '#aaa', fontSize: '13px', fontWeight: 700 }}>Pertandingan #{idx + 1}</span>
                    <button onClick={() => removeScheduleMatch(match.id)} style={{ background: 'rgba(220,38,38,0.15)', color: '#ef4444', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={labelStyle}>Liga / Kompetisi</label>
                      <input style={inputStyle} value={match.league} onChange={e => updateScheduleMatch(match.id, 'league', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tanggal & Waktu</label>
                      <input style={inputStyle} type="datetime-local" value={match.date?.slice(0, 16) || ''} onChange={e => updateScheduleMatch(match.id, 'date', new Date(e.target.value).toISOString())} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Tim Tuan Rumah</label>
                      <select style={selectStyle} value={match.homeTeam.name} onChange={e => updateScheduleTeam(match.id, 'homeTeam', e.target.value)}>
                        {TEAM_LOGOS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        <option value="TBD">TBD</option>
                      </select>
                      <input style={{ ...inputStyle, marginTop: '8px' }} placeholder="Nama manual" value={match.homeTeam.name} onChange={e => updateScheduleTeam(match.id, 'homeTeam', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Tim Tamu</label>
                      <select style={selectStyle} value={match.awayTeam.name} onChange={e => updateScheduleTeam(match.id, 'awayTeam', e.target.value)}>
                        {TEAM_LOGOS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                        <option value="TBD">TBD</option>
                      </select>
                      <input style={{ ...inputStyle, marginTop: '8px' }} placeholder="Nama manual" value={match.awayTeam.name} onChange={e => updateScheduleTeam(match.id, 'awayTeam', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              {schedule.length > 0 && (
                <button
                  onClick={saveSchedule}
                  disabled={saving === 'schedule'}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e63946', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px 28px', fontSize: '15px', fontWeight: 800, cursor: saving === 'schedule' ? 'not-allowed' : 'pointer', opacity: saving === 'schedule' ? 0.7 : 1, marginTop: '8px', transition: 'all 0.2s' }}
                >
                  {saving === 'schedule' ? <RefreshCw size={18} /> : <Save size={18} />}
                  {saving === 'schedule' ? 'Menyimpan...' : 'Simpan Jadwal Pertandingan'}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
