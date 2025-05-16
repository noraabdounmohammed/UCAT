import React, { useState, useEffect } from 'react';
import { PracticeQuestion } from './PracticeQuestion';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface PracticeSessionProps {
  questions: any[];
  onComplete: () => void;
}

export function PracticeSession({ questions, onComplete }: PracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes per question
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const supabase = useSupabaseClient();
  const user = useUser();

  useEffect(() => {
    if (!questions || questions.length === 0) {
      console.error('No questions provided to PracticeSession');
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [questions, onComplete]);

  const handleAnswerSelect = (answer: string) => {
    if (!showFeedback) {
      setSelectedAnswers((prev) => ({
        ...prev,
        [questions[currentIndex].id]: answer,
      }));
      setShowFeedback(true);
    }
  };

  const getOrCreateUserProfile = async (userId: string, userEmail: string) => {
    try {
      // First try to get the existing profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        throw new Error('Failed to fetch user profile');
      }

      // If profile exists, return it
      if (profile) {
        return profile;
      }

      // If no profile exists, create one
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          target_score: 2900,
          current_score: 0,
          streak: 0
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        throw new Error('Failed to create user profile');
      }

      return newProfile;
    } catch (error: any) {
      console.error('Profile operation failed:', error);
      throw new Error('Failed to get or create user profile. Please try refreshing the page or contact support.');
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex === questions.length - 1) {
      // Last question, submit practice session
      try {
        setIsSubmitting(true);

        if (!user?.id || !user?.email) {
          throw new Error('Please sign in to save your progress');
        }

        // Get or create user profile
        const profile = await getOrCreateUserProfile(user.id, user.email);

        if (!profile?.id) {
          throw new Error('Unable to retrieve or create user profile. Please try refreshing the page.');
        }
        
        const correctAnswers = questions.filter(
          (q, i) => selectedAnswers[q.id] === q.correct_answer
        ).length;

        const accuracy = Math.round((correctAnswers / questions.length) * 100);
        
        const { error: sessionError } = await supabase
          .from('practice_sessions')
          .insert({
            user_id: profile.id,
            section: 'QR',
            score: correctAnswers,
            accuracy,
            time_taken: 120 - timeRemaining
          });

        if (sessionError) {
          console.error('Error saving practice session:', sessionError);
          throw new Error('Failed to save practice session');
        }
        
        toast.success('Practice session completed!');
        onComplete();
      } catch (error: any) {
        console.error('Error in practice session:', error);
        toast.error(error.message || 'An unexpected error occurred. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Move to next question
      setCurrentIndex((prev) => prev + 1);
      setTimeRemaining(120); // Reset timer for next question
      setShowFeedback(false);
    }
  };

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <PracticeQuestion
        question={questions[currentIndex]}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        timeRemaining={timeRemaining}
        selectedAnswer={selectedAnswers[questions[currentIndex].id]}
        onAnswerSelect={handleAnswerSelect}
        isLoading={isSubmitting}
        showFeedback={showFeedback}
      />

      {showFeedback && (
        <div className="flex justify-end max-w-4xl mx-auto">
          <Button
            onClick={handleNextQuestion}
            size="lg"
            className="group relative px-8 py-6 text-lg font-medium shadow-soft-xl hover:shadow-soft-2xl transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              {currentIndex === questions.length - 1 ? 'Complete Practice' : 'Next Question'}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}