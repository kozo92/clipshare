import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Editor } from './components/Editor';
import { ViewClip } from './components/ViewClip';
import { RetrieveModal } from './components/RetrieveModal';
import { RecentClips } from './components/RecentClips';
import { AboutSection } from './components/AboutSection';
import { ShareSuccessModal } from './components/ShareSuccessModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Clip, ClipCreationPayload, RecentClipItem, ViewMode } from './types';
import { getRecentClips, saveRecentClip, removeRecentClip, clearRecentClips } from './utils/storage';
import { ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('create');
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals & Clip states
  const [shareModalClip, setShareModalClip] = useState<(Partial<Clip> & { id: string }) | null>(null);
  const [recentClips, setRecentClips] = useState<RecentClipItem[]>([]);
  const [editingClip, setEditingClip] = useState<{ clip: Clip; password?: string } | null>(null);

  // Quick hero retrieval code input
  const [heroCodeInput, setHeroCodeInput] = useState('');

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clipshare_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('clipshare_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('clipshare_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Toast helper
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Sync recent clips from storage
  useEffect(() => {
    setRecentClips(getRecentClips());
  }, []);

  // URL routing helper
  const parseUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Check pathname: /c/:id
    const cMatch = pathname.match(/^\/c\/([a-zA-Z0-9_-]+)/);
    if (cMatch && cMatch[1]) {
      setActiveClipId(cMatch[1]);
      setCurrentView('view');
      return;
    }

    // Check search param ?c=:id
    const queryClip = searchParams.get('c');
    if (queryClip) {
      setActiveClipId(queryClip);
      setCurrentView('view');
      return;
    }

    // Check hash #/c/:id
    const hashMatch = hash.match(/^#\/c\/([a-zA-Z0-9_-]+)/);
    if (hashMatch && hashMatch[1]) {
      setActiveClipId(hashMatch[1]);
      setCurrentView('view');
      return;
    }

    // Check hash for views: #/recent, #/retrieve, #/about
    if (hash === '#/recent' || hash === '#/history') {
      setCurrentView('history');
    } else if (hash === '#/retrieve') {
      setCurrentView('retrieve');
    } else if (hash === '#/about') {
      setCurrentView('about');
    } else {
      setCurrentView('create');
      setActiveClipId(null);
    }
  }, []);

  useEffect(() => {
    parseUrl();
    window.addEventListener('popstate', parseUrl);
    return () => window.removeEventListener('popstate', parseUrl);
  }, [parseUrl]);

  const navigateTo = (view: ViewMode, clipId?: string) => {
    setCurrentView(view);
    if (view === 'view' && clipId) {
      setActiveClipId(clipId);
      window.history.pushState({}, '', `/c/${clipId}`);
    } else if (view === 'create') {
      setActiveClipId(null);
      setEditingClip(null);
      window.history.pushState({}, '', '/');
    } else {
      setActiveClipId(null);
      window.history.pushState({}, '', `#/${view}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Publish or Update a clip
  const handlePublishClip = async (payload: ClipCreationPayload) => {
    setLoading(true);
    try {
      let endpoint = '/api/clips';
      let method = 'POST';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (editingClip) {
        endpoint = `/api/clips/${editingClip.clip.id}`;
        method = 'PUT';
        if (editingClip.password) {
          headers['x-clip-password'] = editingClip.password;
        }
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save clip');
      }

      const clipId = data.id || (editingClip ? editingClip.clip.id : '');

      // Save to recent clips
      const snippet = (payload.content || '').slice(0, 80).replace(/\n/g, ' ');
      const historyItem: RecentClipItem = {
        id: clipId,
        title: payload.title || (payload.imageData && !payload.content.trim() ? 'Screenshot Clip' : 'Untitled Note'),
        snippet,
        hasImage: Boolean(payload.imageData),
        createdAt: Date.now(),
        expiresAt: data.expiresAt || null,
        hasPassword: Boolean(payload.password),
        burnAfterReading: Boolean(payload.burnAfterReading),
        syntax: payload.syntax || 'plain',
      };
      saveRecentClip(historyItem);
      setRecentClips(getRecentClips());

      setEditingClip(null);
      setShareModalClip({
        id: clipId,
        title: payload.title,
        content: payload.content,
        imageData: payload.imageData,
        hasPassword: Boolean(payload.password),
        burnAfterReading: Boolean(payload.burnAfterReading),
        expiresAt: data.expiresAt || null,
        syntax: payload.syntax || 'plain',
      });

      addToast(
        editingClip ? 'Clip updated successfully!' : 'Clip published successfully!',
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating clip';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrieveHero = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = heroCodeInput.trim().toLowerCase();
    if (!cleaned) return;
    let target = cleaned;
    if (cleaned.includes('/c/')) {
      const parts = cleaned.split('/c/');
      target = parts[parts.length - 1].split('?')[0].split('#')[0];
    }
    navigateTo('view', target);
    setHeroCodeInput('');
  };

  const handleRemoveFromHistory = (id: string) => {
    const updated = removeRecentClip(id);
    setRecentClips(updated);
  };

  const handleClearHistory = () => {
    clearRecentClips();
    setRecentClips([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        currentView={currentView}
        onNavigate={view => navigateTo(view)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        recentCount={recentClips.length}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Hero Section shown on 'create' mode */}
        {currentView === 'create' && !editingClip && (
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-2 border-b border-slate-200/80 dark:border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Zero Login · Temporary · Encrypted
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Share text, notes & screenshots securely across devices
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste text or screenshots (Ctrl+V) to create password-protected, self-destructing clips with instant QR codes.
              </p>
            </div>

            {/* Quick Retrieve Inline Widget */}
            <form
              onSubmit={handleRetrieveHero}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs shrink-0"
            >
              <input
                type="text"
                value={heroCodeInput}
                onChange={e => setHeroCodeInput(e.target.value)}
                placeholder="Got a code? e.g. 7A9X"
                className="w-32 sm:w-36 px-2.5 py-1.5 text-xs font-mono tracking-wider bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors flex items-center gap-1"
              >
                <span>Open</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </form>
          </div>
        )}

        {/* View Router */}
        {currentView === 'create' && (
          <Editor
            onPublish={handlePublishClip}
            loading={loading}
            onToast={addToast}
            initialContent={editingClip?.clip.content || ''}
            initialTitle={editingClip?.clip.title || ''}
            initialImageData={editingClip?.clip.imageData || null}
          />
        )}

        {currentView === 'view' && activeClipId && (
          <ViewClip
            clipId={activeClipId}
            onBackToNew={() => navigateTo('create')}
            onOpenShareModal={clip => setShareModalClip(clip)}
            onEditClip={(clip, pwd) => {
              setEditingClip({ clip, password: pwd });
              setCurrentView('create');
            }}
            onToast={addToast}
          />
        )}

        {currentView === 'retrieve' && (
          <RetrieveModal
            isInline={true}
            onRetrieve={id => navigateTo('view', id)}
          />
        )}

        {currentView === 'history' && (
          <RecentClips
            clips={recentClips}
            onOpenClip={id => navigateTo('view', id)}
            onRemoveClip={handleRemoveFromHistory}
            onClearAll={handleClearHistory}
            onNewClip={() => navigateTo('create')}
            onToast={addToast}
          />
        )}

        {currentView === 'about' && (
          <AboutSection
            onNewClip={() => navigateTo('create')}
            onToast={addToast}
          />
        )}
      </main>

      {/* Share Success / QR Code Modal */}
      {shareModalClip && (
        <ShareSuccessModal
          clip={shareModalClip}
          onClose={() => setShareModalClip(null)}
          onOpenClip={id => {
            setShareModalClip(null);
            navigateTo('view', id);
          }}
          onNewClip={() => {
            setShareModalClip(null);
            navigateTo('create');
          }}
          onToast={addToast}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">ClipShare</span>
            <span aria-hidden="true">·</span>
            <span>Online Clipboard & Temporary Notes</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigateTo('about')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Privacy & Security
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigateTo('history')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Device History
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigateTo('retrieve')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Quick Code
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
