import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import SpeechToText from './SpeechToText';

const contentByMode = {
  umum: {
    title: "Pikiran Berbicara",
    icon: "🌸",
    quote: '"Perasaanmu valid, tidak perlu terburu-buru untuk baik-baik saja. ✨"',
    checklist: [
      { id: 'water', label: '💧 Minum 2L Air' },
      { id: 'sleep', label: '😴 Tidur Cukup' },
      { id: 'read', label: '📖 Membaca 10 Menit' }
    ],
    topics: ['#Pekerjaan', '#Kuliah/Sekolah', '#Keluarga', '#Asmara', '#Self Care', '#Umum'],
    gratitudeLabel: '🌿 Hal yang Disyukuri',
    gratitudePlaceholder: 'Hal kecil/besar yang bikin kamu tersenyum...',
    journalLabel: '💭 Curhatan / Brain Dump',
    journalPlaceholder: 'Tumpahkan semua isi pikiranmu di sini...'
  },
  islami: {
    title: "Jurnal Hati & Mutaba'ah Yaumiyah",
    icon: "🕌",
    quote: '"Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram. (QS. Ar-Ra\'d: 28) 🌱"',
    checklistSpiritual: [
      { id: 'subuh', label: '🕌 Shalat Subuh' },
      { id: 'dzuhur', label: '🕌 Shalat Dzuhur' },
      { id: 'ashar', label: '🕌 Shalat Ashar' },
      { id: 'maghrib', label: '🕌 Shalat Maghrib' },
      { id: 'isya', label: '🕌 Shalat Isya' },
      { id: 'dhuha', label: '☀️ Shalat Dhuha / Sunnah' },
      { id: 'tahajud', label: '🌙 Tahajud / Qiyamul Lail' },
      { id: 'tilawah', label: '📖 Tilawah Al-Qur\'an' },
      { id: 'dzikir_pagi', label: '📿 Dzikir Pagi' },
      { id: 'dzikir_petang', label: '📿 Dzikir Petang' },
      { id: 'sedekah', label: '🤲 Sedekah Subuh / Harian' },
      { id: 'Haid', label: '🩸 Halangan' }
    ],
    kondisiHatiOptions: [
      '🤲 Alhamdulillah Tenang',
      '🌱 Butuh Bimbingan / Petunjuk',
      '🌧️ Sedang Diuji / Bersabar',
      '💔 Hati Gelisah / Cemas',
      '✨ Merasa Sangat Dekat dengan Allah'
    ]
  }
};

const moodScores = {
  'Semangat': 5, 'Senang': 5, 'Lega': 4, 'Netral': 3,
  'Lelah': 2, 'Sedih/Cemas': 1, 'Kesal': 1, 'Overthinking': 1
};

const moodIcons = {
  'Semangat': '🤩', 'Senang': '😊', 'Lega': '🤲', 'Netral': '😐',
  'Lelah': '😴', 'Sedih/Cemas': '😢', 'Kesal': '😡', 'Overthinking': '🤯'
};

