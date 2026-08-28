import React, { useState } from 'react';

function SpeechToText({ onTranscriptChange, theme }) {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Browser kamu belum mendukung fitur Speech-to-Text.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID'; // Bahasa Indonesia
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      console.error(e);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscriptChange(transcript);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={startListening}
      style={{
        padding: '6px 12px',
        fontSize: '11px',
        borderRadius: '8px',
        border: `1px solid ${theme.cardBorder}`,
        background: isListening ? '#FF5A5F' : theme.cardBg,
        color: isListening ? '#FFF' : theme.text,
        cursor: 'pointer',
        fontWeight: 600,
        marginBottom: '6px'
      }}
    >
      {isListening ? '🎙️ Mendengarkan...' : '🗣️ Dikte Teks (Speech-to-Text)'}
    </button>
  );
}

export default SpeechToText;