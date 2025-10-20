import React, { useMemo } from 'react';

export function TrendSpark({ data }: { data: { date: string; accuracy: number; reviews: number }[] }) {
  console.log('📈 TrendSpark data:', data);
  
  const { accuracyPoints, reviewsPoints } = useMemo(() => {
    const accuracyVals = data.map((d) => d.accuracy);
    const reviewsVals = data.map((d) => d.reviews);
    
    console.log('📊 Chart values:', { 
      accuracyVals, 
      reviewsVals,
      maxAccuracy: Math.max(...accuracyVals),
      maxReviews: Math.max(...reviewsVals)
    });
    
    const maxAccuracy = Math.max(1, ...accuracyVals);
    const maxReviews = Math.max(1, ...reviewsVals);
    
    const w = 380;
    const h = 120;
    const step = w / (data.length - 1 || 1);
    
    const accuracyPoints = accuracyVals.map((v, i) => [i * step, h - (v / maxAccuracy) * h] as const);
    const reviewsPoints = reviewsVals.map((v, i) => [i * step, h - (v / maxReviews) * h] as const);
    
    return { accuracyPoints, reviewsPoints };
  }, [data]);

  const accuracyPath = accuracyPoints.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
  const reviewsPath = reviewsPoints.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');

  return (
    <div>
      <div className="mb-4 flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#5856D6]"></div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Accuracy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#34C759]"></div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reviews</span>
        </div>
      </div>
      <svg viewBox="0 0 380 120" className="w-full">
        {/* Accuracy line (purple, solid) */}
        <path d={accuracyPath} fill="none" stroke="#5856D6" strokeWidth="3" strokeLinecap="round" />
        
        {/* Reviews line (green, dashed, on top) */}
        <path d={reviewsPath} fill="none" stroke="#34C759" strokeWidth="4" strokeLinecap="round" strokeDasharray="8,4" />
        
        {/* Data points for reviews */}
        {reviewsPoints.map((p, i) => (
          <circle key={`review-${i}`} cx={p[0]} cy={p[1]} r="3" fill="#34C759" opacity="0.8">
            <title>
              {data[i].date}: {data[i].reviews} reviews
            </title>
          </circle>
        ))}
        
        {/* Data points for accuracy */}
        {accuracyPoints.map((p, i) => (
          <circle key={`accuracy-${i}`} cx={p[0]} cy={p[1]} r="4" fill="#5856D6">
            <title>
              {data[i].date}: {data[i].accuracy.toFixed(0)}% accuracy
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
