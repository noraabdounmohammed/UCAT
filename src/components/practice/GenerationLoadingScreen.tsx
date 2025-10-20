import React, { useState, useEffect } from 'react';
import { Loader2, Brain, Sparkles, BookOpen, Zap, Target, TrendingUp, Clock } from 'lucide-react';

interface GenerationLoadingScreenProps {
  format?: 'flashcard' | 'ukmla_sba' | 'mindmap';
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
    "⚡ Testing yourself is more effective than re-reading notes",
    "🎯 Focus on concepts you find challenging for maximum improvement"
  ] : format === 'mindmap' ? [
    "🗺️ Mind maps help visualize relationships between concepts",
    "🧠 Visual learning engages both hemispheres of your brain",
    "🔗 Understanding connections improves long-term retention",
    "🎨 Color coding and spatial arrangement aid memory formation",
    "📊 Hierarchical thinking develops deeper comprehension"
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
    <div 
      className="fixed inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-md w-full">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl overflow-hidden">
          
          {/* Header with Icon */}
          <div className="px-6 py-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-[#007AFF] rounded-full blur-xl opacity-20 animate-pulse"></div>
                <div className="relative bg-[#007AFF] p-4 rounded-full shadow-lg">
                  {animationPhase === 0 && <Brain className="h-8 w-8 text-white" />}
                  {animationPhase === 1 && <Sparkles className="h-8 w-8 text-white" />}
                  {animationPhase === 2 && <BookOpen className="h-8 w-8 text-white" />}
                  {animationPhase === 3 && <Zap className="h-8 w-8 text-white" />}
                </div>
              </div>
            </div>
            
            <h2 className="text-[20px] font-semibold text-zinc-900 dark:text-white mb-2">
              {format === 'mindmap' ? 'Preparing Mind Maps' : `Generating ${format === 'flashcard' ? 'Flashcards' : 'Questions'}`}
            </h2>
            <p className="text-[15px] text-zinc-600 dark:text-zinc-400">
              {format === 'mindmap' 
                ? `Preparing ${conceptCount} interactive mind map${conceptCount > 1 ? 's' : ''}...`
                : `Creating ${conceptCount} personalized ${format === 'flashcard' ? 'flashcard' : 'question'}${conceptCount > 1 ? 's' : ''} using AI...`
              }
            </p>
          </div>
          
          {/* Progress Section */}
          <div className="px-6 pb-6">
            <div className="flex justify-between text-[13px] text-zinc-500 dark:text-zinc-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-zinc-200/60 dark:bg-zinc-700/60 backdrop-blur-xl rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#007AFF] transition-all duration-500 ease-out relative rounded-full"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
          
          {/* Content Cards */}
          <div className="px-6 pb-6 space-y-4">
            
            {/* Study Tip Card */}
            <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 transition-all duration-500">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Target className="h-4 w-4 text-[#007AFF]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white mb-1">
                    Study Tip
                  </h3>
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {tips[currentTip]}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Medical Fact Card */}
            <div className="bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-white mb-1">
                    Did You Know?
                  </h3>
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {medicalFacts[currentFact]}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-black/[0.08] dark:border-white/[0.08] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl">
            <div className="flex justify-center items-center gap-3 mb-3">
              <Loader2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400 animate-spin" />
              <span className="text-[13px] text-zinc-600 dark:text-zinc-400">
                This usually takes 10-30 seconds...
              </span>
            </div>
            
            <div className="text-center">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Quality questions take time to generate. Your patience ensures better learning outcomes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
