/** Shared helpers every PHP-generating tool uses. Ported verbatim from the design source
 * (each generator originally carried its own copy of these). */

export function slugify(s: string, max?: number): string {
  const out = String(s || '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return max ? out.slice(0, max) : out;
}

export function escPhp(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

/** Right-pads array keys so every `=>` lines up, matching WordPress-coding-standards output. */
export function alignBlock(pairs: [string, string][], indent: string): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs
    .map((p) => {
      const key = "'" + p[0] + "'";
      return indent + key + ' '.repeat(w - p[0].length) + ' => ' + p[1] + ',';
    })
    .join('\n');
}

export const CREDIT = '// Generated with WP CodeKit — powered by GrowQuest (https://growquest.io).\n';

export function withCredit(out: string): string {
  if (out.indexOf('<?php\n') === 0) return '<?php\n' + CREDIT + out.slice(6);
  return CREDIT + out;
}

export interface PhpToken {
  text: string;
  color: string;
  italic: 'normal' | 'italic';
}

const TOKEN_RE =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:[^'\\]|\\.)*')|(\$[A-Za-z_]\w*)|\b(function|array|true|false|null|return|defined|exit|class|extends|new|public|private|protected|static|if|else|foreach|as|use)\b|\b(\d+)\b|([A-Za-z_]\w*)(?=\s*\()|([{}()[\];,]|=>|=)/g;

const PHP_COLORS = {
  comment: '#9A9284',
  string: '#1F7A4C',
  variable: '#8A5B00',
  keyword: '#B3439A',
  number: '#B45309',
  fn: '#3858E9',
  punct: '#A79F91',
  plain: '#3B362D',
};

/** Tokenizes generated PHP into colored spans for the dark code preview panel. */
export function tokenizePHP(code: string): PhpToken[] {
  const out: PhpToken[] = [];
  let last = 0;
  const push = (text: string, color: string, italic: 'normal' | 'italic' = 'normal') => {
    if (text) out.push({ text, color, italic });
  };
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(code)) !== null) {
    push(code.slice(last, m.index), PHP_COLORS.plain);
    if (m[1]) push(m[1], PHP_COLORS.comment, 'italic');
    else if (m[2]) push(m[2], PHP_COLORS.string);
    else if (m[3]) push(m[3], PHP_COLORS.variable);
    else if (m[4]) push(m[4], PHP_COLORS.keyword);
    else if (m[5]) push(m[5], PHP_COLORS.number);
    else if (m[6]) push(m[6], PHP_COLORS.fn);
    else push(m[7], PHP_COLORS.punct);
    last = m.index + m[0].length;
  }
  push(code.slice(last), PHP_COLORS.plain);
  return out;
}

export type ValidationSeverity = 'error' | 'warning' | 'recommendation';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  targetId?: string;
  fix?: string;
  fixLabel?: string;
}
