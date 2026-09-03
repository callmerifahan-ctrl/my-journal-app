import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import SpeechToText from './SpeechToText';

// ==========================================
// 1. FUNGSI UNTUK MENGAMBIL INSIGHT DARI GEMINI AI
// ==========================================
async function getAiInsight(isiJurnal, mode) {
  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  // Menyesuaikan prompt AI berdasarkan mode yang dipilih
  const promptBiasa = `
    Kamu adalah seorang teman & konselor psikologi yang sangat empatik dan hangat.
    Bacalah jurnal berikut, lalu berikan:
    1. Pesan validasi/penguatan yang hangat (maksimal 2 kalimat).
    2. Satu pertanyaan refleksi yang lembut.

    Isi Jurnal: "${isiJurnal}"
  `;

  const promptReligi = `
    Kamu adalah seorang pendamping spiritual yang penuh rasa empati, ketenangan, dan kebijaksanaan.
    Bacalah jurnal berikut, lalu berikan:
    1. Pesan penguatan spiritual dan pengingat kebaikan/pesan ketenangan iman (maksimal 2 kalimat).
    2. Satu doa singkat atau ayat/hadis/kata bijak islami yang relevan untuk menenangkan hati.

    Isi Jurnal: "${isiJurnal}"
  `;

  const promptFinal = mode === 'religi' ? promptReligi : promptBiasa;

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
    console.error("Gagal ambil AI insight:", error);
    return null;
  }
}

// ==========================================
// 2. KOMPONEN UTAMA APP
// ==========================================
function App() {
  const [text, setText] = useState('');
  const [mood, setMood] = useState('😊 Senang');
  const [mode, setMode] = useState('biasa'); // 'biasa' atau 'religi'
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetchJournals();
  }, []);

  // Hitung streak hari menulis
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

    // Ambil respon AI berdasarkan mode aktif
    const aiResponse = await getAiInsight(text, mode);

    const { error } = await supabase.from('journals').insert([
      {
        text: text,
        mood: mood,
        mode: mode,
        ai_insight: aiResponse
      }
    ]);

    if (error) {
      console.error('Error saving journal:', error);
      alert('Gagal menyimpan jurnal ke database.');
    } else {
      setText('');
      fetchJournals();
    }

    setIsLoading(false);
  };

  const handleSpeechResult = (transcript) => {
    setText((prevText) => prevText + ' ' + transcript);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header dengan Logo Streak Api 🔥 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Jurnal Refleksi Diri</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: '#fff3e0', padding: '6px 12px', borderRadius: '20px' }}>
          <span title="Streak Menulis">🔥 {streak} Hari</span>
        </div>
      </div>

      {/* Pilihan Mode Jurnal */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setMode('biasa')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: mode === 'biasa' ? '#4CAF50' : '#e0e0e0',
            color: mode === 'biasa' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🌿 Mode Biasa
        </button>
        <button
          type="button"
          onClick={() => setMode('religi')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: mode === 'religi' ? '#2196F3' : '#e0e0e0',
            color: mode === 'religi' ? 'white' : 'black',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🌙 Mode Religi
        </button>
      </div>

      {/* Form Input Jurnal */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Pilih Mood Hari Ini: </label>
          <select value={mood} onChange={(e) => setMood(e.target.value)} style={{ padding: '5px', marginLeft: '10px' }}>
            <option value="😊 Senang">😊 Senang</option>
            <option value="😐 Netral">😐 Netral</option>
            <option value="😢 Sedih">😢 Sedih</option>
            <option value="😡 Cemas/Marah">😡 Cemas/Marah</option>
            <option value="😴 Lelah">😴 Lelah</option>
          </select>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <SpeechToText onResult={handleSpeechResult} />
        </div>

        <textarea
          rows="5"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'religi' ? "Tuliskan keluh kesah atau rasa syukurmu hari ini..." : "Tuliskan apa yang kamu rasakan hari ini..."}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
        />

        <br />

        <button
          type="submit"
          disabled={isLoading}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: isLoading ? '#ccc' : mode === 'religi' ? '#2196F3' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Sedang Memproses AI...' : 'Simpan Refleksi'}
        </button>
      </form>

      <hr />

      {/* List Riwayat Jurnal */}
      <h2>Riwayat Jurnal</h2>
      {journals.length === 0 ? (
        <p>Belum ada catatan jurnal.</p>
      ) : (
        journals.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: '#f9f9f9',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px',
              borderLeft: item.mode === 'religi' ? '5px solid #2196F3' : '5px solid #4CAF50'
            }}
          >
            {/* Tampilan Tanggalan Kalender & Mood */}
            <small style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📅 {new Date(item.created_at).toLocaleString()} | Mood: {item.mood} | Mode: {item.mode === 'religi' ? '🌙 Religi' : '🌿 Biasa'}
            </small>

            <p style={{ marginTop: '8px', fontWeight: '500' }}>{item.text}</p>

            {/* Response dari AI */}
            {item.ai_insight && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: item.mode === 'religi' ? '#e3f2fd' : '#e8f5e9',
                  borderRadius: '5px',
                  fontSize: '0.9em',
                  color: item.mode === 'religi' ? '#1565c0' : '#2e7d32'
                }}
              >
                <strong>{item.mode === 'religi' ? '🕌 Catatan Religi & Doa:' : '💡 Catatan Hangat dari AI:'}</strong>
                <p style={{ margin: '5px 0 0 0', whiteSpace: 'pre-line' }}>{item.ai_insight}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default App;