import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import AudioRecorder from './AudioRecorder';
import SpeechToText from './SpeechToText';
import Auth from './Auth';

const modeConfigs = {
  regular: {
    title: "Pikiran Berbicara",
    quoteHeader: "💡 Refleksi Hari Ini",
    gratitudeLabel: "🌿 Hal yang Disyukuri",
    gratitudePlaceholder: "Hal kecil/besar yang bikin kamu tersenyum...",
    brainDumpLabel: "💭 Curhatan / Brain Dump",
    brainDumpPlaceholder: "Tumpahkan semua isi pikiranmu di sini...",
    categories: ['Pekerjaan', 'Kuliah/Sekolah', 'Keluarga', 'Asmara', 'Self Care', 'Umum'],
    quotes: [
      "Ingatlah untuk bersikap lembut pada dirimu sendiri hari ini. 🌸",
      "Tidak apa-apa untuk beristirahat saat kamu merasa lelah. ☕",
      "Setiap langkah kecil tetaplah sebuah kemajuan. 🌱",
      "Perasaanmu valid, tidak perlu terburu-buru untuk baik-baik saja. ✨"
    ]
  },
  islamic: {
    title: "Jurnal Hati & Ta'ammul",
    quoteHeader: "📖 Pengingat & Hikmah",
    gratitudeLabel: "🤲 Hal yang Di-Alhamdulillah-kan Hari Ini",
    gratitudePlaceholder: "Nikmat kecil/besar dari Allah yang dirasakan...",
    brainDumpLabel: "🕌 Curhat & Doa Murni ke Allah",
    brainDumpPlaceholder: "Tumpahkan seluruh isi hati dan doamu di hadapan-Nya...",
    categories: ['Ibadah', 'Rezeki', 'Ujian/Sabar', 'Keluarga', 'Hati/Jiwa', 'Umum'],
    quotes: [
      "Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram. (QS. Ar-Ra'd: 28) ✨",
      "Bisa jadi kamu membenci sesuatu, padahal itu sangat baik bagimu. (QS. Al-Baqarah: 216) 🌿",
      "Cukuplah Allah menjadi Penolong kami dan Allah adalah Sebaik-baik Pelindung. 🤲",
      "Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya. (QS. Al-Baqarah: 286) 🌱"
    ]
  }
};

const moodConfig = {
  '🤩': { label: 'Semangat', color: '#FFD166', bg: '#FFF8E7', val: 5 },
  '😊': { label: 'Senang', color: '#06D6A0', bg: '#E6F9F5', val: 4 },
  '😌': { label: 'Lega', color: '#118AB2', bg: '#E8F4F8', val: 4 },
  '😐': { label: 'Netral', color: '#A0C4FF', bg: '#EBF2FF', val: 3 },
  '😫': { label: 'Lelah', color: '#FFB703', bg: '#FFF5E0', val: 2 },
  '🥺': { label: 'Sedih/Cemas', color: '#BDB2FF', bg: '#F0EDFF', val: 2 },
  '😡': { label: 'Kesal', color: '#EF476F', bg: '#FDE8ED', val: 1 },
  '🤯': { label: 'Overthinking', color: '#8338EC', bg: '#F2E8FE', val: 1 },
};

const mindGymOptions = {
  bodyScan: [
    { id: 'leher', label: 'Leher/Pundak Tegang 💆' },
    { id: 'dada', label: 'Dada Sesak/Terkunci 🫁' },
    { id: 'perut', label: 'Perut Mual/Melilit 🫄' },
    { id: 'kepala', label: 'Kepala Berat/Pusing 🧠' },
    { id: 'mata', label: 'Mata Lelah 👁️' },
    { id: 'rileks', label: 'Tubuh Nyaman & Rileks ✨' },
  ],
  reframing: {
    regular: [
      '💡 Ini tantangan sementara, aku pasti bisa lewat ini',
      '🌱 Gak apa-apa gak sempurna, yang penting sudah berusaha',
      '🛑 Aku berhak istirahat dan membatasi hal yang melelahkan',
      '☕ Satu langkah kecil dulu, tidak perlu terburu-buru'
    ],
    islamic: [
      '🤲 Allah tahu batas kemampuanku, ini ujian naik tingkat',
      '🌱 Ada hikmah besar yang sedang Allah siapkan',
      '🛑 Allah sedang melindungiku dari hal yang tidak baik',
      '💡 Pasti ada kemudahan setelah kesulitan ini (QS. Al-Insyirah)'
    ]
  },
  energyDrainers: [
    '📱 Overuse Medsos',
    '🗣️ Overthinking Obrolan Orang',
    '💼 Beban Tugas Menumpuk',
    '😴 Kurang Tidur',
    '🌧️ Cuaca/Lingkungan Bikin Lesu'
  ],
  energyGivers: [
    '☕ Minum Air/Teh Hangat',
    '🎧 Dengar Suara Alam/Murottal',
    '🚶 Jalan Santai/Hirup Udara',
    '🧹 Merapikan Meja',
    '🛋️ Rebahan Tanpa HP'
  ],
  amalan: ['Shalat Tepat Waktu 🕋', 'Dzikir Pagi/Petang 📿', 'Tilawah Al-Qur\'an 📖', 'Sedekah Subuh ☕', 'Doa Khusyuk 🤲']
};

const defaultHabits = [
  { id: 'water', label: '💧 Minum 2L Air' },
  { id: 'sleep', label: '😴 Tidur < Jam 11 Malam' },
  { id: 'walk', label: '🚶 Jalan / Bergerak 15 Menit' },
  { id: 'read', label: '📖 Membaca / Dzikir 10 Menit' }
];

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

