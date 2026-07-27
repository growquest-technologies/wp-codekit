import { useMemo } from 'react';
import { tokenizePHP } from '../../lib/codegen';

interface CodePreviewProps {
  code: string;
  filename: string;
  language?: 'php' | 'plain';
}

/**
 * The live code area inside a generator's PHP tab. This is a plain light panel —
 * no dark theme, no title bar of its own. All of that chrome (filename badge,
 * copy/download) lives in GeneratorShell's toolbar; this is just the text.
 */
export function CodePreview({ code, filename, language = 'php' }: CodePreviewProps) {
  const tokens = useMemo(() => (language === 'php' ? tokenizePHP(code) : null), [code, language]);

  return (
    <div style={{ overflowX: 'auto', background: '#FBFAF7', borderRadius: 8 }}>
      <pre
        style={{
          margin: 0,
          padding: '14px 16px 40px',
          fontFamily: 'var(--gfw-font-mono)',
          fontSize: 12,
          lineHeight: 1.65,
          whiteSpace: 'pre',
          tabSize: 4,
          color: '#3B362D',
        }}
        aria-label={filename}
      >
        {tokens
          ? tokens.map((t, i) => (
              <span key={i} style={{ color: t.color, fontStyle: t.italic }}>
                {t.text}
              </span>
            ))
          : code}
      </pre>
    </div>
  );
}
