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
  if (!GEMINI_API_KEY) return "AI sedang istirahat hari ini ✨";

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: mode === 'islami' ? promptIslami : promptUmum }] }]
        })
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("AI Timeout / Error:", error);
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
  
  const [mood, setMood] = useState('Netral');
  const [topic, setTopic] = useState('#Umum');
  const [gratitude, setGratitude] = useState('');
  const [text, setText] = useState('');
  
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

  const toggleAudio = (type) => {
    setActiveAudio(activeAudio === type ? null : type);
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
      if (!text.trim() && !gratitude.trim()) {
        alert('Mohon isi catatan jurnal atau hal yang disyukuri terlebih dahulu!');
        return;
      }
      fullContent = gratitude ? `[${activeContent.gratitudeLabel}]: ${gratitude}\n[${activeContent.journalLabel}]: ${text}` : text;
    }

    setIsLoading(true);

    try {
      const payload = {
        text: fullContent,
        brain_dump: fullContent,
        gratitude: gratitude,
        mood: recordMood,
        mode: mode,
        category: isIslami ? '#Ibadah' : topic,
        photo_url: Boolean(photoUrl)
      };

      if (editingId) {
        const { error } = await supabase
          .from('journals')
          .update(payload)
          .eq('id', editingId);

        if (error) alert("Gagal memperbarui: " + error.message);
      } else {
        const aiResponse = await getAiInsight(fullContent, mode);
        payload.ai_insight = aiResponse;
        payload.amalan = isIslami ? selectedSpiritualChecks : null;

        const { error } = await supabase.from('journals').insert([payload]);

        if (error) alert("Gagal menyimpan ke database: " + error.message);
      }

      setEditingId(null);
      setText('');
      setGratitude('');
      setDoaCatatanKhusus('');
      setSelectedSpiritualChecks([]);
      setPhotoUrl('');
      await fetchJournals();
      setShowHistory(true);
    } catch (err) {
      alert("Terjadi kesalahan sistem: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah kamu yakin ingin menghapus catatan ini?')) {
      const { error } = await supabase.from('journals').delete().eq('id', id);
      if (!error) fetchJournals();
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
    const itemText = (item.text || item.brain_dump || '').toLowerCase();
    const matchesSearch = itemText.includes(searchQuery.toLowerCase());
    const matchesMood = selectedMoodFilter === 'Semua' || item.mood === selectedMoodFilter;
    return matchesSearch && matchesMood;
  });

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;

  const moodCounts = journals.reduce((acc, curr) => {
    const m = curr.mood || 'Netral';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

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
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          touch-action: manipulation;
        }

        .app-container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 0 4px;
          overflow-x: hidden;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          width: 100%;
        }

        @media (min-width: 768px) {
          .main-grid { grid-template-columns: 1.1fr 0.9fr; }
        }

        .card {
          background-color: ${cardBg};
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 14px;
          width: 100%;
          box-sizing: border-box;
        }

        .badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          border: none;
          cursor: pointer;
        }

        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        
        .mobile-nav { display: block; }
        .desktop-nav { display: none; }

        @media (min-width: 768px) {
          .mobile-nav { display: none; }
          .desktop-nav { display: flex; gap: 8px; justify-content: space-between; }
        }
      `}</style>

      <div className="app-container">
        
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
              <option value="mind">🧘 Mind Gym</option>
              <option value="napas">🫁 Relaksasi Napas</option>
              <option value="katarsis">🔥 Ruang Katarsis</option>
              <option value="analisis">📊 Analisis & Diagram</option>
            </select>
          </div>

          <div className="desktop-nav">
            {[
              { id: 'jurnal', icon: '✍️', label: 'Jurnal' },
              { id: 'mind', icon: '🧘', label: 'Mind Gym' },
              { id: 'napas', icon: '🫁', label: 'Napas' },
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

        <div className="main-grid">
          <div>
            {activeTab === 'jurnal' && (
              <>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div>
                    <span>⏰ Pengingat: </span>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => {
                        setReminderTime(e.target.value);
                        localStorage.setItem('reminder_time', e.target.value);
                      }}
                      style={{ borderRadius: '6px', border: 'none', padding: '4px', backgroundColor: isDarkMode ? '#1B1927' : '#EFEFEF', color: textColor }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: subTextColor }}>v1.2 Active ✨</span>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    <span>✅ KEBIASAAN HARIAN</span>
                    <span style={{ color: subTextColor }}>{completedChecklistCount}/3 Done</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {activeContent.checklist ? activeContent.checklist.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setChecklist(p => ({ ...p, [item.id]: !p[item.id] }))}
                        className="badge"
                        style={{
                          backgroundColor: checklist[item.id] ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                          color: checklist[item.id] ? '#FFF' : textColor,
                          textAlign: 'left',
                          fontSize: '0.65rem',
                          padding: '6px 8px'
                        }}
                      >
                        {item.label}
                      </button>
                    )) : null}
                  </div>
                </div>

                <div className="card">
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, display: 'block', marginBottom: '8px' }}>🎧 SUARA LATAR & RELAKSASI:</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['🌧️ Hujan', '☕ Kafe', '🌊 Ombak'].map((audio) => (
                      <button
                        key={audio}
                        type="button"
                        onClick={() => toggleAudio(audio)}
                        className="badge"
                        style={{
                          backgroundColor: activeAudio === audio ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                          color: activeAudio === audio ? '#FFF' : textColor
                        }}
                      >
                        {activeAudio === audio ? `▶️ Memutar ${audio}` : audio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  💡 {activeContent.quote}
                </div>

                <form onSubmit={handleSubmit}>
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
                    <>
                      <div className="card">
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, display: 'block', marginBottom: '8px' }}>TOPIK / KATEGORI 🏷️</span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          {activeContent.topics.map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTopic(t)}
                              className="badge"
                              style={{
                                backgroundColor: topic === t ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                                color: topic === t ? '#FFF' : textColor
                              }}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
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

            {activeTab === 'katarsis' && (
              <div className="card">
                <h3>🔥 Ruang Katarsis (Pelepas Amarah)</h3>
                <textarea rows="4" value={burnText} onChange={(e) => setBurnText(e.target.value)} placeholder="Tumpahkan amarahmu..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, fontSize: '0.8rem' }} />
                <button type="button" onClick={() => { setBurnText(''); alert('Emosimu telah dibakar! 🔥'); }} className="badge" style={{ backgroundColor: '#FF5252', color: '#FFF', width: '100%', marginTop: '10px', padding: '10px' }}>
                  Bakar & Lepaskan 💥
                </button>
              </div>
            )}

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

                  <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px' }}>
                    {['Semua', 'Semangat', 'Senang', 'Lega', 'Netral', 'Sedih/Cemas'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMoodFilter(m)}
                        className="badge"
                        style={{
                          backgroundColor: selectedMoodFilter === m ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                          color: selectedMoodFilter === m ? '#FFF' : subTextColor,
                          fontSize: '0.65rem',
                          padding: '4px 8px'
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

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

                          <p style={{ fontSize: '0.8rem', margin: '4px 0', whiteSpace: 'pre-line' }}>{item.text || item.brain_dump}</p>

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