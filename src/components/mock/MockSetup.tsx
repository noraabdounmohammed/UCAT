import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, Timer, Brain, Calculator, BookOpen, Scale,
  ArrowRight, AlertCircle, CheckCircle2, Timer as TimerIcon,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MockSettings, TimeMode, SectionType } from '@/types/mock';

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
    <div className="max-w-4xl mx-auto px-4 md:px-6 pb-6">
      <Card className="shadow-soft-xl overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent pb-6 md:pb-8">
          <CardTitle className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="text-xl md:text-2xl font-bold">Mock Exams</div>
            </div>
            <p className="text-sm text-muted-foreground font-normal">
              Practice with full-length UCAT mock exams under realistic test conditions
            </p>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4 md:p-6 space-y-6 md:space-y-8">
          {/* Mock Type Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base md:text-lg font-semibold">Exam Type</h3>
              <Badge variant="outline" className="font-normal">
                Step 1 of 2
              </Badge>
            </div>
            
            <Tabs
              value={mockType}
              onValueChange={(value) => setMockType(value as 'full' | 'section')}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full h-auto p-1">
                <TabsTrigger 
                  value="full" 
                  className={cn(
                    "flex items-center gap-2 py-3 data-[state=active]:bg-background",
                    "transition-all duration-300"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Full Mock Exam</span>
                  <span className="sm:hidden">Full</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="section" 
                  className={cn(
                    "flex items-center gap-2 py-3 data-[state=active]:bg-background",
                    "transition-all duration-300"
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Section Practice</span>
                  <span className="sm:hidden">Section</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="full" className="mt-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-background shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Full Mock Exam</h4>
                      <p className="text-sm text-muted-foreground">
                        Complete a comprehensive UCAT mock exam covering all sections in sequence
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {Object.entries(SECTIONS).map(([key, section]) => (
                      <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                        {section.icon}
                        <span className="truncate">{section.label}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0">
                          {section.questions} Q
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="section" className="mt-4">
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-background shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">Section Practice</h4>
                        <p className="text-sm text-muted-foreground">
                          Focus on a specific section to improve your performance
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(SECTIONS).map(([key, section]) => (
                      <Button
                        key={key}
                        variant={selectedSection === key ? 'default' : 'outline'}
                        className={cn(
                          "h-auto py-4 px-4 md:px-6",
                          "flex items-center justify-start gap-3",
                          selectedSection === key && "shadow-soft-xl"
                        )}
                        onClick={() => setSelectedSection(key as SectionType)}
                      >
                        <div className={cn(
                          "p-2 rounded-md shrink-0",
                          selectedSection === key ? "bg-primary-foreground/20" : "bg-muted"
                        )}>
                          {section.icon}
                        </div>
                        <div className="text-left min-w-0">
                          <div className="font-medium text-sm truncate">{section.label}</div>
                          <div className="text-xs text-muted-foreground">
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

          <Separator />

          {/* Time Mode Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base md:text-lg font-semibold">Time Settings</h3>
              <Badge variant="outline" className="font-normal">
                Step 2 of 2
              </Badge>
            </div>
            
            <RadioGroup
              value={timeMode}
              onValueChange={(value) => setTimeMode(value as TimeMode)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {Object.entries(TIME_MODE_INFO).map(([mode, info]) => (
                <Label
                  key={mode}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all",
                    "border-2 hover:border-primary/50",
                    timeMode === mode ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                  )}
                >
                  <RadioGroupItem value={mode} className="mt-1" />
                  <div className="space-y-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-md shrink-0",
                        timeMode === mode ? "bg-primary/10" : "bg-muted"
                      )}>
                        {info.icon}
                      </div>
                      <span className="truncate">{info.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{info.description}</p>
                    <Badge variant="secondary" className="mt-2">
                      {info.duration}
                    </Badge>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Start Button */}
          <div className="flex justify-end pt-4">
            <Button
              size="lg"
              onClick={handleStart}
              className={cn(
                "group relative w-full sm:w-auto px-4 sm:px-8 py-4 sm:py-6",
                "text-base sm:text-lg font-medium",
                "shadow-soft-xl hover:shadow-soft-2xl",
                "bg-primary hover:bg-primary/90",
                "transition-all duration-300"
              )}
            >
              <span className="flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary-foreground/80" />
                <span className="truncate">
                  Start {mockType === 'full' ? 'Full Mock' : `${SECTIONS[selectedSection].label}`}
                </span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 shrink-0" />
              </span>
              
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}