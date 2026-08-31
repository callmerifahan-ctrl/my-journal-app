import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import AudioRecorder from './AudioRecorder';
import SpeechToText from './SpeechToText';
import Auth from './Auth';
import CalendarView from './CalendarView';

// --- CONFIG EMOSI LEBIH BANYAK ---
const moodConfig = {
  '🤩': { label: 'Semangat', color: '#FFD166', bg: '#FFF8E7' },
  '😊': { label: 'Senang', color: '#06D6A0', bg: '#E6F9F5' },
  '😌': { label: 'Lega', color: '#118AB2', bg: '#E8F4F8' },
  '😐': { label: 'Netral', color: '#A0C4FF', bg: '#EBF2FF' },
  '😫': { label: 'Lelah', color: '#FFB703', bg: '#FFF5E0' },
  '🥺': { label: 'Sedih/Cemas', color: '#BDB2FF', bg: '#F0EDFF' },
  '😡': { label: 'Kesal', color: '#EF476F', bg: '#FDE8ED' },
  '🤯': { label: 'Overthinking', color: '#8338EC', bg: '#F2E8FE' },
};

// --- QUOTES HARIAN ---
const dailyQuotes = [
  "Ingatlah untuk bersikap lembut pada dirimu sendiri hari ini. 🌸",
  "Tidak apa-apa untuk beristirahat saat kamu merasa lelah. ☕",
  "Setiap langkah kecil tetaplah sebuah kemajuan. 🌱",
  "Perasaanmu valid, tidak perlu terburu-buru untuk baik-baik saja. ✨",
  "Hari baru, kesempatan baru untuk menjadi dirimu sendiri. ☀️",
  "Kamu telah bertahan melewati 100% hari-hari sulitmu sejauh ini. 💪"
];

const categoryOptions = ['Pekerjaan', 'Kuliah/Sekolah', 'Keluarga', 'Asmara', 'Self Care', 'Umum'];

function getMoodSummaryData(journalList) {
  const counts = { '🤩': 0, '😊': 0, '😌': 0, '😐': 0, '😫': 0, '🥺': 0, '😡': 0, '🤯': 0 };
  journalList.forEach((entry) => {
    if (counts[entry.mood] !== undefined) counts[entry.mood]++;
  });
  return Object.keys(counts).map((emoji) => ({
    mood: `${emoji} ${moodConfig[emoji].label}`,
    jumlah: counts[emoji],
  }));
}

function calculateStreak(journalList) {
  if (journalList.length === 0) return 0;
  const uniqueDates = Array.from(new Set(journalList.map(entry => new Date(entry.id).toDateString())));
  let streak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) return 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    const checkDate = new Date(Date.now() - (i * 86400000)).toDateString();
    if (uniqueDates.includes(checkDate)) streak++;
    else break;
  }
  return streak;
}