async function getAiInsight(isiJurnal, mode) {
  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  const promptUmum = `
    Kamu adalah seorang teman & konselor psikologi yang sangat empatik dan hangat.
    Bacalah jurnal berikut, lalu berikan:
    1. Pesan validasi/penguatan yang hangat (maksimal 2 kalimat).
    2. Satu pertanyaan refleksi yang lembut.

    Isi Jurnal: "${isiJurnal}"
  `;

  const promptIslami = `
    Kamu adalah seorang pendamping spiritual yang penuh rasa empati, ketenangan, dan kebijaksanaan.
    Bacalah jurnal berikut, lalu berikan:
    1. Pesan penguatan spiritual dan pengingat kebaikan/pesan ketenangan iman (maksimal 2 kalimat).
    2. Satu doa singkat atau ayat/hadis/kata bijak islami yang relevan untuk menenangkan hati.

    Isi Jurnal: "${isiJurnal}"
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: mode === 'islami' ? promptIslami : promptUmum }] }]
        })
      }
    );

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gagal mengambil AI insight:", error);
    return null;
  }
}

function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const userPin = localStorage.getItem('app_pin') || '1234';

  const [mode, setMode] = useState('umum');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('jurnal');
  
  // STATE UMUM
  const [mood, setMood] = useState('Netral');
  const [topic, setTopic] = useState('#Umum');
  const [gratitude, setGratitude] = useState('');
  const [text, setText] = useState('');
  
  // STATE ISLAMI (MUTABA'AH YAUMIFAH & OPSI)
  const [selectedSpiritualChecks, setSelectedSpiritualChecks] = useState([]);
  const [selectedKondisiHati, setSelectedKondisiHati] = useState('🤲 Alhamdulillah Tenang');
  const [doaCatatanKhusus, setDoaCatatanKhusus] = useState('');

  const [photoUrl, setPhotoUrl] = useState('');
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState('Semua');
  const [activeAudio, setActiveAudio] = useState(null);

  const [reminderTime, setReminderTime] = useState(localStorage.getItem('reminder_time') || '20:00');
  const [showHistory, setShowHistory] = useState(true);

  const [breathPhase, setBreathPhase] = useState('Tekan Mulai untuk Latihan Napas');
  const [isBreathing, setIsBreathing] = useState(false);
  const [burnText, setBurnText] = useState('');

  const [checklist, setChecklist] = useState({
    water: false,
    sleep: false,
    read: false
  });

  const activeContent = contentByMode[mode];
  const isIslami = mode === 'islami';
  const primaryColor = isIslami ? '#4E7D5B' : '#8A70AB';
  const bgColor = isDarkMode ? '#1B1927' : '#F4F5F9';
  const cardBg = isDarkMode ? '#252336' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#1B1927';
  const subTextColor = isDarkMode ? '#A0A0B0' : '#666666';

  const themeProps = { cardBorder: isDarkMode ? '#444' : '#CCC' };

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setJournals(data || []);
  };

  const handleLogout = () => {
    setIsLocked(true);
    setPinInput('');
  };

  const toggleSpiritualCheck = (id) => {
    if (selectedSpiritualChecks.includes(id)) {
      setSelectedSpiritualChecks(selectedSpiritualChecks.filter(item => item !== id));
    } else {
      setSelectedSpiritualChecks([...selectedSpiritualChecks, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let fullContent = '';
    let recordMood = mood;

    if (isIslami) {
      const completedList = contentByMode.islami.checklistSpiritual
        .filter(item => selectedSpiritualChecks.includes(item.id))
        .map(item => item.label)
        .join(', ');

      fullContent = `[ Mutaba'ah Yaumiyah ]: ${completedList || 'Belum ada opsi dicentang'}\n[ Kondisi Hati ]: ${selectedKondisiHati}`;
      if (doaCatatanKhusus.trim()) {
        fullContent += `\n[ Doa / Refleksi ]: ${doaCatatanKhusus}`;
      }
      recordMood = selectedKondisiHati.split(' ')[1] || 'Lega';
    } else {
      if (!text.trim()) return;
      fullContent = gratitude ? `[${activeContent.gratitudeLabel}]: ${gratitude}\n[${activeContent.journalLabel}]: ${text}` : text;
    }

    setIsLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from('journals')
        .update({
          text: fullContent,
          mood: recordMood,
          category: isIslami ? '#Ibadah' : topic,
          photo_url: photoUrl
        })
        .eq('id', editingId);

      if (!error) {
        setEditingId(null);
        setText('');
        setGratitude('');
        setDoaCatatanKhusus('');
        setPhotoUrl('');
        fetchJournals();
      }
    } else {
      const aiResponse = await getAiInsight(fullContent, mode);

      const { error } = await supabase.from('journals').insert([
        {
          text: fullContent,
          mood: recordMood,
          mode: mode,
          category: isIslami ? '#Ibadah' : topic,
          ai_insight: aiResponse,
          photo_url: photoUrl
        }
      ]);

      if (!error) {
        setText('');
        setGratitude('');
        setDoaCatatanKhusus('');
        setSelectedSpiritualChecks([]);
        setPhotoUrl('');
        fetchJournals();
        setShowHistory(true);
      }
    }
    setIsLoading(false);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setText(item.text);
    setMood(item.mood || 'Netral');
    setTopic(item.category || '#Umum');
    setPhotoUrl(item.photo_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah kamu yakin ingin menghapus catatan ini?')) {
      const { error } = await supabase.from('journals').delete().eq('id', id);
      if (!error) fetchJournals();
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === userPin) {
      setIsLocked(false);
      setPinInput('');
    } else {
      alert('PIN Salah! (PIN Default: 1234)');
    }
  };

  const calculateStreak = (data) => {
    if (!data || data.length === 0) return 0;
    const dates = [...new Set(data.map(item => new Date(item.created_at).toDateString()))];
    let currentStreak = 0;
    let checkDate = new Date();

    for (let i = 0; i < dates.length; i++) {
      const journalDate = new Date(dates[i]);
      const diffDays = Math.ceil(Math.abs(checkDate - journalDate) / (1000 * 60 * 60 * 24)) - 1;
      if (diffDays === 0 || (i === 0 && diffDays === 1)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else { break; }
    }
    return currentStreak;
  };

  const filteredJournals = journals.filter(item => {
    const itemText = item.text ? item.text.toLowerCase() : '';
    const matchesSearch = itemText.includes(searchQuery.toLowerCase());
    const matchesMood = selectedMoodFilter === 'Semua' || item.mood === selectedMoodFilter;
    return matchesSearch && matchesMood;
  });

  const photosList = journals.filter(item => item.photo_url);
  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;

  const moodCounts = journals.reduce((acc, curr) => {
    const m = curr.mood || 'Netral';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const topicCounts = journals.reduce((acc, curr) => {
    const t = curr.category || '#Umum';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const modeCounts = journals.reduce((acc, curr) => {
    const m = curr.mode || 'umum';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  const gratitudeLogsCount = journals.filter(item => {
    if (!item.text) return false;
    const lower = item.text.toLowerCase();
    return (
      lower.includes('disyukuri') ||
      lower.includes('alhamdulillah') ||
      lower.includes('syukur') ||
      lower.includes('terima kasih') ||
      lower.includes('nikmat')
    );
  }).length;

  const timelineJournals = [...journals].reverse().slice(-7);

  if (isLocked) {
    return (
      <div style={{ backgroundColor: '#1B1927', color: '#FFF', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: '#252336', padding: '30px', borderRadius: '20px', textAlign: 'center', maxWidth: '350px', width: '100%' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔒</div>
          <h2 style={{ margin: '0 0 10px 0' }}>Brankas Hati</h2>
          <p style={{ color: '#A0A0B0', fontSize: '0.85rem', marginBottom: '20px' }}>Masukkan PIN untuk mengakses jurnal privatmu</p>
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              maxLength="4"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN (Default: 1234)"
              style={{ width: '80%', padding: '12px', borderRadius: '10px', border: 'none', textAlign: 'center', fontSize: '1.2rem', marginBottom: '15px' }}
            />
            <br />
            <button type="submit" style={{ width: '85%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#8A70AB', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}>
              Buka Kunci
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: bgColor, color: textColor, minHeight: '100vh', padding: '20px 12px', fontFamily: 'system-ui, sans-serif' }}>
      
      <style>{`
        .app-container { max-width: 900px; margin: 0 auto; }
        .main-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 768px) { .main-grid { grid-template-columns: 1.1fr 0.9fr; } }
        .card { background-color: ${cardBg}; border-radius: 16px; padding: 16px; margin-bottom: 14px; }
        .badge { padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; border: none; cursor: pointer; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        
        .mobile-nav { display: block; }
        .desktop-nav { display: none; }

        @media (min-width: 768px) {
          .mobile-nav { display: none; }
          .desktop-nav { display: flex; gap: 8px; justify-content: space-between; }
        }
      `}</style>

      <div className="app-container">
        
        {/* HEADER DENGAN TOMBOL LOGOUT */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>{activeContent.icon}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{activeContent.title}</h2>
              <small style={{ color: subTextColor, fontSize: '0.75rem' }}>callmerifahan@gmail.com</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#FF6B0022', color: '#FF6B00', padding: '6px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.75rem' }}>
              🔥 {calculateStreak(journals)} Hari
            </div>
            <button onClick={handleLogout} className="badge" style={{ backgroundColor: '#FF5252', color: '#FFF', fontWeight: 'bold' }}>
              🚪 Log Out
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="badge" style={{ backgroundColor: cardBg, color: textColor }}>
              {isDarkMode ? '🌙' : '☀️'}
            </button>
          </div>
        </div>

        {/* MODE SWITCHER */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
          <button
            onClick={() => setMode('umum')}
            className="badge"
            style={{ backgroundColor: !isIslami ? '#8A70AB' : cardBg, color: '#fff', fontWeight: 'bold' }}
          >
            🌿 Mode Umum
          </button>
          <button
            onClick={() => setMode('islami')}
            className="badge"
            style={{ backgroundColor: isIslami ? '#4E7D5B' : cardBg, color: '#fff', fontWeight: 'bold' }}
          >
            🕌 Mode Islami
          </button>
        </div>

        {/* NAVBAR */}
        <div className="card" style={{ padding: '10px 14px' }}>
          <div className="mobile-nav">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${primaryColor}`,
                backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9',
                color: textColor,
                fontSize: '0.85rem',
                fontWeight: 'bold',
                outline: 'none'
              }}
            >
              <option value="jurnal">✍️ Jurnal</option>
              <option value="galeri">🖼️ Galeri Foto</option>
              <option value="mind">🧘 Mind Gym</option>
              <option value="napas">🫁 Relaksasi Napas</option>
              <option value="surat">💌 Surat Diri Masa Depan</option>
              <option value="katarsis">🔥 Ruang Katarsis</option>
              <option value="analisis">📊 Analisis & Diagram</option>
            </select>
          </div>

          <div className="desktop-nav">
            {[
              { id: 'jurnal', icon: '✍️', label: 'Jurnal' },
              { id: 'galeri', icon: '🖼️', label: 'Galeri' },
              { id: 'mind', icon: '🧘', label: 'Mind Gym' },
              { id: 'napas', icon: '🫁', label: 'Napas' },
              { id: 'surat', icon: '💌', label: 'Surat' },
              { id: 'katarsis', icon: '🔥', label: 'Katarsis' },
              { id: 'analisis', icon: '📊', label: 'Analisis' }
            ].map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  backgroundColor: activeTab === tab.id ? primaryColor : 'transparent',
                  color: activeTab === tab.id ? '#FFF' : textColor,
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  transition: '0.2s'
                }}
              >
                {tab.icon} {tab.label}
              </div>
            ))}
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="main-grid">
          <div>
            {/* 1. TAB JURNAL */}
            {activeTab === 'jurnal' && (
              <>
                <div className="card" style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  💡 {activeContent.quote}
                </div>

                <form onSubmit={handleSubmit}>
                  
                  {/* TAMPILAN MODE ISLAMI: FULL CHECKLIST & OPSI */}
                  {isIslami ? (
                    <>
                      <div className="card">
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: primaryColor }}>
                          📋 MUTABA'AH YAUMIFAH (OPSI IBADAH HARIAN)
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          {contentByMode.islami.checklistSpiritual.map(item => {
                            const isChecked = selectedSpiritualChecks.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleSpiritualCheck(item.id)}
                                style={{
                                  padding: '10px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  backgroundColor: isChecked ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                                  color: isChecked ? '#FFF' : textColor,
                                  fontSize: '0.75rem',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontWeight: isChecked ? 'bold' : 'normal'
                                }}
                              >
                                {isChecked ? '✅ ' : '▫️ '} {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="card">
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                          🌱 KONDISI HATI SAAT INI
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {contentByMode.islami.kondisiHatiOptions.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSelectedKondisiHati(opt)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: selectedKondisiHati === opt ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                                color: selectedKondisiHati === opt ? '#FFF' : textColor,
                                fontSize: '0.8rem',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontWeight: selectedKondisiHati === opt ? 'bold' : 'normal'
                              }}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="card">
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                          🤲 DOA / CATATAN KHUSUS (OPSIONAL)
                        </label>
                        <textarea
                          rows="3"
                          value={doaCatatanKhusus}
                          onChange={(e) => setDoaCatatanKhusus(e.target.value)}
                          placeholder="Tuliskan doa atau permohonan khusus hari ini..."
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, boxSizing: 'border-box', fontSize: '0.8rem' }}
                        />
                      </div>
                    </>
                  ) : (
                    
                    /* TAMPILAN MODE UMUM: PENGISIAN LENGKAP */
                    <>
                      <div className="card">
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, display: 'block', marginBottom: '10px' }}>BAGAIAMANA PERASAANMU SAAT INI?</span>
                        <div className="grid-4">
                          {[
                            { icon: '🤩', label: 'Semangat' }, { icon: '😊', label: 'Senang' },
                            { icon: '🤲', label: 'Lega' }, { icon: '😐', label: 'Netral' },
                            { icon: '😴', label: 'Lelah' }, { icon: '😢', label: 'Sedih/Cemas' },
                            { icon: '😡', label: 'Kesal' }, { icon: '🤯', label: 'Overthinking' }
                          ].map(m => (
                            <button
                              key={m.label}
                              type="button"
                              onClick={() => setMood(m.label)}
                              style={{
                                padding: '10px 4px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: mood === m.label ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                                color: mood === m.label ? '#FFF' : subTextColor,
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ fontSize: '1.2rem' }}>{m.icon}</div>
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="card">
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                          {activeContent.gratitudeLabel}
                        </label>
                        <input
                          type="text"
                          value={gratitude}
                          onChange={(e) => setGratitude(e.target.value)}
                          placeholder={activeContent.gratitudePlaceholder}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, boxSizing: 'border-box', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {activeContent.journalLabel}
                          </label>
                          <SpeechToText
                            onResult={(t) => setText(p => p + ' ' + t)}
                            theme={themeProps}
                          />
                        </div>
                        <textarea
                          rows="4"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder={activeContent.journalPlaceholder}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, boxSizing: 'border-box', fontSize: '0.8rem' }}
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: isLoading ? '#666' : primaryColor,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      marginBottom: '16px'
                    }}
                  >
                    {isLoading ? 'Sedang Memproses AI...' : (isIslami ? 'Simpan Mutaba\'ah & Doa 🤲' : 'Simpan Refleksi ✨')}
                  </button>
                </form>
              </>
            )}

            {/* 2. TAB GALERI */}
            {activeTab === 'galeri' && (
              <div className="card">
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>🖼️ Galeri Kenangan</h3>
                {photosList.length === 0 ? (
                  <p style={{ color: subTextColor, fontSize: '0.8rem' }}>Belum ada foto yang diunggah ke jurnal.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {photosList.map(item => (
                      <div key={item.id} style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9' }}>
                        <img src={item.photo_url} alt="Kenangan" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                        <div style={{ padding: '6px', fontSize: '0.65rem', color: subTextColor }}>
                          📅 {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. TAB MIND GYM */}
            {activeTab === 'mind' && (
              <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <h3>🧘 Mind Gym & Afirmasi Positif</h3>
                <blockquote style={{ fontStyle: 'italic', fontSize: '1rem', color: primaryColor, margin: '20px 0' }}>
                  {isIslami
                    ? '"Cukuplah Allah bagiku, tidak ada Tuhan selain Dia. Hanya kepada-Nya aku bertawakal."'
                    : '"Saya menghargai setiap proses kecil dalam hidup saya hari ini. Saya tenang dan cukup."'
                  }
                </blockquote>
              </div>
            )}

            {/* 4. TAB NAPAS */}
            {activeTab === 'napas' && (
              <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <h3>🫁 Teknik Relaksasi Napas 4-7-8</h3>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor, margin: '20px 0' }}>
                  {breathPhase}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBreathing(true);
                    setBreathPhase('Tarik Napas... (4 Detik)');
                    setTimeout(() => {
                      setBreathPhase('Tahan Napas... (7 Detik)');
                      setTimeout(() => {
                        setBreathPhase('Hembuskan... (8 Detik)');
                        setTimeout(() => {
                          setBreathPhase('Selesai ✨');
                          setIsBreathing(false);
                        }, 8000);
                      }, 7000);
                    }, 4000);
                  }}
                  disabled={isBreathing}
                  className="badge"
                  style={{ backgroundColor: primaryColor, color: '#FFF', padding: '12px 24px' }}
                >
                  {isBreathing ? 'Sedang Berjalan...' : 'Mulai Latihan Napas 🌬️'}
                </button>
              </div>
            )}

            {/* 5. TAB SURAT */}
            {activeTab === 'surat' && (
              <div className="card">
                <h3>💌 Surat Untuk Diri Masa Depan</h3>
                <textarea rows="5" placeholder="Hai diriku di masa depan..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, fontSize: '0.8rem' }} />
                <button className="badge" style={{ backgroundColor: primaryColor, color: '#FFF', width: '100%', marginTop: '10px', padding: '10px' }}>
                  Kirim ke Masa Depan ⏳
                </button>
              </div>
            )}

            {/* 6. TAB KATARSIS */}
            {activeTab === 'katarsis' && (
              <div className="card">
                <h3>🔥 Ruang Katarsis (Pelepas Amarah)</h3>
                <textarea rows="4" value={burnText} onChange={(e) => setBurnText(e.target.value)} placeholder="Tumpahkan amarahmu..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, fontSize: '0.8rem' }} />
                <button type="button" onClick={() => { setBurnText(''); alert('Emosimu telah dibakar! 🔥'); }} className="badge" style={{ backgroundColor: '#FF5252', color: '#FFF', width: '100%', marginTop: '10px', padding: '10px' }}>
                  Bakar & Lepaskan 💥
                </button>
              </div>
            )}

            {/* 7. TAB ANALISIS */}
            {activeTab === 'analisis' && (
              <div>
                <div className="card">
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>📊 Ringkasan Aktivitas</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                    <div style={{ backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', padding: '8px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: primaryColor }}>{journals.length}</div>
                      <small style={{ color: subTextColor, fontSize: '0.65rem' }}>Total Catatan</small>
                    </div>
                    <div style={{ backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', padding: '8px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FF6B00' }}>{calculateStreak(journals)} Hari</div>
                      <small style={{ color: subTextColor, fontSize: '0.65rem' }}>Streak Aktif</small>
                    </div>
                    <div style={{ backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', padding: '8px', borderRadius: '10px' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2196F3' }}>
                        {Object.keys(moodCounts).length}
                      </div>
                      <small style={{ color: subTextColor, fontSize: '0.65rem' }}>Variasi Mood</small>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>📈 Grafik Fluktuasi Emosi (7 Catatan Terakhir)</h3>
                  {timelineJournals.length === 0 ? (
                    <p style={{ color: subTextColor, fontSize: '0.8rem', textAlign: 'center' }}>Belum ada data jurnal.</p>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '140px', paddingTop: '20px' }}>
                      {timelineJournals.map((item) => {
                        const score = moodScores[item.mood] || 3;
                        const heightPercent = (score / 5) * 100;
                        const icon = moodIcons[item.mood] || '😐';
                        const dateStr = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                        return (
                          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <span style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{icon}</span>
                            <div style={{ width: '16px', height: '80px', backgroundColor: isDarkMode ? '#1B1927' : '#EFEFEF', borderRadius: '10px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: '100%',
                                  height: `${heightPercent}%`,
                                  backgroundColor: score >= 4 ? '#4CAF50' : (score === 3 ? primaryColor : '#FF5252'),
                                  borderRadius: '10px'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '0.6rem', color: subTextColor, marginTop: '6px' }}>{dateStr}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* KOLOM RIWAYAT JURNAL */}
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                  📚 Riwayat Catatan ({journals.length})
                </h3>
                <button onClick={() => setShowHistory(!showHistory)} className="badge" style={{ backgroundColor: isDarkMode ? '#1B1927' : '#EFEFEF', color: textColor, fontSize: '0.75rem' }}>
                  {showHistory ? '🙈 Sembunyikan' : '👁️ Tampilkan'}
                </button>
              </div>

              {showHistory && (
                <>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="🔍 Cari kata kunci..."
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, marginBottom: '8px', boxSizing: 'border-box', fontSize: '0.75rem' }}
                  />

                  <div>
                    {filteredJournals.length === 0 ? (
                      <p style={{ color: subTextColor, fontSize: '0.8rem' }}>Tidak ada catatan yang cocok.</p>
                    ) : (
                      filteredJournals.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: isDarkMode ? '#1B1927' : '#F8F9FA',
                            padding: '12px',
                            borderRadius: '10px',
                            marginBottom: '10px',
                            borderLeft: `4px solid ${item.mode === 'islami' ? '#4E7D5B' : '#8A70AB'}`
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', color: subTextColor, display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>📅 {new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            <span>{item.mood}</span>
                          </div>

                          <p style={{ fontSize: '0.8rem', margin: '4px 0', whiteSpace: 'pre-line' }}>{item.text}</p>

                          {item.ai_insight && (
                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: item.mode === 'islami' ? '#4E7D5B22' : '#8A70AB22', borderRadius: '6px', fontSize: '0.75rem', color: item.mode === 'islami' ? '#81C784' : '#B39DDB' }}>
                              <strong>{item.mode === 'islami' ? '🕌 Pesan Spiritual AI:' : '💡 Catatan Hangat AI:'}</strong>
                              <p style={{ margin: '2px 0 0 0', whiteSpace: 'pre-line' }}>{item.ai_insight}</p>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <button onClick={() => handleDelete(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#FF5252' }}>🗑️ Hapus</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;