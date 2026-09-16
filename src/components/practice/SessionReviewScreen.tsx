import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { learnerEvidenceSummary, readEvidenceLedger } from '@/lib/learningEvidence';
import { SessionAnswer } from './SessionProgressDropdown';

interface SessionReviewScreenProps {
  answers: SessionAnswer[];
  questions: any[];
  onRetryIncorrect: () => void;
  onDone: () => void;
  onAnotherFive?: (filter?: string) => void;
  onViewQuestion?: (questionIndex: number) => void;
  sessionDuration?: number;
}

type HistoricalAttempt = { status?: string; topic?: string; timestamp?: string };
const T = { cream:'#F4ECDF', espresso:'#1F140C', ink:'#2A1E16', muted:'#8A7560', line:'#DCCDBA', sage:'#667555' };
const pct = (n:number,d:number) => d ? Math.round(n/d*100) : 0;
const Bar = ({value,previous}:{value:number;previous?:number}) => <div className="relative mt-2 h-[7px] w-full overflow-visible rounded-full bg-[#E5D9C8]"><div className="absolute inset-y-0 left-0 rounded-full bg-[#667555]" style={{width:`${Math.max(0,Math.min(100,value))}%`}}/>{typeof previous==='number'&&<div className="absolute -top-[3px] h-[13px] w-px bg-[#1F140C]/60" style={{left:`${Math.max(0,Math.min(100,previous))}%`}}/>}</div>;
const StateBar = ({label,value,total}:{label:string;value:number;total:number}) => <div><div className="flex items-baseline justify-between"><span className="text-[12px] font-semibold" style={{color:T.ink}}>{label}</span><span className="text-[12px] font-bold" style={{color:T.muted}}>{value}</span></div><Bar value={pct(value,total)}/></div>;

