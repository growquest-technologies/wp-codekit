import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { escapeHtml, segmentText, type InlineToken, type LineToken } from '../../generators/readmeStudio';
import { Icon } from '../ui/Icon';

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: number;
  fontSize?: number;
  registerRef?: (el: HTMLDivElement | null) => void;
  /** Blockquote blocks get a 3px accent-tinted left border with square-ish other
   * sides, instead of the uniform 1px border every other rich field uses — matches
   * the source's `border-left:3px solid #C7D2FE` treatment for `isBlockquote`. */
  blockquote?: boolean;
}

// ───────────────────────── Tiptap JSON -> markdown-ish string ─────────────────────────
// Mirrors readmeStudio.ts's htmlToMarkdown tree-walk, but walks Tiptap's ProseMirror
// JSON doc instead of a contentEditable DOM tree. Kept local (not in readmeStudio.ts)
// since that file's htmlToMarkdown/mdToHtml/tokenizeInline are relied on elsewhere as-is.

type MDMark = { type: string; attrs?: Record<string, unknown> };

function markedTextToMarkdown(text: string, marks: MDMark[] = []): string {
  let out = text;
  // Nesting order (innermost -> outermost): code, italic, bold, link — matches how
  // the old contentEditable produced nested tags (e.g. <a><strong><em>...</em></strong></a>)
  // when multiple marks applied to the same run.
  if (marks.some((m) => m.type === 'code')) out = `\`${out}\``;
  if (marks.some((m) => m.type === 'italic')) out = `*${out}*`;
  if (marks.some((m) => m.type === 'bold')) out = `**${out}**`;
  const link = marks.find((m) => m.type === 'link');
  if (link) out = `[${out}](${(link.attrs?.href as string) || ''})`;
  return out;
}

function paragraphToMarkdown(node: JSONContent): string {
  if (!node.content) return '';
  return node.content
    .map((child) => {
      if (child.type === 'hardBreak') return '\n';
      if (child.type === 'text') return markedTextToMarkdown(child.text || '', child.marks as MDMark[] | undefined);
      return '';
    })
    .join('');
}

function listToMarkdown(node: JSONContent, ordered: boolean): string {
  return (node.content || [])
    .map((li, i) => {
      const inner = (li.content || []).map(paragraphToMarkdown).join(' ');
      return ordered ? `${i + 1}. ${inner}` : `* ${inner}`;
    })
    .join('\n');
}

function nodeToMarkdown(node: JSONContent): string {
  if (node.type === 'bulletList') return listToMarkdown(node, false);
  if (node.type === 'orderedList') return listToMarkdown(node, true);
  return paragraphToMarkdown(node);
}

function docToMarkdown(doc: JSONContent): string {
  if (!doc.content) return '';
  return doc.content
    .map(nodeToMarkdown)
    .join('\n')
    .replace(/\n+$/, '');
}

// ───────────────────────── markdown-ish string -> Tiptap HTML ─────────────────────────
// Seeds initial/external editor content, including real <ul>/<ol> for `* item` /
// `1. item` line runs — reuses readmeStudio.ts's segmentText (the same line-grouping
// parseGenericBody/mapPreviewBlocks rely on) so a block's rich text can freely mix
// prose paragraphs and real bulleted/numbered lists.

function inlineTokensToHtml(tokens: InlineToken[]): string {
  return tokens
    .map((t) => {
      const esc = escapeHtml(t.value);
      if (t.kind === 'bold') return `<strong>${esc}</strong>`;
      if (t.kind === 'italic') return `<em>${esc}</em>`;
      if (t.kind === 'code') return `<code>${esc}</code>`;
      if (t.kind === 'link') return `<a href="${escapeHtml(t.href)}">${esc}</a>`;
      return esc;
    })
    .join('');
}

function lineTokensToHtml(tokens: LineToken[]): string {
  return tokens.map((t) => (t.kind === 'break' ? '<br>' : inlineTokensToHtml([t]))).join('');
}

function mdToTiptapHtml(text: string): string {
  if (!text) return '<p></p>';
  const html = segmentText(text)
    .map((seg) => {
      if (seg.kind === 'list') {
        const tag = seg.ordered ? 'ol' : 'ul';
        return `<${tag}>${seg.items.map((item) => `<li><p>${inlineTokensToHtml(item)}</p></li>`).join('')}</${tag}>`;
      }
      if (seg.kind === 'paragraph') return `<p>${lineTokensToHtml(seg.tokens)}</p>`;
      return '';
    })
    .join('');
  return html || '<p></p>';
}

function fieldStyleString(minHeight: number, fontSize: number, blockquote: boolean): string {
  return [
    'width:100%',
    `min-height:${minHeight}px`,
    `font-size:${fontSize}px`,
    'line-height:1.6',
    'padding:8px',
    `border-radius:${blockquote ? 0 : 5}px`,
    blockquote ? 'border-top:1px solid var(--gfw-border)' : 'border:1px solid var(--gfw-border)',
    blockquote ? 'border-right:1px solid var(--gfw-border)' : '',
    blockquote ? 'border-bottom:1px solid var(--gfw-border)' : '',
    'outline:none',
    'background:#fff',
  ]
    .filter(Boolean)
    .join(';');
}

/**
 * A native Tiptap rich-text field: Bold/Italic/Code/Bulleted-list/Numbered-list/
 * Link/Clear-formatting. Structurally it allows Document/Paragraph/Text/HardBreak
 * plus real BulletList/OrderedList/ListItem nodes (so lists are authored directly
 * here, not via a separate block type) and Bold/Italic/Code/Link marks — nothing
 * else StarterKit bundles (headings, blockquote-as-node, images, etc). Toolbar
 * buttons reflect live editor state (`editor.isActive(...)`, re-rendered on every
 * Tiptap transaction) and the Link button opens a small popover to type/edit/
 * remove a URL, instead of silently inserting a "https://" placeholder. The
 * markdown-ish string (the block model's source of truth: `**bold**`/`*italic*`/
 * `` `code` ``/`[text](url)`, with `* item`/`1. item` lines for lists) is kept in
 * sync via mdToTiptapHtml (seeding initial/external content, including real
 * `<ul>/<ol>` for list-line runs) and a local JSON-doc-to-markdown walk (emitting
 * onChange).
 */
