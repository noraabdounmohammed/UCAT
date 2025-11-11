import React, { useState, useMemo } from 'react';
import { Target, Play, Settings, TrendingUp, Clock, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { useConceptStore, ConceptStoreProvider } from '@/contexts/ConceptStoreContext';
import { useGoalsStore } from '@/stores/goalsStore';
import { GoalsEditor } from '@/components/goals/GoalsEditor';
import { calculatePaceMetrics, calculateOverallStatus } from '@/utils/etaCalculator';
import { generateNextSession, formatCategoryMix } from '@/utils/sessionGenerator';
import { getRecommendedCuratedSessions, selectConceptsForCuratedSession, type CuratedSession } from '@/utils/curatedSessions';
import { useNavigate } from 'react-router-dom';
import { getOrCreateLearningPlan, generateTodaysPlan, type LearningPlan } from '@/utils/learningPlan';
import TodayStrip from '@/components/learning/TodayStrip';
import LearningPlanList from '@/components/learning/LearningPlanList';

interface CurriculumDashboardProps {
  curriculumId?: string;
}

export const CurriculumDashboardContent: React.FC<CurriculumDashboardProps> = ({ 
  curriculumId = 'default' 
}) => {
  const navigate = useNavigate();
  const { filteredConcepts, startPractice, setPracticeSelection } = useConceptStore();
  const { getGoals } = useGoalsStore();
  const [showGoalsEditor, setShowGoalsEditor] = useState(false);

  const goals = getGoals(curriculumId);

  // Load session history
  const sessionHistory = useMemo(() => {
    const sessionsKey = `${curriculumId}_practice_sessions_history`;
    const saved = localStorage.getItem(sessionsKey);
    return saved ? JSON.parse(saved).slice(0, 50) : [];
  }, [curriculumId]);

  // Calculate current stats
  // Simple: correct/incorrect/unseen based on most recent answer (mastery_level)
  const stats = useMemo(() => {
    const total = filteredConcepts.length;
    const attempted = filteredConcepts.filter((c) => c.mastery_data.attempts > 0).length;
    const correct = filteredConcepts.filter((c) => c.mastery_data.mastery_level === 2).length;
    const incorrect = filteredConcepts.filter((c) => c.mastery_data.mastery_level === 1).length;
    const unseen = filteredConcepts.filter((c) => c.mastery_data.mastery_level === 0).length;
    const accuracy = attempted > 0 ? correct / attempted : 0;

    console.log('📊 Dashboard Stats:', {
      total,
      attempted,
      correct,
      incorrect,
      unseen,
      accuracy: Math.round(accuracy * 100) + '%',
      sampleConcepts: filteredConcepts.slice(0, 3).map(c => ({
        title: c.title,
        mastery_level: c.mastery_data.mastery_level,
        attempts: c.mastery_data.attempts
      }))
    });

    return {
      total,
      attempted,
      accuracy,
      coverage: total > 0 ? attempted / total : 0,
    };
  }, [filteredConcepts]);

  // Calculate pace metrics
  const paceMetrics = useMemo(() => {
    return calculatePaceMetrics(
      sessionHistory,
      stats.total,
      stats.attempted,
      stats.accuracy
    );
  }, [sessionHistory, stats]);

  // Calculate ETA and status
  const statusInfo = useMemo(() => {
    if (!goals) {
      return {
        status: 'no-goal' as const,
        message: 'Set your goals to track progress',
        coverageETA: { daysToGoal: null, targetDate: null, status: 'no-goal' as const, confidence: 'high' as const, message: '' },
        accuracyETA: { daysToGoal: null, targetDate: null, status: 'no-goal' as const, confidence: 'high' as const, message: '' },
      };
    }
    return calculateOverallStatus(paceMetrics, goals);
  }, [goals, paceMetrics]);

  // Learning Plan (units/lessons) and Today's plan
  const learningPlan: LearningPlan = useMemo(() => {
    return getOrCreateLearningPlan(curriculumId, filteredConcepts as any, goals);
  }, [curriculumId, filteredConcepts, goals]);

  const today = useMemo(() => {
    return generateTodaysPlan(filteredConcepts as any, learningPlan, goals);
  }, [filteredConcepts, learningPlan, goals]);

  // Today actions: start targeted sessions using practiceSelection
  const handleStartQuick = () => {
    if (today.quickReviewIds.length === 0) return;
    setPracticeSelection(today.quickReviewIds);
    startPractice({ question_count: today.quickReviewIds.length, target_formats: ['ukmla_sba'] });
  };

  const handleStartWeak = () => {
    if (today.weakWorkoutIds.length === 0) return;
    setPracticeSelection(today.weakWorkoutIds);
    startPractice({ question_count: today.weakWorkoutIds.length, target_formats: ['ukmla_sba'] });
  };

  const handleStartNewLesson = () => {
    if (!today.newLesson) return;
    setPracticeSelection(today.newLesson.conceptIds);
    startPractice({ question_count: today.newLesson.conceptIds.length, target_formats: ['ukmla_sba'] });
  };

  // Get recommended curated sessions
  const curatedSessions = useMemo(() => {
    return getRecommendedCuratedSessions(stats.attempted, stats.total);
  }, [stats.attempted, stats.total]);

  // Generate next session (goal-aligned or curated)
  const nextSession = useMemo(() => {
    if (!goals) return null;
    
    // If user has very little history, show curated session instead
    if (stats.attempted < 5 && curatedSessions.length > 0) {
      return null; // Will show curated sessions instead
    }
    
    const concepts = filteredConcepts.map((c) => ({
      id: c.concept_id,
      title: c.title,
      masteryScore: c.mastery_data.attempts > 0 
        ? c.mastery_data.correct / c.mastery_data.attempts 
        : 0,
      lastReviewed: c.mastery_data.last_practiced || undefined,
      custom_filters: c.custom_filters,
      attempts: c.mastery_data.attempts,
    }));

    return generateNextSession(concepts, goals, paceMetrics, 40);
  }, [filteredConcepts, goals, paceMetrics, stats.attempted, curatedSessions]);

  const handleStartSession = () => {
    if (nextSession && nextSession.concepts.length > 0) {
      const ids = nextSession.concepts.map((c) => c.id);
      setPracticeSelection(ids);
      startPractice({ question_count: ids.length, target_formats: ['ukmla_sba'] });
    }
  };

  const handleStartCuratedSession = (session: CuratedSession) => {
    // Select concepts for this curated session
    const conceptsForSession = filteredConcepts.map(c => ({
      id: c.concept_id,
      title: c.title,
      custom_filters: c.custom_filters,
      attempts: c.mastery_data.attempts,
    }));
    
    const selectedConceptIds = selectConceptsForCuratedSession(session, conceptsForSession);
    setPracticeSelection(selectedConceptIds);
    startPractice({ question_count: selectedConceptIds.length, target_formats: ['ukmla_sba'] });
  };

  const statusColors = {
    'ahead': 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    'on-track': 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'at-risk': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    'behind': 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    'no-goal': 'bg-gray-100 dark:bg-gray-800/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Progress Rings Summary */}
        {goals && (
          <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-8">
            {/* Status + Adjust Button */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {statusInfo.status === 'ahead' ? '🎉 Ahead' :
                 statusInfo.status === 'on-track' ? '✅ On Track' :
                 statusInfo.status === 'at-risk' ? '⚠️ At Risk' :
                 '🚨 Behind'}
              </h2>
              <button
                onClick={() => setShowGoalsEditor(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Adjust Goals
              </button>
            </div>

        {/* Today Strip */}
        {filteredConcepts.length > 0 && (
          <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Today</h2>
            </div>
            <TodayStrip 
              today={today} 
              onStartQuick={handleStartQuick}
              onStartWeak={handleStartWeak}
              onStartNewLesson={handleStartNewLesson}
            />
          </div>
        )}

            {/* Progress Rings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Accuracy Ring */}
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: 160, height: 160 }}>
                  <svg width={160} height={160} className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx={80}
                      cy={80}
                      r={70}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={16}
                      className="text-zinc-100 dark:text-zinc-800"
                    />
                    
                    {/* Progress arc */}
                    <circle
                      cx={80}
                      cy={80}
                      r={70}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={16}
                      strokeDasharray={439.8}
                      strokeDashoffset={439.8 - (Math.min((stats.accuracy / (goals.accuracyTarget || 1)), 1) * 439.8)}
                      className={`transition-all duration-500 ${
                        stats.accuracy >= (goals.accuracyTarget || 0) ? 'text-green-500' :
                        stats.accuracy >= (goals.accuracyTarget || 0) * 0.8 ? 'text-blue-500' :
                        'text-orange-500'
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {Math.round(stats.accuracy * 100)}%
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      of {Math.round((goals.accuracyTarget || 0) * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <div className="font-semibold text-zinc-900 dark:text-white text-sm mb-1">
                    Accuracy
                  </div>
                  {statusInfo.accuracyETA.daysToGoal && stats.accuracy < (goals.accuracyTarget || 0) && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {statusInfo.accuracyETA.daysToGoal} days at current pace
                    </div>
                  )}
                  {stats.accuracy >= (goals.accuracyTarget || 0) && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      ✓ Goal achieved!
                    </div>
                  )}
                </div>
              </div>

              {/* Coverage Ring */}
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: 160, height: 160 }}>
                  <svg width={160} height={160} className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx={80}
                      cy={80}
                      r={70}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={16}
                      className="text-zinc-100 dark:text-zinc-800"
                    />
                    
                    {/* Progress arc */}
                    <circle
                      cx={80}
                      cy={80}
                      r={70}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={16}
                      strokeDasharray={439.8}
                      strokeDashoffset={439.8 - (Math.min((stats.coverage / (goals.coverageTarget || 1)), 1) * 439.8)}
                      className={`transition-all duration-500 ${
                        stats.coverage >= (goals.coverageTarget || 0) ? 'text-green-500' :
                        stats.coverage >= (goals.coverageTarget || 0) * 0.8 ? 'text-purple-500' :
                        'text-orange-500'
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {Math.round(stats.coverage * 100)}%
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      of {Math.round((goals.coverageTarget || 0) * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <div className="font-semibold text-zinc-900 dark:text-white text-sm mb-1">
                    Coverage
                  </div>
                  {statusInfo.coverageETA.daysToGoal && stats.coverage < (goals.coverageTarget || 0) && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {statusInfo.coverageETA.daysToGoal} days at current pace
                    </div>
                  )}
                  {stats.coverage >= (goals.coverageTarget || 0) && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      ✓ Goal achieved!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Deadline */}
            {goals.deadlineISO && (
              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-700 text-center">
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Target Date</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-white">
                  {new Date(goals.deadlineISO).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {Math.max(0, Math.ceil((new Date(goals.deadlineISO).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} days remaining
                </div>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Your Progress Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your goals and stay on pace
              </p>
            </div>
            {!goals && (
              <button
                onClick={() => setShowGoalsEditor(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                <Target className="h-4 w-4" />
                Set Goals
              </button>
            )}
          </div>
        </div>

        {/* Goals & Progress Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Progress */}
          <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Current Progress
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Accuracy
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(stats.accuracy * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${stats.accuracy * 100}%` }}
                  />
                </div>
                {goals?.accuracyTarget && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Target: {Math.round(goals.accuracyTarget * 100)}% • {statusInfo.accuracyETA.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Coverage
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(stats.coverage * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 transition-all duration-500"
                    style={{ width: `${stats.coverage * 100}%` }}
                  />
                </div>
                {goals?.coverageTarget && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Target: {Math.round(goals.coverageTarget * 100)}% • {statusInfo.coverageETA.message}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.attempted} of {stats.total} concepts attempted
                </div>
              </div>
            </div>
          </div>

          {/* Your Pace */}
          <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Your Pace (Last 14 Days)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Reviews/Day
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(paceMetrics.reviewsPerDay)}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Minutes/Day
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(paceMetrics.minutesPerDay)}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    New/Day
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(paceMetrics.newConceptsPerDay)}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Sessions
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sessionHistory.filter((s: any) => {
                    const daysSince = (Date.now() - new Date(s.date).getTime()) / (24 * 60 * 60 * 1000);
                    return daysSince <= 14;
                  }).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Plan */}
        {learningPlan.units.length > 0 && (
          <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Learning plan</h2>
            </div>
            <LearningPlanList 
              plan={learningPlan}
              onStartLesson={(lesson) => {
                setPracticeSelection(lesson.conceptIds);
                startPractice({ question_count: lesson.conceptIds.length, target_formats: ['ukmla_sba'] });
              }}
            />
          </div>
        )}

        {/* Next Session Card - Goal-aligned or Curated */}
        {nextSession ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-xl rounded-3xl border border-blue-200 dark:border-blue-800 p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Your Next Session
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Optimized for your goals • ~{nextSession.estimatedMinutes} minutes
                </p>
              </div>
              <button
                onClick={handleStartSession}
                disabled={nextSession.concepts.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-colors shadow-lg"
              >
                <Play className="h-5 w-5" />
                Start Session
              </button>
            </div>

            {/* Session Breakdown */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Due Reviews</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {nextSession.breakdown.due}
                </div>
              </div>
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Weak Concepts</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {nextSession.breakdown.weak}
                </div>
              </div>
              <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Concepts</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {nextSession.breakdown.unseen}
                </div>
              </div>
            </div>

            {/* Rationale */}
            <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Why These Concepts?
              </h3>
              <ul className="space-y-1">
                {nextSession.rationale.map((reason, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Category mix: {formatCategoryMix(nextSession.categoryMix)}
                </p>
              </div>
            </div>
          </div>
        ) : goals && curatedSessions.length > 0 ? (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 backdrop-blur-xl rounded-3xl border border-purple-200 dark:border-purple-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Curated Learning Paths
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Expert-designed sessions to get you started
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {curatedSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-6 bg-white/60 dark:bg-gray-800/60 rounded-xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all cursor-pointer border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-700"
                  onClick={() => handleStartCuratedSession(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{session.icon}</span>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {session.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {session.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          ~{session.estimatedMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {session.conceptCount} concepts
                        </span>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                          {session.difficulty}
                        </span>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors ml-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartCuratedSession(session);
                      }}
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* No Goals State */}
        {!goals && (
          <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-black/[0.08] dark:border-white/[0.08] p-12 text-center">
            <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Set Your Goals to Get Started
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Define your targets and let us plan your optimal practice sessions
            </p>
            <button
              onClick={() => setShowGoalsEditor(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
            >
              Set Goals Now
            </button>
          </div>
        )}
      </div>

      {/* Goals Editor Modal */}
      {showGoalsEditor && (
        <GoalsEditor
          curriculumId={curriculumId}
          onClose={() => setShowGoalsEditor(false)}
        />
      )}
    </div>
  );
};

// Wrapper component with ConceptStoreProvider
export const CurriculumDashboard: React.FC<CurriculumDashboardProps> = ({ 
  curriculumId = 'default' 
}) => {
  return (
    <ConceptStoreProvider curriculumId={curriculumId}>
      <CurriculumDashboardContent curriculumId={curriculumId} />
    </ConceptStoreProvider>
  );
};
