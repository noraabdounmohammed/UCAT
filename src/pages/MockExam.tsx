import React from 'react';
import { MockSetup } from '@/components/mock/MockSetup';
import { MockSettings } from '@/types/mock';

interface MockExamProps {
  onNavigateToTargetPractice: () => void;
}

export function MockExam({ onNavigateToTargetPractice }: MockExamProps) {
  const handleStartMock = (settings: MockSettings) => {
    console.log('Starting mock with settings:', settings);
    // TODO: Implement mock exam session
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-0 md:px-4">
        <MockSetup onStart={handleStartMock} />
      </div>
    </div>
  );
}