export const SessionReviewScreen: React.FC<SessionReviewScreenProps> = ({answers,questions,onDone,onAnotherFive}) => {
 const navigate=useNavigate(); const {user}=useAuth();
 const analytics=useMemo(()=>{
  const total=answers.length, correct=answers.filter(a=>a.isCorrect).length, accuracy=pct(correct,total);
  const currentIds=new Set(questions.map(q=>String(q?.id||'')).filter(Boolean)); const history:HistoricalAttempt[]=[];
  try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith('question_progress_'))continue;if(currentIds.has(key.replace('question_progress_','')))continue;try{history.push(JSON.parse(localStorage.getItem(key)||'{}'))}catch{}}}catch{}
  const priorTotal=history.length,priorCorrect=history.filter(h=>h.status==='correct').length,priorAccuracy=priorTotal?pct(priorCorrect,priorTotal):null;
  const combinedTotal=priorTotal+total,combinedAccuracy=pct(priorCorrect+correct,combinedTotal);
  const rows=questions.map((q,index)=>({topic:String(q?.concept_title||q?.title||q?.topic||'Other'),answer:answers.find(a=>a.questionIndex===index)})).filter(x=>x.answer);
  const map=new Map<string,{total:number;correct:number}>();rows.forEach(({topic,answer})=>{const r=map.get(topic)||{total:0,correct:0};r.total++;if(answer?.isCorrect)r.correct++;map.set(topic,r)});
  const topics=Array.from(map.entries()).map(([topic,r])=>({topic,...r,pct:pct(r.correct,r.total)})).slice(0,5);
  const priorTopics=new Set(history.map(h=>h.topic).filter(Boolean));const newAreas=new Set(rows.map(r=>r.topic).filter(t=>!priorTopics.has(t))).size;
  const evidence=learnerEvidenceSummary(readEvidenceLedger()); const evidenced=evidence.evidencedConcepts||0;
  return{total,correct,accuracy,priorAccuracy,combinedTotal,combinedAccuracy,topics,newAreas,evidence,evidenced};
 },[answers,questions]);
 const delta=analytics.priorAccuracy==null?null:analytics.combinedAccuracy-analytics.priorAccuracy;
 const stateTotal=Math.max(analytics.evidenced,1);
 return <main className="min-h-screen overflow-y-auto" style={{backgroundColor:T.cream,color:T.ink}} aria-label="Learning analytics">
  <div className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-8 sm:px-8 sm:pt-10"><section className="border-t pt-7" style={{borderColor:T.line}}>
   <div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:T.muted}}>Session complete</div>
   <p className="mt-3 text-[20px] font-medium leading-[1.55]" style={{color:T.espresso}}>{analytics.total?`You answered ${analytics.correct} of ${analytics.total} correctly first time. Here’s what that changed.`:'No answered cases were added this time.'}</p>
   <div className="mt-7 grid grid-cols-3 border-y py-5" style={{borderColor:T.line}}>
    {[ [`${analytics.accuracy}%`,'first-pass accuracy'],[String(analytics.total),'cases answered'],[String(analytics.newAreas),'new areas sampled'] ].map(([v,l],i)=><div key={l} className={`${i?'border-l pl-3':'pr-3'}`} style={{borderColor:T.line}}><div className="text-[28px] font-semibold tracking-[-.04em]" style={{color:T.espresso}}>{v}</div><div className="mt-1 text-[11px] font-semibold" style={{color:T.muted}}>{l}</div></div>)}
   </div>
   {analytics.topics.length>0&&<div className="mt-7"><div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:T.muted}}>This session</div><div className="mt-4 space-y-4">{analytics.topics.map(r=><div key={r.topic}><div className="flex items-baseline justify-between gap-4"><span className="truncate text-[13px] font-semibold">{r.topic}</span><span className="text-[12px] font-bold" style={{color:T.muted}}>{r.correct}/{r.total}</span></div><Bar value={r.pct}/></div>)}</div></div>}

   <div className="mt-10 border-t pt-7" style={{borderColor:T.line}}><div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:T.muted}}>Your UKMLA picture</div>
    <div className="mt-4 flex items-end justify-between"><div><div className="text-[30px] font-semibold tracking-[-.04em]" style={{color:T.espresso}}>{analytics.combinedAccuracy}%</div><div className="text-[11px] font-semibold" style={{color:T.muted}}>observed first-pass performance</div></div><div className="pb-1 text-[12px] font-bold" style={{color:delta&&delta!==0?T.sage:T.muted}}>{delta==null?'baseline building':`${delta>0?'+':''}${delta} pts this session`}</div></div>
    <Bar value={analytics.combinedAccuracy} previous={analytics.priorAccuracy??undefined}/><div className="mt-2 flex justify-between text-[11px]" style={{color:T.muted}}><span>{analytics.combinedTotal} recorded attempts</span>{analytics.priorAccuracy!=null&&<span>marker = before session</span>}</div>
   </div>

   <div className="mt-8 border-y py-6" style={{borderColor:T.line}}><div className="flex items-baseline justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.18em]" style={{color:T.muted}}>Evidence map</div><div className="mt-1 text-[22px] font-semibold tracking-[-.03em]" style={{color:T.espresso}}>{analytics.evidenced} concepts evidenced</div></div><div className="text-right text-[11px] font-semibold" style={{color:T.muted}}>not a readiness score</div></div>
    {analytics.evidenced>0?<div className="mt-5 space-y-4"><StateBar label="Demonstrated" value={analytics.evidence.demonstrated} total={stateTotal}/><StateBar label="Developing" value={analytics.evidence.developing} total={stateTotal}/><StateBar label="Due for retrieval" value={analytics.evidence.dueForRetrieval} total={stateTotal}/></div>:<p className="mt-4 text-[13px] leading-6" style={{color:T.muted}}>Your evidence map will appear as StudyEdit gathers independent retrieval and tutor evidence.</p>}
   </div>

   <p className="mt-5 text-[12px] font-medium leading-5" style={{color:T.muted}}>Accuracy shows what happened. The evidence map shows what StudyEdit can actually support about your knowledge. A concept only moves toward demonstrated or retained when the evidence justifies it.</p>
   <div className="mt-8 flex flex-wrap gap-x-6 gap-y-4">{onAnotherFive&&<button onClick={()=>onAnotherFive()} className="text-[15px] font-bold underline underline-offset-4">Keep going →</button>}<button onClick={onDone} className="text-[13px] font-semibold underline underline-offset-4" style={{color:T.muted}}>Done for now</button></div>
   {!user&&<div className="mt-8 border-t pt-5" style={{borderColor:T.line}}><p className="text-[13px]" style={{color:T.muted}}>Sign in to carry this learning picture into future sessions.</p><button onClick={()=>navigate('/signin?reason=save&next=/')} className="mt-3 text-[13px] font-bold underline underline-offset-4">Save my progress →</button></div>}
  </section></div>
 </main>;
};
