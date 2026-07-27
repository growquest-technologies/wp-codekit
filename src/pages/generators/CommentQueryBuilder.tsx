import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  OUTPUT_HINTS,
  REF_ARGS,
  REF_STATUSES,
  STATUSES,
  TYPES,
  applyFix,
  buildCode,
  fileNameFor,
  freshProject,
  plainEnglish,
  typeNote,
  validate,
  type CommentQuery,
  type OutputMode,
} from '../../generators/commentQuery';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'query', label: 'WP_Comment_Query' },
  { id: 'get_comments', label: 'get_comments()' },
  { id: 'args', label: 'Args array' },
];

export function CommentQueryBuilder() {
  const { state: cq, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<CommentQuery>('comment-query-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('query');

  const code = useMemo(() => buildCode(cq, outputMode), [cq, outputMode]);
  const issues = useMemo(() => validate(cq), [cq]);
  const fileName = fileNameFor();

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  const postIdBorder = String(cq.postId || '').trim() && !/^\d+$/.test(String(cq.postId).trim()) ? '#B91C1C' : 'var(--gfw-border)';
  const userIdBorder = String(cq.userId || '').trim() && !/^\d+$/.test(String(cq.userId).trim()) ? '#B91C1C' : 'var(--gfw-border)';
  const emailBorder = String(cq.authorEmail || '').trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(cq.authorEmail).trim()) ? '#B91C1C' : 'var(--gfw-border)';
  const numberBorder = parseInt(cq.number, 10) ? 'var(--gfw-border)' : '#B45309';

  return (
    <GeneratorShell
      category="query"
      title="Comment Query Builder"
      description={
        <>
          Comment queries by status, type, post and hierarchy — with the "all includes spam" and hierarchical-counts-threads gotchas called out before they ship.
        </>
      }
      code={code}
      filename={fileName}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      outputModes={OUTPUT_MODES}
      activeOutputMode={outputMode}
      onOutputModeChange={(id) => setOutputMode(id as OutputMode)}
      outputHint={OUTPUT_HINTS[outputMode]}
      secondaryTab={{
        label: 'Reference',
        content: (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ border: '1px solid var(--gfw-border)', borderRadius: 8, padding: '16px 18px', background: 'var(--gfw-surface-sunken)', marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>In plain English</div>
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>{plainEnglish(cq)}</div>
            </div>

            <div className="gfw-mono" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>new WP_Comment_Query()</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>get_comments() is the wrapper around it</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Arguments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              {REF_ARGS.map((r) => (
                <div key={r.name} style={{ borderBottom: '1px solid var(--gfw-border)', paddingBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <span className="gfw-mono" style={{ fontSize: 12.5, fontWeight: 700 }}>{r.name}</span>
                    <span className="type-badge">{r.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.5, marginTop: 4 }}>{r.description}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Statuses</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{REF_STATUSES}</pre>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Trackbacks are comments</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 18 }}>wp_comments holds pingbacks and trackbacks alongside real comments, so "latest comments" without a type filter eventually shows a pingback from a scraper site. type comment is the filter almost every front-end list wants.</div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Threading changes the shape</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>With hierarchical set, WP_Comment_Query returns only top-level comments and attaches children to each one — so a number of 10 means 10 threads, not 10 comments. Flat mode returns parents followed by their children in one list.</div>
          </div>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Status and type</div>
            <label className="field-label">Status</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {STATUSES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => commit((p) => (p.status = v as CommentQuery['status']))} className={`chip${cq.status === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            <label className="field-label">Type</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TYPES.map(([v, l]) => (
                <button key={v || 'any'} type="button" onClick={() => commit((p) => (p.type = v as CommentQuery['type']))} className={`chip${cq.type === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.55 }}>{typeNote(cq)}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Scope</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">post_id</label>
                <input className="input gfw-mono" placeholder="empty for all posts" value={cq.postId} onChange={(e) => commit((p) => (p.postId = e.target.value), 'postId')} style={{ borderColor: postIdBorder }} />
              </div>
              <div>
                <label className="field-label">post_type</label>
                <input className="input gfw-mono" placeholder="post" value={cq.postType} onChange={(e) => commit((p) => (p.postType = e.target.value), 'postType')} />
              </div>
              <div>
                <label className="field-label">user_id — logged-in author</label>
                <input className="input gfw-mono" placeholder="empty for anyone" value={cq.userId} onChange={(e) => commit((p) => (p.userId = e.target.value), 'userId')} style={{ borderColor: userIdBorder }} />
              </div>
              <div>
                <label className="field-label">author_email</label>
                <input className="input gfw-mono" placeholder="someone@example.com" value={cq.authorEmail} onChange={(e) => commit((p) => (p.authorEmail = e.target.value), 'authorEmail')} style={{ borderColor: emailBorder }} />
              </div>
              <div>
                <label className="field-label">search</label>
                <input className="input gfw-mono" placeholder="in content, author, email, url" value={cq.search} onChange={(e) => commit((p) => (p.search = e.target.value), 'search')} />
              </div>
              <div>
                <label className="field-label">parent</label>
                <input className="input gfw-mono" placeholder="0 for top level" value={cq.parent} onChange={(e) => commit((p) => (p.parent = e.target.value), 'parent')} />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Order and shape</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">number</label>
                <input className="input gfw-mono" placeholder="10" value={cq.number} onChange={(e) => commit((p) => (p.number = e.target.value), 'number')} style={{ borderColor: numberBorder }} />
              </div>
              <div>
                <label className="field-label">orderby</label>
                <select className="select" value={cq.orderby} onChange={(e) => commit((p) => (p.orderby = e.target.value))}>
                  <option value="comment_date_gmt">comment_date_gmt</option>
                  <option value="comment_date">comment_date</option>
                  <option value="comment_karma">comment_karma</option>
                  <option value="comment_post_ID">comment_post_ID</option>
                  <option value="comment_ID">comment_ID</option>
                </select>
              </div>
              <div>
                <label className="field-label">order</label>
                <select className="select" value={cq.order} onChange={(e) => commit((p) => (p.order = e.target.value as 'DESC' | 'ASC'))}>
                  <option value="DESC">DESC — newest first</option>
                  <option value="ASC">ASC — oldest first</option>
                </select>
              </div>
              <div>
                <label className="field-label">fields</label>
                <select className="select" value={cq.fields} onChange={(e) => commit((p) => (p.fields = e.target.value as CommentQuery['fields']))}>
                  <option value="all">all — comment objects</option>
                  <option value="ids">ids</option>
                </select>
              </div>
              <div>
                <label className="field-label">hierarchical</label>
                <select className="select" value={cq.hierarchical} onChange={(e) => commit((p) => (p.hierarchical = e.target.value as CommentQuery['hierarchical']))}>
                  <option value="false">false — flat list</option>
                  <option value="threaded">threaded — nested</option>
                  <option value="flat">flat — parents then children</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 13 }}>
              <ToggleRow
                label="Count only"
                help="Returns a single number instead of rows."
                checked={cq.countOnly}
                onChange={(v) => commit((p) => (p.countOnly = v))}
              />
              <ToggleRow
                label="Prime the comment meta cache"
                help="One query for all comment meta instead of one per comment."
                checked={cq.updateCache}
                onChange={(v) => commit((p) => (p.updateCache = v))}
              />
              <ToggleRow
                label="no_found_rows"
                help="Skips the total count when you are not paginating."
                checked={cq.noFoundRows}
                onChange={(v) => commit((p) => (p.noFoundRows = v))}
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
