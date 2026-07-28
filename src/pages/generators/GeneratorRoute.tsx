import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGeneratorComponent } from '../../generators/registry';
import { CAT_MAP, TOOLS, toolPageTitle } from '../../data/tools';
import { getToolContent } from '../../data/toolContent/index';
import { afterYouCopyFaqs } from '../../data/afterYouCopy';
import { CONTENT_REVIEWED } from '../../data/contentMeta';
import { ToolContentSection } from '../../components/generator/ToolContentSection';
import { usePageMeta } from '../../lib/usePageMeta';
import { useJsonLd } from '../../lib/useJsonLd';

const BASE_URL = 'https://www.wpcodekit.com';

/** Strips the backtick code-span markers content strings use, for schema/meta text. */
function plain(s: string): string {
  return s.replace(/`/g, '');
}

export function GeneratorRoute() {
  const { toolId = '' } = useParams();
  const Comp = getGeneratorComponent(toolId);
  const tool = TOOLS.find((t) => t.id === toolId);
  const content = tool ? getToolContent(tool.id) : null;
  const url = `${BASE_URL}/tools/${toolId}`;

  // Title formula: exact-match keyword, then the one thing the incumbents can't
  // claim. GenerateWP and WPTurbo both gate saving behind an account; we don't,
  // and "Free, No Login" is the differentiator that fits in the 50-60 char
  // sweet spot alongside the keyword.
  usePageMeta(
    tool ? `${toolPageTitle(tool)} — Free, No Login | WP CodeKit` : 'Generator not found — WP CodeKit',
    tool ? `${tool.desc} Runs in your browser, nothing uploaded, no account needed.` : "That generator doesn't exist.",
    `/tools/${toolId}`,
    { noindex: !Comp, rawTitle: true },
  );

  useJsonLd(
    'ld-breadcrumb',
    tool
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Generators', item: `${BASE_URL}/tools` },
            { '@type': 'ListItem', position: 3, name: CAT_MAP[tool.cat].label, item: `${BASE_URL}/category/${tool.cat}` },
            { '@type': 'ListItem', position: 4, name: `${tool.name} Generator`, item: url },
          ],
        }
      : null,
  );

  // The tool itself, as a free WebApplication. `@id` is stable so the HowTo and
  // FAQPage below can reference this page as one entity rather than three
  // unrelated blobs — that's what lets an answer engine attribute them together.
  useJsonLd(
    'ld-tool',
    tool && content
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          '@id': `${url}#app`,
          name: `${tool.name} Generator`,
          url,
          applicationCategory: 'DeveloperApplication',
          applicationSubCategory: 'WordPress code generator',
          operatingSystem: 'Any (runs in the browser)',
          browserRequirements: 'Requires JavaScript',
          description: plain(content.aboutLead),
          featureList: content.features.map((f) => f.title),
          softwareRequirements: content.spec.requires,
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          publisher: { '@id': `${BASE_URL}/#organization` },
          isPartOf: { '@id': `${BASE_URL}/#website` },
          // Freshness is a live differentiator here: the category incumbent's
          // tool pages still carry a dateModified of 2016.
          dateModified: CONTENT_REVIEWED,
          inLanguage: 'en',
        }
      : null,
  );

  useJsonLd(
    'ld-howto',
    tool && content
      ? {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: content.howTitle,
          description: plain(content.howIntro),
          totalTime: 'PT3M',
          estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
          tool: [{ '@type': 'HowToTool', name: `${tool.name} Generator` }],
          step: content.steps.map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s.title,
            text: plain(s.body),
            url: `${url}#step-${i + 1}`,
          })),
        }
      : null,
  );

  // Must mirror what ToolContentSection actually renders — the tool's own FAQs
  // plus the appended post-click support questions. Schema that claims fewer
  // (or different) questions than the page shows is a mismatch.
  useJsonLd(
    'ld-faq',
    tool && content
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [...content.faqs, ...afterYouCopyFaqs(tool)].map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: plain(f.answer) },
          })),
        }
      : null,
  );

  if (!Comp || !tool) {
    return (
      <div className="gfw-container" style={{ padding: '80px 28px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--gfw-text-strong)', marginBottom: 10 }}>
          {tool ? `${tool.name} isn't built yet` : 'Generator not found'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--gfw-text-muted)', marginBottom: 22 }}>
          {tool ? "It's on the build list — let us know if you need it sooner." : "That generator doesn't exist."}
        </p>
        <Link to="/tools" className="btn btn-primary">Back to generators</Link>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={<div style={{ padding: 60, textAlign: 'center', color: 'var(--gfw-text-mutest)' }}>Loading…</div>}>
        <Comp />
      </Suspense>
      {content && <ToolContentSection tool={tool} content={content} />}
    </>
  );
}
