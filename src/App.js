import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import SpeechToText from './SpeechToText';

// ==========================================
// 1. INTEGRASI GEMINI AI (SECURE API KEY)
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

  const promptFinal = mode === 'islami' ? promptIslami : promptUmum;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptFinal }] }]
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

// ==========================================
// 2. KOMPONEN UTAMA APP
// ==========================================
function App() {
  const [mode, setMode] = useState('umum'); // 'umum' atau 'islami'
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mood, setMood] = useState('Semangat');
  const [text, setText] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [category, setCategory] = useState('#Umum');
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streak, setStreak] = useState(0);

  // Styling Warna Tema
  const isIslami = mode === 'islami';
  const primaryColor = isIslami ? '#417D58' : '#8A70AB';
  const bgColor = isDarkMode ? '#171523' : '#F4F5F9';
  const cardBg = isDarkMode ? '#222034' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#171523';
  const subTextColor = isDarkMode ? '#A0A0B0' : '#666666';

  useEffect(() => {
    fetchJournals();
  }, []);

  // Hitung Streak Menulis Jurnal
  const calculateStreak = (data) => {
    if (!data || data.length === 0) return 0;
    const dates = [...new Set(data.map(item => new Date(item.created_at).toDateString()))];
    
    let currentStreak = 0;
    let checkDate = new Date();

    for (let i = 0; i < dates.length; i++) {
      const journalDate = new Date(dates[i]);
      const diffTime = Math.abs(checkDate - journalDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;

      if (diffDays === 0 || (i === 0 && diffDays === 1)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return currentStreak;
  };

  const fetchJournals = async () => {
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching journals:', error);
    } else {
      setJournals(data || []);
      setStreak(calculateStreak(data || []));
    }
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
        category: category,
        ai_insight: aiResponse
      }
    ]);

    if (error) {
      console.error('Error saving journal:', error);
      alert('Gagal menyimpan jurnal.');
    } else {
      setText('');
      setGratitude('');
      fetchJournals();
    }
    setIsLoading(false);
  };

  const handleSpeechResult = (transcript) => {
    setText((prev) => prev + ' ' + transcript);
  };

  return (
    <div style={{ backgroundColor: bgColor, color: textColor, minHeight: '100vh', padding: '20px 15px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* CSS RESPONSIVE GRID (HP: 1 Kolom, Laptop: 2 Kolom) */}
      <style>{`
        .app-container {
          max-width: 1000px;
          margin: 0 auto;
        }
        .main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 768px) {
          .main-grid {
            grid-template-columns: 1.2fr 0.8fr;
          }
        }
        .card {
          background-color: ${cardBg};
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 16px;
        }
        .btn-mode {
          padding: 8px 16px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          font-weight: bold;
          transition: 0.2s;
        }
      `}</style>

      <div className="app-container">
        
        {/* HEADER APLIKASI */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '2rem' }}>{isIslami ? '🕌' : '🌸'}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{isIslami ? "Jurnal Hati & Ta'ammul" : "Pikiran Berbicara"}</h2>
              <small style={{ color: subTextColor }}>callmerifahan@gmail.com</small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* FITUR STREAK 🔥 */}
            <div style={{ backgroundColor: '#FF6B0022', color: '#FF6B00', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              🔥 {streak} Hari
            </div>
            {/* DARK/LIGHT MODE TOGGLE */}
            <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ border: 'none', background: cardBg, color: textColor, padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}>
              {isDarkMode ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>

        {/* MODE SWITCHER */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          <button
            className="btn-mode"
            onClick={() => setMode('umum')}
            style={{ backgroundColor: !isIslami ? '#8A70AB' : cardBg, color: !isIslami ? '#fff' : subTextColor }}
          >
            🌿 Mode Umum
          </button>
          <button
            className="btn-mode"
            onClick={() => setMode('islami')}
            style={{ backgroundColor: isIslami ? '#417D58' : cardBg, color: isIslami ? '#fff' : subTextColor }}
          >
            🕌 Mode Islami
          </button>
        </div>

        {/* KONTEN UTAMA (LAYOUT GRID RESPONSIP) */}
        <div className="main-grid">
          
          {/* KOLOM KIRI: FORM INPUT JURNAL */}
          <div>
            
            {/* QUOTE HARIAN */}
            <div className="card" style={{ borderLeft: `4px solid ${primaryColor}` }}>
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.9rem' }}>
                {isIslami 
                  ? '"Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya. (QS. Al-Baqarah: 286) 🌱"'
                  : '"Perasaanmu valid, tidak perlu terburu-buru untuk baik-baik saja. ✨"'}
              </p>
            </div>

            {/* MOOD TRACKER */}
            <div className="card">
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: subTextColor }}>BAGAIAMANA PERASAANMU SAAT INI?</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                {['😊 Senang', '😐 Netral', '😢 Sedih', '😡 Kesal', '😴 Lelah', '🤯 Overthinking', '🔥 Semangat', '🤲 Lega'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: mood === m ? primaryColor : (isDarkMode ? '#1D1B2C' : '#EFEFEF'),
                      color: mood === m ? '#FFF' : textColor,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* FORM ISI JURNAL */}
            <form onSubmit={handleSubmit}>
              
              {/* HAL YANG DISYUKURI */}
              <div className="card">
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  {isIslami ? '🤲 Hal yang Di-Alhamdulillah-kan Hari Ini' : '🌿 Hal yang Disyukuri'}
                </label>
                <input
                  type="text"
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder={isIslami ? "Nikmat kecil/besar dari Allah yang dirasakan..." : "Hal kecil/besar yang bikin kamu tersenyum..."}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', backgroundColor: isDarkMode ? '#171523' : '#FFF', color: textColor, boxSizing: 'border-width' }}
                />
              </div>

              {/* CURHATAN & SPEECH TO TEXT */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {isIslami ? '🕌 Curhat & Doa Murni ke Allah' : '💭 Curhatan / Brain Dump'}
                  </label>
                  <SpeechToText onResult={handleSpeechResult} />
                </div>
                <textarea
                  rows="5"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isIslami ? "Tumpahkan seluruh isi hati dan doamu di hadapan-Nya..." : "Tumpahkan semua isi pikiranmu di sini..."}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', backgroundColor: isDarkMode ? '#171523' : '#FFF', color: textColor, boxSizing: 'border-box' }}
                />
              </div>

              {/* TOMBOL SUBMIT */}
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
                  fontSize: '1rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  marginBottom: '20px'
                }}
              >
                {isLoading ? 'Sedang Memproses AI...' : 'Simpan Refleksi ✨'}
              </button>
            </form>

          </div>

          {/* KOLOM KANAN: RIWAYAT JURNAL & KALENDER */}
          <div>
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📚</span> Riwayat Catatan
              </h3>

              {journals.length === 0 ? (
                <p style={{ color: subTextColor, fontSize: '0.85rem' }}>Belum ada catatan jurnal.</p>
              ) : (
                journals.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: isDarkMode ? '#171523' : '#F8F9FA',
                      padding: '12px',
                      borderRadius: '10px',
                      marginBottom: '12px',
                      borderLeft: `4px solid ${item.mode === 'islami' ? '#417D58' : '#8A70AB'}`
                    }}
                  >
                    {/* FORMAT TANGGALAN DENGAN IKON KALENDER 📅 */}
                    <div style={{ fontSize: '0.75rem', color: subTextColor, display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>📅 {new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span>{item.mood}</span>
                    </div>

                    <p style={{ fontSize: '0.85rem', margin: '6px 0', whiteSpace: 'pre-line' }}>{item.text}</p>

                    {/* AI INSIGHT */}
                    {item.ai_insight && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 10px',
                          backgroundColor: item.mode === 'islami' ? '#417D5822' : '#8A70AB22',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          color: item.mode === 'islami' ? '#81C784' : '#B39DDB'
                        }}
                      >
                        <strong>{item.mode === 'islami' ? '🕌 Pesan Spiritual AI:' : '💡 Catatan Hangat AI:'}</strong>
                        <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-line' }}>{item.ai_insight}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;