import React, { useState } from 'react';
import { supabase } from './supabaseClient';

function Auth({ theme }) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registrasi berhasil! Silakan cek email kamu atau langsung login.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: theme.bg, color: theme.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        maxWidth: '400px', width: '100%', background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`, borderRadius: '24px', padding: '32px 24px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #9D84B7, #7A5C9E)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '30px', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(157, 132, 183, 0.3)'
        }}>
          🌸
        </div>
        
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px', color: theme.text }}>
          Pikiran Berbicara
        </h2>
        <p style={{ fontSize: '13px', color: theme.subtext, margin: '0 0 24px' }}>
          {isSignUp ? 'Buat akun baru untuk mulai menjurnal' : 'Masuk untuk mengakses jurnal pribadimu'}
        </p>

        {message && (
          <div style={{
            background: message.includes('berhasil') ? '#E8F5E9' : '#FFEBEE',
            color: message.includes('berhasil') ? '#2E7D32' : '#C62828',
            padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px', textAlign: 'left'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="email"
            placeholder="Alamat Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '12px',
              border: `1px solid ${theme.inputBorder}`, background: theme.inputBg,
              color: theme.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box'
            }}
          />
          <input
            type="password"
            placeholder="Password (minimal 6 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '12px',
              border: `1px solid ${theme.inputBorder}`, background: theme.inputBg,
              color: theme.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: theme.accent, color: '#FFF',
              border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', marginTop: '6px'
            }}
          >
            {loading ? 'Memproses...' : isSignUp ? 'Daftar Akun ✨' : 'Masuk ✨'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '13px', color: theme.subtext }}>
          {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <span
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }}
            style={{ color: theme.accent, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Masuk di sini' : 'Daftar gratis'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Auth;