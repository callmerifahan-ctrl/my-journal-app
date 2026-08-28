import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import AudioRecorder from './AudioRecorder';
import SpeechToText from './SpeechToText';

const moodConfig = {
  '😊': { label: 'Senang', color: '#FFD97D', bg: '#FFF9E6' },
  '😐': { label: 'Netral', color: '#A0C4FF', bg: '#EBF2FF' },
  '😫': { label: 'Lelah', color: '#FFADAD', bg: '#FFE5E5' },
  '😴': { label: 'Ngantuk', color: '#BDB2FF', bg: '#F0EDFF' },
};

function getMoodSummaryData(journalList) {
  const counts = { '😊': 0, '😐': 0, '😫': 0, '😴': 0 };
  journalList.forEach((entry) => {
    if (counts[entry.mood] !== undefined) {
      counts[entry.mood]++;
    }
  });
  return Object.keys(counts).map((emoji) => ({
    mood: `${emoji} ${moodConfig[emoji].label}`,
    jumlah: counts[emoji],
  }));
}

// Fungsi Menghitung Daily Streak
function calculateStreak(journalList) {
  if (journalList.length === 0) return 0;
  
  // Ambil tanggal unik dari daftar jurnal
  const uniqueDates = Array.from(
    new Set(journalList.map(entry => new Date(entry.id).toDateString()))
  );

  let streak = 0;
  let today = new Date().toDateString();
  let yesterday = new Date(Date.now() - 86400000).toDateString();

  // Cek apakah ada jurnal hari ini atau kemarin
  if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
    return 0;
  }

  for (let i = 0; i < uniqueDates.length; i++) {
    const checkDate = new Date(Date.now() - (i * 86400000)).toDateString();
    if (uniqueDates.includes(checkDate)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function App() {
  const [audioBlob, setAudioBlob] = useState(null);
  const [activeTab, setActiveTab] = useState('write');
  const [selectedMood, setSelectedMood] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [brainDump, setBrainDump] = useState('');
  const [journalList, setJournalList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState('all');

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('journal_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('id', { ascending: false });

    if (error) console.error('Error fetching data:', error);
    else setJournalList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    localStorage.setItem('journal_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const theme = darkMode
    ? {
        bg: '#14121E', cardBg: '#1E1B2E', cardBorder: '#2D2842', text: '#F3EFEF',
        subtext: '#A39BB9', inputBg: '#181524', inputBorder: '#2D2842', accent: '#9D84B7'
      }
    : {
        bg: '#F8F6FC', cardBg: '#FFFFFF', cardBorder: '#EFEAF8', text: '#2D2738',
        subtext: '#8C829E', inputBg: '#FAFAFD', inputBorder: '#E4DCF3', accent: '#9D84B7'
      };

  const handleSave = async () => {
    if (!selectedMood && !gratitude && !brainDump && !audioBlob) {
      alert('Isi minimal satu kolom atau rekam suara dulu ya!');
      return;
    }

    let uploadedAudioUrl = null;

    if (audioBlob) {
      const fileName = `audio_${Date.now()}.webm`;
      const { error: storageError } = await supabase.storage
        .from('journal-audios')
        .upload(fileName, audioBlob, { contentType: 'audio/webm' });

      if (storageError) {
        alert('Gagal mengunggah audio: ' + storageError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('journal-audios')
        .getPublicUrl(fileName);

      uploadedAudioUrl = publicUrlData.publicUrl;
    }

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      mood: selectedMood,
      gratitude: gratitude,
      brain_dump: brainDump,
      audio_url: uploadedAudioUrl
    };

    const { error } = await supabase.from('journals').insert([newEntry]);

    if (error) {
      alert('Gagal menyimpan ke cloud: ' + error.message);
    } else {
      setJournalList([newEntry, ...journalList]);
      setSelectedMood('');
      setGratitude('');
      setBrainDump('');
      setAudioBlob(null);
      setActiveTab('history');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus jurnal ini?')) {
      const { error } = await supabase.from('journals').delete().eq('id', id);
      if (error) {
        alert('Gagal menghapus: ' + error.message);
      } else {
        setJournalList(journalList.filter((entry) => entry.id !== id));
      }
    }
  };

  // Fungsi Export Data ke File JSON
  const exportToJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(journalList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `journal_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Fungsi Cetak / Download PDF
  const exportToPdf = () => {
    window.print();
  };

  const filteredJournals = journalList.filter((entry) => {
    const matchesSearch = 
      (entry.gratitude && entry.gratitude.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.brain_dump && entry.brain_dump.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesMood = filterMood === 'all' || entry.mood === filterMood;

    return matchesSearch && matchesMood;
  });

  const chartData = getMoodSummaryData(journalList);
  const currentStreak = calculateStreak(journalList);

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, transition: 'all 0.3s ease', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '80px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>My Journal 🌸</h1>
            <p style={{ fontSize: '12px', color: theme.subtext, margin: '2px 0 0' }}>Cloud Connected ☁️</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* STREAK BADGE HEADER */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#FF7043' }}>
              🔥 {currentStreak} Hari
            </div>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                border: `1px solid ${theme.cardBorder}`, background: theme.cardBg,
                borderRadius: '50%', width: '40px', height: '40px', fontSize: '18px',
                cursor: 'pointer', color: theme.text
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* NAVIGASI TAB */}
        <div style={{ display: 'flex', background: theme.cardBg, padding: '4px', borderRadius: '14px', border: `1px solid ${theme.cardBorder}`, marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('write')}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              background: activeTab === 'write' ? theme.accent : 'transparent',
              color: activeTab === 'write' ? '#FFF' : theme.subtext
            }}
          >
            ✍️ Tulis Jurnal
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              background: activeTab === 'history' ? theme.accent : 'transparent',
              color: activeTab === 'history' ? '#FFF' : theme.subtext
            }}
          >    
            📚 Riwayat ({journalList.length})
          </button>
        </div>

        {/* TAB 1: FORM */}
        {activeTab === 'write' && (
          <div>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '12px', color: theme.subtext }}>
                GIMANA PERASAANMU?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {Object.keys(moodConfig).map((emoji) => {
                  const isSelected = selectedMood === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => setSelectedMood(emoji)}
                      style={{
                        padding: '12px 0', borderRadius: '12px',
                        border: isSelected ? `2px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`,
                        background: isSelected ? moodConfig[emoji].bg : theme.inputBg,
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <span style={{ fontSize: '26px' }}>{emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#333' : theme.subtext }}>
                        {moodConfig[emoji].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', color: theme.subtext }}>
                LATIHAN PUBLIC SPEAKING / AUDIO 🎙️
              </label>
              <AudioRecorder 
                theme={theme} 
                onRecordingComplete={(blob) => {
                  setAudioBlob(blob);
                }} 
              />
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: theme.subtext }}>
                HAL YANG DISYUKURI 🌿
              </label>
              <input
                type="text" value={gratitude} onChange={(e) => setGratitude(e.target.value)}
                placeholder="Hal kecil/besar yang bikin tersenyum..."
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: theme.subtext }}>
                  BRAIN DUMP / CURHATAN 💭
                </label>
                <SpeechToText 
                  theme={theme} 
                  onTranscriptChange={(text) => setBrainDump((prev) => prev ? `${prev} ${text}` : text)} 
                />
              </div>
              <textarea
                rows="4" value={brainDump} onChange={(e) => setBrainDump(e.target.value)}
                placeholder="Tumpahkan semua isi pikiranmu di sini..."
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleSave}
              style={{ width: '100%', padding: '15px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Simpan ke Cloud ✨
            </button>
          </div>
        )}

        {/* TAB 2: RIWAYAT */}
        {activeTab === 'history' && (
          <div>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: theme.subtext }}>ANALISIS MOOD 📊</h3>
                
                {/* TOMBOL EXPORT DATA */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={exportToJson} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${theme.cardBorder}`, background: theme.inputBg, color: theme.text, cursor: 'pointer' }}>
                    📦 Backup JSON
                  </button>
                  <button onClick={exportToPdf} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', border: `1px solid ${theme.cardBorder}`, background: theme.inputBg, color: theme.text, cursor: 'pointer' }}>
                    🖨️ Cetak PDF
                  </button>
                </div>
              </div>

              <div style={{ height: 220, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke={theme.cardBorder} />
                    <PolarAngleAxis dataKey="mood" stroke={theme.subtext} tick={{ fill: theme.text, fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="transparent" />
                    <Radar name="Mood" dataKey="jumlah" stroke={theme.accent} fill={theme.accent} fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="🔍 Cari catatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`,
                  background: theme.cardBg, color: theme.text, fontSize: '13px', outline: 'none'
                }}
              />
              <select
                value={filterMood}
                onChange={(e) => setFilterMood(e.target.value)}
                style={{
                  padding: '10px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`,
                  background: theme.cardBg, color: theme.text, fontSize: '13px', outline: 'none'
                }}
              >
                <option value="all">Semua Mood</option>
                {Object.keys(moodConfig).map((emoji) => (
                  <option key={emoji} value={emoji}>{emoji} {moodConfig[emoji].label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: theme.subtext }}>Memuat dari cloud...</p>
            ) : filteredJournals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: theme.subtext }}>
                <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📖</p>
                <p style={{ fontSize: '14px' }}>Tidak ada catatan yang cocok.</p>
              </div>
            ) : (
              filteredJournals.map((entry) => (
                <div key={entry.id} style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', color: theme.subtext, background: theme.inputBg, padding: '4px 8px', borderRadius: '6px' }}>
                      {entry.date} • {entry.time}
                    </span>
                    <button onClick={() => handleDelete(entry.id)} style={{ border: 'none', background: 'transparent', color: '#E57373', cursor: 'pointer', fontSize: '12px' }}>
                      🗑️ Hapus
                    </button>
                  </div>

                  {entry.mood && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: moodConfig[entry.mood]?.bg || theme.inputBg, padding: '4px 10px', borderRadius: '20px', marginBottom: '10px' }}>
                      <span>{entry.mood}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>{moodConfig[entry.mood]?.label}</span>
                    </div>
                  )}

                  {entry.gratitude && (
                    <p style={{ margin: '4px 0', fontSize: '13px', lineHeight: 1.5 }}>
                      <strong>🌿 Disyukuri:</strong> {entry.gratitude}
                    </p>
                  )}

                  {entry.brain_dump && (
                    <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5, color: theme.text }}>
                      <strong>💭 Catatan:</strong> {entry.brain_dump}
                    </p>
                  )}

                  {entry.audio_url && (
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ fontSize: '11px', color: theme.subtext, margin: '0 0 4px' }}>🎙️ Rekaman Suara:</p>
                      <audio src={entry.audio_url} controls style={{ width: '100%', height: '32px' }} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;