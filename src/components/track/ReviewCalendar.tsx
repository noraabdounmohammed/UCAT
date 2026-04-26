import React from 'react';

interface DailyStat {
  date: string;
  dueReviews: number;
}

interface ReviewCalendarProps {
  daily: DailyStat[];
}

export const ReviewCalendar: React.FC<ReviewCalendarProps> = ({ daily }) => {
  const last28Days = daily.slice(-28);
  
  const getHeatColor = (dueReviews: number) => {
    if (dueReviews === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (dueReviews <= 3) return 'bg-green-200 dark:bg-green-900';
    if (dueReviews <= 6) return 'bg-yellow-200 dark:bg-yellow-900';
    return 'bg-red-200 dark:bg-red-900';
  };

  const totalDue = last28Days.reduce((sum, d) => sum + d.dueReviews, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Spaced Review Calendar
        </h3>
        {totalDue > 0 && (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
            {totalDue} due
          </span>
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
            {day}
          </div>
        ))}
        
        {last28Days.map((stat, i) => {
          const date = new Date(stat.date);
          return (
            <div
              key={i}
              className={`aspect-square rounded-lg ${getHeatColor(stat.dueReviews)} flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group relative`}
              title={`${stat.date}: ${stat.dueReviews} reviews due`}
            >
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {date.getDate()}
              </span>
              {stat.dueReviews > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center">
                  {stat.dueReviews}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-4">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800"></div>
          <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-900"></div>
          <div className="w-4 h-4 rounded bg-yellow-200 dark:bg-yellow-900"></div>
          <div className="w-4 h-4 rounded bg-red-200 dark:bg-red-900"></div>
        </div>
        <span>More</span>
      </div>

      {/* CTA */}
      {totalDue > 0 && (
        <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all">
          Start Reviews ({totalDue} due)
        </button>
      )}
    </div>
  );
};
