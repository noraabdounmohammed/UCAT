import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, BookOpen, Zap } from 'lucide-react';

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
  
  // Rotate through tips and facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % (tips.length + medicalFacts.length));
    }, 3000);
    return () => clearInterval(interval);
  }, [tips.length, medicalFacts.length]);
  
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
      className="fixed inset-0 bg-white flex items-center justify-center z-50 p-4 sm:p-6"
    >
      <div className="max-w-lg w-full text-center px-4">
        {/* Animated Icon */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="relative">
            <div className="absolute inset-0 bg-gray-900/5 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="relative bg-gray-100 p-5 sm:p-6 rounded-full border border-gray-200">
              {animationPhase === 0 && <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-gray-900" strokeWidth={1.5} />}
              {animationPhase === 1 && <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-gray-900" strokeWidth={1.5} />}
              {animationPhase === 2 && <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-gray-900" strokeWidth={1.5} />}
              {animationPhase === 3 && <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-gray-900" strokeWidth={1.5} />}
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 mb-2 sm:mb-3 tracking-tight" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
          {format === 'mindmap' ? 'Crafting Mind Maps' : format === 'flashcard' ? 'Creating Flashcards' : 'Generating Questions'}
        </h2>
        <p className="text-sm text-gray-600 font-light mb-8 sm:mb-12 max-w-sm mx-auto" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
          {format === 'mindmap' 
            ? `Building ${conceptCount} interactive visualization${conceptCount > 1 ? 's' : ''}`
            : `Crafting ${conceptCount} personalized ${format === 'flashcard' ? 'flashcard' : 'question'}${conceptCount > 1 ? 's' : ''}`
          }
        </p>
        
        {/* Progress Bar */}
        <div className="mb-10 sm:mb-16">
          <div className="flex justify-between text-[10px] text-gray-500 mb-3 uppercase tracking-[0.2em]" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-900 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Single Rotating Tip */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
            {currentTip % 2 === 0 ? tips[Math.floor(currentTip / 2)] : medicalFacts[Math.floor(currentTip / 2)]}
          </p>
        </div>
        
        {/* Footer */}
        <p className="text-xs text-gray-500" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
          This usually takes 10-30 seconds
        </p>
      </div>
    </div>
  );
};
