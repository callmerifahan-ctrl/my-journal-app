import React, { useState } from 'react';

function SpeechToText({ onResult, theme }) {
  const [isListening, setIsListening] = useState(false);

  // Penanganan aman jika prop 'theme' tidak dikirim
  const borderColor = theme?.cardBorder || '#8A70AB';

  const handleListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Fitur Pengenalan Suara (Speech Recognition) tidak didukung di browser ini. Coba gunakan Google Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (onResult) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Error speech recognition:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <button
      type="button"
      onClick={handleListen}
      style={{
        padding: '6px 12px',
        borderRadius: '20px',
        border: `1px solid ${borderColor}`,
        backgroundColor: isListening ? '#FF5252' : 'transparent',
        color: isListening ? '#FFF' : 'inherit',
        fontSize: '0.75rem',
        cursor: 'pointer',
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: '0.2s'
      }}
    >
      <span>{isListening ? '🎙️ Mendengarkan...' : '🗣️ Dikte Teks'}</span>
    </button>
  );
}

export default SpeechToText;