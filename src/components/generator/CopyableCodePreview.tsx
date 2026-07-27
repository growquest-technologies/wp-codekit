import { useCopyFlash } from '../../lib/useCopyFlash';
import { CodePreview } from './CodePreview';

interface CopyableCodePreviewProps {
  code: string;
  filename: string;
  language?: 'php' | 'plain';
}

/**
 * A secondary-tab code block that's a genuine second generated file (Nav Menu /
 * Sidebar's "Template" tab, theme.json's "CSS vars" tab, Readme Studio's "Raw
 * readme.txt" tab) — these get their own Copy button with its own "Copied" flash,
 * independent of the primary tab's toolbar Copy button, matching the source's
 * per-tab `copyTemplate()`/tab-aware `copyCode()` functions.
 */
export function CopyableCodePreview({ code, filename, language = 'php' }: CopyableCodePreviewProps) {
  const copyFlash = useCopyFlash();
  return (
    <div>
      <div className="gen-code-toprow">
        <div style={{ flex: 1 }} />
        <button onClick={() => copyFlash.copy(code)} className="gen-code-copy-btn">{copyFlash.label}</button>
      </div>
      <CodePreview code={code} filename={filename} language={language} />
    </div>
  );
}
