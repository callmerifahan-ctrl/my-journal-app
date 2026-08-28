import React, { useState, useRef, useEffect } from 'react';

const PROMPTS = [
  "Ceritakan hal kecil yang bikin kamu tersenyum hari ini dalam 60 detik!",
  "Kalau kamu punya waktu bebas seharian tanpa gadget, kamu mau ngapain?",
  "Jelaskan satu pelajaran berharga yang kamu dapatkan minggu ini!",
  "Apa hal paling menantang yang sedang kamu hadapi, dan bagaimana rencanamu?",
  "Ceritakan tentang makanan favoritmu seolah-olah kamu food critic di TV!",
  "Kalau kamu bisa bicara sama diri kamu 5 tahun lalu, pesan apa yang mau disampaikan?"
];

// Fungsi penentu badge berdasarkan durasi rekaman
const getBadge = (seconds) => {
  if (seconds < 10) return { title: "🐣 Pemula", color: "#A0C4FF" };
  if (seconds < 30) return { title: "🔥 Pendengar Setia", color: "#FFD97D" };
  if (seconds <= 60) return { title: "🏆 Speaker Handal (Pas 60s!)", color: "#77DD77" };
  return { title: "🗣️ Si Orator Panjang Lebar", color: "#FFADAD" };
};

function AudioRecorder({ onRecordingComplete, theme }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [earnedBadge, setEarnedBadge] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          // Stop otomatis kalau sudah 60 detik
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * PROMPTS.length);
    setCurrentPrompt(PROMPTS[randomIndex]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setEarnedBadge(null);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, url);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      alert('Izin akses mikrofon ditolak atau tidak didukung browser ini.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      
      // Hitung badge berdasarkan durasi terakhir
      setRecordingTime((finalTime) => {
        setEarnedBadge(getBadge(finalTime));
        return finalTime;
      });
    }
  };

  return (
    <div
      style={{
        background: theme.inputBg,
        border: `1px solid ${theme.inputBorder}`,
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
        marginTop: '10px',
      }}
    >
      <div style={{ marginBottom: '14px' }}>
        <button
          onClick={generateRandomPrompt}
          type="button"
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '8px',
            border: `1px solid ${theme.cardBorder}`,
            background: theme.cardBg,
            color: theme.accent,
            cursor: 'pointer',
            marginBottom: '8px'
          }}
        >
          🎲 Acak Topik Bicara
        </button>

        {currentPrompt && (
          <div style={{ 
            fontSize: '13px', 
            fontStyle: 'italic', 
            color: theme.text, 
            background: theme.cardBg, 
            padding: '10px', 
            borderRadius: '8px',
            borderLeft: `3px solid ${theme.accent}`
          }}>
            "{currentPrompt}"
          </div>
        )}
      </div>

      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: isRecording ? '#FF5A5F' : theme.text }}>
        ⏱️ Durasi: {formatTime(recordingTime)} / 01:00
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            type="button"
            style={{
              padding: '10px 18px',
              borderRadius: '20px',
              border: 'none',
              background: '#FF5A5F',
              color: '#FFF',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🎙️ Mulai Rekam
          </button>
        ) : (
          <button
            onClick={stopRecording}
            type="button"
            style={{
              padding: '10px 18px',
              borderRadius: '20px',
              border: 'none',
              background: '#333',
              color: '#FFF',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⏹️ Selesaikan Rekaman
          </button>
        )}
      </div>

      {/* TAMPILAN BADGE SETELAH REKAM */}
      {earnedBadge && !isRecording && (
        <div style={{ 
          margin: '10px 0', 
          padding: '8px 12px', 
          borderRadius: '20px', 
          background: earnedBadge.color, 
          color: '#333',
          fontWeight: 'bold',
          fontSize: '12px',
          display: 'inline-block'
        }}>
          Pencapaian: {earnedBadge.title}
        </div>
      )}

      {audioUrl && !isRecording && (
        <div style={{ marginTop: '10px' }}>
          <p style={{ fontSize: '12px', color: theme.subtext, margin: '0 0 6px' }}>Preview Rekaman Suara:</p>
          <audio src={audioUrl} controls style={{ width: '100%', height: '36px' }} />
        </div>
      )}
    </div>
  );
}

export default AudioRecorder;