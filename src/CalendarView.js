import React, { useState } from 'react';

const moodConfig = {
  '😊': { label: 'Senang', color: '#FFD97D', bg: '#FFF9E6' },
  '😐': { label: 'Netral', color: '#A0C4FF', bg: '#EBF2FF' },
  '😫': { label: 'Lelah', color: '#FFADAD', bg: '#FFE5E5' },
  '😴': { label: 'Ngantuk', color: '#BDB2FF', bg: '#F0EDFF' },
};

function CalendarView({ journalList, theme }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Peta data mood berdasarkan tanggal (YYYY-MM-DD)
  const journalMap = {};
  journalList.forEach(entry => {
    const d = new Date(entry.id);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!journalMap[key] && entry.mood) {
      journalMap[key] = entry.mood;
    }
  });

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<div key={`empty-${i}`} style={{ height: '50px' }}></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${month}-${day}`;
    const mood = journalMap[key];
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

    days.push(
      <div
        key={day}
        style={{
          height: '54px', borderRadius: '12px', border: `1px solid ${isToday ? theme.accent : theme.cardBorder}`,
          background: isToday ? `${theme.accent}15` : theme.inputBg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: isToday ? 800 : 500, color: isToday ? theme.accent : theme.subtext }}>
          {day}
        </span>
        {mood && (
          <span style={{ fontSize: '18px', marginTop: '2px' }} title={moodConfig[mood]?.label}>
            {mood}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: theme.text }}>
          🗓️ {monthNames[month]} {year}
        </h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={prevMonth} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.cardBorder}`, background: theme.inputBg, color: theme.text, cursor: 'pointer' }}>◀</button>
          <button onClick={nextMonth} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.cardBorder}`, background: theme.inputBg, color: theme.text, cursor: 'pointer' }}>▶</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: theme.subtext, marginBottom: '8px' }}>
        <div>Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {days}
      </div>
    </div>
  );
}

export default CalendarView;