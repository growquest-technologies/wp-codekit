/**
 * Copying text, with the fallbacks the async Clipboard API actually needs.
 *
 * `navigator.clipboard.writeText` rejects *asynchronously* — a denied permission,
 * an unfocused document, or an iframe without the clipboard-write policy all
 * surface as a rejected promise rather than a throw. Fire-and-forget therefore
 * reports success on a copy that never happened, which is worse than failing
 * visibly: the user walks away and pastes something else.
 *
 * So there are three outcomes, and the caller is expected to show all three:
 *   'ok'       the text is on the clipboard
 *   'selected' both clipboard paths failed, but the source text is now selected,
 *              so the user can finish with Cmd/Ctrl+C
 *   'blocked'  nothing worked and nothing is selected — never promise a shortcut
 */

export type CopyOutcome = 'ok' | 'selected' | 'blocked';

/** The pre-Clipboard-API path. Still the only one that works in some locked-down contexts. */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Last resort: select the node the text came from so Cmd+C is one keystroke away. */
function selectNode(el: HTMLElement | null | undefined): boolean {
  try {
    if (!el) return false;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(range);
    return String(sel).length > 0;
  } catch {
    return false;
  }
}

/**
 * Copies `text`, falling back through execCommand and then selecting
 * `fallbackNode` (the element displaying the value) if both clipboard paths fail.
 */
export async function copyText(text: string, fallbackNode?: HTMLElement | null): Promise<CopyOutcome> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return 'ok';
    } catch {
      /* fall through to the legacy path */
    }
  }
  if (legacyCopy(text)) return 'ok';
  return selectNode(fallbackNode) ? 'selected' : 'blocked';
}

/** How long a copy label should stay up. A failure needs longer — it asks the user to act. */
export function copyFlashMs(outcome: CopyOutcome): number {
  return outcome === 'ok' ? 1500 : 4000;
}
