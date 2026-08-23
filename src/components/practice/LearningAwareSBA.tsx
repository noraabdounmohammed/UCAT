import React, { useMemo, useState } from 'react';
import { BookOpen, X, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UkmlaSBAQuestion } from './UkmlaSBAQuestion';
import type { QuestionData } from './questionTypes';
import type { SessionAnswer } from './SessionProgressDropdown';
import type { FilterState } from './PracticeFilterModalParchment';

interface LearningAwareSBAProps {
  question: QuestionData; onAnswer: (isCorrect: boolean) => void; onNext: () => void; onPrevious?: () => void; onExit?: () => void;
  currentIndex?: number; totalQuestions?: number; title?: string; sessionAnswers?: SessionAnswer[]; onJumpTo?: (index: number) => void;
  availableFilters?: string[]; activeFilter?: string | null; onFilterSelect?: (filter?: string) => void; currentFormat?: string;
  onChangeFormat?: (format: string) => void; onRestartWithFilters?: (filters?: FilterState) => void; preSelectedAnswer?: string;
  preSubmitted?: boolean; nextButtonText?: string;
}

const C = { paper:'#FFFDF8', cream:'#FAF5EC', espresso:'#1F140C', ink:'#2A1E16', muted:'#8A7560', line:'#E8DCC4', blushSoft:'#F9E4DF' };

function firstUsefulSentence(text: string) { const clean=String(text||'').replace(/\s+/g,' ').trim(); if(!clean)return ''; return clean.match(/^(.+?[.!?])(?:\s|$)/)?.[1]||clean; }
function optionText(option: {text:string;id:string}|string) { return typeof option === 'string' ? option : option.text; }

