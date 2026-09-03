import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import SpeechToText from './SpeechToText';

async function getAiInsight(isiJurnal) {
  const GEMINI_API_KEY = "AQ.Ab8RN6KPWt0dl_fiypUiGhxxGhhkPPhCPwIjqKr7hdngz0YLTA";

  const prompt = `
    Kamu adalah seorang teman & konselor psikologi yang sangat empatik dan hangat.
    Bacalah jurnal berikut, lalu berikan:
    1. Pesan validasi/penguatan yang hangat (maksimal 2 kalimat).
    2. Satu pertanyaan refleksi yang lembut.

    Isi Jurnal: "${isiJurnal}"
  `;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
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

function App() {
  const [text, setText] = useState('');
  const [mood, setMood] = useState('😊 Neutral');
  const [journals, setJournals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    fetchJournals();
  }, []);

  const calculateStreak = (data) => {
    if (!data || data.length === 0) return 0;

    // Ambil tanggal unik penulisan jurnal (Format: YYYY-MM-DD)
    const dates = [...new Set(data.map(item => new Date(item.created_at).toDateString()))];
    
    let currentStreak = 0;
    let today = new Date();
    let checkDate = new Date(today);

    // Cek apakah hari ini atau kemarin ada jurnal
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

    const aiResponse = await getAiInsight(text);

    const { error } = await supabase.from('journals').insert([
      {
        text: text,
        mood: mood,
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
      
      {/* Header dengan Logo Streak Api & Kalender */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Jurnal Refleksi Diri</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
          <span title="Streak Menulis">🔥 {streak} Hari</span>
        </div>
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
          placeholder="Tuliskan apa yang kamu rasakan hari ini..."
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
        />

        <br />

        <button
          type="submit"
          disabled={isLoading}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: isLoading ? '#ccc' : '#4CAF50',
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
              borderLeft: '5px solid #4CAF50'
            }}
          >
            {/* Tampilan Kalender & Tanggal */}
            <small style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📅 {new Date(item.created_at).toLocaleString()} | Mood: {item.mood}
            </small>

            <p style={{ marginTop: '8px', fontWeight: '500' }}>{item.text}</p>

            {item.ai_insight && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '5px',
                  fontSize: '0.9em',
                  color: '#2e7d32'
                }}
              >
                <strong>💡 Catatan Hangat dari AI:</strong>
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