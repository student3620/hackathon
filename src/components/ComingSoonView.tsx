import React from 'react';
import { Compass, ArrowRight, Clock } from 'lucide-react';
import { ActiveTab } from '../types/museum';

interface ComingSoonViewProps {
  tab: ActiveTab;
  onNavigateToExplorer: () => void;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({ tab, onNavigateToExplorer }) => {
  const modules: Record<ActiveTab, { title: string; subtitle: string; description: string }> = {
    overview: {
      title: 'Overview',
      subtitle: 'Museum Collection Summary',
      description: 'Overview dashboard of loaded museum collection records.',
    },
    explorer: {
      title: 'Collection Explorer',
      subtitle: 'Browse Museum Records',
      description: 'Explore museum artifacts and verified catalogue fields.',
    },
    analytics: {
      title: 'Historical Analytics',
      subtitle: 'Planned Module · Chronological & Material Distributions',
      description:
        'Scheduled for a future milestone to chart historical date spans, medium distributions, and documented geography coverage across the loaded dataset.',
    },
    storyteller: {
      title: 'AI Storyteller',
      subtitle: 'Planned Module · Source-Grounded Narratives',
      description:
        'Scheduled for a future milestone to assemble factual curatorial narratives grounded strictly in uploaded catalogue metadata.',
    },
    visual: {
      title: 'Visual Story Studio',
      subtitle: 'Planned Module · Curatorial Storyboards',
      description:
        'Scheduled for a future milestone to arrange verified museum objects into structured exhibition sequences.',
    },
    evidence: {
      title: 'Evidence Explorer',
      subtitle: 'Planned Module · Catalogue Provenance & Audit Trail',
      description:
        'Scheduled for a future milestone to inspect metadata completeness, unknown-origin records, and field-level source attribution.',
    },
  };

  const info = modules[tab];

  return (
    <div className="bg-[#FCFAF5] border border-[#DDD4C4] rounded-xl p-10 sm:p-12 text-center max-w-2xl mx-auto my-8 text-[#1C1917]">
      <div className="w-12 h-12 rounded-xl bg-[#F4EFE4] border border-[#DDD4C4] flex items-center justify-center text-[#96722D] mx-auto mb-5">
        <Clock className="w-6 h-6 stroke-[1.75]" />
      </div>

      <div className="text-xs font-mono uppercase tracking-wider text-[#755821]">
        Coming Soon · Subsequent Milestone
      </div>

      <h2 className="text-2xl font-serif font-semibold text-[#1C1917] mt-2">{info.title}</h2>
      <p className="text-sm font-medium text-[#5C554C] mt-1">{info.subtitle}</p>
      <p className="text-sm text-[#4A443C] leading-relaxed max-w-lg mx-auto mt-4 mb-8">
        {info.description}
      </p>

      <button
        type="button"
        onClick={onNavigateToExplorer}
        className="px-5 py-2.5 rounded-lg bg-[#1B1917] hover:bg-[#2F2B26] text-[#FCFAF5] font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
      >
        <Compass className="w-4 h-4 text-[#D1B06B]" />
        Return to Collection Explorer
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
