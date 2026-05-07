/**
 * Citation Link Component
 * Displays a clickable link to the NICE guideline source.
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { buildNiceUrl, formatCitationLabel } from '@/utils/niceCitation';
import { cn } from '@/lib/utils';

interface CitationLinkProps {
  citationId: string | null | undefined;
  className?: string;
}

export const CitationLink: React.FC<CitationLinkProps> = ({
  citationId,
  className
}) => {
  const url = buildNiceUrl(citationId);
  const label = formatCitationLabel(citationId);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm',
        'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300',
        'hover:underline transition-colors',
        className
      )}
    >
      <span>Source: {label}</span>
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
};

export default CitationLink;
