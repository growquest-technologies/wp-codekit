import { useState, type ReactNode } from 'react';
import type { InlineToken, LineToken, ReadmeProject } from '../../generators/readmeStudio';
import { mapPreviewBlocks, segmentText } from '../../generators/readmeStudio';

/** Renders a run of inline tokens (text/bold/italic/code/link) as React nodes. */
function renderInline(tokens: InlineToken[], keyPrefix: string): ReactNode {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`;
    if (t.kind === 'bold') return <strong key={key}>{t.value}</strong>;
    if (t.kind === 'italic') return <em key={key}>{t.value}</em>;
    if (t.kind === 'code') return <code key={key} style={{ background: '#F0F0F1', padding: '1px 4px', borderRadius: 3 }}>{t.value}</code>;
    if (t.kind === 'link') return (
      <a key={key} href={t.href} title={t.title} target="_blank" rel="noopener noreferrer nofollow ugc" style={{ color: '#3858E9' }}>
        {t.value}
      </a>
    );
    return <span key={key}>{t.value}</span>;
  });
}

/** Renders multiline tokens (text/bold/italic/code/link/break) as React nodes. */
function renderLines(tokens: LineToken[], keyPrefix: string): ReactNode {
  return tokens.map((t, i) => (t.kind === 'break' ? <br key={`${keyPrefix}-br-${i}`} /> : renderInline([t], `${keyPrefix}-${i}`)));
}

/**
 * Renders a text blob's paragraph/list runs (see `segmentText`) with the given
 * paragraph styling — used for FAQ answers, changelog and upgrade-notice
 * descriptions, so `* item` / `1. item` lines typed there render as real bullets
 * too, not just inside the Description/Installation block editor.
 */
function SegmentedText({ text, keyPrefix, style }: { text: string; keyPrefix: string; style: React.CSSProperties }) {
  const segments = segmentText(text);
  return (
    <>
      {segments.map((seg, i) => {
        const key = `${keyPrefix}-seg-${i}`;
        if (seg.kind === 'list') {
          const Tag = seg.ordered ? 'ol' : 'ul';
          return (
            <Tag key={key} style={{ ...style, margin: `${style.margin ?? '6px 0 0'}`, paddingLeft: 22 }}>
              {seg.items.map((item, ii) => (
                <li key={ii}>{renderInline(item, `${key}-${ii}`)}</li>
              ))}
            </Tag>
          );
        }
        if (seg.kind !== 'paragraph') return null;
        return (
          <p key={key} style={style}>
            {renderLines(seg.tokens, key)}
          </p>
        );
      })}
    </>
  );
}

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'installation', label: 'Installation' },
  { key: 'development', label: 'Development' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function PreviewBlocks({ project, sectionKind }: { project: ReadmeProject; sectionKind: 'description' | 'installation' }) {
  const section = project.sections.find((s) => s.kind === sectionKind && s.enabled);
  if (!section || section.kind !== sectionKind) return null;
  const blocks = mapPreviewBlocks(section.blocks);
  if (!blocks.length) return null;
  return (
    <div>
      {blocks.map((b, i) => {
        const key = `blk-${i}`;
        if (b.kind === 'subheading') return <h3 key={key} style={{ fontSize: 15, margin: '16px 0 6px' }}>{b.text}</h3>;
        if (b.kind === 'paragraph') return <p key={key} style={{ fontSize: 13.5, lineHeight: 1.75, margin: '0 0 12px', color: '#3C434A' }}>{renderLines(b.tokens, key)}</p>;
        if (b.kind === 'blockquote')
          return (
            <p key={key} style={{ fontSize: 13.5, lineHeight: 1.75, margin: '0 0 12px', color: '#3C434A' }}>
              {renderLines(b.tokens, key)}
            </p>
          );
        if (b.kind === 'code')
          return (
            <pre key={key} style={{ background: '#F0F0F1', borderRadius: 6, padding: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, overflowX: 'auto', margin: '0 0 12px' }}>
              {b.text}
            </pre>
          );
        if (b.kind === 'video')
          return (
            <div key={key} style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 6, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
              <iframe src={b.embedUrl} title="Embedded video" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
          );
        if (b.kind === 'video-link')
          return (
            <div key={key} style={{ border: '1px solid #DCDCDE', borderRadius: 6, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#646970', marginBottom: 12 }}>
              Video: {b.url}
            </div>
          );
        // list
        const Tag = b.ordered ? 'ol' : 'ul';
        return (
          <Tag key={key} style={{ margin: '0 0 12px', paddingLeft: 22, fontSize: 13.5, lineHeight: 1.8, color: '#3C434A' }}>
            {b.items.map((item, ii) => (
              <li key={ii}>{renderInline(item, `${key}-${ii}`)}</li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

interface ListingPreviewProps {
  project: ReadmeProject;
}

/**
 * WordPress.org-listing-style live preview, ported from the design source's
 * `ListingPreview` sub-component (`design-reference/ListingPreview.dc.html`).
 * Real wordpress.org tab structure: Details (description body + screenshots +
 * FAQ all together) / Installation / Development (contributors + changelog +
 * upgrade notice) / Reviews (always disabled — this app has no review data).
 */
export function ListingPreview({ project }: ListingPreviewProps) {
  const [tab, setTab] = useState<TabKey>('details');

  const name = project.name || 'Your Plugin Name';
  const initial = (project.name[0] || '?').toUpperCase();
  const contributors = project.meta.contributors;
  const byline = contributors.length ? `By ${contributors[0]}` : '';

  const shotsSection = project.sections.find((s) => s.kind === 'screenshots' && s.enabled);
  const screenshots = shotsSection && shotsSection.kind === 'screenshots' ? shotsSection.screenshots : [];

  const faqSection = project.sections.find((s) => s.kind === 'faq' && s.enabled);
  const faqs = faqSection && faqSection.kind === 'faq' ? faqSection.faqs : [];

  const changelogSection = project.sections.find((s) => s.kind === 'changelog' && s.enabled);
  const versions = changelogSection && changelogSection.kind === 'changelog' ? changelogSection.versions : [];

  const upgradeSection = project.sections.find((s) => s.kind === 'upgradeNotice' && s.enabled);
  const notices = upgradeSection && upgradeSection.kind === 'upgradeNotice' ? upgradeSection.notices : [];
  const noticeByVersion = new Map(notices.map((n) => [n.version, n]));

  return (
    <div style={{ background: '#fff', maxWidth: 900, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', color: '#1E1E1E' }}>
      {/* Gradient banner */}
      <div style={{ height: 130, background: 'linear-gradient(135deg,#3858E9,#26221C)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, opacity: 0.9 }}>{name}</div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', borderBottom: '1px solid #DCDCDE' }}>
        <div style={{ width: 64, height: 64, borderRadius: 10, background: '#3858E9', color: '#fff', fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{name}</div>
          {byline && <div style={{ fontSize: 13, color: '#3858E9' }}>{byline}</div>}
        </div>
        <button type="button" tabIndex={-1} style={{ width: 40, height: 40, border: '1px solid #DCDCDE', borderRadius: 6, background: '#fff', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A4438', flexShrink: 0 }}>
          ♡
        </button>
        <button type="button" tabIndex={-1} style={{ border: 'none', borderRadius: 6, background: '#3858E9', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 22px', cursor: 'default', flexShrink: 0 }}>
          Download
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '0 24px', borderBottom: '1px solid #DCDCDE' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: '12px 16px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.key ? '#3858E9' : '#3C434A', borderBottom: tab === t.key ? '3px solid #3858E9' : '3px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
        <button type="button" disabled style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: '#A7AAAD', borderBottom: '3px solid transparent', cursor: 'default' }}>
          Reviews
        </button>
      </div>

      <div style={{ display: 'flex', gap: 28, padding: 24 }}>
        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === 'details' && (
            <div>
              <PreviewBlocks project={project} sectionKind="description" />

              {screenshots.length > 0 && (
                <>
                  <h3 style={{ fontSize: 15, margin: '22px 0 10px' }}>Screenshots</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 10 }}>
                    {screenshots.map((sh, i) => (
                      <div key={i}>
                        <div style={{ background: '#F0F0F1', border: '1px solid #DCDCDE', borderRadius: 4, aspectRatio: '16 / 10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A7AAAD', fontSize: 11 }}>
                          Screenshot {i + 1}
                        </div>
                        <div style={{ fontSize: 12, color: '#3C434A', marginTop: 5 }}>
                          {i + 1}. {sh.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {faqs.length > 0 && (
                <>
                  <h3 style={{ fontSize: 15, margin: '22px 0 10px' }}>FAQ</h3>
                  {faqs.map((f, i) => (
                    <details key={i} style={{ borderBottom: '1px solid #DCDCDE', padding: '10px 0' }}>
                      <summary style={{ fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{f.question}</summary>
                      <SegmentedText text={f.answer} keyPrefix={`faq-${i}`} style={{ fontSize: 13, margin: '8px 0 0', lineHeight: 1.7, color: '#3C434A' }} />
                    </details>
                  ))}
                </>
              )}
            </div>
          )}

          {tab === 'installation' && <PreviewBlocks project={project} sectionKind="installation" />}

          {tab === 'development' && (
            <div>
              <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>Contributors &amp; Developers</h3>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
                {contributors.length ? contributors.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#3858E9', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(c[0] || '?').toUpperCase()}
                    </div>
                    <span style={{ fontSize: 12.5, color: '#3858E9' }}>{c}</span>
                  </div>
                )) : <span style={{ fontSize: 12.5, color: '#646970' }}>No contributors listed yet.</span>}
              </div>

              <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>Changelog</h3>
              {versions.length ? versions.map((v, i) => {
                const notice = v.version ? noticeByVersion.get(v.version) : undefined;
                return (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{v.version || '(no version)'}</div>
                    <SegmentedText text={v.description} keyPrefix={`ver-${i}`} style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.8, color: '#3C434A' }} />
                    {notice && (
                      <div style={{ marginTop: 8, background: '#FFF6E5', border: '1px solid #F0D9A8', color: '#8A5B00', borderRadius: 6, padding: '8px 10px', fontSize: 12.5 }}>
                        <strong>Upgrade Notice:</strong> <SegmentedText text={notice.description} keyPrefix={`notice-${i}`} style={{ display: 'inline', fontSize: 12.5, color: '#8A5B00' }} />
                      </div>
                    )}
                  </div>
                );
              }) : <p style={{ fontSize: 13, color: '#646970' }}>No changelog entries yet.</p>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ border: '1px solid #DCDCDE', borderRadius: 6, padding: 14, fontSize: 12.5 }}>
            <MetaRow label="Version" value={project.meta.stableTag || '—'} />
            <MetaRow label="Requires WordPress" value={project.meta.requiresAtLeast ? `${project.meta.requiresAtLeast}+` : '—'} />
            <MetaRow label="Tested up to" value={project.meta.testedUpTo || '—'} />
            <MetaRow label="Requires PHP" value={project.meta.requiresPHP ? `${project.meta.requiresPHP}+` : '—'} last />
            <div style={{ padding: '8px 0 2px', color: '#646970' }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {project.meta.tags.map((t, i) => (
                <span key={i} style={{ background: '#F0F0F1', borderRadius: 3, padding: '2px 7px', fontSize: 11, color: '#3C434A' }}>
                  {t}
                </span>
              ))}
            </div>
            {project.meta.donateLink && (
              <a href={project.meta.donateLink} target="_blank" rel="noopener noreferrer nofollow ugc" style={{ display: 'block', marginTop: 12, fontSize: 12.5, color: '#3858E9' }}>
                Donate to this plugin »
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: last ? 'none' : '1px solid #F0F0F1' }}>
      <span style={{ color: '#646970' }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
