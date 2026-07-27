import { useRef, useState } from 'react';

/**
 * Copy-to-clipboard with a "Copied" flash, matching the source's `copiedFlash`
 * state (reverts after 1.6s). `copy` takes the text to copy so one hook instance
 * can back a button whose target text changes (e.g. the active output mode).
 */
export function useCopyFlash(flashMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), flashMs);
  }

  return { copied, copy, label: copied ? 'Copied' : 'Copy' };
}
