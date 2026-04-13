import React from 'react';
import { Play, Target, Clock, TrendingUp, AlertCircle, Star } from 'lucide-react';

interface NextSessionCardProps {
  concepts: any[];
  selectedFormat?: string;
  onStartSession: (config: { format: string; topics: string[]; reason: string }) => void;
}

export const NextSessionCard: React.FC<NextSessionCardProps> = ({
  concepts,
  selectedFormat = 'sba',
  onStartSession
}) => {
  // Analyze user's progress to create personalized recommendations
  const analyzeProgress = () => {
    if (!concepts.length) return null;

    // Get concepts that need attention (incorrect or struggling)
    const strugglingConcepts = concepts.filter((c: any) => 
      c.mastery_data.mastery_level === 1 && c.mastery_data.attempts > 0
    );

    // Get concepts that haven't been practiced recently
    const staleConcepts = concepts.filter((c: any) => {
      if (!c.mastery_data.last_practiced) return false;
      const daysSince = (Date.now() - new Date(c.mastery_data.last_practiced).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7 && c.mastery_data.mastery_level >= 2;
    });

    // Get new concepts (never attempted)
    const newConcepts = concepts.filter((c: any) => 
      c.mastery_data.mastery_level === 0 && c.mastery_data.attempts === 0
    );

    // Get concepts close to mastery (level 2-3)
    const almostMasteredConcepts = concepts.filter((c: any) => 
      c.mastery_data.mastery_level >= 2 && c.mastery_data.mastery_level < 4
    );

    // Extract a concise primary topic from concept filters and titles
    const getTopicForTitle = (concepts: any[]) => {
      const ACRONYM_SET = new Set(['ACS','IHD','ECG','STEMI','NSTEMI','COPD','CKD','UTI','DVT','PE','TIA','AF','HF','HIV']);
      const prettifyTopic = (s: string) => {
        const cleaned = s.replace(/-/g, ' ').trim();
        const upper = cleaned.toUpperCase();
        if (ACRONYM_SET.has(upper)) return upper; // keep known acronyms uppercase
        // If looks like an acronym (<=6 letters, no spaces, all letters), uppercase it
        if (/^[a-zA-Z]{2,6}$/.test(cleaned) && cleaned.indexOf(' ') === -1) return cleaned.toUpperCase();
        return cleaned.replace(/\b\w/g, c => c.toUpperCase());
      };
      const counts: Record<string, number> = {};
      const add = (k: string, w = 1) => {
        const key = (k || '').trim();
        if (!key) return;
        counts[key.toLowerCase()] = (counts[key.toLowerCase()] || 0) + w;
      };

      concepts.forEach((c: any) => {
        // 1) Count custom filters
        if (Array.isArray(c.custom_filters)) c.custom_filters.forEach((f: string) => add(f, 1));
        const title: string = c.title || '';
        if (!title) return;

        // 2) Prefer acronyms in parentheses e.g. "(ACS)"
        const paren = title.match(/\(([^)]+)\)/);
        if (paren && paren[1] && paren[1].length <= 6) add(paren[1], 3);

        // 3) Common medical acronyms anywhere in title
        const acronyms = title.match(/\b[A-Z]{2,6}\b/g);
        if (acronyms) acronyms.forEach(a => add(a, 2));

        // 4) First phrase before separators often is the theme
        const first = title.split(/[:\-–—]/)[0]?.trim();
        if (first) add(first, 1);

        // 5) Helpful heuristics
        if (/acute coronary syndrome/i.test(title)) add('ACS', 3);
        if (/ischa?emic heart disease/i.test(title)) add('IHD', 2);
      });

      // Avoid overly-broad labels
      const blacklist = new Set(['cardiology', 'general', 'mixed topics']);
      const sorted = Object.entries(counts)
        .filter(([k]) => !blacklist.has(k))
        .sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) return 'Mixed Topics';
      const top = sorted[0][0];
      return prettifyTopic(top);
    };

    // Helper: craft engaging, action-oriented titles
    const buildTitle = (kind: 'struggling'|'stale'|'almost_mastered'|'new', topic: string) => {
      const cta = selectedFormat === 'flashcard' ? 'Sprint' : selectedFormat === 'sba' ? 'Clinicals' : 'Practice';
      switch (kind) {
        case 'struggling':
          return `Tackle ${topic} • ${cta}`;
        case 'stale':
          return `Quick refresher: ${topic}`;
        case 'almost_mastered':
          return `Finish strong: ${topic}`;
        case 'new':
        default:
          return `Start strong: ${topic}`;
      }
    };

    // Prioritize recommendations
    if (strugglingConcepts.length > 0) {
      const topic = getTopicForTitle(strugglingConcepts.slice(0, 5));
      return {
        type: 'struggling',
        concepts: strugglingConcepts.slice(0, 5),
        format: selectedFormat,
        title: buildTitle('struggling', topic),
        primaryTopic: topic,
        reason: 'Reinforce challenging concepts',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    if (staleConcepts.length > 0) {
      const topic = getTopicForTitle(staleConcepts.slice(0, 5));
      return {
        type: 'stale',
        concepts: staleConcepts.slice(0, 5),
        format: selectedFormat,
        title: buildTitle('stale', topic),
        primaryTopic: topic,
        reason: 'Refresh knowledge from last week',
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      };
    }

    if (almostMasteredConcepts.length > 0) {
      const topic = getTopicForTitle(almostMasteredConcepts.slice(0, 5));
      return {
        type: 'almost_mastered',
        concepts: almostMasteredConcepts.slice(0, 5),
        format: selectedFormat,
        title: buildTitle('almost_mastered', topic),
        primaryTopic: topic,
        reason: 'Push to complete mastery',
        icon: TrendingUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }

    if (newConcepts.length > 0) {
      const topic = getTopicForTitle(newConcepts.slice(0, 5));
      return {
        type: 'new',
        concepts: newConcepts.slice(0, 5),
        format: selectedFormat,
        title: buildTitle('new', topic),
        primaryTopic: topic,
        reason: 'Start with fundamentals',
        icon: Star,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    return null;
  };

  const recommendation = analyzeProgress();

  if (!recommendation) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-black/[0.06]">
        <div className="text-center py-8">
          <Target className="h-8 w-8 text-stone-400 mx-auto mb-3" />
          <p className="text-sm text-stone-500 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
            No concepts available for practice
          </p>
        </div>
      </div>
    );
  }

  // Get the most common custom filters from recommended concepts
  const getTopicSummary = () => {
    const filterCounts: Record<string, number> = {};
    
    recommendation.concepts.forEach((concept: any) => {
      if (concept.custom_filters) {
        concept.custom_filters.forEach((filter: string) => {
          filterCounts[filter] = (filterCounts[filter] || 0) + 1;
        });
      }
    });

    const sortedFilters = Object.entries(filterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);

    if (sortedFilters.length === 0) return 'Mixed Topics';
    if (sortedFilters.length === 1) return sortedFilters[0][0].replace(/-/g, ' ');
    return sortedFilters.map(([filter]) => filter.replace(/-/g, ' ')).join(' & ');
  };

  const topicSummary = getTopicSummary();
  const conceptCount = recommendation.concepts.length;
  const countLabel = (() => {
    switch (recommendation.format) {
      case 'flashcard':
        return `${conceptCount} Flashcards`;
      case 'sba':
        return `${conceptCount} SBAs`;
      case 'ukmla_sba':
        return `${conceptCount} UKMLA SBAs`;
      default:
        return `${conceptCount} Items`;
    }
  })();
  const primaryTopic = (recommendation as any).primaryTopic || topicSummary;
  const descriptionText = (() => {
    switch ((recommendation as any).type) {
      case 'struggling':
        return `Reinforce weak areas in ${primaryTopic}`;
      case 'stale':
        return `Refresh recently neglected ${primaryTopic} topics`;
      case 'almost_mastered':
        return `Polish and finalize mastery in ${primaryTopic}`;
      case 'new':
      default:
        return `Learn core concepts in ${primaryTopic}`;
    }
  })();

  const handleStartSession = () => {
    const topics = recommendation.concepts.map((c: any) => c.concept_id || c.id);
    onStartSession({
      format: recommendation.format,
      topics,
      reason: recommendation.reason
    });
  };

  const Icon = recommendation.icon;

  return (
    <button
      onClick={handleStartSession}
      className="w-full bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-stone-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:border-stone-300 transition-all duration-300 text-left group cursor-pointer h-full min-h-[260px] flex flex-col"
    >
      {/* Main content - centered */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2.5 rounded-xl ${recommendation.bgColor} border ${recommendation.borderColor} group-hover:scale-110 transition-transform`}>
            <Icon className={`h-5 w-5 ${recommendation.color}`} />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-medium text-stone-900 group-hover:text-stone-700 transition-colors" style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 500 }}>
              {recommendation.title}
            </div>
            <div className="text-xs text-stone-600 font-light mt-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {descriptionText}
            </div>
          </div>
        </div>

        {/* Meta row under title/description */}
        <div className="flex items-center gap-2 mb-3 pl-12">
          <div className="px-3 py-1.5 bg-stone-100 rounded-full">
            <span className="text-xs text-stone-600 font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {countLabel}
            </span>
          </div>
          <div className="px-3 py-1.5 bg-stone-100 rounded-full">
            <span className="text-xs text-stone-600 font-medium" style={{ fontFamily: "'Manrope', sans-serif" }}>
              ~{Math.ceil(conceptCount * 1.5)} min
            </span>
          </div>
        </div>
      </div>

      {/* Call to Action - anchored at bottom */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-200/50">
        <span className="text-sm text-stone-600 font-light" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {recommendation.reason}
        </span>
        <Play className="h-5 w-5 text-stone-900 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};
