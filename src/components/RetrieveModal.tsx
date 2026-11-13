import React, { useState } from 'react';
import { Search, ArrowRight, X } from 'lucide-react';

interface RetrieveModalProps {
  onRetrieve: (id: string) => void;
  onClose?: () => void;
  isInline?: boolean;
}

export const RetrieveModal: React.FC<RetrieveModalProps> = ({
  onRetrieve,
  onClose,
  isInline = false,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim().toLowerCase();
    if (!cleaned) {
      setError('Please enter a clip code or alias');
      return;
    }

    // Allow user to paste a full URL like https://domain.com/c/x9k2p4 or ?c=x9k2p4
    let targetId = cleaned;
    if (cleaned.includes('/c/')) {
      const parts = cleaned.split('/c/');
      targetId = parts[parts.length - 1].split('?')[0].split('#')[0].replace(/\/+$/, '');
    } else if (cleaned.includes('?c=') || cleaned.includes('&c=')) {
      const match = cleaned.match(/[?&]c=([a-z0-9_-]+)/);
      if (match && match[1]) targetId = match[1];
    } else if (cleaned.startsWith('c=')) {
      targetId = cleaned.replace('c=', '');
    }

    targetId = targetId.replace(/^\/+|\/+$/g, '');
    if (!targetId) {
      setError('Invalid clip URL or code');
      return;
    }

    onRetrieve(targetId);
  };

  const content = (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Search className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Retrieve a Shared Clip
          </h2>
        </div>
        {onClose && !isInline && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Got a quick code or URL from another phone, laptop, or colleague? Enter the 6-character code or custom alias below to retrieve the note instantly.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Quick Retrieval Code or Link
          </label>
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={e => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="e.g. K9X2M4 or custom alias or link"
              autoFocus
              className="w-full px-4 py-3 text-sm font-mono tracking-wider rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <span>Open Clip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {content}
    </div>
  );
};
