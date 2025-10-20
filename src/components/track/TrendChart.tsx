import React, { useState } from 'react';

interface DailyStat {
  date: string;
  reviews: number;
  accuracy: number;
  minutes: number;
}

interface TrendChartProps {
  daily: DailyStat[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ daily }) => {
  const [metric, setMetric] = useState<'accuracy' | 'reviews' | 'minutes'>('accuracy');

  const last14Days = daily.slice(-14);
  
  const maxValue = Math.max(...last14Days.map(d => 
    metric === 'accuracy' ? d.accuracy * 100 : 
    metric === 'reviews' ? d.reviews : 
    d.minutes
  ));

  const getYValue = (stat: DailyStat) => {
    switch (metric) {
      case 'accuracy': return stat.accuracy * 100;
      case 'reviews': return stat.reviews;
      case 'minutes': return stat.minutes;
    }
  };

  // Generate SVG path
  const width = 600;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = last14Days.map((stat, i) => {
    const x = padding + (i / (last14Days.length - 1)) * chartWidth;
    const y = padding + chartHeight - (getYValue(stat) / maxValue) * chartHeight;
    return { x, y, stat };
  });

  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mastery Trend
        </h3>
        
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          <button
            onClick={() => setMetric('accuracy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              metric === 'accuracy' 
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Accuracy
          </button>
          <button
            onClick={() => setMetric('reviews')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              metric === 'reviews' 
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setMetric('minutes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              metric === 'minutes' 
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Minutes
          </button>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
            const y = padding + chartHeight - fraction * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-gray-200 dark:text-gray-700"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {Math.round(fraction * maxValue)}
                </text>
              </g>
            );
          })}

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>
                {point.stat.date}: {getYValue(point.stat).toFixed(1)}
                {metric === 'accuracy' ? '%' : ''}
              </title>
            </circle>
          ))}

          {/* X-axis labels */}
          {points.filter((_, i) => i % 3 === 0).map((point, i) => (
            <text
              key={i}
              x={point.x}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {new Date(point.stat.date).getDate()}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};
