import React from 'react';
import { ExternalLink } from 'lucide-react';

interface Session {
  date: string;
  items: number;
  accuracy: number;
  minutes: number;
}

interface SessionsTableProps {
  sessions: Session[];
}

export const SessionsTable: React.FC<SessionsTableProps> = ({ sessions }) => {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Recent Sessions
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Date
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Items
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Accuracy
              </th>
              <th className="hidden md:table-cell text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Time
              </th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, i) => {
              const accuracyPercent = session.accuracy * 100;
              const date = new Date(session.date);
              const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });

              return (
                <tr 
                  key={i}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                    {formattedDate}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {session.items}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-semibold ${
                      accuracyPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                      accuracyPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {accuracyPercent.toFixed(0)}%
                    </span>
                  </td>
                  <td className="hidden md:table-cell py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                    {session.minutes} min
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1 text-sm font-medium">
                      Resume
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