function App() {
  const [session, setSession] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [activeTab, setActiveTab] = useState('write');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Umum');
  const [gratitude, setGratitude] = useState('');
  const [brainDump, setBrainDump] = useState('');
  const [journalList, setJournalList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // --- LOGIKA TEMA IKUT SISTEM ---
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('journal_theme_mode') || 'system';
  });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      if (themeMode === 'system') {
        setIsDark(mediaQuery.matches);
      } else {
        setIsDark(themeMode === 'dark');
      }
    };
    updateTheme();
    localStorage.setItem('journal_theme_mode', themeMode);
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [themeMode]);

  const theme = isDark
    ? { bg: '#14121E', cardBg: '#1E1B2E', cardBorder: '#2D2842', text: '#F3EFEF', subtext: '#A39BB9', inputBg: '#181524', inputBorder: '#2D2842', accent: '#9D84B7' }
    : { bg: '#F8F6FC', cardBg: '#FFFFFF', cardBorder: '#EFEAF8', text: '#2D2738', subtext: '#8C829E', inputBg: '#FAFAFD', inputBorder: '#E4DCF3', accent: '#9D84B7' };

  // Quote Harian berdasarkan Tanggal
  const todayQuote = dailyQuotes[new Date().getDate() % dailyQuotes.length];

  // Sesi Login Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ambil jurnal dari Supabase
  useEffect(() => {
    const fetchJournals = async () => {
      if (!session?.user) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('id', { ascending: false });

      if (error) console.error('Error fetching data:', error);
      else setJournalList(data || []);
      setLoading(false);
    };

    fetchJournals();
  }, [session]);

  const handleSave = async () => {
    if (!selectedMood && !gratitude && !brainDump && !audioBlob) {
      alert('Isi minimal satu kolom, mood, atau rekam suara dulu ya!');
      return;
    }

    let uploadedAudioUrl = null;
    if (audioBlob) {
      const fileName = `${session.user.id}/audio_${Date.now()}.webm`;
      const { error: storageError } = await supabase.storage.from('journal-audios').upload(fileName, audioBlob, { contentType: 'audio/webm' });
      if (storageError) {
        alert('Gagal mengunggah audio: ' + storageError.message);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from('journal-audios').getPublicUrl(fileName);
      uploadedAudioUrl = publicUrlData.publicUrl;
    }

    const newEntry = {
      id: Date.now(),
      user_id: session.user.id,
      date: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      mood: selectedMood,
      category: selectedCategory,
      gratitude: gratitude,
      brain_dump: brainDump,
      audio_url: uploadedAudioUrl
    };

    const { error } = await supabase.from('journals').insert([newEntry]);
    if (error) {
      alert('Gagal menyimpan ke cloud: ' + error.message);
    } else {
      setJournalList([newEntry, ...journalList]);
      
      // Pesan hangat sesuai mood
      let warmMsg = "Catatanmu tersimpan dengan aman ✨";
      if (selectedMood === '😫' || selectedMood === '🤯') warmMsg = "Terima kasih sudah melapangkan pikiranmu. Istirahat sejenak ya 🍵✨";
      else if (selectedMood === '🤩' || selectedMood === '😊') warmMsg = "Senang mendengar kabarmu hari ini! Pertahankan energi positifmu! 🌟";
      else if (selectedMood === '🥺' || selectedMood === '😡') warmMsg = "Terima kasih sudah berani mengungkapkan perasaannmu. Kamu hebat! ❤️";
      
      alert(warmMsg);

      // Reset Form
      setSelectedMood('');
      setSelectedCategory('Umum');
      setGratitude('');
      setBrainDump('');
      setAudioBlob(null);
      setActiveTab('history');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus jurnal ini?')) {
      const { error } = await supabase.from('journals').delete().eq('id', id);
      if (error) alert('Gagal menghapus: ' + error.message);
      else setJournalList(journalList.filter((entry) => entry.id !== id));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setJournalList([]);
  };

  const filteredJournals = journalList.filter((entry) => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !cleanSearch || (entry.gratitude && entry.gratitude.toLowerCase().includes(cleanSearch)) || (entry.brain_dump && entry.brain_dump.toLowerCase().includes(cleanSearch));
    const matchesMood = filterMood === 'all' || entry.mood === filterMood;
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
    return matchesSearch && matchesMood && matchesCategory;
  });

  if (!session) return <Auth theme={theme} />;

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, transition: 'all 0.3s ease', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '80px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #9D84B7, #7A5C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>🌸</div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: theme.text }}>Pikiran Berbicara</h1>
              <p style={{ fontSize: '11px', color: theme.subtext, margin: '2px 0 0' }}>{session.user.email}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, color: '#FF7043' }}>
              🔥 {calculateStreak(journalList)} Hari
            </div>
            
            <button
              onClick={() => {
                if (themeMode === 'system') setThemeMode('dark');
                else if (themeMode === 'dark') setThemeMode('light');
                else setThemeMode('system');
              }}
              title={`Mode Tampilan: ${themeMode.toUpperCase()}`}
              style={{
                border: `1px solid ${theme.cardBorder}`,
                background: theme.cardBg,
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                color: theme.text,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {themeMode === 'system' ? '💻 Auto' : themeMode === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>

            <button onClick={handleLogout} title="Keluar Akun" style={{ border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, borderRadius: '50%', width: '38px', height: '38px', fontSize: '14px', cursor: 'pointer', color: '#E57373' }}>
              🚪
            </button>
          </div>
        </div>

        {/* DAILY QUOTE BANNER */}
        <div style={{ background: 'linear-gradient(135deg, rgba(157,132,183,0.15), rgba(122,92,158,0.05))', border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>💡</span>
          <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: theme.text, lineHeight: 1.4 }}>"{todayQuote}"</p>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', background: theme.cardBg, padding: '4px', borderRadius: '14px', border: `1px solid ${theme.cardBorder}`, marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('write')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', background: activeTab === 'write' ? theme.accent : 'transparent', color: activeTab === 'write' ? '#FFF' : theme.subtext }}>
            ✍️ Tulis
          </button>
          <button onClick={() => setActiveTab('calendar')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', background: activeTab === 'calendar' ? theme.accent : 'transparent', color: activeTab === 'calendar' ? '#FFF' : theme.subtext }}>
            📅 Kalender
          </button>
          <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', background: activeTab === 'history' ? theme.accent : 'transparent', color: activeTab === 'history' ? '#FFF' : theme.subtext }}>
            📚 Riwayat ({journalList.length})
          </button>
        </div>

        {/* TAB 1: FORM TULIS */}
        {activeTab === 'write' && (
          <div>
            {/* PILIH EMOSI (8 PILIHAN) */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '12px', color: theme.subtext }}>BAGAIMANA PERASAANMU SAAT INI?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {Object.keys(moodConfig).map((emoji) => (
                  <button key={emoji} onClick={() => setSelectedMood(emoji)} style={{ padding: '10px 0', borderRadius: '12px', border: selectedMood === emoji ? `2px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`, background: selectedMood === emoji ? moodConfig[emoji].bg : theme.inputBg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'transform 0.1s ease' }}>
                    <span style={{ fontSize: '24px' }}>{emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: selectedMood === emoji ? 700 : 500, color: selectedMood === emoji ? '#333' : theme.subtext }}>{moodConfig[emoji].label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PILIH KATEGORI TOPIK */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: theme.subtext }}>TOPIK / KATEGORI 🏷️</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categoryOptions.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: selectedCategory === cat ? `1px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`, background: selectedCategory === cat ? theme.accent : theme.inputBg, color: selectedCategory === cat ? '#FFF' : theme.subtext, cursor: 'pointer' }}>
                    #{cat}
                  </button>
                ))}
              </div>
            </div>

            {/* AUDIO RECORDER */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', color: theme.subtext }}>LATIHAN PUBLIC SPEAKING / REKAM SUARA 🎙️</label>
              <AudioRecorder theme={theme} onRecordingComplete={(blob) => setAudioBlob(blob)} />
            </div>

            {/* HAL DISYUKURI */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: theme.subtext }}>HAL YANG DISYUKURI 🌿</label>
              <input type="text" value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="Hal kecil/besar yang bikin tersenyum..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* BRAIN DUMP */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: theme.subtext }}>BRAIN DUMP / CURHATAN 💭</label>
                <SpeechToText theme={theme} onTranscriptChange={(text) => setBrainDump((prev) => prev ? `${prev} ${text}` : text)} />
              </div>
              <textarea rows="4" value={brainDump} onChange={(e) => setBrainDump(e.target.value)} placeholder="Tumpahkan semua isi pikiranmu di sini..." style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <button onClick={handleSave} style={{ width: '100%', padding: '15px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(157, 132, 183, 0.3)' }}>
              Simpan ke Cloud ✨
            </button>
          </div>
        )}

        {/* TAB 2: KALENDER */}
        {activeTab === 'calendar' && (
          <CalendarView journalList={journalList} theme={theme} />
        )}

        {/* TAB 3: RIWAYAT */}
        {activeTab === 'history' && (
          <div>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: theme.subtext }}>SPEKTRUM EMOSI 📊</h3>
              <div style={{ height: 230, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={getMoodSummaryData(journalList)}>
                    <PolarGrid stroke={theme.cardBorder} />
                    <PolarAngleAxis dataKey="mood" stroke={theme.subtext} tick={{ fill: theme.text, fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="transparent" />
                    <Radar name="Mood" dataKey="jumlah" stroke={theme.accent} fill={theme.accent} fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* FILTER SEARCH & CATEGORY */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="🔍 Cari kata..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.cardBg, color: theme.text, fontSize: '13px', outline: 'none' }} />
              
              <select value={filterMood} onChange={(e) => setFilterMood(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.cardBg, color: theme.text, fontSize: '13px', outline: 'none' }}>
                <option value="all">Semua Mood</option>
                {Object.keys(moodConfig).map((emoji) => (
                  <option key={emoji} value={emoji}>{emoji} {moodConfig[emoji].label}</option>
                ))}
              </select>

              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.cardBg, color: theme.text, fontSize: '13px', outline: 'none' }}>
                <option value="all">Semua Topik</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>#{cat}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: theme.subtext }}>Memuat jurnal milikmu...</p>
            ) : filteredJournals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: theme.subtext }}>
                <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📖</p>
                <p style={{ fontSize: '14px' }}>Belum ada catatan yang sesuai.</p>
              </div>
            ) : (
              filteredJournals.map((entry) => (
                <div key={entry.id} style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: theme.subtext, background: theme.inputBg, padding: '4px 8px', borderRadius: '6px' }}>
                        {entry.date} • {entry.time}
                      </span>
                      {entry.category && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: theme.accent }}>
                          #{entry.category}
                        </span>
                      )}
                    </div>
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

                  {entry.gratitude && <p style={{ margin: '4px 0', fontSize: '13px', lineHeight: 1.5 }}><strong>🌿 Disyukuri:</strong> {entry.gratitude}</p>}
                  {entry.brain_dump && <p style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5, color: theme.text }}><strong>💭 Catatan:</strong> {entry.brain_dump}</p>}
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