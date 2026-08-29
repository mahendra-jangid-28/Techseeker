'use client';

import React, { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Syntax Highlighting Engine (VS Code / GitHub Dark Theme)
// ---------------------------------------------------------------------------

const KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class',
  'const', 'continue', 'def', 'default', 'del', 'delete', 'do', 'elif',
  'else', 'enum', 'except', 'exec', 'export', 'extends', 'false', 'finally',
  'for', 'from', 'function', 'global', 'if', 'import', 'in', 'instanceof',
  'interface', 'is', 'lambda', 'let', 'match', 'new', 'nil', 'nonlocal',
  'not', 'null', 'or', 'package', 'pass', 'private', 'protected', 'public',
  'raise', 'return', 'self', 'super', 'switch', 'this', 'throw', 'true',
  'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'with',
  'yield', 'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'CREATE', 'TABLE',
  'ALTER', 'DROP', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES'
]);

const BUILTIN_TYPES = new Set([
  'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'bytes',
  'object', 'None', 'True', 'False', 'number', 'string', 'boolean', 'any',
  'unknown', 'never', 'symbol', 'bigint', 'Array', 'Record', 'Promise',
  'Set', 'Map', 'User', 'Session', 'Request', 'Response', 'Error'
]);

interface Token {
  type: 'keyword' | 'type' | 'string' | 'comment' | 'number' | 'function' | 'operator' | 'punctuation' | 'text';
  value: string;
}

