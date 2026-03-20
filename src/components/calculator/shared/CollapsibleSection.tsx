import { type ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  summary?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function CollapsibleSection({ id, title, summary, isExpanded, onToggle, children }: Props) {
  return (
    <div className="border-b border-gray-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`section-${id}`}
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-white">{title}</span>
          {!isExpanded && summary && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={`section-${id}`}
        className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}