function getMoodTrendData(journalList) {
  return journalList.slice().reverse().map(e => ({
    date: e.date.split(',')[0] || e.date,
    skor: e.mood ? moodConfig[e.mood]?.val || 3 : 3
  }));
}

function calculateStreak(journalList) {
  if (journalList.length === 0) return 0;
  const uniqueDates = Array.from(new Set(journalList.map(entry => new Date(Number(entry.id)).toDateString())));
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

function getPlantStage(totalJournals) {
  if (totalJournals === 0) return { stage: '🫙', name: 'Pot Kosong', desc: 'Mulai isi jurnal untuk menanam benih!' };
  if (totalJournals < 3) return { stage: '🌱', name: 'Benih Kecil', desc: 'Tunas baru mulai tumbuh lewat curhatanmu.' };
  if (totalJournals < 7) return { stage: '🌿', name: 'Tanaman Muda', desc: 'Daun-daun makin lebat seiring waktumu berefleksi.' };
  if (totalJournals < 15) return { stage: '🪴', name: 'Tanaman Segar', desc: 'Tumbuh kuat merawat emosimu.' };
  return { stage: '🌸', name: 'Bunga Mekar', desc: 'Taman jiwamu sedang mekar indah!' };
}

function getBadges(journalList) {
  const badges = [];
  if (journalList.length >= 1) badges.push({ emoji: '✍️', title: 'Langkah Pertama', desc: 'Menulis jurnal pertama' });
  if (journalList.length >= 10) badges.push({ emoji: '📚', title: 'Penulis Setia', desc: 'Mencapai 10 jurnal' });
  if (journalList.some(e => e.gratitude)) badges.push({ emoji: '🌿', title: 'Hati Syukur', desc: 'Mencatat hal yang disyukuri' });
  if (journalList.some(e => e.audio_url)) badges.push({ emoji: '🎙️', title: 'Suara Jiwa', desc: 'Menggunakan rekaman suara' });
  if (journalList.some(e => e.photo_url)) badges.push({ emoji: '🖼️', title: 'Memori Visual', desc: 'Menyimpan foto kenangan' });
  return badges;
}

function App() {
  const [session, setSession] = useState(null);
  const [journalMode, setJournalMode] = useState('islamic');
  const [activeTab, setActiveTab] = useState('write');
  
  const [savedPin, setSavedPin] = useState(() => localStorage.getItem('app_pin_code') || '');
  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem('app_pin_code'));
  const [inputPin, setInputPin] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  const [selectedMood, setSelectedMood] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Umum');
  const [gratitude, setGratitude] = useState('');
  const [brainDump, setBrainDump] = useState('');
  const [audioBlob, setAudioBlob] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [journalList, setJournalList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isTimeCapsule, setIsTimeCapsule] = useState(false);
  const [unlockDate, setUnlockDate] = useState('');

  const [bodySensations, setBodySensations] = useState([]);
  const [selectedReframing, setSelectedReframing] = useState('');
  const [selectedDrainer, setSelectedDrainer] = useState('');
  const [selectedGiver, setSelectedGiver] = useState('');
  const [selectedAmalan, setSelectedAmalan] = useState([]);

  const [burnText, setBurnText] = useState('');
  const [isBurning, setIsBurning] = useState(false);
  const [activeSound, setActiveSound] = useState('off');
  const audioCtxRef = useRef(null);
  const murottalRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('journal_theme_mode') || 'system');
  const [isDark, setIsDark] = useState(false);

  const [breathePhase, setBreathePhase] = useState('Ready');
  const [breatheTimer, setBreatheTimer] = useState(0);
  const [isBreathingActive, setIsBreathingActive] = useState(false);

  const [randomGratitude, setRandomGratitude] = useState(null);
  const [selectedEntryForCard, setSelectedEntryForCard] = useState(null);

  const todayKey = new Date().toISOString().split('T')[0];
  const [checkedHabits, setCheckedHabits] = useState(() => {
    const saved = localStorage.getItem(`habits_${todayKey}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [selfLetters, setSelfLetters] = useState(() => {
    const saved = localStorage.getItem('self_letters_data');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Saat Kamu Merasa Lelah & Cemas', content: 'Hei, tarik napas dulu. Kamu sudah berjuang sejauh ini. Kamu tidak harus menyelesaikan semuanya hari ini. Istirahatlah, kamu cukup.' }
    ];
  });
  const [newLetterTitle, setNewLetterTitle] = useState('');
  const [newLetterContent, setNewLetterContent] = useState('');

  const currentConfig = modeConfigs[journalMode];

  useEffect(() => {
    localStorage.setItem(`habits_${todayKey}`, JSON.stringify(checkedHabits));
  }, [checkedHabits, todayKey]);

  useEffect(() => {
    localStorage.setItem('self_letters_data', JSON.stringify(selfLetters));
  }, [selfLetters]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      if (themeMode === 'system') setIsDark(mediaQuery.matches);
      else setIsDark(themeMode === 'dark');
    };
    updateTheme();
    localStorage.setItem('journal_theme_mode', themeMode);
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [themeMode]);

  useEffect(() => {
    let interval = null;
    if (isBreathingActive) {
      interval = setInterval(() => {
        setBreatheTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
      setBreatheTimer(0);
      setBreathePhase('Ready');
    }
    return () => clearInterval(interval);
  }, [isBreathingActive]);

  useEffect(() => {
    if (!isBreathingActive) return;
    const cycleTime = breatheTimer % 19;
    if (cycleTime < 4) {
      setBreathePhase('Tarik Napas (4s)... 🫁');
    } else if (cycleTime < 11) {
      setBreathePhase('Tahan Napas (7s)... ⏸️');
    } else {
      setBreathePhase('Hembuskan Perlahan (8s)... 🌬️');
    }
  }, [breatheTimer, isBreathingActive]);

  const theme = isDark
    ? { bg: '#14121E', cardBg: '#1E1B2E', cardBorder: '#2D2842', text: '#F3EFEF', subtext: '#A39BB9', inputBg: '#181524', inputBorder: '#2D2842', accent: journalMode === 'islamic' ? '#4A7C59' : '#9D84B7' }
    : { bg: '#F8F6FC', cardBg: '#FFFFFF', cardBorder: '#EFEAF8', text: '#2D2738', subtext: '#8C829E', inputBg: '#FAFAFD', inputBorder: '#E4DCF3', accent: journalMode === 'islamic' ? '#4A7C59' : '#9D84B7' };

  const todayQuote = currentConfig.quotes[new Date().getDate() % currentConfig.quotes.length];

  const toggleBodySensation = (id) => {
    setBodySensations(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleAmalan = (item) => {
    setSelectedAmalan(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const toggleHabit = (id) => {
    setCheckedHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  };

  const stopAllAudio = () => {
    if (audioCtxRef.current) audioCtxRef.current.close();
    if (murottalRef.current) murottalRef.current.pause();
    setActiveSound('off');
  };

  const toggleSound = (type) => {
    if (activeSound === type) {
      stopAllAudio();
      return;
    }
    
    stopAllAudio();

    if (type === 'murottal') {
      if (murottalRef.current) {
        murottalRef.current.play();
        setActiveSound('murottal');
      }
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    
    if (type === 'rain') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
    } else if (type === 'cafe') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    setActiveSound(type);
  };

  useEffect(() => {
    return () => { stopAllAudio(); };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

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
    const isMindGymFilled = bodySensations.length > 0 || selectedReframing || selectedDrainer || selectedGiver || selectedAmalan.length > 0;
    
    if (!selectedMood && !gratitude && !brainDump && !audioBlob && !photoFile && !isMindGymFilled) {
      alert('Isi minimal satu opsi, pilihan mood, foto, atau rekaman suara dulu ya!');
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

    let uploadedPhotoUrl = null;
    if (photoFile) {
      const fileName = `${session.user.id}/photo_${Date.now()}_${photoFile.name}`;
      const { error: photoError } = await supabase.storage.from('journal-images').upload(fileName, photoFile);
      if (photoError) {
        alert('Gagal mengunggah foto: ' + photoError.message);
        return;
      }
      const { data: photoUrlData } = supabase.storage.from('journal-images').getPublicUrl(fileName);
      uploadedPhotoUrl = photoUrlData.publicUrl;
    }

    const newEntry = {
      id: Date.now(),
      user_id: session.user.id,
      date: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      mode: journalMode,
      mood: selectedMood,
      category: selectedCategory,
      gratitude: gratitude,
      brain_dump: brainDump,
      audio_url: uploadedAudioUrl,
      photo_url: uploadedPhotoUrl,
      is_favorite: false,
      is_time_capsule: isTimeCapsule,
      unlock_date: unlockDate || null,
      cbt_rational: selectedReframing,
      energy_drainer: selectedDrainer,
      energy_giver: selectedGiver,
      body_sensations: bodySensations,
      amalan: selectedAmalan
    };

    const { error } = await supabase.from('journals').insert([newEntry]);
    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      setJournalList([newEntry, ...journalList]);
      alert(isTimeCapsule ? `🔒 Kapsul Waktu dikunci sampai ${unlockDate}!` : "Refleksi berhasil tersimpan! 🌸");

      setSelectedMood('');
      setGratitude('');
      setBrainDump('');
      setAudioBlob(null);
      setPhotoFile(null);
      setIsTimeCapsule(false);
      setUnlockDate('');
      setBodySensations([]);
      setSelectedReframing('');
      setSelectedDrainer('');
      setSelectedGiver('');
      setSelectedAmalan([]);
      setActiveTab('history');
    }
  };

  const toggleFavorite = async (id, currentStatus) => {
    const updatedStatus = !currentStatus;
    const { error } = await supabase.from('journals').update({ is_favorite: updatedStatus }).eq('id', id);
    if (!error) {
      setJournalList(journalList.map(item => item.id === id ? { ...item, is_favorite: updatedStatus } : item));
    }
  };

  const handleBurn = () => {
    if (!burnText.trim()) return;
    setIsBurning(true);
    setTimeout(() => {
      setBurnText('');
      setIsBurning(false);
      alert('🔥 Emosi negatifmu telah dibakar dan dilepaskan secara permanen.');
    }, 1500);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus jurnal ini?')) {
      const { error } = await supabase.from('journals').delete().eq('id', id);
      if (error) alert('Gagal menghapus: ' + error.message);
      else setJournalList(journalList.filter((entry) => entry.id !== id));
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportData = () => {
    if (journalList.length === 0) {
      alert("Belum ada data jurnal untuk diunduh!");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(journalList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_jurnal_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const pickRandomGratitude = () => {
    const gratitudeEntries = journalList.filter(e => e.gratitude && e.gratitude.trim() !== '');
    if (gratitudeEntries.length === 0) {
      alert('Belum ada kenangan rasa syukur tersimpan. Yuk isi dulu!');
      return;
    }
    const randomIndex = Math.floor(Math.random() * gratitudeEntries.length);
    setRandomGratitude(gratitudeEntries[randomIndex]);
  };

  const handleAddLetter = () => {
    if (!newLetterTitle || !newLetterContent) {
      alert('Judul dan isi surat harus diisi ya!');
      return;
    }
    const newL = { id: Date.now(), title: newLetterTitle, content: newLetterContent };
    setSelfLetters([newL, ...selfLetters]);
    setNewLetterTitle('');
    setNewLetterContent('');
    alert('💌 Surat untuk diri sendiri berhasil disimpan!');
  };

  const handleUnlock = () => {
    if (inputPin === savedPin) {
      setIsLocked(false);
      setInputPin('');
    } else {
      alert('PIN Salah! Coba lagi.');
      setInputPin('');
    }
  };

  const handleSetPin = () => {
    if (newPinInput.length !== 4) {
      alert('PIN harus 4 angka!');
      return;
    }
    localStorage.setItem('app_pin_code', newPinInput);
    setSavedPin(newPinInput);
    setNewPinInput('');
    alert('🔒 PIN Keamanan berhasil diaktifkan/diperbarui!');
  };

  const handleRemovePin = () => {
    localStorage.removeItem('app_pin_code');
    setSavedPin('');
    alert('🔓 PIN Keamanan dicopot.');
  };

  if (!session) return <Auth theme={theme} />;

  if (isLocked) {
    return (
      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '20px', padding: '30px', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
          <span style={{ fontSize: '48px' }}>🔒</span>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '12px 0 6px' }}>Jurnal Terkunci</h2>
          <p style={{ fontSize: '12px', color: theme.subtext, margin: '0 0 20px' }}>Masukkan 4 digit PIN kamu untuk membuka</p>
          <input
            type="password"
            maxLength="4"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            placeholder="••••"
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '24px', textAlign: 'center', letterSpacing: '8px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
          />
          <button onClick={handleUnlock} style={{ width: '100%', padding: '14px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Buka Kunci ✨
          </button>
        </div>
      </div>
    );
  }

  const plantInfo = getPlantStage(journalList.length);
  const userBadges = getBadges(journalList);

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, transition: 'all 0.3s ease', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '80px' }}>
      <audio ref={murottalRef} loop src="https://download.quranicaudio.com/quran/abdurrahmaan_as-sudais/055.mp3" />

      {selectedEntryForCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #1E1B2E, #2D2842)', color: '#FFF', borderRadius: '24px', padding: '30px 24px', maxWidth: '340px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: '#A39BB9' }}>{selectedEntryForCard.mode === 'islamic' ? "Ta'ammul Hati" : "Pikiran Berbicara"}</span>
            <div style={{ fontSize: '42px', margin: '14px 0 6px' }}>{selectedEntryForCard.mood || '🌸'}</div>
            <p style={{ fontSize: '11px', color: '#A39BB9', margin: '0 0 16px' }}>{selectedEntryForCard.date}</p>
            
            {selectedEntryForCard.photo_url && (
              <img src={selectedEntryForCard.photo_url} alt="Kenangan" style={{ width: '100%', borderRadius: '12px', marginBottom: '12px', maxHeight: '180px', objectFit: 'cover' }} />
            )}

            {selectedEntryForCard.gratitude && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', marginBottom: '10px', fontSize: '12px', fontStyle: 'italic', borderLeft: '3px solid #06D6A0' }}>
                "{selectedEntryForCard.gratitude}"
              </div>
            )}
            
            {selectedEntryForCard.brain_dump && (
              <p style={{ fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px', color: '#E4DCF3' }}>
                "{selectedEntryForCard.brain_dump}"
              </p>
            )}

            <button onClick={() => setSelectedEntryForCard(null)} style={{ padding: '10px 24px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              Tutup ✨
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: journalMode === 'islamic' ? 'linear-gradient(135deg, #4A7C59, #2D5036)' : 'linear-gradient(135deg, #9D84B7, #7A5C9E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              {journalMode === 'islamic' ? '🕌' : '🌸'}
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: theme.text }}>{currentConfig.title}</h1>
              <p style={{ fontSize: '11px', color: theme.subtext, margin: '2px 0 0' }}>{session.user.email}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {savedPin && (
              <button onClick={() => setIsLocked(true)} title="Kunci Aplikasi" style={{ border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '14px' }}>
                🔒
              </button>
            )}
            <button onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')} style={{ border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: theme.text }}>
              {isDark ? '🌙 Dark' : '☀️ Light'}
            </button>
            <button onClick={() => supabase.auth.signOut()} style={{ border: `1px solid ${theme.cardBorder}`, background: theme.cardBg, borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: '#E57373' }}>
              🚪
            </button>
          </div>
        </div>

        {/* SWITCH TEMA MODE */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, padding: '4px', borderRadius: '20px', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setJournalMode('regular')}
              style={{ padding: '6px 16px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: journalMode === 'regular' ? theme.accent : 'transparent', color: journalMode === 'regular' ? '#FFF' : theme.subtext }}
            >
              🌿 Mode Umum
            </button>
            <button
              onClick={() => setJournalMode('islamic')}
              style={{ padding: '6px 16px', borderRadius: '16px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: journalMode === 'islamic' ? theme.accent : 'transparent', color: journalMode === 'islamic' ? '#FFF' : theme.subtext }}
            >
              🕌 Mode Islami
            </button>
          </div>
        </div>

        {/* DAILY HABITS TRACKER */}
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '12px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: theme.subtext, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>✅ KEBIASAAN HARIAN (CHECKLIST Hari Ini)</span>
            <span>{checkedHabits.length}/{defaultHabits.length} Done</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {defaultHabits.map((h) => {
              const isDone = checkedHabits.includes(h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', border: isDone ? `1px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`, background: isDone ? theme.accent : theme.inputBg, color: isDone ? '#FFF' : theme.subtext, cursor: 'pointer', opacity: isDone ? 1 : 0.7 }}
                >
                  {isDone ? '✓ ' : ''}{h.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* QUOTE BANNER */}
        <div style={{ background: 'linear-gradient(135deg, rgba(157,132,183,0.1), rgba(122,92,158,0.03))', border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>{journalMode === 'islamic' ? '📖' : '💡'}</span>
          <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: theme.text }}>"{todayQuote}"</p>
        </div>

        {/* SOUNDSCAPE CONTROLLER */}
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '14px', padding: '10px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: theme.subtext }}>🎧 SUARA LATAR & RELAKSASI:</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => toggleSound('rain')} style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', border: 'none', cursor: 'pointer', background: activeSound === 'rain' ? theme.accent : theme.inputBg, color: activeSound === 'rain' ? '#FFF' : theme.text }}>
              🌧️ Hujan
            </button>
            <button onClick={() => toggleSound('cafe')} style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', border: 'none', cursor: 'pointer', background: activeSound === 'cafe' ? theme.accent : theme.inputBg, color: activeSound === 'cafe' ? '#FFF' : theme.text }}>
              ☕ Kafe
            </button>
            <button onClick={() => toggleSound('murottal')} style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', border: 'none', cursor: 'pointer', background: activeSound === 'murottal' ? theme.accent : theme.inputBg, color: activeSound === 'murottal' ? '#FFF' : theme.text }}>
              📖 Murottal (QS. Ar-Rahman)
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', background: theme.cardBg, padding: '4px', borderRadius: '14px', border: `1px solid ${theme.cardBorder}`, marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('write')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', background: activeTab === 'write' ? theme.accent : 'transparent', color: activeTab === 'write' ? '#FFF' : theme.subtext }}>
            ✍️ Jurnal
          </button>
          <button onClick={() => setActiveTab('reflect')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', background: activeTab === 'reflect' ? theme.accent : 'transparent', color: activeTab === 'reflect' ? '#FFF' : theme.subtext }}>
            🧘 Mind Gym
          </button>
          <button onClick={() => setActiveTab('breathe')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', background: activeTab === 'breathe' ? theme.accent : 'transparent', color: activeTab === 'breathe' ? '#FFF' : theme.subtext }}>
            🫁 Napas 4-7-8
          </button>
          <button onClick={() => setActiveTab('letters')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', background: activeTab === 'letters' ? theme.accent : 'transparent', color: activeTab === 'letters' ? '#FFF' : theme.subtext }}>
            💌 Surat Diri
          </button>
          <button onClick={() => setActiveTab('burn')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', background: activeTab === 'burn' ? theme.accent : 'transparent', color: activeTab === 'burn' ? '#FFF' : theme.subtext }}>
            🔥 Katarsis
          </button>
          <button onClick={() => setActiveTab('analytics')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', background: activeTab === 'analytics' ? theme.accent : 'transparent', color: activeTab === 'analytics' ? '#FFF' : theme.subtext }}>
            📊 Analisis
          </button>
          <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '11px', background: activeTab === 'history' ? theme.accent : 'transparent', color: activeTab === 'history' ? '#FFF' : theme.subtext }}>
            📚 Riwayat ({journalList.length})
          </button>
        </div>

        {/* TAB 1: FORM JURNAL UTAMA */}
        {activeTab === 'write' && (
          <div>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '12px', color: theme.subtext }}>BAGAIMANA PERASAANMU SAAT INI?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {Object.keys(moodConfig).map((emoji) => (
                  <button key={emoji} onClick={() => setSelectedMood(emoji)} style={{ padding: '10px 0', borderRadius: '12px', border: selectedMood === emoji ? `2px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`, background: selectedMood === emoji ? moodConfig[emoji].bg : theme.inputBg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '22px' }}>{emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: selectedMood === emoji ? 700 : 500, color: '#333' }}>{moodConfig[emoji].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: theme.subtext }}>TOPIK / KATEGORI 🏷️</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {currentConfig.categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: selectedCategory === cat ? `1px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`, background: selectedCategory === cat ? theme.accent : theme.inputBg, color: selectedCategory === cat ? '#FFF' : theme.subtext, cursor: 'pointer' }}>
                    #{cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: theme.subtext }}>{currentConfig.gratitudeLabel}</label>
              <input type="text" value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder={currentConfig.gratitudePlaceholder} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: theme.subtext }}>{currentConfig.brainDumpLabel}</label>
                <SpeechToText theme={theme} onTranscriptChange={(text) => setBrainDump((prev) => prev ? `${prev} ${text}` : text)} />
              </div>
              <textarea rows="4" value={brainDump} onChange={(e) => setBrainDump(e.target.value)} placeholder={currentConfig.brainDumpPlaceholder} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            {/* UPLOAD FOTO KENANGAN */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: theme.subtext }}>TAMBAHKAN FOTO / KENANGAN 🖼️</label>
              <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} style={{ fontSize: '12px', color: theme.text }} />
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', color: theme.subtext }}>REKAM SUARA LISAN 🎙️</label>
              <AudioRecorder theme={theme} onRecordingComplete={(blob) => setAudioBlob(blob)} />
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: theme.text }}>🔒 Kunci Sebagai Kapsul Waktu Masa Depan</label>
                <input type="checkbox" checked={isTimeCapsule} onChange={(e) => setIsTimeCapsule(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </div>
              {isTimeCapsule && (
                <div style={{ marginTop: '12px' }}>
                  <input type="date" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '13px' }} />
                </div>
              )}
            </div>

            <button onClick={handleSave} style={{ width: '100%', padding: '15px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
              Simpan Refleksi ✨
            </button>
          </div>
        )}

        {/* TAB 2: MIND GYM */}
        {activeTab === 'reflect' && (
          <div>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: theme.text }}>1. Somatic Body Scan 🧘‍♀️</h3>
              <p style={{ fontSize: '11px', color: theme.subtext, margin: '0 0 12px' }}>Bagian mana yang paling terasa tegang saat ini?</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {mindGymOptions.bodyScan.map((item) => {
                  const isSelected = bodySensations.includes(item.id);
                  return (
                    <button key={item.id} onClick={() => toggleBodySensation(item.id)} style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: isSelected ? `1px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`, background: isSelected ? theme.accent : theme.inputBg, color: isSelected ? '#FFF' : theme.text, cursor: 'pointer' }}>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: theme.text }}>
                {journalMode === 'islamic' ? '2. Penguat Hati & Husnuzhan 🤲' : '2. Reframing Perspektif 🧠'}
              </h3>
              <p style={{ fontSize: '11px', color: theme.subtext, margin: '0 0 12px' }}>Pilih 1 kalimat pengingat yang paling kamu butuhkan:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mindGymOptions.reframing[journalMode].map((option) => {
                  const isSelected = selectedReframing === option;
                  return (
                    <button key={option} onClick={() => setSelectedReframing(isSelected ? '' : option)} style={{ textAlign: 'left', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: isSelected ? 700 : 500, border: isSelected ? `1px solid ${theme.accent}` : `1px solid ${theme.inputBorder}`, background: isSelected ? theme.accent : theme.inputBg, color: isSelected ? '#FFF' : theme.text, cursor: 'pointer' }}>
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {journalMode === 'islamic' && (
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: theme.text }}>3. Amalan Harian 📿</h3>
                <p style={{ fontSize: '11px', color: theme.subtext, margin: '0 0 12px' }}>Pilih amalan yang sudah dikerjakan hari ini:</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {mindGymOptions.amalan.map((item) => {
                    const isSelected = selectedAmalan.includes(item);
                    return (
                      <button key={item} onClick={() => toggleAmalan(item)} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', border: `1px solid ${theme.inputBorder}`, background: isSelected ? theme.accent : theme.inputBg, color: isSelected ? '#FFF' : theme.text, cursor: 'pointer' }}>
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: theme.text }}>Keseimbangan Energi 🔋</h3>
              
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#E57373', margin: '0 0 8px' }}>🪫 Penyedot Energi:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {mindGymOptions.energyDrainers.map((item) => (
                  <button key={item} onClick={() => setSelectedDrainer(selectedDrainer === item ? '' : item)} style={{ padding: '6px 12px', borderRadius: '16px', fontSize: '11px', border: `1px solid ${theme.inputBorder}`, background: selectedDrainer === item ? '#E57373' : theme.inputBg, color: selectedDrainer === item ? '#FFF' : theme.subtext, cursor: 'pointer' }}>
                    {item}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '11px', fontWeight: 600, color: '#81C784', margin: '0 0 8px' }}>🔋 Pengisi Energi:</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {mindGymOptions.energyGivers.map((item) => (
                  <button key={item} onClick={() => setSelectedGiver(selectedGiver === item ? '' : item)} style={{ padding: '6px 12px', borderRadius: '16px', fontSize: '11px', border: `1px solid ${theme.inputBorder}`, background: selectedGiver === item ? '#81C784' : theme.inputBg, color: selectedGiver === item ? '#FFF' : theme.subtext, cursor: 'pointer' }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSave} style={{ width: '100%', padding: '15px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
              Simpan Mind Gym ✨
            </button>
          </div>
        )}

        {/* TAB BREATHING */}
        {activeTab === 'breathe' && (
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '30px 20px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: theme.text }}>Latihan Napas Relaksasi (4-7-8) 🫁</h3>
            <p style={{ fontSize: '12px', color: theme.subtext, margin: '0 0 30px' }}>Tarik napas 4 detik, tahan 7 detik, lalu hembuskan 8 detik untuk meredakan cemas.</p>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px', marginBottom: '30px' }}>
              <div style={{
                width: isBreathingActive ? (breathePhase.includes('Tarik') ? '160px' : breathePhase.includes('Tahan') ? '160px' : '90px') : '110px',
                height: isBreathingActive ? (breathePhase.includes('Tarik') ? '160px' : breathePhase.includes('Tahan') ? '160px' : '90px') : '110px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${theme.accent} 0%, rgba(157,132,183,0.2) 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 3.8s ease-in-out',
                boxShadow: `0 0 25px ${theme.accent}`
              }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF', padding: '0 10px' }}>
                  {breathePhase}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsBreathingActive(!isBreathingActive)}
              style={{ padding: '12px 30px', background: isBreathingActive ? '#E57373' : theme.accent, color: '#FFF', border: 'none', borderRadius: '25px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              {isBreathingActive ? '⏹️ Selesai' : '▶️ Mulai Relaksasi'}
            </button>
          </div>
        )}

        {/* TAB SURAT DIRI */}
        {activeTab === 'letters' && (
          <div>
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px', color: theme.text }}>💌 Tulis Surat Untuk Diri Sendiri</h3>
              <p style={{ fontSize: '11px', color: theme.subtext, margin: '0 0 12px' }}>Pesan hangat dari versi dirimu yang tenang untuk dibaca saat kamu sedang lelah/down nanti.</p>
              
              <input
                type="text"
                value={newLetterTitle}
                onChange={(e) => setNewLetterTitle(e.target.value)}
                placeholder="Judul Surat (misal: Saat Kamu Merasa Gagal)"
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '12px', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }}
              />
              <textarea
                rows="3"
                value={newLetterContent}
                onChange={(e) => setNewLetterContent(e.target.value)}
                placeholder="Tulis pesan penguat jiwamu di sini..."
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <button onClick={handleAddLetter} style={{ padding: '10px 18px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Simpan Surat 💌
              </button>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 700, color: theme.subtext, margin: '0 0 10px' }}>KOTAK SURAT PENGUAT:</h4>
            {selfLetters.map((letter) => (
              <div key={letter.id} style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                <h5 style={{ margin: '0 0 6px', fontSize: '13px', color: theme.text }}>✉️ {letter.title}</h5>
                <p style={{ margin: 0, fontSize: '12px', color: theme.subtext, lineHeight: '1.5', fontStyle: 'italic' }}>"{letter.content}"</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB KATARSIS */}
        {activeTab === 'burn' && (
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '40px' }}>🔥</span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '8px 0 4px', color: theme.text }}>Burn & Release</h3>
            <p style={{ fontSize: '12px', color: theme.subtext, margin: '0 0 16px' }}>Tulis amarah atau kekesalanmu. Teks ini <strong>TIDAK DISIMPAN</strong> dan akan hangus begitu dibakar.</p>
            <textarea rows="6" value={burnText} onChange={(e) => setBurnText(e.target.value)} placeholder="Luapkan semuanya di sini..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box', opacity: isBurning ? 0.1 : 1, transition: 'opacity 1s ease' }} />
            <button onClick={handleBurn} disabled={isBurning || !burnText.trim()} style={{ marginTop: '16px', width: '100%', padding: '14px', background: isBurning ? '#888' : 'linear-gradient(135deg, #EF476F, #FF7043)', color: '#FFF', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              {isBurning ? '🔥 Membakar Emosi...' : '🔥 Bakar & Lepaskan'}
            </button>
          </div>
        )}

        {/* TAB ANALISIS */}
        {activeTab === 'analytics' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, rgba(6,214,160,0.1), rgba(17,138,178,0.05))', border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px' }}>🫙</span>
              <h4 style={{ margin: '4px 0', fontSize: '14px', color: theme.text }}>Kotak Kejutan Rasa Syukur (Gratitude Jar)</h4>
              <p style={{ margin: '0 0 12px', fontSize: '11px', color: theme.subtext }}>Ambil 1 memori kebaikan acak dari masa lalumu saat kamu sedang down.</p>
              
              {randomGratitude && (
                <div style={{ background: theme.cardBg, padding: '12px', borderRadius: '10px', marginBottom: '12px', border: `1px solid ${theme.cardBorder}` }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: theme.accent }}>"{randomGratitude.gratitude}"</p>
                  <span style={{ fontSize: '10px', color: theme.subtext }}>— {randomGratitude.date}</span>
                </div>
              )}

              <button onClick={pickRandomGratitude} style={{ padding: '8px 16px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '20px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                ✨ Ambil Kenangan Syukur Acak
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '4px' }}>{plantInfo.stage}</div>
                <h4 style={{ margin: 0, fontSize: '13px', color: theme.text }}>{plantInfo.name}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: theme.subtext }}>{plantInfo.desc}</p>
              </div>

              <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#FF7043', marginBottom: '8px' }}>🔥 Streak: {calculateStreak(journalList)} Hari</div>
                <h4 style={{ margin: '0 0 6px', fontSize: '11px', color: theme.subtext }}>LENCANA PENCAPAIAN 🏆</h4>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {userBadges.map((badge, idx) => (
                    <span key={idx} title={`${badge.title}: ${badge.desc}`} style={{ fontSize: '16px', background: theme.inputBg, padding: '4px 8px', borderRadius: '8px' }}>
                      {badge.emoji}
                    </span>
                  ))}
                  {userBadges.length === 0 && <span style={{ fontSize: '10px', color: theme.subtext }}>Belum ada lencana.</span>}
                </div>
              </div>
            </div>

            {/* GRAFIK TREN MOOD (LINE CHART) */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: theme.subtext }}>TREN EMOSI SEIRING WAKTU 📈</h3>
              <div style={{ height: 180, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getMoodTrendData(journalList)}>
                    <XAxis dataKey="date" stroke={theme.subtext} tick={{ fontSize: 9 }} />
                    <YAxis domain={[1, 5]} hide />
                    <Tooltip contentStyle={{ background: theme.cardBg, borderRadius: '8px', border: `1px solid ${theme.cardBorder}`, fontSize: '11px' }} />
                    <Line type="monotone" dataKey="skor" stroke={theme.accent} strokeWidth={2} dot={{ fill: theme.accent }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px', color: theme.subtext }}>SPEKTRUM EMOSI 📊</h3>
              <div style={{ height: 220, width: '100%' }}>
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

            <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: theme.text }}>🔒 Keamanan PIN Aplikasi</h4>
              {savedPin ? (
                <div>
                  <p style={{ fontSize: '11px', color: '#81C784', margin: '0 0 8px' }}>✓ PIN Keamanan Sedang Aktif</p>
                  <button onClick={handleRemovePin} style={{ padding: '6px 12px', background: '#E57373', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                    Hapus PIN Keamanan
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    maxLength="4"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Buat 4 Digit PIN"
                    style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.text, fontSize: '12px', outline: 'none' }}
                  />
                  <button onClick={handleSetPin} style={{ padding: '8px 14px', background: theme.accent, color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Aktifkan PIN
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={handlePrintPDF} 
                style={{ flex: 1, padding: '12px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.cardBorder}`, borderRadius: '12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                🖨️ Cetak / Simpan PDF
              </button>
              <button 
                onClick={handleExportData} 
                style={{ flex: 1, padding: '12px', background: theme.inputBg, color: theme.text, border: `1px solid ${theme.cardBorder}`, borderRadius: '12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                📥 Export Backup (JSON)
              </button>
            </div>
          </div>
        )}

        {/* TAB RIWAYAT */}
        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="🔍 Cari catatan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.cardBg, color: theme.text, fontSize: '13px', outline: 'none', minWidth: '160px' }} />
              <select value={filterMood} onChange={(e) => setFilterMood(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: theme.cardBg, color: theme.text, fontSize: '13px', outline: 'none' }}>
                <option value="all">Semua Mood</option>
                {Object.keys(moodConfig).map((emoji) => (
                  <option key={emoji} value={emoji}>{emoji} {moodConfig[emoji].label}</option>
                ))}
              </select>
              <button onClick={() => setOnlyFavorites(!onlyFavorites)} style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${theme.inputBorder}`, background: onlyFavorites ? theme.accent : theme.cardBg, color: onlyFavorites ? '#FFF' : theme.text, cursor: 'pointer', fontSize: '12px' }}>
                ⭐ Favorite
              </button>
            </div>

            {/* QUICK EMOJI FILTER BAR */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              <button onClick={() => setFilterMood('all')} style={{ padding: '4px 10px', borderRadius: '12px', border: filterMood === 'all' ? `1px solid ${theme.accent}` : `1px solid ${theme.cardBorder}`, background: theme.cardBg, fontSize: '11px', color: theme.text, cursor: 'pointer' }}>Semua</button>
              {Object.keys(moodConfig).map((emoji) => (
                <button key={emoji} onClick={() => setFilterMood(filterMood === emoji ? 'all' : emoji)} style={{ padding: '4px 10px', borderRadius: '12px', border: filterMood === emoji ? `1px solid ${theme.accent}` : `1px solid ${theme.cardBorder}`, background: filterMood === emoji ? moodConfig[emoji].bg : theme.cardBg, fontSize: '12px', cursor: 'pointer' }}>
                  {emoji}
                </button>
              ))}
            </div>

            {loading ? (
              <p style={{ textAlign: 'center', color: theme.subtext }}>Memuat jurnal...</p>
            ) : journalList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: theme.subtext }}>
                <p style={{ fontSize: '32px', margin: '0 0 8px' }}>📖</p>
                <p style={{ fontSize: '13px' }}>Belum ada catatan tersimpan.</p>
              </div>
            ) : (
              journalList
                .filter(e => filterMood === 'all' || e.mood === filterMood)
                .filter(e => !onlyFavorites || e.is_favorite)
                .filter(e => !searchTerm || JSON.stringify(e).toLowerCase().includes(searchTerm.toLowerCase()))
                .map((entry) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isLockedCapsule = entry.is_time_capsule && entry.unlock_date && entry.unlock_date > todayStr;

                  return (
                    <div key={entry.id} style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '16px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: theme.subtext, background: theme.inputBg, padding: '4px 8px', borderRadius: '6px' }}>
                          {entry.date} • {entry.time} {entry.mode === 'islamic' ? '🕌' : '🌿'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => toggleFavorite(entry.id, entry.is_favorite)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>
                            {entry.is_favorite ? '⭐' : '☆'}
                          </button>
                          <button onClick={() => setSelectedEntryForCard(entry)} style={{ border: 'none', background: 'transparent', color: theme.accent, cursor: 'pointer', fontSize: '12px' }}>🎨 Kartu</button>
                          <button onClick={() => handleDelete(entry.id)} style={{ border: 'none', background: 'transparent', color: '#E57373', cursor: 'pointer', fontSize: '12px' }}>🗑️ Hapus</button>
                        </div>
                      </div>

                      {isLockedCapsule ? (
                        <div style={{ background: theme.inputBg, border: `1px dashed ${theme.cardBorder}`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '24px' }}>🔒</span>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.subtext }}>Kapsul waktu dikunci sampai <strong>{entry.unlock_date}</strong>.</p>
                        </div>
                      ) : (
                        <>
                          {entry.mood && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: moodConfig[entry.mood]?.bg || theme.inputBg, padding: '4px 10px', borderRadius: '20px', marginBottom: '8px' }}>
                              <span>{entry.mood}</span>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>{moodConfig[entry.mood]?.label}</span>
                            </div>
                          )}
                          {entry.photo_url && (
                            <img src={entry.photo_url} alt="Kenangan" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '10px', margin: '8px 0' }} />
                          )}
                          {entry.gratitude && <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>🌿 Syukur:</strong> {entry.gratitude}</p>}
                          {entry.brain_dump && <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>💭 Catatan:</strong> {entry.brain_dump}</p>}
                          {entry.cbt_rational && <p style={{ margin: '4px 0', fontSize: '12px', color: theme.accent }}><strong>💡 Penguat Hati:</strong> {entry.cbt_rational}</p>}
                          {entry.audio_url && <audio src={entry.audio_url} controls style={{ width: '100%', height: '32px', marginTop: '8px' }} />}
                        </>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;