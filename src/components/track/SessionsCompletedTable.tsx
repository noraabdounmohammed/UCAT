import React from 'react';

export function SessionsCompletedTable({
  sessions,
}: {
  sessions: { date: string; items: number; accuracy: number; minutes: number; formats?: string[] }[];
}) {

  
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
        No sessions yet. Start practicing to see your history!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="text-left py-3 px-4 text-xs font-medium text-stone-700 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              Date
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-stone-700 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              Session
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-stone-700 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              Accuracy
            </th>
            <th className="hidden md:table-cell text-left py-3 px-4 text-xs font-medium text-stone-700 uppercase tracking-wider" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, i) => {
            // Accuracy is already a percentage (0-100), not a decimal
            const accuracyPercent = session.accuracy;
            const date = new Date(session.date);
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <tr
                key={i}
                className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
              >
                <td className="py-3 px-4 text-sm text-stone-900" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}>{formattedDate}</td>
                <td className="py-3 px-4 text-sm text-stone-700" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                  {(session.formats || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(session.formats || []).map((fmt, idx) => {
                        const label = fmt === 'ukmla_sba' ? 'SBA' : fmt === 'flashcard' ? 'Flashcard' : (fmt || '').toString();
                        return (
                          <span key={idx}>
                            {session.items} × {label}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span>{session.items} items</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {/* Hide bar on mobile, show on desktop */}
                    <div className="hidden sm:block h-2 w-20 rounded-full bg-stone-200">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${accuracyPercent}%`,
                          background:
                            accuracyPercent >= 70
                              ? '#34C759'
                              : accuracyPercent >= 50
                              ? '#FFD60A'
                              : '#FF3B30',
                        }}
                      />
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        accuracyPercent >= 70
                          ? 'text-[#34C759]'
                          : accuracyPercent >= 50
                          ? 'text-[#FFD60A]'
                          : 'text-[#FF3B30]'
                      }`}
                      style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600 }}
                    >
                      {accuracyPercent.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="hidden md:table-cell py-3 px-4 text-sm text-stone-700" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                  {session.minutes} min
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
