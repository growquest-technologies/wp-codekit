import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CAT_MAP, type ToolCategory } from '../../data/tools';
import { Icon } from '../ui/Icon';
import { CodePreview } from './CodePreview';
import { ValidationList } from './ValidationList';
import type { ValidationIssue } from '../../lib/codegen';
import { useCopyFlash } from '../../lib/useCopyFlash';
import { trackEvent } from '../../lib/analytics';

interface EditorControls {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNew: () => void;
  savedLabel: string;
}

interface OutputMode {
  id: string;
  label: string;
}

interface SecondaryTab {
  label: string;
  content: ReactNode;
}

interface GeneratorShellProps {
  category: ToolCategory;
  title: string;
  description: ReactNode;
  form: ReactNode;
  code: string;
  filename: string;
  language?: 'php' | 'plain';
  editor: EditorControls;
  issues: ValidationIssue[];
  onFix?: (fix: string) => void;
  onFocusField?: (targetId: string) => void;
  secondaryTab?: SecondaryTab;
  /** Additional tool-specific tabs beyond `secondaryTab` — e.g. a tool with both a
   * live-screen preview tab and a Reference tab needs two, not one. Rendered in
   * order right after `secondaryTab`, before Checks. */
  extraSecondaryTabs?: SecondaryTab[];
  outputModes?: OutputMode[];
  activeOutputMode?: string;
  onOutputModeChange?: (id: string) => void;
  outputHint?: ReactNode;
  /** Overrides the primary tab's label (default "PHP"/"Output") and content (default: output-mode chips + CodePreview). Only Readme Studio uses this today — its primary output is a rendered listing, not code. */
  primaryTabLabel?: string;
  primaryTabContent?: ReactNode;
  /** Extra toolbar buttons rendered before New/Copy/Download — for tool-specific actions (e.g. Readme Studio's Import / Export project). */
  extraActions?: ReactNode;
}

type RightTab = 'code' | 'checks' | `secondary-${number}`;

/**
 * Shared generator page shell: breadcrumb + title sub-header, then a bordered
 * IDE-style workspace card — a toolbar (file badge, saved status, undo/redo,
 * error/warning pill, New/Copy/Download) above a two-column split: the form on
 * the left, a tabbed output panel (code / an optional tool-specific tab / checks)
 * on the right. Every generator uses this so the chrome stays identical everywhere.
 */
