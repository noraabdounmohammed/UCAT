import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, Timer, Brain, Calculator, BookOpen, Scale,
  ArrowRight, AlertCircle, CheckCircle2, Timer as TimerIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MockSettings, TimeMode } from '@/types/mock';

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
    <div className="max-w-4xl mx-auto">
      {/* Enhanced header with more aesthetic design */}
      <div className="mb-10 px-6 py-8 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100/50 shadow-sm">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 shadow-md">
            <Clock className="h-7 w-7 md:h-8 md:w-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">Mock Exams</h1>
        </div>
        <p className="text-base md:text-lg text-gray-600 font-normal max-w-2xl">
          Practice with full-length UCAT mock exams under realistic test conditions
        </p>
      </div>
      
      {/* Content with enhanced aesthetic design */}
      <div className="space-y-10">
        {/* Mock Type Selection */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg md:text-xl font-medium text-gray-900">Exam Type</h2>
            <Badge className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              Step 1 of 2
            </Badge>
          </div>
          
          <Tabs
            value={mockType}
            onValueChange={(value) => setMockType(value as 'full' | 'section')}
            className="w-full pt-4"
          >
            <TabsList className="grid grid-cols-2 w-full h-auto p-1.5 bg-indigo-50 rounded-xl">
              <TabsTrigger 
                value="full" 
                className={cn(
                  "flex items-center justify-center gap-2 py-3.5",
                  "text-base font-medium rounded-lg",
                  "transition-all duration-200",
                  "data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-indigo-600/70"
                )}
              >
                <CheckCircle2 className="h-5 w-5" />
                <span className="hidden sm:inline">Full Mock Exam</span>
                <span className="sm:hidden">Full</span>
              </TabsTrigger>
              <TabsTrigger 
                value="section" 
                className={cn(
                  "flex items-center justify-center gap-2 py-3.5",
                  "text-base font-medium rounded-lg",
                  "transition-all duration-200",
                  "data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-indigo-600/70"
                )}
              >
                <BookOpen className="h-5 w-5" />
                <span className="hidden sm:inline">Section Practice</span>
                <span className="sm:hidden">Section</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="full" className="mt-6">
              <div className="bg-white rounded-xl p-6 space-y-5 border border-gray-200 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-indigo-50 shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg text-gray-900 mb-1">Full Mock Exam</h3>
                    <p className="text-base text-gray-600">
                      Complete a comprehensive UCAT mock exam covering all sections in sequence
                    </p>
                  </div>
                </div>
                <Separator className="bg-gray-100" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  {Object.entries(SECTIONS).map(([key, section]) => (
                    <div key={key} className="flex items-center gap-3 text-base text-gray-700 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="text-indigo-600">{section.icon}</div>
                      <span className="truncate font-medium">{section.label}</span>
                      <Badge className="ml-auto shrink-0 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5">
                        {section.questions} Q
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="section" className="mt-6">
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-indigo-50 shrink-0">
                      <BookOpen className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg text-gray-900 mb-1">Section Practice</h3>
                      <p className="text-base text-gray-600">
                        Focus on a specific section to improve your performance
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {Object.entries(SECTIONS).map(([key, section]) => (
                    <Button
                      key={key}
                      variant={selectedSection === key ? 'default' : 'outline'}
                      className={cn(
                        "h-auto py-5 px-6",
                        "flex items-center justify-start gap-4",
                        "transition-all duration-200",
                        "rounded-xl border",
                        selectedSection === key 
                          ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent shadow-md" 
                          : "border-gray-200 bg-white text-gray-800 hover:border-indigo-200 hover:bg-indigo-50/30"
                      )}
                      onClick={() => setSelectedSection(key as SectionType)}
                    >
                      <div className={cn(
                        "p-3 rounded-full shrink-0",
                        selectedSection === key ? "bg-white/20" : "bg-gray-100 group-hover:bg-indigo-100/30"
                      )}>
                        <div className={selectedSection === key ? "text-white" : "text-indigo-600"}>
                          {section.icon}
                        </div>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="font-medium text-base md:text-lg">{section.label}</div>
                        <div className={cn(
                          "text-sm mt-1",
                          selectedSection === key ? "text-white/80" : "text-gray-500"
                        )}>
                          {section.questions} questions
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Time Mode Selection */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg md:text-xl font-medium text-gray-900">Time Settings</h2>
            <Badge className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              Step 2 of 2
            </Badge>
          </div>
          
          <RadioGroup
            value={timeMode}
            onValueChange={(value) => setTimeMode(value as TimeMode)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2"
          >
            {Object.entries(TIME_MODE_INFO).map(([mode, info]) => (
              <Label
                key={mode}
                className={cn(
                  "flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-all duration-200",
                  "border hover:shadow-md",
                  timeMode === mode 
                    ? "border-indigo-200 bg-indigo-50/50 shadow-sm" 
                    : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20"
                )}
              >
                <RadioGroupItem value={mode} className="mt-1 text-indigo-600" />
                <div className="space-y-2 min-w-0">
                  <div className="font-medium flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full shrink-0",
                      timeMode === mode ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"
                    )}>
                      {info.icon}
                    </div>
                    <span className="text-base md:text-lg text-gray-900">{info.label}</span>
                  </div>
                  <p className="text-sm md:text-base text-gray-600 line-clamp-2">{info.description}</p>
                  <Badge className="mt-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1">
                    {info.duration}
                  </Badge>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Enhanced action button */}
        <div className="flex justify-end pt-8">
          <Button
            onClick={handleStart}
            className={cn(
              "relative px-8 py-4 md:px-10 md:py-5",
              "text-base md:text-lg font-medium",
              "rounded-full",
              "transition-all duration-200",
              "shadow-md hover:shadow-lg",
              "bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700"
            )}
          >
            <span className="flex items-center justify-center gap-3">
              <Clock className="h-5 w-5 md:h-6 md:w-6" />
              <span>Start Exam</span>
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}