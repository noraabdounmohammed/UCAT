export function MockTimer({ secondsLeft }: { secondsLeft: number }) {
  const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const s = (secondsLeft % 60).toString().padStart(2, '0');
  const danger = secondsLeft <= 60;
  return (
    <div className={`text-sm font-mono ${danger ? 'text-red-700' : 'text-stone-700'}`}>
      {m}:{s}
    </div>
  );
}
