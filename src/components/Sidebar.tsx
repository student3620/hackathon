import React from 'react';
import {
  LayoutDashboard,
  Compass,
  LineChart,
  BookOpen,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { ActiveTab } from '../types/museum';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  recordCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, recordCount }) => {
  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    statusText?: string;
    planned?: boolean;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'explorer',
      label: 'Collection Explorer',
      icon: <Compass className="w-4 h-4" />,
      statusText: recordCount > 0 ? recordCount.toLocaleString() : undefined,
    },
    {
      id: 'analytics',
      label: 'Historical Analytics',
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      id: 'storyteller',
      label: 'AI Storyteller',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'visual',
      label: 'Visual Story Studio',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'evidence',
      label: 'Evidence Explorer',
      icon: <ShieldCheck className="w-4 h-4" />,
      statusText: 'Coming soon',
      planned: true,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-[#191715] border-b md:border-b-0 md:border-r border-[#2C2824] flex flex-col shrink-0">
      <div className="px-5 pt-5 pb-3">
        <span className="text-[11px] font-medium tracking-wider text-[#8C8377] uppercase">
          Modules
        </span>
      </div>

      <nav className="px-3 pb-4 space-y-1 flex-1" aria-label="Primary navigation">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#26221D] text-[#FCFAF5] border border-[#3F372C]'
                  : item.planned
                  ? 'text-[#8C8377] hover:text-[#CFC7BA] hover:bg-[#211E1B] border border-transparent'
                  : 'text-[#CFC7BA] hover:text-[#FCFAF5] hover:bg-[#211E1B] border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className={isActive ? 'text-[#D1B06B]' : 'text-[#8C8377]'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </span>

              {item.statusText && (
                <span
                  className={`text-[11px] shrink-0 whitespace-nowrap ${
                    item.planned
                      ? 'text-[#787065] font-normal'
                      : 'font-mono text-[#D1B06B] tabular-nums'
                  }`}
                >
                  {item.statusText}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="hidden md:block p-5 border-t border-[#2C2824] text-xs text-[#9E9589] space-y-1.5">
        <div className="font-medium text-[#DFD7CA]">Unknown-Origin Policy</div>
        <p className="leading-relaxed text-[12px] text-[#8C8377]">
          Missing geographical origins are preserved as unrecorded and never derived from culture,
          medium, or imagery.
        </p>
      </div>
    </aside>
  );
};