function tokenizeLine(line: string, language: string): Token[] {
  const lang = (language || '').toLowerCase();
  const tokens: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    // 1. Comments
    if (
      (lang === 'python' || lang === 'py' || lang === 'bash' || lang === 'sh' || lang === 'yaml' || lang === 'yml') &&
      line[i] === '#'
    ) {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }
    if (
      (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts' || lang === 'cpp' || lang === 'c' || lang === 'go' || lang === 'rust' || lang === 'rs') &&
      line[i] === '/' && line[i + 1] === '/'
    ) {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }
    if (
      (lang === 'sql') &&
      line[i] === '-' && line[i + 1] === '-'
    ) {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }

    // 2. Strings: double, single, backtick
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let str = quote;
      i++;
      while (i < len) {
        if (line[i] === '\\' && i + 1 < len) {
          str += line[i] + line[i + 1];
          i += 2;
          continue;
        }
        str += line[i];
        if (line[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // 3. Numbers
    if (/\d/.test(line[i]) && (i === 0 || /[\s,([+\-*/=<>!:]/.test(line[i - 1]))) {
      let num = '';
      while (i < len && /[\d.xXa-fA-F_]/.test(line[i])) {
        num += line[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // 4. Identifiers & Keywords & Function calls
    if (/[a-zA-Z_$]/.test(line[i])) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_$]/.test(line[i])) {
        word += line[i];
        i++;
      }

      // Check if followed by '(' -> function call
      let j = i;
      while (j < len && /\s/.test(line[j])) j++;
      const isFunction = j < len && line[j] === '(';

      if (KEYWORDS.has(word) || KEYWORDS.has(word.toUpperCase())) {
        tokens.push({ type: 'keyword', value: word });
      } else if (BUILTIN_TYPES.has(word)) {
        tokens.push({ type: 'type', value: word });
      } else if (isFunction) {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'text', value: word });
      }
      continue;
    }

    // 5. Operators & Punctuation
    if (/[=+\-*/%&|^~<>!?:]/.test(line[i])) {
      let op = '';
      while (i < len && /[=+\-*/%&|^~<>!?:]/.test(line[i])) {
        op += line[i];
        i++;
      }
      tokens.push({ type: 'operator', value: op });
      continue;
    }

    if (/[(){}\[\],;.]/.test(line[i])) {
      tokens.push({ type: 'punctuation', value: line[i] });
      i++;
      continue;
    }

    // Whitespace or plain characters
    tokens.push({ type: 'text', value: line[i] });
    i++;
  }

  return tokens;
}

function renderHighlightedCode(code: string, language: string): React.ReactNode {
  const lines = code.split('\n');

  return lines.map((line, lineIdx) => {
    const tokens = tokenizeLine(line, language);
    return (
      <div key={lineIdx} className="table-row">
        <span className="table-cell select-none pr-4 text-right font-mono text-[11px] text-slate-500/70">
          {lineIdx + 1}
        </span>
        <span className="table-cell whitespace-pre">
          {tokens.map((token, tokenIdx) => {
            switch (token.type) {
              case 'keyword':
                return (
                  <span key={tokenIdx} className="font-semibold text-[#f43f5e] dark:text-[#fb7185]">
                    {token.value}
                  </span>
                );
              case 'type':
                return (
                  <span key={tokenIdx} className="text-[#38bdf8] dark:text-[#38bdf8]">
                    {token.value}
                  </span>
                );
              case 'string':
                return (
                  <span key={tokenIdx} className="text-[#86efac] dark:text-[#86efac]">
                    {token.value}
                  </span>
                );
              case 'comment':
                return (
                  <span key={tokenIdx} className="italic text-[#94a3b8] dark:text-[#64748b]">
                    {token.value}
                  </span>
                );
              case 'number':
                return (
                  <span key={tokenIdx} className="text-[#fb923c] dark:text-[#fb923c]">
                    {token.value}
                  </span>
                );
              case 'function':
                return (
                  <span key={tokenIdx} className="text-[#60a5fa] dark:text-[#93c5fd]">
                    {token.value}
                  </span>
                );
              case 'operator':
                return (
                  <span key={tokenIdx} className="text-[#cbd5e1] dark:text-[#cbd5e1]">
                    {token.value}
                  </span>
                );
              case 'punctuation':
                return (
                  <span key={tokenIdx} className="text-[#94a3b8] dark:text-[#94a3b8]">
                    {token.value}
                  </span>
                );
              default:
                return <span key={tokenIdx}>{token.value}</span>;
            }
          })}
        </span>
      </div>
    );
  });
}

// ---------------------------------------------------------------------------
// Code Block Component with Header & Copy Action
// ---------------------------------------------------------------------------

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayLang = (language || 'code').toUpperCase();

  return (
    <div className="my-3.5 overflow-hidden rounded-xl border border-border-subtle bg-[#090d16] text-slate-100 shadow-elevated">
      {/* Code Block Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand" />
          <span className="font-mono font-bold tracking-wider text-slate-300">
            {displayLang}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied code to clipboard' : 'Copy code to clipboard'}
          className="flex items-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-semibold text-slate-200 transition hover:bg-white/[0.12] hover:text-white active:scale-95"
        >
          <span>{copied ? '✓' : '⎘'}</span>
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Area with Line Numbers */}
      <div className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-slate-200">
        <pre className="table w-full select-text">
          {renderHighlightedCode(code, language)}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Markdown Parser (Bold, Italic, Strikethrough, Code, Links)
// ---------------------------------------------------------------------------

function renderInlineSpans(text: string): React.ReactNode[] {
  // Regex to match inline code, bold, italic, strikethrough, markdown links
  const pattern = /(`[^`]+`|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
  const tokens = text.split(pattern);

  return tokens.map((token, idx) => {
    // 1. Inline Code
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded-md border border-border-subtle bg-surface-elevated px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-brand"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    // 2. Bold Italic (*** or ___)
    if (
      (token.startsWith('***') && token.endsWith('***') && token.length >= 6) ||
      (token.startsWith('___') && token.endsWith('___') && token.length >= 6)
    ) {
      return (
        <strong key={idx} className="font-bold italic text-content-primary">
          {token.slice(3, -3)}
        </strong>
      );
    }

    // 3. Bold (** or __)
    if (
      (token.startsWith('**') && token.endsWith('**') && token.length >= 4) ||
      (token.startsWith('__') && token.endsWith('__') && token.length >= 4)
    ) {
      return (
        <strong key={idx} className="font-semibold text-content-primary">
          {token.slice(2, -2)}
        </strong>
      );
    }

    // 4. Strikethrough (~~)
    if (token.startsWith('~~') && token.endsWith('~~') && token.length >= 4) {
      return (
        <del key={idx} className="line-through opacity-75">
          {token.slice(2, -2)}
        </del>
      );
    }

    // 5. Italic (* or _)
    if (
      (token.startsWith('*') && token.endsWith('*') && token.length >= 2) ||
      (token.startsWith('_') && token.endsWith('_') && token.length >= 2)
    ) {
      return (
        <em key={idx} className="italic text-content-secondary">
          {token.slice(1, -1)}
        </em>
      );
    }

    // 6. Links [text](url)
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand underline decoration-brand/40 underline-offset-2 transition hover:decoration-brand hover:text-brand-hover"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return token;
  });
}

// ---------------------------------------------------------------------------
// Table Renderer
// ---------------------------------------------------------------------------

function isTableDelimiter(line: string): boolean {
  return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\||\|$/g, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function TableBlock({ headerLine, rows }: { headerLine: string; rows: string[] }) {
  const headers = parseTableRow(headerLine);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-border-subtle bg-surface shadow-subtle">
      <table className="w-full text-left text-xs text-content-primary">
        <thead className="border-b border-border-default bg-surface-elevated font-semibold text-content-primary">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5">
                {renderInlineSpans(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row, rowIdx) => {
            const cells = parseTableRow(row);
            return (
              <tr
                key={rowIdx}
                className="transition-colors hover:bg-surface-hover/50"
              >
                {cells.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3.5 py-2 text-content-secondary">
                    {renderInlineSpans(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Markdown Renderer Component
// ---------------------------------------------------------------------------

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const parts: React.ReactNode[] = [];
  const lines = content.split('\n');

  let inCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockContent: string[] = [];

  let currentList: { type: 'ul' | 'ol'; items: { text: string; checked?: boolean }[] } | null = null;
  let tableHeader: string | null = null;
  let tableRows: string[] = [];

  function flushList() {
    if (!currentList) return;
    const { type, items } = currentList;
    const key = `list-${parts.length}`;

    if (type === 'ul') {
      parts.push(
        <ul key={key} className="my-2 space-y-1 pl-5 list-disc text-content-secondary">
          {items.map((item, i) => {
            if (item.checked !== undefined) {
              return (
                <li key={i} className="list-none -ml-5 flex items-center gap-2 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-0"
                  />
                  <span>{renderInlineSpans(item.text)}</span>
                </li>
              );
            }
            return (
              <li key={i} className="text-sm leading-relaxed">
                {renderInlineSpans(item.text)}
              </li>
            );
          })}
        </ul>
      );
    } else {
      parts.push(
        <ol key={key} className="my-2 space-y-1 pl-5 list-decimal text-content-secondary">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInlineSpans(item.text)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  }

  function flushTable() {
    if (!tableHeader) return;
    parts.push(
      <TableBlock
        key={`table-${parts.length}`}
        headerLine={tableHeader}
        rows={tableRows}
      />
    );
    tableHeader = null;
    tableRows = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Code Fence (```)
    if (line.trim().startsWith('```')) {
      flushList();
      flushTable();
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

    // 2. Markdown Tables
    if (line.includes('|')) {
      // Check if next line is a table delimiter
      if (!tableHeader && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
        flushList();
        tableHeader = line;
        i++; // skip delimiter line
        continue;
      }
      if (tableHeader) {
        tableRows.push(line);
        continue;
      }
    } else if (tableHeader) {
      flushTable();
    }

    // 3. Task List Item (- [ ] or - [x])
    const taskMatch = line.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (taskMatch) {
      flushTable();
      if (currentList && currentList.type !== 'ul') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push({
        text: taskMatch[3],
        checked: taskMatch[2].toLowerCase() === 'x',
      });
      continue;
    }

    // 4. Unordered List Item (- or *)
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushTable();
      if (currentList && currentList.type !== 'ul') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push({ text: ulMatch[2] });
      continue;
    }

    // 5. Ordered List Item (1. 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      flushTable();
      if (currentList && currentList.type !== 'ol') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push({ text: olMatch[2] });
      continue;
    }

    // Not a list item
    flushList();
    flushTable();

    // 6. Horizontal Rule
    if (/^---$|^___$|^\*\*\*$/.test(line.trim())) {
      parts.push(
        <hr key={`hr-${parts.length}`} className="my-4 border-border-subtle" />
      );
      continue;
    }

    // 7. Headings
    if (line.startsWith('###### ')) {
      parts.push(
        <h6 key={`h6-${parts.length}`} className="mt-3 mb-1 text-xs font-bold text-content-primary">
          {renderInlineSpans(line.slice(7))}
        </h6>
      );
      continue;
    }
    if (line.startsWith('##### ')) {
      parts.push(
        <h5 key={`h5-${parts.length}`} className="mt-3.5 mb-1 text-xs font-bold text-content-primary uppercase tracking-wider">
          {renderInlineSpans(line.slice(6))}
        </h5>
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      parts.push(
        <h4 key={`h4-${parts.length}`} className="mt-4 mb-1 text-xs font-bold text-content-primary">
          {renderInlineSpans(line.slice(5))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      parts.push(
        <h3 key={`h3-${parts.length}`} className="mt-4 mb-1.5 text-sm font-bold text-content-primary tracking-tight">
          {renderInlineSpans(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      parts.push(
        <h2 key={`h2-${parts.length}`} className="mt-5 mb-2 text-base font-bold text-content-primary tracking-tight border-b border-border-subtle pb-1">
          {renderInlineSpans(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      parts.push(
        <h1 key={`h1-${parts.length}`} className="mt-6 mb-2.5 text-lg font-bold text-content-primary tracking-tight">
          {renderInlineSpans(line.slice(2))}
        </h1>
      );
      continue;
    }

    // 8. Blockquote
    if (line.startsWith('> ')) {
      parts.push(
        <blockquote
          key={`quote-${parts.length}`}
          className="my-2 border-l-2 border-brand bg-brand-subtle px-3.5 py-1.5 text-xs italic text-content-secondary rounded-r-md"
        >
          {renderInlineSpans(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // 9. Paragraph / Blank line
    if (line.trim() === '') {
      parts.push(<div key={`blank-${parts.length}`} className="h-1.5" />);
    } else {
      parts.push(
        <p key={`p-${parts.length}`} className="text-sm leading-relaxed text-content-secondary">
          {renderInlineSpans(line)}
        </p>
      );
    }
  }

  // Handle mid-stream open code block
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
  flushTable();

  return <div className={`space-y-1.5 ${className}`}>{parts}</div>;
}
