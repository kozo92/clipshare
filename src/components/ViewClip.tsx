import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Download,
  QrCode as QrIcon,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Lock,
  ExternalLink,
  Trash2,
  Edit3,
  Type,
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { Clip } from '../types';
import { formatTimeRemaining, computeTextStats, formatBytes } from '../utils/textUtils';
import {
  copyImageDataUrlToClipboard,
  estimateDataUrlBytes,
  getImageExtensionFromDataUrl,
} from '../utils/imageUtils';

interface ViewClipProps {
  clipId: string;
  onBackToNew: () => void;
  onOpenShareModal: (clip: Clip) => void;
  onEditClip: (clip: Clip, password?: string) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ViewClip: React.FC<ViewClipProps> = ({
  clipId,
  onBackToNew,
  onOpenShareModal,
  onEditClip,
  onToast,
}) => {
  const [clip, setClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Password unlock state
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [activePassword, setActivePassword] = useState<string>('');

  // UI preferences
  const [isMonospace, setIsMonospace] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Delete modal state
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchClip = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError(null);

      const headers: Record<string, string> = {};
      if (pwd) {
        headers['x-clip-password'] = pwd;
      }

      const res = await fetch(`/api/clips/${encodeURIComponent(clipId)}`, {
        headers,
      });

      const data = await res.json();

      if (res.status === 401) {
        setRequiresPassword(true);
        setClip({
          id: data.id,
          title: data.title,
          content: '',
          syntax: data.syntax || 'plain',
          hasPassword: true,
          burnAfterReading: data.burnAfterReading,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          viewCount: data.viewCount,
        });
        setLoading(false);
        return;
      }

      if (res.status === 403) {
        setPasswordError('Incorrect password. Please try again.');
        setLoading(false);
        return;
      }

      if (res.status === 404) {
        if (data.expired) {
          setIsExpired(true);
          setError('This temporary clip has expired and has been permanently deleted.');
        } else {
          setError('Clip not found. It may have expired or been deleted.');
        }
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch clip');
      }

      setClip(data);
      setRequiresPassword(false);
      if (pwd) {
        setActivePassword(pwd);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching clip';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClip();
  }, [clipId]);

  // Live timer for remaining time
  useEffect(() => {
    if (!clip || !clip.expiresAt) return;
    const updateTimer = () => {
      setTimeRemaining(formatTimeRemaining(clip.expiresAt));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [clip?.expiresAt]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setPasswordError('Please enter the password');
      return;
    }
    fetchClip(passwordInput);
  };

  const handleCopyContent = async () => {
    if (!clip?.content) return;
    try {
      await navigator.clipboard.writeText(clip.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast('Note text copied to clipboard!', 'success');
    } catch {
      onToast('Failed to copy. Please select and copy manually.', 'error');
    }
  };

  const handleCopyImage = async () => {
    if (!clip?.imageData) return;
    try {
      await copyImageDataUrlToClipboard(clip.imageData);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 2000);
      onToast('Screenshot copied to clipboard!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to copy image to clipboard';
      onToast(msg, 'error');
    }
  };

  const handleDownloadImage = () => {
    if (!clip?.imageData) return;
    const ext = getImageExtensionFromDataUrl(clip.imageData);
    const a = document.createElement('a');
    a.href = clip.imageData;
    a.download = `${clip.title ? clip.title.replace(/\s+/g, '_') : 'screenshot'}_${clip.id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast(`Downloaded screenshot as .${ext}`, 'info');
  };

  const handleDownload = () => {
    if (!clip?.content) return;
    const blob = new Blob([clip.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = clip.syntax === 'markdown' ? 'md' : clip.syntax === 'json' ? 'json' : 'txt';
    a.download = `${clip.title ? clip.title.replace(/\s+/g, '_') : 'clip'}_${clip.id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast(`Downloaded as .${ext}`, 'info');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this clip?')) return;
    try {
      setIsDeleting(true);
      const headers: Record<string, string> = {};
      if (activePassword) {
        headers['x-clip-password'] = activePassword;
      }
      const res = await fetch(`/api/clips/${encodeURIComponent(clipId)}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete clip');
      }
      onToast('Clip deleted successfully', 'success');
      onBackToNew();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting clip';
      onToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Decrypting & loading clip...
        </p>
      </div>
    );
  }

  // Not found or Expired state
  if (error || !clip) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto flex items-center justify-center">
          {isExpired ? <Clock className="w-6 h-6 text-amber-500" /> : <AlertTriangle className="w-6 h-6 text-rose-500" />}
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isExpired ? 'Clip Expired' : 'Clip Not Found'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {error || 'This clip does not exist, has expired, or was already burned after reading.'}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Create a New Note</span>
          </button>
        </div>
      </div>
    );
  }

  // Password Prompt Screen
  if (requiresPassword) {
    return (
      <div className="w-full max-w-md mx-auto py-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Password Protected Note
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The creator has locked this note with a password. Enter the password below to decrypt and read.
            </p>
          </div>

          {/* Metadata preview */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Clip ID:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 uppercase">{clip.id}</span>
            </div>
            {clip.title && (
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Title:</span>
                <span className="truncate max-w-[200px]">{clip.title}</span>
              </div>
            )}
            {clip.burnAfterReading && (
              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <Flame className="w-3.5 h-3.5" /> Burns immediately after first view!
              </div>
            )}
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Unlock Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Enter password..."
                  autoFocus
                  className="w-full px-3 py-2 pr-9 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Unlock Note</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onBackToNew}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Cancel and return to editor
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = computeTextStats(clip.content);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Burned Warning Banner */}
      {clip.burned && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start gap-3 text-rose-800 dark:text-rose-300">
          <Flame className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-sm">🔥 Burn-After-Reading Note Destroyed</p>
            <p>
              This clip was set to view once. It has now been permanently purged from the server and cannot be viewed again. Please copy or download your content now.
            </p>
          </div>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold">
                {clip.id}
              </span>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {clip.title || 'Untitled Note'}
              </h1>
            </div>

            {/* Unboxed Metadata with dot separators (§1.A Zero-Pill rule) */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Created {new Date(clip.createdAt).toLocaleDateString()}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{clip.viewCount} {clip.viewCount === 1 ? 'view' : 'views'}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{clip.syntax}</span>
              {clip.expiresAt && !clip.burned && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                    {timeRemaining || 'Active'}
                  </span>
                </>
              )}
              {clip.hasPassword && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Protected
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Monospace Toggle (when text exists) */}
            {clip.content && (
              <button
                type="button"
                onClick={() => setIsMonospace(!isMonospace)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                title={isMonospace ? 'Switch to proportional font' : 'Switch to monospace font'}
              >
                <Type className="w-4 h-4" />
              </button>
            )}

            {/* Share / QR Modal */}
            <button
              type="button"
              onClick={() => onOpenShareModal(clip)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 transition-colors"
              title="Share Link & QR"
            >
              <QrIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Share & QR</span>
            </button>

            {/* Download Text */}
            {clip.content && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 transition-colors"
                title="Download text file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}

            {/* Raw Link */}
            {clip.content && (
              <a
                href={`/api/clips/${clip.id}/raw${activePassword ? `?password=${encodeURIComponent(activePassword)}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 transition-colors"
                title="Raw text view"
              >
                <span>Raw</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}

            {/* 1-Click Copy Text */}
            {clip.content && (
              <button
                type="button"
                onClick={handleCopyContent}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            )}

            {/* If image-only clip, promote Copy Image as primary CTA in header */}
            {clip.imageData && !clip.content && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {copiedImage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedImage ? 'Image Copied!' : 'Copy Image'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Text Content Box (only rendered when text exists) */}
        {clip.content && (
          <div className="relative">
            <div
              className={`w-full min-h-[200px] max-h-[600px] overflow-auto p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm leading-relaxed select-text ${
                isMonospace ? 'font-mono' : 'font-sans'
              }`}
            >
              <pre className="whitespace-pre-wrap break-words">{clip.content}</pre>
            </div>
          </div>
        )}

        {/* Screenshot / Image Box */}
        {clip.imageData && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                <span>Screenshot</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px · ` : ''}
                  {formatBytes(estimateDataUrlBytes(clip.imageData))}
                </span>
              </div>

              {clip.content && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    className="px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    {copiedImage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedImage ? 'Copied!' : 'Copy Image'}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-center bg-white dark:bg-slate-900 rounded border border-slate-200/80 dark:border-slate-800 p-2 overflow-auto">
              <img
                src={clip.imageData}
                alt={clip.title || 'Shared screenshot'}
                onLoad={e => {
                  const img = e.currentTarget;
                  setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }}
                className="max-h-[650px] w-auto object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* Bottom statistics & secondary actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 tabular-nums">
            {clip.content && (
              <>
                <span>{stats.words.toLocaleString()} words</span>
                <span aria-hidden="true">·</span>
                <span>{stats.chars.toLocaleString()} chars</span>
                <span aria-hidden="true">·</span>
                <span>{stats.lines.toLocaleString()} lines</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>
              {formatBytes(stats.bytes + (clip.imageData ? estimateDataUrlBytes(clip.imageData) : 0))}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!clip.isReadOnly && !clip.burned && (
              <button
                type="button"
                onClick={() => onEditClip(clip, activePassword)}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Note</span>
              </button>
            )}

            {!clip.burned && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
