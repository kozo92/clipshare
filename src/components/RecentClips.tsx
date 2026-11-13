import React, { useState } from 'react';
import { Clock, Shield, Flame, Trash2, ExternalLink, Copy, Check, Search, Plus, Image as ImageIcon } from 'lucide-react';
import { RecentClipItem } from '../types';
import { formatTimeRemaining } from '../utils/textUtils';

interface RecentClipsProps {
  clips: RecentClipItem[];
  onOpenClip: (id: string) => void;
  onRemoveClip: (id: string) => void;
  onClearAll: () => void;
  onNewClip: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RecentClips: React.FC<RecentClipsProps> = ({
  clips,
  onOpenClip,
  onRemoveClip,
  onClearAll,
  onNewClip,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = clips.filter(
    c =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.snippet.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyCode = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id.toUpperCase());
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      onToast(`Code ${id.toUpperCase()} copied!`, 'success');
    } catch {
      onToast('Failed to copy', 'error');
    }
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onRemoveClip(id);
    onToast('Removed from recent list', 'info');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Clips on this Device
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Stored locally in your browser. Clips created or visited recently appear here for quick access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {clips.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear all recent clips from your device history?')) {
                  onClearAll();
                  onToast('Recent history cleared', 'info');
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewClip}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Clip</span>
          </button>
        </div>
      </div>

      {/* Search Bar if items exist */}
      {clips.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recent clips by title, code, or content..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {search ? 'No matching clips found' : 'No recent clips yet'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {search
              ? 'Try searching with a different keyword or clip ID.'
              : 'Clips that you create or open will be recorded locally on this device for your convenience.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={onNewClip}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create your first clip</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => onOpenClip(item.id)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 rounded-xl p-4 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded uppercase">
                      {item.id}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={e => handleCopyCode(e, item.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Copy code"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={e => handleRemove(e, item.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-mono bg-slate-50 dark:bg-slate-950/60 p-2 rounded border border-slate-100 dark:border-slate-800/60">
                  {item.snippet || (item.hasImage ? '[Screenshot attached]' : '(empty content)')}
                </p>
              </div>

              {/* Footer metadata */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  {item.hasImage && (
                    <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                      <ImageIcon className="w-3 h-3" /> Image
                    </span>
                  )}
                  {item.hasPassword && (
                    <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                      <Shield className="w-3 h-3" /> Locked
                    </span>
                  )}
                  {item.burnAfterReading ? (
                    <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                      <Flame className="w-3 h-3" /> Burnable
                    </span>
                  ) : item.expiresAt ? (
                    <span>{formatTimeRemaining(item.expiresAt)}</span>
                  ) : (
                    <span>Permanent</span>
                  )}
                </div>

                <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1 font-medium">
                  Open <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
