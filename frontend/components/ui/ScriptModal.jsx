import { useEffect, useState } from 'react';
import { Button } from '../index';

// JavaScript keywords highlighted in the read-only view
const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'typeof',
  'instanceof', 'in', 'of', 'class', 'extends', 'super', 'import', 'export',
  'from', 'default', 'try', 'catch', 'finally', 'throw', 'async', 'await',
  'yield', 'delete', 'void', 'null', 'undefined', 'true', 'false', 'NaN',
  'Infinity'
]);

// Lightweight (dependency-free) JavaScript tokenizer used only for display
const tokenizeJs = (code) => {
  const tokens = [];
  const n = code.length;
  let i = 0;
  while (i < n) {
    const ch = code[i];

    // Line comment
    if (ch === '/' && code[i + 1] === '/') {
      let j = i + 2;
      while (j < n && code[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: code.slice(i, j) });
      i = j;
      continue;
    }
    // Block comment
    if (ch === '/' && code[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(code[j] === '*' && code[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      tokens.push({ type: 'comment', value: code.slice(i, j) });
      i = j;
      continue;
    }
    // String / template literal
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === ch) { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < n && /[0-9a-fA-FxXob_.]/.test(code[j])) j++;
      tokens.push({ type: 'number', value: code.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier / keyword
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      tokens.push({ type: JS_KEYWORDS.has(word) ? 'keyword' : 'identifier', value: word });
      i = j;
      continue;
    }
    // Anything else (whitespace, punctuation, operators)
    tokens.push({ type: 'plain', value: ch });
    i++;
  }
  return tokens;
};

const TOKEN_CLASS = {
  comment: 'text-gray-500 italic',
  string: 'text-green-400',
  number: 'text-orange-400',
  keyword: 'text-purple-400',
  identifier: 'text-sky-300',
  plain: 'text-gray-100'
};

const HighlightedScript = ({ code }) => {
  const tokens = tokenizeJs(code);
  return (
    <pre className="m-0 p-4 text-sm leading-relaxed overflow-auto whitespace-pre font-mono">
      <code>
        {tokens.map((t, idx) => (
          <span key={idx} className={TOKEN_CLASS[t.type] || TOKEN_CLASS.plain}>{t.value}</span>
        ))}
      </code>
    </pre>
  );
};

const ScriptModal = ({ open, configName, script = '', onSave, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(script);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset state whenever the modal is (re)opened for a config
  useEffect(() => {
    if (open) {
      setIsEditing(false);
      setDraft(script);
      setCopied(false);
    }
  }, [open, script]);

  if (!open) return null;

  const handleEdit = () => {
    setDraft(script);
    setIsEditing(true);
  };

  // Save persists the script but keeps the popup open (switches back to view)
  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setIsEditing(false);
  };

  const handleCopy = async () => {
    const text = isEditing ? draft : script;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context); ignore silently
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] rounded-lg shadow-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">
            Script{configName ? ` — ${configName}` : ''}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            title="Close"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isEditing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              placeholder="// Enter JavaScript here"
              className="w-full h-80 px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : script.trim() ? (
            <div className="rounded border border-gray-700 bg-gray-900 overflow-auto">
              <HighlightedScript code={script} />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No script saved yet. Click "Edit" to add one.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleCopy} variant="secondary">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          {isEditing ? (
            <Button onClick={handleSave} variant="success" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          ) : (
            <Button onClick={handleEdit} variant="primary">Edit</Button>
          )}
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </div>
    </div>
  );
};

export default ScriptModal;
