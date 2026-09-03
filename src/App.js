import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import SpeechToText from './SpeechToText';

// ==========================================
// INTEGRASI GEMINI AI (PANGGIL VIA .ENV)
// ==========================================
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
  // STATE UI & FITUR LENGKAP
  const [mode, setMode] = useState('umum'); // 'umum' / 'islami'
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('jurnal');
  const [mood, setMood] = useState('Netral');
  const [topic, setTopic] = useState('#Umum');
  const [gratitude, setGratitude] = useState('');
  const [text, setText] = useState('');
  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // CHECKLIST KEBIASAAN HARIAN
  const [checklist, setChecklist] = useState({
    water: false,
    sleep: false,
    walk: false,
    read: false
  });

  const isIslami = mode === 'islami';
  const primaryColor = isIslami ? '#4E7D5B' : '#8A70AB';
  const bgColor = isDarkMode ? '#1B1927' : '#F4F5F9';
  const cardBg = isDarkMode ? '#252336' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#1B1927';
  const subTextColor = isDarkMode ? '#A0A0B0' : '#666666';

  useEffect(() => {
    fetchJournals();
  }, []);

  // FITUR HITUNG STREAK (🔥)
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

  const fetchJournals = async () => {
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setJournals(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    const fullContent = gratitude ? `[Hal Disyukuri]: ${gratitude}\n[Curhatan]: ${text}` : text;
    const aiResponse = await getAiInsight(fullContent, mode);

    const { error } = await supabase.from('journals').insert([
      {
        text: fullContent,
        mood: mood,
        mode: mode,
        category: topic,
        ai_insight: aiResponse
      }
    ]);

    if (!error) {
      setText('');
      setGratitude('');
      fetchJournals();
    }
    setIsLoading(false);
  };

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div style={{ backgroundColor: bgColor, color: textColor, minHeight: '100vh', padding: '20px 12px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* CSS RESPONSIVE GRID (HP: 1 Kolom, Laptop: 2 Kolom) */}
      <style>{`
        .app-container { max-width: 900px; margin: 0 auto; }
        .main-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 768px) { .main-grid { grid-template-columns: 1.1fr 0.9fr; } }
        .card { background-color: ${cardBg}; border-radius: 16px; padding: 16px; margin-bottom: 14px; }
        .badge { padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; border: none; cursor: pointer; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
      `}</style>

      <div className="app-container">
        
        {/* HEADER APLIKASI + STREAK 🔥 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>{isIslami ? '🕌' : '🌸'}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{isIslami ? "Jurnal Hati & Ta'ammul" : "Pikiran Berbicara"}</h2>
              <small style={{ color: subTextColor, fontSize: '0.75rem' }}>callmerifahan@gmail.com</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* FITUR STREAK API 🔥 */}
            <div style={{ backgroundColor: '#FF6B0022', color: '#FF6B00', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem' }}>
              🔥 {calculateStreak(journals)} Hari
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="badge" style={{ backgroundColor: cardBg, color: textColor }}>
              🌙 Dark
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

        {/* LAYOUT RESPONSIP HP VS LAPTOP */}
        <div className="main-grid">
          
          {/* KOLOM UTAMA (FORM & TOOLS) */}
          <div>
            
            {/* KEBIASAAN HARIAN */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                <span>✅ KEBIASAAN HARIAN (CHECKLIST Hari Ini)</span>
                <span style={{ color: subTextColor }}>{completedChecklistCount}/4 Done</span>
              </div>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'water', label: '💧 Minum 2L Air' },
                  { id: 'sleep', label: '😴 Tidur < Jam 11 Malam' },
                  { id: 'walk', label: '🚶 Jalan / Bergerak 15 Menit' },
                  { id: 'read', label: isIslami ? '📖 Membaca / Dzikir 10 Menit' : '📖 Membaca 10 Menit' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChecklist(p => ({ ...p, [item.id]: !p[item.id] }))}
                    className="badge"
                    style={{
                      backgroundColor: checklist[item.id] ? primaryColor : (isDarkMode ? '#1B1927' : '#EFEFEF'),
                      color: checklist[item.id] ? '#FFF' : textColor,
                      textAlign: 'left',
                      fontSize: '0.7rem'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* QUOTE HARIAN */}
            <div className="card" style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.85rem' }}>
              💡 {isIslami 
                ? '"Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya. (QS. Al-Baqarah: 286) 🌱"'
                : '"Perasaanmu valid, tidak perlu terburu-buru untuk baik-baik saja. ✨"'}
            </div>

            {/* SUARA LATAR & RELAKSASI */}
            <div className="card">
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, display: 'block', marginBottom: '8px' }}>🎧 SUARA LATAR & RELAKSASI:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="badge" style={{ backgroundColor: isDarkMode ? '#1B1927' : '#EFEFEF', color: textColor }}>🌧️ Hujan</button>
                <button className="badge" style={{ backgroundColor: isDarkMode ? '#1B1927' : '#EFEFEF', color: textColor }}>☕ Kafe</button>
                {isIslami && <button className="badge" style={{ backgroundColor: isDarkMode ? '#1B1927' : '#EFEFEF', color: textColor }}>📖 Murottal (QS. Ar-Rahman)</button>}
              </div>
            </div>

            {/* FITUR NAVIGATION TABS */}
            <div className="card grid-6" style={{ textAlign: 'center', fontSize: '0.7rem' }}>
              {[
                { id: 'jurnal', icon: '✍️', label: 'Jurnal' },
                { id: 'mind', icon: '🧘', label: 'Mind Gym' },
                { id: 'napas', icon: '🫁', label: 'Napas 4-7-8' },
                { id: 'surat', icon: '💌', label: 'Surat Diri' },
                { id: 'katarsis', icon: '🔥', label: 'Katarsis' },
                { id: 'analisis', icon: '📊', label: 'Analisis' }
              ].map(tab => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '10px',
                    backgroundColor: activeTab === tab.id ? primaryColor : 'transparent',
                    color: activeTab === tab.id ? '#FFF' : textColor,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '1rem' }}>{tab.icon}</div>
                  <div>{tab.label}</div>
                </div>
              ))}
            </div>

            {/* MOOD TRACKER (8 EMOJI) */}
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

            {/* TOPIK / KATEGORI */}
            <div className="card">
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, display: 'block', marginBottom: '8px' }}>TOPIK / KATEGORI 🏷️</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(isIslami 
                  ? ['#Ibadah', '#Rezeki', '#Ujian/Sabar', '#Keluarga', '#Hati/Jiwa', '#Umum'] 
                  : ['#Pekerjaan', '#Kuliah/Sekolah', '#Keluarga', '#Asmara', '#Self Care', '#Umum']
                ).map(t => (
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
            </div>

            {/* FORM JURNAL */}
            <form onSubmit={handleSubmit}>
              
              {/* HAL DISYUKURI */}
              <div className="card">
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                  {isIslami ? '🤲 Hal yang Di-Alhamdulillah-kan Hari Ini' : '🌿 Hal yang Disyukuri'}
                </label>
                <input
                  type="text"
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder={isIslami ? "Nikmat kecil/besar dari Allah yang dirasakan..." : "Hal kecil/besar yang bikin kamu tersenyum..."}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, boxSizing: 'border-box', fontSize: '0.8rem' }}
                />
              </div>

              {/* CURHATAN / BRAIN DUMP */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {isIslami ? '🕌 Curhat & Doa Murni ke Allah' : '💭 Curhatan / Brain Dump'}
                  </label>
                  <SpeechToText onResult={(t) => setText(p => p + ' ' + t)} />
                </div>
                <textarea
                  rows="4"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isIslami ? "Tumpahkan seluruh isi hati dan doamu di hadapan-Nya..." : "Tumpahkan semua isi pikiranmu di sini..."}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: isDarkMode ? '#1B1927' : '#F4F5F9', color: textColor, boxSizing: 'border-box', fontSize: '0.8rem' }}
                />
              </div>

              {/* TAMBAHKAN FOTO */}
              <div className="card">
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>TAMBAHKAN FOTO / KENANGAN 🖼️</label>
                <input type="file" style={{ fontSize: '0.75rem', color: subTextColor }} />
              </div>

              {/* REKAM SUARA LISAN */}
              <div className="card" style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>REKAM SUARA LISAN 🎙️</span>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>⏱️ Durasi: 00:00 / 01:00</div>
                <button type="button" className="badge" style={{ backgroundColor: '#FF5252', color: '#FFF', width: '100%', padding: '10px' }}>🎙️ Mulai Rekam</button>
              </div>

              {/* KAPSUL WAKTU */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>🔒 Kunci Sebagai Kapsul Waktu Masa Depan</span>
                <input type="checkbox" checked={isTimeCapsule} onChange={(e) => setIsTimeCapsule(e.target.checked)} />
              </div>

              {/* TOMBOL SIMPAN */}
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
                {isLoading ? 'Sedang Memproses AI...' : 'Simpan Refleksi ✨'}
              </button>
            </form>

          </div>

          {/* KOLOM KANAN (RIWAYAT JURNAL + IKON KALENDER 📅) */}
          <div>
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📚 Riwayat Catatan ({journals.length})
              </h3>

              {journals.length === 0 ? (
                <p style={{ color: subTextColor, fontSize: '0.8rem' }}>Belum ada catatan jurnal.</p>
              ) : (
                journals.map((item) => (
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
                    {/* TANGGALAN & IKON KALENDER 📅 */}
                    <div style={{ fontSize: '0.7rem', color: subTextColor, display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>📅 {new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span>{item.mood}</span>
                    </div>

                    <p style={{ fontSize: '0.8rem', margin: '4px 0', whiteSpace: 'pre-line' }}>{item.text}</p>

                    {/* AI INSIGHT */}
                    {item.ai_insight && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px',
                          backgroundColor: item.mode === 'islami' ? '#4E7D5B22' : '#8A70AB22',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: item.mode === 'islami' ? '#81C784' : '#B39DDB'
                        }}
                      >
                        <strong>{item.mode === 'islami' ? '🕌 Pesan Spiritual AI:' : '💡 Catatan Hangat AI:'}</strong>
          