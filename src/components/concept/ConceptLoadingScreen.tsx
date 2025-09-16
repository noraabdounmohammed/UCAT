import React, { useState, useEffect } from 'react';
import { Loader2, Brain, BookOpen, GraduationCap, Zap, Lightbulb, Target, Rocket } from 'lucide-react';

export const ConceptLoadingScreen: React.FC = () => {
  const [currentTip, setCurrentTip] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Universal study tips that appear while loading
  const studyTips = [
    "🎯 Active recall is 2-3x more effective than passive reading",
    "🧠 The testing effect: Taking practice tests improves long-term retention by 50%",
    "📚 Spaced repetition can increase retention rates from 20% to 80%",
    "⏰ The Pomodoro Technique: 25-minute focused sessions improve concentration",
    "💡 Teaching others is the best way to learn - the Feynman Technique",
    "🔄 Interleaving topics improves problem-solving abilities by 43%",
    "😴 Memory consolidation happens during sleep - aim for 7-9 hours",
    "✍️ Handwritten notes improve comprehension by 23% vs typing",
    "🎨 Visual mnemonics can improve recall by up to 65%",
    "🏃 20 minutes of exercise before studying improves focus and retention"
  ];
  
  // Interesting learning facts to display
  const learningFacts = [
    "Your brain creates new neural pathways every time you learn something",
    "It takes about 66 days to form a new habit",
    "The forgetting curve shows we lose 50% of new info within an hour",
    "Multitasking reduces productivity by up to 40%",
    "The brain can process images 60,000 times faster than text",
    "You remember 90% of what you teach others",
    "Learning a new skill can create up to 1 million new neural connections",
    "The brain generates about 20 watts of electrical power",
    "Short breaks every 90 minutes optimize mental performance",
    "Curiosity activates the same brain circuits as rewards"
  ];
  
  // General exam and practice tips
  const examTips = [
    "📋 Practice tests improve performance more than re-reading",
    "🎯 Focus on understanding concepts, not memorizing facts",
    "🔍 Look for keywords and context clues in questions",
    "📊 Break complex problems into smaller parts",
    "⏱️ Time management: allocate time based on question difficulty",
    "🚨 Answer all questions - there's no penalty for guessing",
    "👥 Study groups improve understanding through discussion",
    "📈 Track your progress to identify weak areas",
    "🎯 Process of elimination increases success rate by 25%",
    "✅ Review mistakes to avoid repeating them"
  ];
  
  // Rotate through tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % studyTips.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);
  
  // Rotate through facts
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % learningFacts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  
  // Animation phases for icons
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 6);
    }, 800);
    return () => clearInterval(interval);
  }, []);
  
  // Simulate progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.random() * 20;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);
  
  const icons = [Brain, BookOpen, Lightbulb, Target, Rocket, GraduationCap];
  const CurrentIcon = icons[animationPhase];
  
  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 space-y-6 border border-gray-200 dark:border-gray-700">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-full">
                <CurrentIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Loading Your Knowledge Base
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Preparing concepts, questions, and study materials...
              </p>
            </div>
          </div>
          
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-700 dark:text-gray-300">Loading Progress</span>
              <span className="text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          {/* Study Tip Card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Study Tip
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {studyTips[currentTip]}
                </p>
              </div>
            </div>
          </div>
          
          {/* Two Column Layout for Facts and Exam Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Learning Fact Card */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-3">
                <Zap className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Learning Fact
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {learningFacts[currentFact]}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Practice Tip Card */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-3">
                <GraduationCap className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Practice Tip
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {examTips[currentTip % examTips.length]}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* What's Loading Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Currently Preparing:
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${progress > 20 ? 'bg-green-500' : 'bg-gray-300'} animate-pulse`}></div>
                <span className={progress > 20 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                  Loading concept database
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${progress > 40 ? 'bg-green-500' : 'bg-gray-300'} animate-pulse`}></div>
                <span className={progress > 40 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                  Indexing relationships
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${progress > 60 ? 'bg-green-500' : 'bg-gray-300'} animate-pulse`}></div>
                <span className={progress > 60 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                  Building filters
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${progress > 80 ? 'bg-green-500' : 'bg-gray-300'} animate-pulse`}></div>
                <span className={progress > 80 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                  Calculating mastery stats
                </span>
              </div>
            </div>
          </div>
          
          {/* Bottom Message */}
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center space-x-2">
              <Loader2 className="h-4 w-4 text-gray-500 dark:text-gray-400 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                First load takes 5-10 seconds • Future loads will be instant
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              💡 While you wait: {progress < 50 ? 'Your brain forms 1,000 new connections per second while learning!' : 'Every time you retrieve a memory, you strengthen its neural pathway!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
