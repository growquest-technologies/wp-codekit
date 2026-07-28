import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CAT_MAP, TOOL_MAP, type Tool } from '../../data/tools';
import { Icon } from '../ui/Icon';
import { afterYouCopyFaqs } from '../../data/afterYouCopy';
import { CONTENT_REVIEWED, CONTENT_REVIEWED_LABEL, TESTED_ON } from '../../data/contentMeta';
import type { ToolContent } from '../../data/toolContentTypes';

/**
 * Renders `code` spans written as backticks in content strings, so the content
 * data stays plain serialisable text (no JSX in the data layer) while still
 * getting real <code> elements in the DOM for crawlers and screen readers.
 */
function Rich({ text }: { text: string }): ReactNode {
  const parts = text.split('`');
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <code key={i} className="tc-code">{p}</code> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

interface ToolContentSectionProps {
  tool: Tool;
  content: ToolContent;
}

/**
 * The long-form, indexable content block under every generator. This is what
 * search engines and answer engines actually read — the workspace above it is an
 * interactive app they cannot evaluate. Structure mirrors the design handoff:
 * About + spec card, Why (6 features), How (4 steps + worked example + docs),
 * FAQ, and same-category related tools.
 *
 * All outbound links are nofollow: every external destination here is a
 * third-party documentation site, and we don't pass PageRank to them.
 */
export function ToolContentSection({ tool, content }: ToolContentSectionProps) {
  const cat = CAT_MAP[tool.cat];
  const related = content.related
    .map((r) => ({ tool: TOOL_MAP[r.id], note: r.note }))
    .filter((r): r is { tool: Tool; note: string } => !!r.tool);
  // Tool-specific FAQs first, then the post-click support questions no
  // competitor in this category answers. See afterYouCopy.ts.
  const faqs = [...content.faqs, ...afterYouCopyFaqs(tool)];

  return (
    <section className="tc-section" aria-labelledby="tc-about-heading">
      <div className="gfw-container tc-inner">

        {/* About + spec */}
        <div className="tc-about">
          <div className="tc-about-main">
            <p className="tc-eyebrow">About this generator</p>
            <h2 id="tc-about-heading" className="tc-h2 tc-h2-lead">{content.aboutTitle}</h2>
            <p className="tc-lead"><Rich text={content.aboutLead} /></p>
            <p className="tc-body"><Rich text={content.aboutSupport} /></p>
            <p className="tc-freshness">
              Reviewed <time dateTime={CONTENT_REVIEWED}>{CONTENT_REVIEWED_LABEL}</time>
              <span aria-hidden="true"> · </span>
              Output tested on {TESTED_ON}
            </p>
          </div>
          <aside className="tc-spec" aria-label="Generator specifications">
            <div className="tc-spec-row">
              <span className="tc-spec-label">Hook</span>
              <span className="tc-spec-value gfw-mono">{content.spec.hook}</span>
            </div>
            <div className="tc-spec-sep" />
            <div className="tc-spec-row">
              <span className="tc-spec-label">Outputs</span>
              <span className="tc-spec-value"><Rich text={content.spec.outputs} /></span>
            </div>
            <div className="tc-spec-sep" />
            <div className="tc-spec-row">
              <span className="tc-spec-label">Requires</span>
              <span className="tc-spec-value">{content.spec.requires}</span>
            </div>
            <div className="tc-spec-sep" />
            <div className="tc-spec-row">
              <span className="tc-spec-label">Price</span>
              <span className="tc-spec-value">Free — no sign-up, no limits</span>
            </div>
          </aside>
        </div>

        {/* Why */}
        <div>
          <h2 className="tc-h2">{content.whyTitle}</h2>
          <p className="tc-body tc-body-wide"><Rich text={content.whyIntro} /></p>
          <div className="tc-feature-grid">
            {content.features.map((f) => (
              <div key={f.title} className="tc-card tc-feature">
                <span className="tc-feature-icon" aria-hidden="true"><Icon name="check" size={12} /></span>
                <div style={{ minWidth: 0 }}>
                  <h3 className="tc-card-title">{f.title}</h3>
                  <p className="tc-card-body"><Rich text={f.body} /></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div>
          <h2 className="tc-h2">{content.howTitle}</h2>
          <p className="tc-body tc-body-wide"><Rich text={content.howIntro} /></p>
          <ol className="tc-step-grid">
            {content.steps.map((s, i) => (
              <li key={s.title} className="tc-card tc-step">
                <span className="tc-step-num gfw-mono">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="tc-card-title">{s.title}</h3>
                <p className="tc-card-body"><Rich text={s.body} /></p>
              </li>
            ))}
          </ol>

          <div className="tc-example-wrap">
            <div className="tc-example-main">
              <h3 className="tc-example-title">{content.example.title}</h3>
              <p className="tc-card-body" style={{ maxWidth: '64ch', marginBottom: 12 }}><Rich text={content.example.intro} /></p>
              <pre className="tc-pre"><code>{content.example.code}</code></pre>
              {content.example.note && (
                <p className="tc-card-body" style={{ maxWidth: '68ch', marginTop: 12 }}><Rich text={content.example.note} /></p>
              )}
            </div>
            <aside className="tc-card tc-refs" aria-label="Reference documentation">
              <p className="tc-eyebrow" style={{ marginBottom: 12 }}>Reference documentation</p>
              {content.refLinks.map((r, i) => (
                <a
                  key={r.href}
                  href={r.href}
                  target="_blank"
                  rel="noopener nofollow"
                  className="tc-ref-link"
                  style={i === content.refLinks.length - 1 ? { borderBottom: 'none' } : undefined}
                >
                  <Icon name="arrowRight" size={11} style={{ marginTop: 4, color: 'var(--gfw-text-mutest)' }} />
                  <span style={{ minWidth: 0 }}>
                    <span className="tc-ref-title">{r.title}</span>
                    <span className="tc-ref-desc">{r.description}</span>
                  </span>
                </a>
              ))}
            </aside>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="tc-h2" style={{ marginBottom: 6 }}>{content.faqTitle}</h2>
          <p className="tc-body" style={{ marginBottom: 24 }}><Rich text={content.faqIntro} /></p>
          <div className="tc-card tc-faq-card">
            {faqs.map((f, i) => (
              <div key={f.question} className="tc-faq-row" style={i === faqs.length - 1 ? { borderBottom: 'none' } : undefined}>
                <h3 className="tc-faq-q">{f.question}</h3>
                <p className="tc-faq-a"><Rich text={f.answer} /></p>
              </div>
            ))}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <div className="tc-related-head">
              <h2 className="tc-h2" style={{ margin: 0, fontSize: 'clamp(20px,2vw,25px)' }}>More {cat.label} generators</h2>
              <Link to="/tools" className="tc-browse-all">Browse all generators →</Link>
            </div>
            <p className="tc-body" style={{ marginBottom: 18, maxWidth: '70ch' }}>
              The other {cat.label} generators in the library, plus the WordPress tools most often used alongside this one.
            </p>
            <div className="tc-related-grid">
              {related.map(({ tool: rt, note }) => (
                <Link key={rt.id} to={`/tools/${rt.id}`} className="tc-card tc-related-card">
                  <span className={`tc-related-cat${rt.cat === tool.cat ? ' is-same' : ''}`}>{CAT_MAP[rt.cat].label}</span>
                  <span className="tc-related-name">{rt.name} Generator</span>
                  <span className="tc-related-fn gfw-mono">{rt.fn}</span>
                  <span className="tc-related-note">{note}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
