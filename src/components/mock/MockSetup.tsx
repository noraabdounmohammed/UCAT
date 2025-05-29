import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, Timer, Brain, Calculator, BookOpen, Scale,
  CheckCircle2, Timer as TimerIcon,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MockSettings, TimeMode } from '@/types/mock';
import '../layout/apple-layout-styles.css';
import './apple-mock-styles.css';

type SectionType = 'VR' | 'DM' | 'QR' | 'SJ';

interface MockSetupProps {
  onStart: (settings: MockSettings) => void;
}

const TIME_MODE_INFO: Record<TimeMode, { label: string; description: string; icon: React.ReactNode; duration: string }> = {
  standard: {
    label: 'Standard Time',
    description: 'Standard UCAT exam timing',
    icon: <Clock className="h-4 w-4" />,
    duration: '2 hours'
  },
  sen: {
    label: 'SEN Time',
    description: 'Extended time for SEN students',
    icon: <Timer className="h-4 w-4" />,
    duration: '2.5 hours'
  },
  sen50: {
    label: 'SEN +50% Time',
    description: 'Additional 50% time extension',
    icon: <Timer className="h-4 w-4" />,
    duration: '3 hours'
  },
  unlimited: {
    label: 'Unlimited Time',
    description: 'Practice without time pressure',
    icon: <TimerIcon className="h-4 w-4" />,
    duration: 'No limit'
  }
};

const SECTIONS: Record<SectionType, { label: string; icon: React.ReactNode; questions: number }> = {
  VR: { label: 'Verbal Reasoning', icon: <BookOpen className="h-5 w-5" />, questions: 44 },
  DM: { label: 'Decision Making', icon: <Brain className="h-5 w-5" />, questions: 29 },
  QR: { label: 'Quantitative Reasoning', icon: <Calculator className="h-5 w-5" />, questions: 44 },
  SJ: { label: 'Situational Judgement', icon: <Scale className="h-5 w-5" />, questions: 69 }
};

export function MockSetup({ onStart }: MockSetupProps) {
  const [mockType, setMockType] = useState<'full' | 'section'>('full');
  const [selectedSection, setSelectedSection] = useState<SectionType>('VR');
  const [timeMode, setTimeMode] = useState<TimeMode>('standard');

  const handleStart = () => {
    onStart({
      type: mockType,
      section: mockType === 'section' ? selectedSection : undefined,
      timeMode
    });
  };

  return (
    <div className="apple-container">
      {/* Apple-style header with SF design principles */}
      <div className="apple-title-section">
        <h1 className="apple-heading-1">Mock Exams</h1>
        <p className="apple-body text-secondary">
          Practice with full-length UCAT mock exams under realistic test conditions
        </p>
      </div>
      
      {/* Content with Apple HIG design */}
      <div className="apple-content-stack">
        {/* Mock Type Selection */}
        <div className="apple-card">
          <div className="apple-card-header">
            <div className="flex items-center justify-between">
              <h2 className="apple-heading-2">Exam Type</h2>
              <div className="apple-pill-badge">
                <span>Step 1 of 2</span>
              </div>
            </div>
          </div>
          
          <div className="apple-card-content">
            <Tabs
              value={mockType}
              onValueChange={(value) => setMockType(value as 'full' | 'section')}
              className="w-full"
            >
              <TabsList className="apple-segmented-control">
                <TabsTrigger 
                  value="full" 
                  className="apple-segmented-item"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Full Mock Exam</span>
                  <span className="sm:hidden">Full</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="section" 
                  className="apple-segmented-item"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Section Practice</span>
                  <span className="sm:hidden">Section</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="full" className="apple-tabs-content">
                <div className="apple-info-box">
                  <div className="apple-info-box-header">
                    <div className="apple-info-icon">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="apple-heading-3">Full Mock Exam</h3>
                      <p className="apple-body text-secondary">
                        Complete a comprehensive UCAT mock exam covering all sections in sequence
                      </p>
                    </div>
                  </div>
                  <Separator className="apple-separator my-4" />
                  <div className="apple-section-grid">
                    {Object.entries(SECTIONS).map(([key, section]) => (
                      <div key={key} className="apple-section-item">
                        <div className="apple-section-icon">{section.icon}</div>
                        <span className="apple-section-label">{section.label}</span>
                        <div className="apple-section-badge">
                          {section.questions} Q
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="section" className="apple-tabs-content">
                <div className="apple-content-stack">
                  <div className="apple-info-box">
                    <div className="apple-info-box-header">
                      <div className="apple-info-icon">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="apple-heading-3">Section Practice</h3>
                        <p className="apple-body text-secondary">
                          Focus on a specific section to improve your performance
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="apple-selection-grid">
                    {Object.entries(SECTIONS).map(([key, section]) => (
                      <button
                        key={key}
                        type="button"
                        className={cn(
                          "apple-selection-button",
                          selectedSection === key && "apple-selection-button-selected"
                        )}
                        onClick={() => setSelectedSection(key as SectionType)}
                      >
                        <div className="apple-selection-icon-wrapper">
                          <div className="apple-selection-icon">
                            {section.icon}
                          </div>
                        </div>
                        <div className="apple-selection-content">
                          <div className="apple-selection-title">{section.label}</div>
                          <div className="apple-selection-subtitle">
                            {section.questions} questions
                          </div>
                        </div>
                        <ChevronRight className="apple-selection-chevron" />
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Time Mode Selection */}
        <div className="apple-card">
          <div className="apple-card-header">
            <div className="flex items-center justify-between">
              <h2 className="apple-heading-2">Time Settings</h2>
              <div className="apple-pill-badge">
                <span>Step 2 of 2</span>
              </div>
            </div>
          </div>
          
          <div className="apple-card-content">
            <RadioGroup
              value={timeMode}
              onValueChange={(value) => setTimeMode(value as TimeMode)}
              className="apple-radio-group"
            >
              {Object.entries(TIME_MODE_INFO).map(([mode, info]) => (
                <Label
                  key={mode}
                  className={cn(
                    "apple-radio-option",
                    timeMode === mode && "apple-radio-option-selected"
                  )}
                >
                  <RadioGroupItem value={mode} className="apple-radio-input" />
                  <div className="apple-radio-content">
                    <div className="apple-radio-header">
                      <div className="apple-radio-icon">
                        {info.icon}
                      </div>
                      <span className="apple-radio-title">{info.label}</span>
                    </div>
                    <p className="apple-radio-description">{info.description}</p>
                    <div className="apple-duration-badge">
                      {info.duration}
                    </div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Apple-style action button */}
        <div className="apple-button-container">
          <Button
            onClick={handleStart}
            className="apple-primary-button"
          >
            <span className="apple-button-content">
              <span>Start Exam</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}