export const LearningAwareSBA: React.FC<LearningAwareSBAProps> = (props) => {
  const [learningOpen,setLearningOpen]=useState(false);
  const [usedLearningMode,setUsedLearningMode]=useState(false);
  const [gapPickerOpen,setGapPickerOpen]=useState(false);
  const [unknownOptions,setUnknownOptions]=useState<string[]>([]);
  const conceptTitle=useMemo(()=>String((props.question as any).concept_title||props.question.title||(props.question as any).topic||'this concept'),[props.question]);
  const teachingText=useMemo(()=>{const k=String((props.question as any).key_fact||'').trim();const e=String(props.question.explanation||props.question.worked_solution||'').trim();return k||firstUsefulSentence(e)||'This is above your current knowledge frontier. We’ll treat it as learning, not a failed retrieval.';},[props.question]);
  const optionLabels=useMemo(()=>props.question.options.map(optionText).filter(Boolean),[props.question.options]);

  const saveSignal=(signal:string,value?:string)=>{try{const key=`learning_frontier_${props.question.id||props.question.concept_id||props.currentIndex||0}_${signal}_${value||''}`;sessionStorage.setItem(key,JSON.stringify({signal,value,concept:conceptTitle,at:new Date().toISOString()}));}catch{}};
  const openLearning=()=>{setUsedLearningMode(true);setLearningOpen(true);saveSignal('dont_know_yet');};
  const toggleUnknown=(label:string)=>{setUnknownOptions(prev=>{const exists=prev.includes(label);const next=exists?prev.filter(x=>x!==label):[...prev,label];if(!exists)saveSignal('unfamiliar_option',label);return next;});};

  return <>
    <UkmlaSBAQuestion {...props}/>

    {!props.preSubmitted&&!learningOpen&&<div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-30 flex justify-center px-5 sm:bottom-6"><button type="button" onClick={openLearning} className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold shadow-[0_8px_24px_rgba(31,20,12,0.10)] backdrop-blur" style={{borderColor:C.line,backgroundColor:'rgba(255,253,248,.96)',color:C.muted}}><BookOpen className="h-4 w-4"/>I don’t know this yet</button></div>}

    {props.preSubmitted&&!gapPickerOpen&&<div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-30 flex justify-center px-5 sm:bottom-6"><button type="button" onClick={()=>setGapPickerOpen(true)} className="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold shadow-[0_8px_24px_rgba(31,20,12,0.10)] backdrop-blur" style={{borderColor:C.line,backgroundColor:'rgba(255,253,248,.97)',color:C.muted}}><BookOpen className="h-4 w-4"/>Anything here unfamiliar?</button></div>}

    {gapPickerOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F140C]/20 sm:items-center" role="dialog" aria-modal="true" aria-label="Mark unfamiliar answers"><div className="w-full rounded-t-[30px] border-t px-6 pb-8 pt-5 sm:max-w-[560px] sm:rounded-[30px] sm:border" style={{borderColor:C.line,backgroundColor:C.cream,color:C.ink}}><div className="mx-auto mb-5 h-1 w-10 rounded-full sm:hidden" style={{backgroundColor:'#D9CCB6'}}/><div className="flex items-start justify-between gap-5"><div><div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{color:'#A9675D'}}>One-tap gaps</div><h2 className="mt-2 text-[26px] font-medium leading-tight" style={{color:C.espresso,fontFamily:"'Fraunces', serif"}}>Anything you didn’t know?</h2><p className="mt-2 text-[13px] leading-5" style={{color:C.muted}}>Tap any answer option that was unfamiliar. No typing, and it won’t count as getting this question wrong.</p></div><button type="button" onClick={()=>setGapPickerOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{borderColor:C.line,color:C.muted}} aria-label="Close"><X className="h-5 w-5"/></button></div><div className="mt-5 flex flex-col gap-2">{optionLabels.map((label,i)=>{const selected=unknownOptions.includes(label);return <button key={`${label}-${i}`} type="button" onClick={()=>toggleUnknown(label)} className="flex w-full items-center gap-3 rounded-[16px] border px-4 py-3 text-left text-[14px] font-semibold leading-5" style={{borderColor:selected?'#D9A69D':C.line,backgroundColor:selected:C.blushSoft:C.paper,color:C.espresso}}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px]" style={{backgroundColor:selected?'#E9B9B0':'#F3EDE4'}}>{selected?<Check className="h-4 w-4"/>:String.fromCharCode(65+i)}</span><span>{label}</span></button>;})}</div><button type="button" onClick={()=>setGapPickerOpen(false)} className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[17px] text-[15px] font-bold" style={{backgroundColor:C.espresso,color:C.cream}}>{unknownOptions.length?`${unknownOptions.length} gap${unknownOptions.length===1?'':'s'} captured →`:'Nothing unfamiliar →'}</button>{unknownOptions.length>0&&<p className="mt-3 text-center text-[11px] leading-4" style={{color:C.muted}}>Saved as unfamiliar, not mastered. StudyEdit can use these signals to decide what to teach next.</p>}</div></div>}

    {learningOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1F140C]/20 sm:items-center" role="dialog" aria-modal="true" aria-label="Learning mode"><div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[30px] border-t px-6 pb-8 pt-5 sm:max-w-[560px] sm:rounded-[30px] sm:border" style={{borderColor:C.line,backgroundColor:C.cream,color:C.ink}}><div className="mx-auto mb-5 h-1 w-10 rounded-full sm:hidden" style={{backgroundColor:'#D9CCB6'}}/><div className="flex items-start justify-between gap-5"><div><div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{color:'#A9675D'}}>Learn mode</div><h2 className="mt-2 text-[27px] font-medium leading-tight" style={{color:C.espresso,fontFamily:"'Fraunces', serif"}}>Let’s build this first.</h2></div><button type="button" onClick={()=>setLearningOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{borderColor:C.line,color:C.muted}} aria-label="Back to question"><X className="h-5 w-5"/></button></div><p className="mt-4 text-[14px] leading-6" style={{color:C.muted}}>You don’t need to guess just to unlock the teaching. StudyEdit will treat this as a signal that the question may be above your current knowledge frontier.</p><div className="mt-6 rounded-[22px] border p-5" style={{borderColor:'#E5B9B1',backgroundColor:C.blushSoft}}><div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{color:'#9C655D'}}>The concept</div><div className="mt-2 text-[20px] font-bold leading-7" style={{color:C.espresso}}>{conceptTitle}</div><div className="mt-4 text-[16px] font-medium leading-7" style={{color:'#4B372A'}}><ReactMarkdown>{teachingText}</ReactMarkdown></div></div><div className="mt-5 rounded-[18px] border px-4 py-3 text-[13px] leading-5" style={{borderColor:C.line,backgroundColor:C.paper,color:C.muted}}>For safety, this first version only teaches from the question’s existing verified material. Prerequisite teaching will be added behind the same interaction once it is evidence-bound.</div><button type="button" onClick={()=>setLearningOpen(false)} className="mt-6 flex w-full items-center justify-center rounded-full px-6 py-[17px] text-[15px] font-bold" style={{backgroundColor:C.espresso,color:C.cream}}>Back to the case →</button>{usedLearningMode&&<div className="mt-3 text-center text-[11px]" style={{color:C.muted}}>Marked as “didn’t know yet” for this session.</div>}</div></div>}
  </>;
};
