/**
 * Learn Page
 * Main study experience with FSRS spaced repetition, your polished UI,
 * streak tracking, predicted score, and NICE citations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ApplePracticeSession } from '@/components/practice/ApplePracticeSession';
import { StreakBadge } from '@/components/practice/StreakBadge';
import { PredictedScoreBadge } from '@/components/practice/PredictedScoreBadge';
import { GenerationLoadingScreen } from '@/components/practice/GenerationLoadingScreen';
import { createConceptStore } from '@/store/conceptStore';
// import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Play, ArrowLeft } from 'lucide-react';

// Default curriculum for learn page
const DEFAULT_CURRICULUM_ID = 'ukmla-akt';

export const LearnPage: React.FC = () => {
  const navigate = useNavigate();
  // const { user } = useAuth();
  
  // Create curriculum-specific store
  const useConceptStore = useMemo(() => createConceptStore(DEFAULT_CURRICULUM_ID), []);
  
  const {
    concepts,
    filteredConcepts,
    isLoading,
    isPracticing,
    practiceQuestions,
    loadConcepts,
    startPractice,
    endPractice
  } = useConceptStore();

  // Local state
  const [streakDays, setStreakDays] = useState(0);
  const [predictedScore, setPredictedScore] = useState(0);
  const [atomCount, setAtomCount] = useState(0);
  const [isStarting, setIsStarting] = useState(false);

  // Load concepts on mount
  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

  // Calculate streak from localStorage
  useEffect(() => {
    const calculateStreak = () => {
      const sessionsKey = `${DEFAULT_CURRICULUM_ID}_practice_sessions_history`;
      const sessionsData = localStorage.getItem(sessionsKey);
      if (!sessionsData) return 0;

      try {
        const sessions = JSON.parse(sessionsData);
        if (!sessions.length) return 0;

        // Get unique dates
        const dates = [...new Set(sessions.map((s: any) => s.date))].sort().reverse();
        
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // Check if studied today or yesterday
        if (dates[0] !== today && dates[0] !== yesterday) return 0;
        
        // Count consecutive days
        for (let i = 0; i < dates.length; i++) {
          const expectedDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
          if (dates[i] === expectedDate) {
            streak++;
          } else {
            break;
          }
        }
        
        return streak;
      } catch {
        return 0;
      }
    };

    setStreakDays(calculateStreak());
  }, [isPracticing]);

  // Calculate predicted score from mastery data
  useEffect(() => {
    if (concepts.length === 0) return;

    const conceptsWithMastery = concepts.filter(c => 
      c.mastery_data && c.mastery_data.attempts > 0
    );
    
    setAtomCount(conceptsWithMastery.length);

    if (conceptsWithMastery.length === 0) {
      setPredictedScore(0);
      return;
    }

    // Calculate average mastery level (0-2 scale, convert to 0-100)
    const avgMastery = conceptsWithMastery.reduce((sum, c) => 
      sum + (c.mastery_data?.mastery_level || 0), 0
    ) / conceptsWithMastery.length;

    // Convert to percentage (mastery 2 = 100%)
    const score = Math.min(100, (avgMastery / 2) * 100);
    setPredictedScore(score);
  }, [concepts]);

  // Handle starting practice
  const handleStartPractice = async () => {
    setIsStarting(true);
    try {
      await startPractice({
        target_bloom_levels: [],
        target_formats: ['ukmla_sba'],
        question_count: 5,
        custom_prompt: ''
      });
    } finally {
      setIsStarting(false);
    }
  };

  // Handle practice completion
  const handlePracticeComplete = () => {
    endPractice();
  };

  // Handle answer submission (for FSRS tracking)
  const handleAnswerSubmit = (questionId: string, isCorrect: boolean) => {
    // FSRS tracking will be added here
    console.log('Answer submitted:', { questionId, isCorrect });
  };

  // Show loading screen while generating questions
  if ((isLoading && isPracticing) || isStarting) {
    return (
      <MainLayout currentPage="learn">
        <GenerationLoadingScreen format="ukmla_sba" conceptCount={5} />
      </MainLayout>
    );
  }

  // Show practice session
  if (isPracticing && practiceQuestions.length > 0) {
    return (
      <MainLayout currentPage="learn">
        <div className="relative">
          {/* Header with streak and score */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
              <StreakBadge days={streakDays} />
              <PredictedScoreBadge score={predictedScore} atomCount={atomCount} />
            </div>
          </div>
          
          {/* Practice session with top padding for header */}
          <div className="pt-14">
            <ApplePracticeSession
              questions={practiceQuestions}
              onComplete={handlePracticeComplete}
              onAnswerSubmit={handleAnswerSubmit}
              section="UKMLA AKT"
              defaultFormat="ukmla_sba"
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show start screen
  return (
    <MainLayout currentPage="learn">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          <StreakBadge days={streakDays} />
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
          {/* Icon and title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Daily Study
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Spaced repetition powered by FSRS-5 for optimal retention
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {atomCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Concepts studied
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
              <PredictedScoreBadge 
                score={predictedScore} 
                atomCount={atomCount}
                className="justify-center"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Predicted score
              </div>
            </div>
          </div>

          {/* Concepts available */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            {filteredConcepts.length} concepts available for practice
          </div>

          {/* Start button */}
          <button
            onClick={handleStartPractice}
            disabled={filteredConcepts.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-5 w-5" />
            Start 5-Question Session
          </button>

          {/* Info */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Questions are selected based on what you're about to forget
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default LearnPage;
