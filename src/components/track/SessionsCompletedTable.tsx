import React from 'react';

export function SessionsCompletedTable({
  sessions,
}: {
  sessions: { date: string; items: number; accuracy: number; minutes: number; formats?: string[] }[];
}) {
  console.log('📊 SessionsCompletedTable received sessions:', sessions);
  
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No sessions yet. Start practicing to see your history!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Date
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Items
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Accuracy
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white">{formattedDate}</td>
                <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">{session.items}</td>
                <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">
                  <div className="flex flex-wrap gap-1.5">
                    {(session.formats || []).map((fmt, idx) => {
                      const label = fmt === 'ukmla_sba' ? 'SBA' : fmt === 'flashcard' ? 'Flashcard' : (fmt || '').toString();
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        >
                          {label}
                        </span>
                      );
                    })}
                    {(session.formats || []).length === 0 && (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700">
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
                    >
                      {accuracyPercent.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-zinc-700 dark:text-zinc-300">
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