export function RichTextEditor({ value, onChange, placeholder, minHeight = 44, fontSize = 13, registerRef, blockquote = false }: RichTextEditorProps) {
  const lastMdRef = useRef<string>('');
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [, setTick] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const linkPopoverRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Document/Paragraph/Text/HardBreak/BulletList/OrderedList/ListItem
        // (structure) + Bold/Italic/Code (marks) survive. Everything else
        // StarterKit bundles is switched off.
        blockquote: false,
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        gapcursor: false,
        dropcursor: false,
        link: false, // configured separately below so we control openOnClick
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: mdToTiptapHtml(value),
    editorProps: {
      // Styles applied straight to the contentEditable node (editor.view.dom) —
      // matches the previous plain contentEditable div's inline style exactly.
      attributes: { class: 'rte-content', style: fieldStyleString(minHeight, fontSize, blockquote) },
    },
    onUpdate: ({ editor: e }) => {
      const md = docToMarkdown(e.getJSON());
      lastMdRef.current = md;
      onChangeRef.current(md);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toolbar active-states (isActive('bold') etc) need a re-render on every
  // selection/content change — Tiptap's editor mutates in place, so `editor` as a
  // useEffect dep alone won't do it; subscribe to its own transaction event.
  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((t) => t + 1);
    editor.on('transaction', bump);
    return () => {
      editor.off('transaction', bump);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    try {
      registerRef?.(editor.view.dom as HTMLDivElement);
    } catch {
      /* editor.view can throw in the brief window before the view is attached
       * (React StrictMode's dev-only mount/cleanup/remount) — registerRef is only
       * a "jump to this field on validation fix" convenience, safe to skip once. */
    }
    return () => registerRef?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (!editor.isFocused && lastMdRef.current !== value) {
      editor.commands.setContent(mdToTiptapHtml(value), { emitUpdate: false });
      lastMdRef.current = value;
    }
  }, [value, editor]);

  useEffect(() => {
    if (!linkOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target as Node)) setLinkOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLinkOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [linkOpen]);

  function toggle(command: 'bold' | 'italic' | 'code' | 'bulletList' | 'orderedList') {
    if (!editor || editor.isDestroyed) return;
    if (command === 'bold') editor.chain().focus().toggleBold().run();
    else if (command === 'italic') editor.chain().focus().toggleItalic().run();
    else if (command === 'code') editor.chain().focus().toggleCode().run();
    else if (command === 'bulletList') editor.chain().focus().toggleBulletList().run();
    else editor.chain().focus().toggleOrderedList().run();
  }

  function clearFormatting() {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus().unsetAllMarks().run();
  }

  function openLinkPopover() {
    if (!editor || editor.isDestroyed) return;
    if (linkOpen) {
      setLinkOpen(false);
      return;
    }
    setLinkValue((editor.getAttributes('link').href as string) || '');
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor || editor.isDestroyed) return;
    const href = linkValue.trim();
    if (!href) {
      setLinkOpen(false);
      return;
    }
    const { from, to } = editor.state.selection;
    if (from !== to || editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    } else {
      const text = 'link text';
      editor.chain().focus().insertContent(text).run();
      editor.chain().setTextSelection({ from, to: from + text.length }).setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  function removeLink() {
    if (!editor || editor.isDestroyed) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkOpen(false);
  }

  function btnClass(active: boolean) {
    return `rte-toolbar-btn${active ? ' is-active' : ''}`;
  }

  const linkActive = !!editor?.isActive('link');

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggle('bold')} title="Bold" className={btnClass(!!editor?.isActive('bold'))} style={{ fontWeight: 700 }}>
          B
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggle('italic')} title="Italic" className={btnClass(!!editor?.isActive('italic'))} style={{ fontStyle: 'italic' }}>
          I
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggle('code')} title="Inline code" className={btnClass(!!editor?.isActive('code'))}>
          <Icon name="code" size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggle('bulletList')} title="Bulleted list" className={btnClass(!!editor?.isActive('bulletList'))}>
          <Icon name="bulleted" size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => toggle('orderedList')} title="Numbered list" className={btnClass(!!editor?.isActive('orderedList'))}>
          <Icon name="numbered" size={14} />
        </button>
        <div style={{ position: 'relative' }}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={openLinkPopover} title="Link" className={btnClass(linkActive || linkOpen)}>
            <Icon name="link" size={14} />
          </button>
          {linkOpen && (
            <div ref={linkPopoverRef} className="rte-link-popover" onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="text"
                className="rte-link-input"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                }}
              />
              <button type="button" onClick={applyLink} className="btn btn-primary btn-sm">
                Apply
              </button>
              {linkActive && (
                <button type="button" onClick={removeLink} className="btn btn-ghost btn-sm">
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clearFormatting} title="Clear formatting" className="rte-toolbar-btn">
          <Icon name="clear" size={14} />
        </button>
      </div>
      <div style={{ position: 'relative', ...(blockquote ? { borderLeft: '3px solid var(--gfw-accent-tint-border)', borderRadius: 5 } : undefined) }}>
        {!value && placeholder && (
          <span style={{ position: 'absolute', top: 8, left: 8, color: 'var(--gfw-text-faint)', fontSize, pointerEvents: 'none' }}>{placeholder}</span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
