import React, { useState } from 'react';
import { X, Upload, Download, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurriculumPublishingService } from '@/services/curriculumPublishing';

interface PublishCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculum: {
    id: string;
    name: string;
    description: string;
    conceptCount: number;
  };
}

export const PublishCurriculumModal: React.FC<PublishCurriculumModalProps> = ({
  isOpen,
  onClose,
  curriculum
}) => {
  const [step, setStep] = useState<'options' | 'publish' | 'export'>('options');
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Publish form state
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [estimatedHours, setEstimatedHours] = useState(10);

  const handlePublish = async () => {
    if (!author.trim()) {
      alert('Please enter your name as the author');
      return;
    }

    setPublishing(true);
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const success = await CurriculumPublishingService.publishCurriculum(curriculum.id, {
        author: author.trim(),
        tags: tagArray,
        difficulty,
        estimatedHours
      });

      if (success) {
        alert('Curriculum published to Expert successfully! You can now find it in the Expert tab (Import Expert).');
        onClose();
      } else {
        alert('Failed to publish to Expert. Please try again.');
      }
    } catch (error) {
      console.error('Error publishing curriculum:', error);
      alert('Failed to publish to Expert. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportData = await CurriculumPublishingService.exportCurriculum(curriculum.id);
      if (exportData) {
        CurriculumPublishingService.downloadCurriculumFile(exportData);
        alert('Curriculum exported successfully! You can share this file with others.');
        onClose();
      } else {
        alert('Failed to export curriculum. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting curriculum:', error);
      alert('Failed to export curriculum. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Publish to Expert
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Publish "{curriculum.name}" to the Expert tab so others can import it
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'options' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Publish to Expert Option */}
                <div
                  onClick={() => setStep('publish')}
                  className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Publish to Expert</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Make this curriculum available in your Expert library for import
                    </p>
                  </div>
                </div>

                {/* Export Option */}
                <div
                  onClick={() => setStep('export')}
                  className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Export File</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Download as a file to share privately
                    </p>
                  </div>
                </div>
              </div>

              {/* Curriculum Info */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Curriculum Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{curriculum.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Concepts:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">{curriculum.conceptCount}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 dark:text-gray-400">Description:</span>
                  <p className="text-gray-900 dark:text-gray-100 text-sm mt-1">{curriculum.description}</p>
                </div>
              </div>
            </div>
          )}

          {step === 'publish' && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setStep('options')}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  ← Back to options
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Author Name *
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name or organization"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., UKMLA, Cardiology, Clinical, Advanced"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Study Hours
                  </label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 0)}
                    min="1"
                    max="200"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Expert Publishing Guidelines</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Ensure all content is accurate and up-to-date</li>
                  <li>• Include proper citations for medical guidelines</li>
                  <li>• Your curriculum can be imported from the Expert tab after publishing</li>
                  <li>• You retain ownership of your content</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handlePublish}
                  disabled={publishing || !author.trim()}
                  className="flex-1"
                >
                  {publishing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publishing to Expert...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Publish to Expert
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setStep('options')}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === 'export' && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <button
                  onClick={() => setStep('options')}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  ← Back to options
                </button>
              </div>

              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Export Curriculum
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Download your curriculum as a JSON file that can be imported by other users
                </p>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Export includes:</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• All {curriculum.conceptCount} concepts with full content</li>
                    <li>• Custom filters and categories</li>
                    <li>• Practice templates and configurations</li>
                    <li>• Curriculum metadata and settings</li>
                  </ul>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Curriculum File
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
