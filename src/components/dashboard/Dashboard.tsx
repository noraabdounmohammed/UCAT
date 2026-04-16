import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PracticeSection } from '@/components/practice/PracticeSection';
import { QuestionFormatSelector } from '@/components/dashboard/QuestionFormatSelector';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedFormat, setSelectedFormat] = useState<string>('sba');

  // Day of week greeting
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // User initials from name or email
  const getInitials = (): string => {
    const name: string = (user as any)?.user_metadata?.full_name || user?.email || '';
    const parts = name.split(/[\s@]/);
    return parts
      .slice(0, 2)
      .map((p: string) => (p[0] || '').toUpperCase())
      .join('') || 'M';
  };

  // Load saved format preference from localStorage
  useEffect(() => {
    const savedFormat = localStorage.getItem('preferredQuestionFormat');
    if (savedFormat) {
      setSelectedFormat(savedFormat);
    }
  }, []);

  // Save format preference when it changes
  const handleFormatChange = (formatId: string) => {
    setSelectedFormat(formatId);
    localStorage.setItem('preferredQuestionFormat', formatId);
  };

  // Navigate to the dedicated practice page with section and format parameters
  const handlePracticeStart = (section: string) => {
    navigate(`/practice?section=${section}&format=${selectedFormat}`);
  };

  return (
    <div>
      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <span
          style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 300,
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#A89880',
          }}
        >
          {dayName}
        </span>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: '#F2D4C8',
            color: '#6A2E1E',
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 500,
            fontSize: '11px',
          }}
        >
          {getInitials()}
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="mb-10">
        <h1
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontWeight: 300,
            fontSize: 'clamp(26px, 5.5vw, 36px)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#1C1814',
          }}
        >
          Study with
          <br />
          <em style={{ fontStyle: 'italic', color: '#C47A62' }}>intention.</em>
        </h1>
      </div>

      {/* ── FORMAT TILES ─────────────────────────────────── */}
      <QuestionFormatSelector
        selectedFormat={selectedFormat}
        onFormatChange={handleFormatChange}
      />

      {/* ── DIVIDER ──────────────────────────────────────── */}
      <div style={{ height: '0.5px', backgroundColor: '#E4DDD4', margin: '0 0 28px' }} />

      {/* ── CATEGORY TILES ───────────────────────────────── */}
      <PracticeSection
        onPracticeStart={handlePracticeStart}
      />
    </div>
  );
};

export default Dashboard;
