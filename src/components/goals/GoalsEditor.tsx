import React, { useState } from 'react';
import { X, Target, Calendar, TrendingUp } from 'lucide-react';
import { useGoalsStore, type GoalPreset } from '@/stores/goalsStore';

interface GoalsEditorProps {
  curriculumId: string;
  onClose: () => void;
}

const PRESETS: Array<{ id: GoalPreset; name: string; description: string; icon: string }> = [
  {
    id: 'exam-4-weeks',
    name: 'Exam in 4 Weeks',
    description: '80% accuracy, 90% coverage by deadline',
    icon: '📚',
  },
  {
    id: 'daily-30-mins',
    name: 'Steady Progress',
    description: '75% accuracy, 70% coverage, no deadline',
    icon: '⏰',
  },
  {
    id: 'fast-catchup',
    name: 'Fast Catch-up',
    description: '70% accuracy, 80% coverage in 2 weeks',
    icon: '🚀',
  },
  {
    id: 'custom',
    name: 'Custom Goals',
    description: 'Set your own targets',
    icon: '⚙️',
  },
];

export const GoalsEditor: React.FC<GoalsEditorProps> = ({ curriculumId, onClose }) => {
  const { getGoals, setGoals, applyPreset } = useGoalsStore();
  const currentGoals = getGoals(curriculumId);

  const [selectedPreset, setSelectedPreset] = useState<GoalPreset>(
    currentGoals?.preset || 'custom'
  );
  const [accuracyTarget, setAccuracyTarget] = useState(
    currentGoals?.accuracyTarget ? Math.round(currentGoals.accuracyTarget * 100) : 80
  );
  const [coverageTarget, setCoverageTarget] = useState(
    currentGoals?.coverageTarget ? Math.round(currentGoals.coverageTarget * 100) : 70
  );
  const [deadline, setDeadline] = useState(
    currentGoals?.deadlineISO ? currentGoals.deadlineISO.split('T')[0] : ''
  );

  const handlePresetSelect = (preset: GoalPreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      applyPreset(curriculumId, preset);
      const updated = getGoals(curriculumId);
      if (updated) {
        setAccuracyTarget(updated.accuracyTarget ? Math.round(updated.accuracyTarget * 100) : 80);
        setCoverageTarget(updated.coverageTarget ? Math.round(updated.coverageTarget * 100) : 70);
        setDeadline(updated.deadlineISO ? updated.deadlineISO.split('T')[0] : '');
      }
    }
  };

  const handleSave = () => {
    setGoals(curriculumId, {
      accuracyTarget: accuracyTarget / 100,
      coverageTarget: coverageTarget / 100,
      deadlineISO: deadline ? new Date(deadline).toISOString() : undefined,
      preset: selectedPreset,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Set Your Goals
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Define what you want to achieve and by when
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Goal Settings */}
          <div className="space-y-4">

            {/* Accuracy Target */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Accuracy Target
                </label>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {accuracyTarget}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={accuracyTarget}
                onChange={(e) => {
                  setAccuracyTarget(Number(e.target.value));
                  setSelectedPreset('custom');
                }}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Coverage Target */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Coverage Target
                </label>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {coverageTarget}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={coverageTarget}
                onChange={(e) => {
                  setCoverageTarget(Number(e.target.value));
                  setSelectedPreset('custom');
                }}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Target Date
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  setSelectedPreset('custom');
                }}
                placeholder="When do you want to achieve these goals?"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optional - Leave blank for no deadline
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Save Goals
          </button>
        </div>
      </div>
    </div>
  );
};
