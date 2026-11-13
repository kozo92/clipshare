import React, { useState, useEffect, useRef } from 'react';
import {
  Clipboard,
  Trash2,
  Wand2,
  FileCode,
  Shield,
  Clock,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Flame,
  Lock,
  ChevronDown,
  Sparkles,
  Type,
  ImagePlus,
  X,
} from 'lucide-react';
import { ClipCreationPayload } from '../types';
import {
  readImageFileAsDataUrl,
  estimateDataUrlBytes,
} from '../utils/imageUtils';
import {
  computeTextStats,
  formatBytes,
  cleanEmptyLines,
  trimLines,
  toTitleCase,
  toCamelCase,
  toSlug,
  formatJson,
  encodeBase64,
  decodeBase64,
  encodeUrl,
  decodeUrl,
} from '../utils/textUtils';

interface EditorProps {
  onPublish: (payload: ClipCreationPayload) => Promise<void>;
  loading: boolean;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialContent?: string;
  initialTitle?: string;
  initialImageData?: string | null;
}

export const Editor: React.FC<EditorProps> = ({
  onPublish,
  loading,
  onToast,
  initialContent = '',
  initialTitle = '',
  initialImageData = null,
}) => {
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle);
  const [imageData, setImageData] = useState<string | null>(initialImageData);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [syntax, setSyntax] = useState('plain');
  const [isMonospace, setIsMonospace] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [expiration, setExpiration] = useState<string>('86400'); // 24 hours default
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enableCustomId, setEnableCustomId] = useState(false);
  const [customId, setCustomId] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Tool dropdown
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const stats = computeTextStats(content);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to process an image File/Blob
  const attachImageBlob = async (file: File | Blob) => {
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setImageData(dataUrl);
      setImageDimensions(null);
      onToast('Screenshot attached!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to attach image';
      onToast(msg, 'error');
    }
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to publish
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, title, imageData, password, expiration, burnAfterReading, customId, isReadOnly, syntax, enablePassword, enableCustomId]);

  // Global paste listener so Ctrl+V works even if textarea isn't focused
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ignore if pasting inside text inputs other than our main textarea
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        target.getAttribute('data-clip-editor') !== 'true'
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await attachImageBlob(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handlePasteFromClipboard = async () => {
    try {
      // Try reading rich clipboard items (images + text) first
      if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
        try {
          const clipboardItems = await navigator.clipboard.read();
          let handled = false;

          for (const item of clipboardItems) {
            const imageType = item.types.find(t => t.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              await attachImageBlob(blob);
              handled = true;
            } else if (item.types.includes('text/plain')) {
              const blob = await item.getType('text/plain');
              const text = await blob.text();
              if (text) {
                setContent(prev => (prev ? prev + '\n' + text : text));
                onToast('Text pasted from clipboard!', 'success');
                handled = true;
              }
            }
          }

          if (handled) return;
        } catch {
          // Fall back to readText below if read() is rejected or unsupported
        }
      }

      const text = await navigator.clipboard.readText();
      if (!text) {
        onToast('Clipboard is empty (or try Ctrl+V / Cmd+V directly)', 'info');
        return;
      }
      setContent(prev => (prev ? prev + '\n' + text : text));
      onToast('Pasted from clipboard!', 'success');
    } catch {
      onToast('Permission denied — press Ctrl+V / Cmd+V directly on the page to paste', 'error');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await attachImageBlob(file);
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await attachImageBlob(file);
    } else if (file) {
      onToast('Please drop an image file (PNG, JPEG, WebP, GIF)', 'error');
    }
  };

  const handleClear = () => {
    if (!content && !imageData) return;
    if (confirm('Are you sure you want to clear this note?')) {
      setContent('');
      setTitle('');
      setImageData(null);
      setImageDimensions(null);
      onToast('Cleared note', 'info');
    }
  };

  const handleToolAction = (action: string) => {
    setToolsOpen(false);
    if (!content) {
      onToast('Note is empty', 'info');
      return;
    }

    try {
      let updated = content;
      switch (action) {
        case 'cleanLines':
          updated = cleanEmptyLines(content);
          onToast('Removed extra blank lines', 'success');
          break;
        case 'trim':
          updated = trimLines(content);
          onToast('Trimmed leading/trailing spaces', 'success');
          break;
        case 'upper':
          updated = content.toUpperCase();
          onToast('Converted to UPPERCASE', 'success');
          break;
        case 'lower':
          updated = content.toLowerCase();
          onToast('Converted to lowercase', 'success');
          break;
        case 'title':
          updated = toTitleCase(content);
          onToast('Converted to Title Case', 'success');
          break;
        case 'camel':
          updated = toCamelCase(content);
          onToast('Converted to camelCase', 'success');
          break;
        case 'slug':
          updated = toSlug(content);
          onToast('Converted to URL slug', 'success');
          break;
        case 'jsonPrettify':
          updated = formatJson(content, true);
          setSyntax('json');
          onToast('JSON formatted nicely', 'success');
          break;
        case 'jsonMinify':
          updated = formatJson(content, false);
          setSyntax('json');
          onToast('JSON minified', 'success');
          break;
        case 'b64Encode':
          updated = encodeBase64(content);
          onToast('Encoded to Base64', 'success');
          break;
        case 'b64Decode':
          updated = decodeBase64(content);
          onToast('Decoded from Base64', 'success');
          break;
        case 'urlEncode':
          updated = encodeUrl(content);
          onToast('URL encoded', 'success');
          break;
        case 'urlDecode':
          updated = decodeUrl(content);
          onToast('URL decoded', 'success');
          break;
        default:
          break;
      }
      setContent(updated);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Transformation failed';
      onToast(errorMsg, 'error');
    }
  };

  const loadSample = (type: 'wifi' | 'code' | 'todo') => {
    if (type === 'wifi') {
      setTitle('Guest Wi-Fi Access');
      setContent(`Network SSID: Office_Guest_5G\nPassword: Sunset-Horizon-842\nSecurity: WPA3-Personal\nDNS: 1.1.1.1\n\nNotes: Scan the QR code or use the password above.`);
      setSyntax('plain');
      setExpiration('86400');
    } else if (type === 'code') {
      setTitle('quick_server_setup.sh');
      setContent(`#!/usr/bin/env bash\nset -euo pipefail\n\necho "Initializing setup..."\nexport APP_ENV=production\nexport PORT=8080\n\ngit pull origin main\nnpm install --frozen-lockfile\nnpm run build\npm2 reload ecosystem.config.js\n\necho "Deployment finished successfully!"`);
      setSyntax('shell');
      setExpiration('604800'); // 7 days
    } else if (type === 'todo') {
      setTitle('Sprint Kickoff Notes');
      setContent(`# Sprint 42 Objectives\n\n- [ ] Migrate database schema to postgres\n- [ ] Add rate limiting to auth endpoints\n- [ ] Review PR #104 (Clipboard QR code generator)\n- [ ] Finalize customer onboarding flow\n\n> "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra`);
      setSyntax('markdown');
    }
    onToast('Sample loaded', 'info');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !imageData) {
      onToast('Please enter text or paste a screenshot before sharing', 'error');
      return;
    }

    if (enablePassword && !password.trim()) {
      onToast('Please enter a password or disable password protection', 'error');
      return;
    }

    if (enableCustomId) {
      const cleaned = customId.trim().toLowerCase();
      if (!cleaned || !/^[a-z0-9_-]{2,32}$/.test(cleaned)) {
        onToast('Custom ID must be 2-32 letters, numbers, or hyphens', 'error');
        return;
      }
    }

    const expiresInSec = burnAfterReading
      ? null
      : expiration === 'never'
      ? null
      : parseInt(expiration, 10);

    const payload: ClipCreationPayload = {
      title: title.trim() || undefined,
      content,
      imageData,
      syntax,
      burnAfterReading,
      isReadOnly,
      expiresInSeconds: expiresInSec,
      password: enablePassword ? password : undefined,
      id: enableCustomId && customId.trim() ? customId.trim().toLowerCase() : undefined,
    };

    await onPublish(payload);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Title & Syntax Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title / Memo (optional, e.g. 'Wi-Fi Credentials', 'API Snippet')"
            className="flex-1 px-3 py-2 text-sm font-medium bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
          />

          <div className="flex items-center gap-2 shrink-0">
            {/* Syntax selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={syntax}
                onChange={e => setSyntax(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="plain">Plain Text</option>
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="javascript">JavaScript / TS</option>
                <option value="python">Python</option>
                <option value="html">HTML / XML</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
                <option value="shell">Bash / Shell</option>
              </select>
            </div>

            {/* Font Toggle */}
            <button
              type="button"
              onClick={() => setIsMonospace(!isMonospace)}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
                isMonospace
                  ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title={isMonospace ? 'Switch to proportional font' : 'Switch to monospace font'}
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Paste, Image Upload, Clear, Tools dropdown, Sample templates */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste Clipboard</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              title="Attach screenshot or image file"
            >
              <ImagePlus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Image</span>
            </button>

            {/* Quick formatting tools dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setToolsOpen(!toolsOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Text Tools</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {toolsOpen && (
                <div className="absolute left-0 mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 text-xs">
                  <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                    Clean & Format
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToolAction('trim')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Trim line spaces
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('cleanLines')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Remove duplicate empty lines
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('jsonPrettify')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Format JSON (Prettify)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('jsonMinify')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Minify JSON
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                  <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                    Case Converter
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToolAction('upper')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    UPPERCASE
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('lower')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    lowercase
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('title')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Title Case
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('camel')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    camelCase
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('slug')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    URL Slug
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                  <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                    Encoding
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToolAction('b64Encode')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Base64 Encode
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('b64Decode')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Base64 Decode
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('urlEncode')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    URL Encode
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolAction('urlDecode')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    URL Decode
                  </button>
                </div>
              )}
            </div>

            {syntax === 'markdown' && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                  showPreview
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {showPreview ? 'Edit Raw' : 'Preview Markdown'}
              </button>
            )}

            {(content || imageData) && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Clear content"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          {/* Quick template snippets */}
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="hidden md:inline text-[11px]">Load:</span>
            <button
              type="button"
              onClick={() => loadSample('wifi')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
            >
              Wi-Fi
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => loadSample('code')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
            >
              Script
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => loadSample('todo')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
            >
              Markdown
            </button>
          </div>
        </div>

        {/* Text Area / Preview & Drag-Drop Image Zone */}
        <div
          className={`relative rounded-lg transition-all ${
            isDraggingOver ? 'ring-2 ring-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20' : ''
          }`}
          onDragOver={e => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
        >
          {showPreview && syntax === 'markdown' ? (
            <div className="min-h-[300px] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg prose dark:prose-invert max-w-none text-sm overflow-y-auto max-h-[550px]">
              {content ? (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {content}
                </div>
              ) : (
                <p className="text-slate-400 italic">No markdown content yet...</p>
              )}
            </div>
          ) : (
            <textarea
              data-clip-editor="true"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste text or press Ctrl+V / Cmd+V to paste a screenshot directly from your clipboard (or drag & drop an image)..."
              className={`w-full ${
                imageData ? 'min-h-[160px]' : 'min-h-[320px]'
              } max-h-[600px] p-4 rounded-lg bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y text-sm leading-relaxed transition-all ${
                isMonospace ? 'font-mono' : 'font-sans'
              }`}
              spellCheck={false}
              autoFocus
            />
          )}

          {isDraggingOver && (
            <div className="absolute inset-0 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/15 border-2 border-dashed border-indigo-500 flex items-center justify-center pointer-events-none">
              <div className="px-4 py-2 rounded-lg bg-white dark:bg-slate-900 shadow-md text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Drop screenshot here to attach
              </div>
            </div>
          )}
        </div>

        {/* Attached Screenshot Preview */}
        {imageData && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                <span>Attached Screenshot</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {imageDimensions ? `${imageDimensions.width} × ${imageDimensions.height} px · ` : ''}
                  {formatBytes(estimateDataUrlBytes(imageData))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageData(null);
                  setImageDimensions(null);
                  onToast('Screenshot removed', 'info');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
            <div className="flex justify-center bg-white dark:bg-slate-900 rounded border border-slate-200/80 dark:border-slate-800 p-2">
              <img
                src={imageData}
                alt="Clipboard screenshot preview"
                onLoad={e => {
                  const img = e.currentTarget;
                  setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }}
                className="max-h-[420px] w-auto object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* Text Statistics Bar (Zero-pill discipline: unboxed clean text) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 tabular-nums">
            <span>{stats.words.toLocaleString()} words</span>
            <span aria-hidden="true">·</span>
            <span>{stats.chars.toLocaleString()} chars</span>
            <span aria-hidden="true">·</span>
            <span>{stats.lines.toLocaleString()} lines</span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(stats.bytes + (imageData ? estimateDataUrlBytes(imageData) : 0))} total</span>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd> paste screenshot · <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Ctrl+Enter</kbd> publish
          </span>
        </div>
      </div>

      {/* Security & Expiration Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Sharing & Security Controls
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            No login required · Encrypted in transit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Auto-Expiration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Expiration Period
            </label>
            <select
              value={burnAfterReading ? 'burn' : expiration}
              onChange={e => {
                if (e.target.value === 'burn') {
                  setBurnAfterReading(true);
                } else {
                  setBurnAfterReading(false);
                  setExpiration(e.target.value);
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="600">10 Minutes</option>
              <option value="3600">1 Hour</option>
              <option value="86400">24 Hours (Default)</option>
              <option value="604800">7 Days</option>
              <option value="2592000">30 Days</option>
              <option value="never">Never (Persistent)</option>
              <option value="burn">🔥 Burn after reading (View once)</option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {burnAfterReading
                ? 'Clip will be automatically destroyed immediately upon the first view.'
                : 'Clip and all its contents will be permanently deleted after this time.'}
            </p>
          </div>

          {/* 2. Password Protection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Password Protection
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={e => {
                    setEnablePassword(e.target.checked);
                    if (!e.target.checked) setPassword('');
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {enablePassword ? (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Set unlock password"
                  className="w-full px-3 py-2 pr-9 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Anyone with the link or code can view this note. Enable to require a password.
              </p>
            )}
          </div>

          {/* 3. Custom Clip ID / Short Link */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                Custom Link / Code
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCustomId}
                  onChange={e => {
                    setEnableCustomId(e.target.checked);
                    if (!e.target.checked) setCustomId('');
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {enableCustomId ? (
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="px-2.5 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg font-mono">
                    /c/
                  </span>
                  <input
                    type="text"
                    value={customId}
                    onChange={e => setCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="my-custom-code"
                    maxLength={32}
                    className="w-full px-3 py-2 text-xs rounded-r-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Letters, numbers, dashes, and underscores (2-32 chars).</p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                A random 6-character code (e.g. <span className="font-mono">k9x2m4</span>) will be generated automatically.
              </p>
            )}
          </div>

          {/* 4. Edit Permissions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Read-Only Lock
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReadOnly}
                  onChange={e => setIsReadOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isReadOnly
                ? 'Prevent any further edits once published. Viewers can only copy or read.'
                : 'Editable after publishing (requires the password if password protection is set).'}
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {burnAfterReading ? (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <Flame className="w-4 h-4" /> Self-destructs after 1 read
              </span>
            ) : (
              <span>Instant link & QR code generated</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && !imageData)}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Publish & Share Clip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
