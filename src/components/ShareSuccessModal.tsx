import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download, QrCode as QrIcon, ExternalLink, Terminal, Shield, Flame, X } from 'lucide-react';
import { Clip } from '../types';

interface ShareSuccessModalProps {
  clip: Partial<Clip> & { id: string };
  onClose: () => void;
  onOpenClip: (id: string) => void;
  onNewClip: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ShareSuccessModal: React.FC<ShareSuccessModalProps> = ({
  clip,
  onClose,
  onOpenClip,
  onNewClip,
  onToast,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${baseUrl}/c/${clip.id}`;
  const rawUrl = `${baseUrl}/api/clips/${clip.id}/raw`;
  const curlCmd = `curl -s "${rawUrl}"`;

  useEffect(() => {
    // Generate QR Code
    QRCode.toDataURL(shareUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [shareUrl]);

  const copyToClipboard = async (text: string, type: 'link' | 'code' | 'curl') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        onToast('Clip URL copied to clipboard!', 'success');
      } else if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        onToast('Quick Code copied!', 'success');
      } else if (type === 'curl') {
        setCopiedCurl(true);
        setTimeout(() => setCopiedCurl(false), 2000);
        onToast('cURL command copied!', 'success');
      }
    } catch {
      onToast('Failed to copy. Please copy manually.', 'error');
    }
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `clipshare-${clip.id}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onToast('QR Code downloaded', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Clip Ready to Share
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Code Badge */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 text-center space-y-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              Quick Retrieval Code
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 select-all">
                {clip.id.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(clip.id.toUpperCase(), 'code')}
                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                title="Copy Quick Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter this code on any device in the "Retrieve by Code" box to open instantly.
            </p>
          </div>

          {/* Full Link Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Direct Share Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(shareUrl, 'link')}
                className="px-3.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Security & Expiry Status Details */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            {clip.hasPassword && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/50">
                <Shield className="w-3.5 h-3.5" /> Password Protected
              </span>
            )}
            {clip.burnAfterReading ? (
              <span className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/50">
                <Flame className="w-3.5 h-3.5" /> Burns After Reading
              </span>
            ) : clip.expiresAt ? (
              <span>Expires: {new Date(clip.expiresAt).toLocaleString()}</span>
            ) : (
              <span>Permanent (until deleted)</span>
            )}
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="text-center">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
                <QrIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Scan to Open on Phone or Tablet
              </span>
            </div>
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                <img
                  src={qrDataUrl}
                  alt="QR Code to open clip"
                  className="w-44 h-44 object-contain"
                />
              </div>
            ) : (
              <div className="w-44 h-44 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg" />
            )}
            <button
              type="button"
              onClick={downloadQrCode}
              className="text-xs font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 inline-flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download QR Code PNG
            </button>
          </div>

          {/* Developer / cURL Section */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-500" /> Command Line Access (cURL)
            </span>
            <div className="flex items-center gap-2 bg-slate-900 text-slate-200 px-3 py-2 rounded-lg font-mono text-xs overflow-x-auto">
              <span className="truncate flex-1 select-all">{curlCmd}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(curlCmd, 'curl')}
                className="text-slate-400 hover:text-white p-1 transition-colors"
                title="Copy curl command"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onNewClip}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Create Another
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenClip(clip.id)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span>View Clip</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
