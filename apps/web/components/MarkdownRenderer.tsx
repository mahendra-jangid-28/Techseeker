'use client';

import React, { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-white/[0.1] bg-[#141820] shadow-md">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#1a202c] px-3.5 py-1.5 text-[11px] text-slate-400">
        <span className="font-mono font-medium uppercase tracking-wider text-sky-300">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
        >
          <span>{copied ? '✓' : '⎘'}</span>
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-slate-200">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

// Formats inline markdown spans (bold, italic, inline code)
function renderInlineSpans(text: string): React.ReactNode[] {
  // Regex to match inline code, bold, italic
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g);

  return tokens.map((token, idx) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded-md border border-white/[0.1] bg-white/[0.07] px-1.5 py-0.5 font-mono text-[11px] font-medium text-sky-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (
      (token.startsWith('**') && token.endsWith('**') && token.length >= 4) ||
      (token.startsWith('__') && token.endsWith('__') && token.length >= 4)
    ) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (
      (token.startsWith('*') && token.endsWith('*') && token.length >= 2) ||
      (token.startsWith('_') && token.endsWith('_') && token.length >= 2)
    ) {
      return (
        <em key={idx} className="italic text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  // Split into code blocks vs non-code blocks
  const parts: React.ReactNode[] = [];
  const lines = content.split('\n');

  let inCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockContent: string[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  function flushList() {
    if (!currentList) return;
    const { type, items } = currentList;
    const key = `list-${parts.length}`;

    if (type === 'ul') {
      parts.push(
        <ul key={key} className="my-2 space-y-1 pl-5 list-disc text-slate-300">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInlineSpans(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      parts.push(
        <ol key={key} className="my-2 space-y-1 pl-5 list-decimal text-slate-300">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInlineSpans(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for code fence start/end
    if (line.trim().startsWith('```')) {
      flushList();
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = line.trim().replace(/^```/, '').trim();
        codeBlockContent = [];
      } else {
        inCodeBlock = false;
        parts.push(
          <CodeBlock
            key={`code-${parts.length}`}
            language={codeBlockLanguage}
            code={codeBlockContent.join('\n')}
          />
        );
        codeBlockLanguage = '';
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Check for unordered list item (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (currentList && currentList.type !== 'ul') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[2]);
      continue;
    }

    // Check for ordered list item (1. 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (currentList && currentList.type !== 'ol') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // Not a list item
    flushList();

    // Horizontal rule
    if (/^---$|^___$|^\*\*\*$/.test(line.trim())) {
      parts.push(
        <hr key={`hr-${parts.length}`} className="my-4 border-white/[0.08]" />
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      parts.push(
        <h3
          key={`h3-${parts.length}`}
          className="mt-4 mb-1 text-sm font-bold text-white tracking-tight"
        >
          {renderInlineSpans(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      parts.push(
        <h2
          key={`h2-${parts.length}`}
          className="mt-5 mb-2 text-base font-bold text-white tracking-tight border-b border-white/[0.06] pb-1"
        >
          {renderInlineSpans(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      parts.push(
        <h1
          key={`h1-${parts.length}`}
          className="mt-6 mb-2 text-lg font-bold text-white tracking-tight"
        >
          {renderInlineSpans(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      parts.push(
        <blockquote
          key={`quote-${parts.length}`}
          className="my-2 border-l-2 border-sky-400/60 bg-sky-500/[0.04] px-3 py-1.5 text-xs italic text-slate-300"
        >
          {renderInlineSpans(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Regular paragraph or blank line
    if (line.trim() === '') {
      parts.push(<div key={`blank-${parts.length}`} className="h-2" />);
    } else {
      parts.push(
        <p key={`p-${parts.length}`} className="text-sm leading-6 text-slate-300">
          {renderInlineSpans(line)}
        </p>
      );
    }
  }

  // Handle unclosed code block if stream is mid-transmission
  if (inCodeBlock && codeBlockContent.length > 0) {
    parts.push(
      <CodeBlock
        key={`code-${parts.length}`}
        language={codeBlockLanguage}
        code={codeBlockContent.join('\n')}
      />
    );
  }

  flushList();

  return <div className={`space-y-1 ${className}`}>{parts}</div>;
}
