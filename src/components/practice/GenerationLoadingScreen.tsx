import React, { useState, useEffect } from 'react';
import { Loader2, Brain, Sparkles, BookOpen, Zap, Target, TrendingUp, Clock } from 'lucide-react';

interface GenerationLoadingScreenProps {
  format?: 'flashcard' | 'ukmla_sba';
  conceptCount?: number;
  currentProgress?: number;
}

export const GenerationLoadingScreen: React.FC<GenerationLoadingScreenProps> = ({
  format = 'ukmla_sba',
  conceptCount = 1,
  currentProgress = 0
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  
  // Educational tips to show while loading
  const tips = format === 'flashcard' ? [
    "💡 Flashcards use spaced repetition to optimize memory retention",
    "🧠 Active recall strengthens neural pathways more than passive review",
    "📚 The Feynman Technique: If you can't explain it simply, you don't understand it",
    "⏰ Short, frequent study sessions are more effective than cramming",
    "🎯 Testing yourself is 50% more effective than re-reading notes",
    "🔄 Interleaving different topics improves problem-solving skills",
    "✨ Your brain consolidates memories during sleep - rest is crucial",
    "📈 The forgetting curve shows why regular review is essential"
  ] : [
    "🏥 UKMLA tests clinical reasoning, not just factual recall",
    "📋 Always read the question stem carefully - every detail matters",
    "🎯 The 'most appropriate' answer considers UK clinical guidelines",
    "⚡ Pattern recognition improves with deliberate practice",
    "🔍 Look for keywords that indicate urgency or severity",
    "💊 Consider patient safety as the top priority in management questions",
    "📊 Data interpretation questions test analytical skills",
    "🌟 Understanding pathophysiology helps eliminate wrong answers"
  ];
  
  // Medical facts to display
  const medicalFacts = [
    "The human brain contains approximately 86 billion neurons",
    "Your heart beats about 100,000 times per day",
    "The surface area of human lungs is roughly the size of a tennis court",
    "Bone is 5 times stronger than steel when compared pound for pound",
    "The human body produces 25 million new cells every second",
    "Your liver can regenerate itself from just 25% of its tissue mass",
    "The acid in your stomach is strong enough to dissolve metal",
    "Human blood vessels laid end to end would circle Earth 2.5 times"
  ];
  
  const [currentFact, setCurrentFact] = useState(0);
  
  // Rotate through tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tips.length]);
  
  // Rotate through facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % medicalFacts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  
  // Animation phases
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 4);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Estimate progress based on time if not provided
  const [estimatedProgress, setEstimatedProgress] = useState(0);
  useEffect(() => {
    if (currentProgress === 0) {
      const interval = setInterval(() => {
        setEstimatedProgress((prev) => {
          if (prev >= 90) return 90; // Don't go past 90% until actually done
          return prev + Math.random() * 15;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setEstimatedProgress(currentProgress);
    }
  }, [currentProgress]);
  
  const progressPercentage = Math.min(estimatedProgress, 100);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center z-50">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
          
          {/* Animated Icon Header */}
          <div className="flex justify-center">
            <div className="relative">
              <div className={`absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-30 animate-pulse`}></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-full">
                {animationPhase === 0 && <Brain className="h-12 w-12 text-white animate-pulse" />}
                {animationPhase === 1 && <Sparkles className="h-12 w-12 text-white animate-pulse" />}
                {animationPhase === 2 && <BookOpen className="h-12 w-12 text-white animate-pulse" />}
                {animationPhase === 3 && <Zap className="h-12 w-12 text-white animate-pulse" />}
              </div>
            </div>
          </div>
          
          {/* Main Loading Message */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Generating {format === 'flashcard' ? 'Flashcards' : 'Questions'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Creating {conceptCount} personalized {format === 'flashcard' ? 'flashcard' : 'question'}
              {conceptCount > 1 ? 's' : ''} using AI...
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Study Tip Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 transition-all duration-500">
            <div className="flex items-start space-x-3">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Study Tip
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                  {tips[currentTip]}
                </p>
              </div>
            </div>
          </div>
          
          {/* Medical Fact Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-1">
                  Did You Know?
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-300 leading-relaxed">
                  {medicalFacts[currentFact]}
                </p>
              </div>
            </div>
          </div>
          
          {/* Loading Spinner */}
          <div className="flex justify-center items-center space-x-3">
            <Loader2 className="h-5 w-5 text-gray-500 dark:text-gray-400 animate-spin" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              This usually takes 10-30 seconds...
            </span>
          </div>
          
          {/* Bottom Message */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <Clock className="inline h-3 w-3 mr-1" />
              Quality questions take time to generate. Your patience ensures better learning outcomes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
