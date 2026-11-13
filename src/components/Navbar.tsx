import React from 'react';
import { Sun, Moon, Plus } from 'lucide-react';
import { ViewMode } from '../types';

interface NavbarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  recentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  darkMode,
  onToggleDarkMode,
  recentCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity flex items-center gap-2 text-left"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 inline-block" />
          ClipShare
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white ${
              currentView === 'create' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            New Clip
          </button>
          <button
            type="button"
            onClick={() => onNavigate('retrieve')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white ${
              currentView === 'retrieve' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Retrieve by Code
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 ${
              currentView === 'history' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Recent Clips
            {recentCount > 0 && (
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {recentCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('about')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 dark:hover:text-white ${
              currentView === 'about' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Security & FAQ
          </button>
        </nav>

        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Clip</span>
          </button>
        </div>
      </div>
    </header>
  );
};