export function GeneratorShell({
  category,
  title,
  description,
  form,
  code,
  filename,
  language = 'php',
  editor,
  issues,
  onFix,
  onFocusField,
  secondaryTab,
  extraSecondaryTabs,
  outputModes,
  activeOutputMode,
  onOutputModeChange,
  outputHint,
  primaryTabLabel,
  primaryTabContent,
  extraActions,
}: GeneratorShellProps) {
  const cat = CAT_MAP[category];
  const [tab, setTab] = useState<RightTab>('code');
  const secondaryTabs = [secondaryTab, ...(extraSecondaryTabs ?? [])].filter((t): t is SecondaryTab => !!t);
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const healthDot = errorCount > 0 ? 'var(--gfw-danger)' : warningCount > 0 ? 'var(--gfw-warning)' : 'var(--gfw-success)';
  const copyFlash = useCopyFlash();

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const [rightPaneWidth, setRightPaneWidth] = useState(520);
  const [resizingPane, setResizingPane] = useState(false);
  const isDesktop = viewportWidth >= 1024;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) editor.onRedo();
      else editor.onUndo();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor]);

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!resizingPane) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [resizingPane]);

  useEffect(() => {
    if (!resizingPane) return;
    function onMouseMove(e: MouseEvent) {
      e.preventDefault();
      const host = workspaceRef.current;
      const rect = host ? host.getBoundingClientRect() : { right: window.innerWidth, width: window.innerWidth };
      const maxW = Math.max(340, rect.width - 420);
      setRightPaneWidth(Math.round(Math.min(maxW, Math.max(340, rect.right - e.clientX - 3))));
    }
    function onMouseUp() {
      setResizingPane(false);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingPane]);

  function copy() {
    copyFlash.copy(code);
    trackEvent('code_copied', { generator: title, category });
  }

  function download() {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    trackEvent('code_downloaded', { generator: title, category, filename });
  }

  return (
    <div>
      <div className="gen-subheader">
        <div className="gfw-container" style={{ padding: '15px 28px 16px', display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--gfw-text-faint)', marginBottom: 5, flexWrap: 'wrap' }}>
              <Link to="/tools" style={{ color: 'var(--gfw-text-mutest)', fontWeight: 600 }}>Generators</Link>
              <span aria-hidden="true">/</span>
              <Link to={`/category/${category}`} style={{ color: 'var(--gfw-text-mutest)', fontWeight: 600 }}>{cat.label}</Link>
              <span aria-hidden="true">/</span>
              <span style={{ color: 'var(--gfw-text-muted)', fontWeight: 600 }}>{title.replace(/ Generator$/, '')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.022em', color: 'var(--gfw-text-strong)' }}>{title}</h1>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 12 }} />
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--gfw-text-muted)', maxWidth: 420 }}>{description}</p>
        </div>
      </div>

      <div className="gen-workspace-wrap">
        <div className="gen-workspace" ref={workspaceRef}>
          <div className="gen-toolbar">
            <div className="gen-toolbar-file">
              <Icon name="file" size={13} />
              <span className="gen-toolbar-filename">{filename}</span>
            </div>
            <div className="gen-toolbar-saved">{editor.savedLabel}</div>
            <div className="gen-toolbar-icons">
              <button aria-label="Undo" title="Undo" onClick={editor.onUndo} disabled={!editor.canUndo} className="gen-icon-btn">
                <Icon name="undo" size={14} />
              </button>
              <button aria-label="Redo" title="Redo" onClick={editor.onRedo} disabled={!editor.canRedo} className="gen-icon-btn">
                <Icon name="redo" size={14} />
              </button>
            </div>
            <button onClick={() => setTab('checks')} className="gen-toolbar-health">
              <span className="gen-toolbar-health-dot" style={{ background: healthDot }} />
              {errorCount} error{errorCount === 1 ? '' : 's'} · {warningCount} warning{warningCount === 1 ? '' : 's'}
            </button>
            <div className="gen-toolbar-spacer" />
            {extraActions}
            <button onClick={editor.onNew} className="gen-toolbar-btn">New</button>
            <button onClick={copy} className="gen-toolbar-btn">{copyFlash.label}</button>
            <button onClick={download} className="gen-toolbar-btn-primary">
              Download {filename.slice(filename.lastIndexOf('.'))}
            </button>
          </div>

          <div className={`gen-workspace-body${isDesktop ? ' is-resizable' : ''}`}>
            <div className="gen-form-col">{form}</div>
            {isDesktop && (
              <div
                className="gen-pane-resizer"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setResizingPane(true);
                }}
              />
            )}
            <div className="gen-output-col" style={isDesktop ? { width: rightPaneWidth, minWidth: rightPaneWidth } : undefined}>
              <div className="gen-tabbar">
                <button onClick={() => setTab('code')} className={`gen-tab${tab === 'code' ? ' is-active' : ''}`}>
                  {primaryTabLabel ?? (language === 'php' ? 'PHP' : 'Output')}
                </button>
                {secondaryTabs.map((t, i) => {
                  const key: RightTab = `secondary-${i}`;
                  return (
                    <button key={key} onClick={() => setTab(key)} className={`gen-tab${tab === key ? ' is-active' : ''}`}>
                      {t.label}
                    </button>
                  );
                })}
                <button onClick={() => setTab('checks')} className={`gen-tab${tab === 'checks' ? ' is-active' : ''}`}>
                  Checks ({issues.length})
                </button>
              </div>

              {tab === 'code' && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {primaryTabContent ?? (
                    <>
                      <div className="gen-code-toprow">
                        {outputModes?.map((m) => (
                          <button key={m.id} onClick={() => onOutputModeChange?.(m.id)} className={`chip${activeOutputMode === m.id ? ' is-active' : ''}`}>
                            {m.label}
                          </button>
                        ))}
                        <div style={{ flex: 1 }} />
                        <button onClick={copy} className="gen-code-copy-btn">{copyFlash.label}</button>
                      </div>
                      {outputHint && <div className="gen-code-hint">{outputHint}</div>}
                      <CodePreview code={code} filename={filename} language={language} />
                    </>
                  )}
                </div>
              )}
              {secondaryTabs.map((t, i) => {
                const key: RightTab = `secondary-${i}`;
                return tab === key ? (
                  <div key={key} className="gen-tab-panel">
                    {t.content}
                  </div>
                ) : null;
              })}
              {tab === 'checks' && (
                <div className="gen-tab-panel">
                  <ValidationList issues={issues} onFix={onFix} onFocusField={onFocusField} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
