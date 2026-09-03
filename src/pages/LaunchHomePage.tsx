import React, { useMemo } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConceptStoreProvider, useConceptStore } from '@/contexts/ConceptStoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserCurriculumId, migrateLegacyCurriculumState } from '@/utils/curriculumScope';

const palette = { cream:'#FAF5EC', espresso:'#1F140C', ink:'#2A1E16', muted:'#8A7560', blushSoft:'#F9E4DF', line:'#E8DCC4' };

function HomeContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { concepts } = useConceptStore() as any;

  const preparation = useMemo(() => {
    const all = concepts || [];
    const now = Date.now();
    const attempted = all.filter((c:any)=>(c.mastery_data?.attempts||0)>0);
    const correct = attempted.reduce((s:number,c:any)=>s+(c.mastery_data?.correct||0),0);
    const attempts = attempted.reduce((s:number,c:any)=>s+(c.mastery_data?.attempts||0),0);
    const due = all.filter((c:any)=>c.mastery_data?.fsrs_due_at && new Date(c.mastery_data.fsrs_due_at).getTime()<=now);
    const weak = all.filter((c:any)=>c.mastery_data?.mastery_level===1);
    const unseen = all.filter((c:any)=>(c.mastery_data?.attempts||0)===0);
    return {
      hasEvidence: attempts>0,
      coverage: all.length?Math.round((attempted.length/all.length)*100):0,
      retrieval: attempts?Math.round((correct/attempts)*100):0,
      weakCount: weak.length,
      dueCount: due.length,
      unseenCount: unseen.length,
    };
  },[concepts]);

  const startRecommended=()=>navigate('/recommended-practice');
  const practiseYourWay=()=>navigate('/concept-practice');

  return (
    <main className="min-h-screen" style={{backgroundColor:palette.cream,color:palette.ink}}>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
        <header className="flex items-center justify-between gap-4 border-b pb-5" style={{borderColor:palette.line}}>
          <div><div className="text-xl font-semibold tracking-tight" style={{color:palette.espresso}}>StudyEdit</div><div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em]" style={{color:palette.muted}}><span>UKMLA AKT</span><span className="rounded-full px-2 py-1 text-[9px] font-semibold tracking-[0.14em]" style={{backgroundColor:palette.blushSoft,color:'#8A5148'}}>Early access</span></div></div>
          <div className="flex items-center gap-2"><button onClick={practiseYourWay} className="rounded-full border px-4 py-2 text-sm" style={{borderColor:palette.line}}>Practice</button>{user&&<button onClick={()=>void signOut()} className="hidden px-3 py-2 text-xs sm:block" style={{color:palette.muted}}>Sign out</button>}</div>
        </header>

        <section className="grid gap-8 py-12 sm:py-16 md:grid-cols-[1.3fr_.7fr] md:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{color:'#9C655D'}}>Your UKMLA knowledge, mapped</div>
            <h1 className="mt-4 max-w-3xl text-5xl font-light leading-[1.02] tracking-[-0.04em] sm:text-6xl" style={{fontFamily:"'Fraunces', serif",color:palette.espresso}}>Know what to practise next.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 sm:text-lg" style={{color:palette.muted}}>StudyEdit maps the concepts underneath your questions, learns from your answers, and helps focus your next session on the areas that deserve attention.</p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <button onClick={startRecommended} className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium text-white md:w-auto" style={{backgroundColor:palette.espresso}}>Start 5 recommended questions <ArrowRight className="h-4 w-4"/></button>
            <button onClick={practiseYourWay} className="inline-flex items-center justify-center gap-2 text-sm" style={{color:'#7F514A'}}><SlidersHorizontal className="h-4 w-4"/> Practise your way</button>
          </div>
        </section>

        {!preparation.hasEvidence ? (
          <section className="grid gap-4 pb-10 md:grid-cols-3">
            <Feature n="01" title="Mapped beneath the question" body="Practice is tied back to the specific curriculum concepts being tested — not just a broad specialty score." />
            <Feature n="02" title="Priorities, not just percentages" body="Recommended practice can consider weak, unseen, due, high-importance and safety-critical knowledge." />
            <Feature n="03" title="Your map grows as you answer" body="Start with five questions. Your first answers give StudyEdit evidence to make future sessions more useful." />
          </section>
        ) : (
          <>
            <section className="rounded-[28px] border p-6 sm:p-8" style={{borderColor:palette.line,backgroundColor:'#FFFDF8'}}>
              <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{color:palette.muted}}>Your map so far</div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <Metric label="Tested coverage" value={`${preparation.coverage}%`} />
                <Metric label="Retrieval" value={`${preparation.retrieval}%`} />
                <Metric label="Needs another pass" value={String(preparation.weakCount)} />
              </div>
            </section>
            <section className="mt-5 rounded-[30px] p-7 sm:p-9" style={{backgroundColor:palette.blushSoft}}>
              <div className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{color:'#9C655D'}}>What now?</div>
              <h2 className="mt-3 text-3xl font-light tracking-[-0.03em]" style={{fontFamily:"'Fraunces', serif",color:palette.espresso}}>Practise what deserves attention now.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6" style={{color:'#6F4B45'}}>Your next session can prioritise concepts that are due, showing difficulty, or still need stronger evidence.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">{preparation.dueCount>0&&<Pill>{preparation.dueCount} due</Pill>}{preparation.weakCount>0&&<Pill>{preparation.weakCount} weak</Pill>}{preparation.unseenCount>0&&<Pill>{preparation.unseenCount} untested</Pill>}</div>
              <button onClick={startRecommended} className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-4 text-sm font-medium text-white" style={{backgroundColor:palette.espresso}}>Start recommended questions <ArrowRight className="h-4 w-4"/></button>
            </section>
          </>
        )}

        <footer className="mt-10 flex items-center justify-between border-t py-5 text-xs" style={{borderColor:palette.line,color:palette.muted}}><button onClick={()=>navigate('/privacy')}>Privacy</button>{user&&<button className="sm:hidden" onClick={()=>void signOut()}>Sign out</button>}</footer>
      </div>
    </main>
  );
}

function Feature({n,title,body}:{n:string;title:string;body:string}){return <div className="rounded-[24px] border p-6" style={{borderColor:palette.line,backgroundColor:'#FFFDF8'}}><div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{color:'#9C655D'}}>{n}</div><h3 className="mt-3 text-xl font-light" style={{fontFamily:"'Fraunces', serif",color:palette.espresso}}>{title}</h3><p className="mt-2 text-sm leading-6" style={{color:palette.muted}}>{body}</p></div>}
function Metric({label,value}:{label:string;value:string}){return <div><div className="text-xs" style={{color:palette.muted}}>{label}</div><div className="mt-2 text-3xl font-light" style={{fontFamily:"'Fraunces', serif",color:palette.espresso}}>{value}</div></div>}
function Pill({children}:{children:React.ReactNode}){return <span className="rounded-full border px-3 py-1.5" style={{borderColor:'#E5B9B1',backgroundColor:'rgba(255,255,255,.45)',color:'#704C46'}}>{children}</span>}

export function LaunchHomePage(){
  const {user}=useAuth();
  const curriculumId=useMemo(()=>{if(user?.id)migrateLegacyCurriculumState(user.id);return getUserCurriculumId(user?.id)},[user?.id]);
  return <ConceptStoreProvider curriculumId={curriculumId}><HomeContent/></ConceptStoreProvider>;
}
