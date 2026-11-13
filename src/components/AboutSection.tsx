import React from 'react';
import { Shield, Flame, Smartphone, Terminal, Clock, Lock, Sparkles, Copy, Check } from 'lucide-react';

interface AboutSectionProps {
  onNewClip: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onNewClip, onToast }) => {
  const [copiedExample, setCopiedExample] = React.useState(false);

  const curlExample = `curl -X POST https://your-app-url/api/clips \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Hello from terminal!", "expiresInSeconds": 3600}'`;

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlExample);
      setCopiedExample(true);
      setTimeout(() => setCopiedExample(false), 2000);
      onToast('cURL example copied!', 'success');
    } catch {
      onToast('Failed to copy', 'error');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Hero explanation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          <Sparkles className="w-3.5 h-3.5" />
          The Fast, Temporary Clipboard for the Web
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Effortless cross-device text sharing with zero accounts.
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
          ClipShare is built for seamless everyday text transfer. Transfer long passwords, server logs, Wi-Fi credentials, code snippets, or quick notes between your PC, Mac, phone, tablet, and colleagues in seconds.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={onNewClip}
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors inline-flex items-center gap-2"
          >
            <span>Create a Temporary Note</span>
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Burn After Reading</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Need to share sensitive credentials? Choose Burn After Reading: the clip is completely deleted from the database the moment it is opened.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Password Protection</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Set an unlock passphrase. Content is protected with strong cryptographic hashing (scrypt) and cannot be decrypted without the password.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instant QR Code</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Point your mobile camera at the rendered QR code to immediately open and copy the clipboard contents right to your phone.
          </p>
        </div>
      </div>

      {/* Expiry & Privacy */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Automatic Self-Destruction & Privacy Guarantee
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          ClipShare never requires an email address, login, or tracking cookies. Every clip has a strict expiration timer (10m, 1h, 24h, 7d, 30d). Once expired, background garbage collection permanently purges the data.
        </p>
      </div>

      {/* Developer API & cURL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              CLI & Command-Line Developer API
            </h2>
          </div>
          <button
            type="button"
            onClick={copyCurl}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            {copiedExample ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedExample ? 'Copied' : 'Copy cURL'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          You can pipe stdout directly from your terminal or bash script to create a clip:
        </p>

        <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed">
          {curlExample}
        </pre>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          To read a clip as raw plain text without HTML:
        </p>
        <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed">
          curl -s https://your-app-url/api/clips/CLIP_ID/raw
        </pre>
      </div>
    </div>
  );
};
