import { useMemo, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import {
  applyFix,
  buildCode,
  deriveOembed,
  freshProject,
  referenceInfo,
  testMatch,
  validate,
  type AspectRatio,
  type OembedProvider,
  type OutputMode,
} from '../../generators/oembedProvider';

const OUTPUT_MODES: { id: OutputMode; label: string }[] = [
  { id: 'snippet', label: 'Snippet' },
  { id: 'functions', label: 'functions.php' },
  { id: 'plugin', label: 'Plugin file' },
];
const OUTPUT_HINTS: Record<OutputMode, string> = {
  snippet: 'Registration plus whichever helpers you enabled.',
  functions: 'Works in a theme — though embeds usually outlive the design.',
  plugin: 'A single-file plugin, so pasted URLs keep working after a redesign.',
};

export function OembedProviderGenerator() {
  const { state: oe, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<OembedProvider>('oembed-generator-v1', freshProject);
  const [outputMode, setOutputMode] = useState<OutputMode>('plugin');

  const d = useMemo(() => deriveOembed(oe), [oe]);
  const code = useMemo(() => buildCode(oe, outputMode), [oe, outputMode]);
  const issues = useMemo(() => validate(oe), [oe]);
  const ref = useMemo(() => referenceInfo(oe), [oe]);
  const test = useMemo(() => testMatch(oe), [oe]);
  const fileName = d.slug + '-embeds.php';

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  return (
    <GeneratorShell
      category="core"
      title="oEmbed Provider Generator"
      description="Paste a URL, get an embed. For services with a real oEmbed endpoint that is one line; for the ones without, this writes the regex handler instead."
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
          <>
            <div style={{ fontFamily: 'var(--gfw-font-mono)', fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{ref.functionName}</div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>Registered on init or plugins_loaded — before any content is rendered</div>
            <div className="field-label">Provider or handler</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>A provider is for services that publish an oEmbed endpoint: WordPress calls it, gets JSON back, and prints whatever html the service returned. A handler is for services that do not — you match the URL with a regex and build the iframe yourself. Providers are one line and always correct; handlers are your responsibility forever.</div>
            <div className="field-label">Arguments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
              {ref.args.map(([name, description]) => (
                <div key={name} style={{ borderBottom: '1px solid var(--gfw-border-muted)', paddingBottom: 9 }}>
                  <div className="gfw-mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', marginTop: 3 }}>{description}</div>
                </div>
              ))}
            </div>
            <div className="field-label">Caching</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>Successful oEmbed responses are cached in post meta under _oembed_{'{hash}'} and never expire on their own. Failures are cached too, for a shorter window. If you change the endpoint, existing posts keep the old embed until the meta is cleared — the generated code includes the delete_post_meta_by_key call for that.</div>
            <div className="field-label">Testing it</div>
            <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '10px 12px', background: 'var(--gfw-surface-muted)', fontSize: 11.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{ref.testing}</pre>
          </>
        ),
      }}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-title">Which kind</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {([['provider', 'The service has an oEmbed endpoint'], ['handler', 'It does not — build the iframe']] as const).map(([id, label]) => (
                <button key={id} type="button" className={`chip${(oe.mode || 'provider') === id ? ' is-active' : ''}`} onClick={() => commit((p) => (p.mode = id))}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gfw-text-muted)', lineHeight: 1.6 }}>
              {d.isProvider
                ? 'wp_oembed_add_provider() — one call. WordPress fetches the endpoint, caches the response and prints whatever html the service returns. Check the service docs for /oembed or a .well-known entry before assuming it has none.'
                : 'wp_embed_register_handler() — your regex, your iframe. Necessary for services with no oEmbed support, and permanently your maintenance problem when their embed URL changes.'}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">{d.isProvider ? 'Provider details' : 'Handler details'}</div>
              <div className="field-card-desc">{d.isProvider ? 'endpoint + pattern' : 'regex + iframe template'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">Service name</label>
                <input className="input" value={oe.name} onChange={(e) => commit((p) => (p.name = e.target.value), 'name')} placeholder="Acme Video" />
              </div>
              <div>
                <label className="field-label">function prefix</label>
                <input className="input gfw-mono" value={oe.prefix} onChange={(e) => commit((p) => (p.prefix = e.target.value), 'prefix')} placeholder="acme" spellCheck={false} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">URL pattern the user pastes</label>
                <input className="input gfw-mono" value={oe.pattern} onChange={(e) => commit((p) => (p.pattern = e.target.value), 'pattern')} placeholder="https://video.example.com/watch/*" spellCheck={false} />
                <div className="field-hint">{d.isProvider ? 'A glob with * wildcards, or a regex if you turn that on below.' : 'Compiled to ' + d.regex + ' — each * becomes a capture group.'}</div>
              </div>
              {d.isProvider ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">oEmbed endpoint</label>
                  <input className="input gfw-mono" value={oe.endpoint} onChange={(e) => commit((p) => (p.endpoint = e.target.value), 'endpoint')} placeholder="https://video.example.com/oembed" spellCheck={false} />
                  <div className="field-hint">WordPress appends ?url= and &amp;format=json itself. Do not include either.</div>
                </div>
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">embed URL template</label>
                  <input className="input gfw-mono" value={oe.embedTemplate} onChange={(e) => commit((p) => (p.embedTemplate = e.target.value), 'embedTemplate')} placeholder="https://video.example.com/embed/%1$s" spellCheck={false} />
                  <div className="field-hint">%1$s is the first capture group from your regex — usually the video or item id.</div>
                </div>
              )}
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Embed frame</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label className="field-label">aspect ratio</label>
                <select className="select" value={oe.ratio} onChange={(e) => commit((p) => (p.ratio = e.target.value as AspectRatio))}>
                  <option value="16-9">16 : 9</option>
                  <option value="4-3">4 : 3</option>
                  <option value="1-1">1 : 1</option>
                  <option value="9-16">9 : 16 — vertical</option>
                </select>
              </div>
              <div>
                <label className="field-label">cache lifetime (hours)</label>
                <input className="input gfw-mono" value={oe.cacheHours} onChange={(e) => commit((p) => (p.cacheHours = e.target.value), 'cacheHours')} placeholder="24" spellCheck={false} />
              </div>
            </div>
            {d.isProvider && (
              <ToggleRow
                label="Pattern is a regex"
                help="Passes true as the third argument, so your pattern is used verbatim."
                checked={oe.isRegex}
                onChange={(v) => commit((p) => (p.isRegex = v))}
              />
            )}
            {!d.isProvider && (
              <>
                <ToggleRow
                  label="Responsive wrapper"
                  help="Wraps the iframe in a padded box at your aspect ratio."
                  checked={oe.responsiveWrapper}
                  onChange={(v) => commit((p) => (p.responsiveWrapper = v))}
                />
                <ToggleRow
                  label="allowfullscreen"
                  help="Lets a video embed go full screen."
                  checked={oe.allowFullscreen}
                  onChange={(v) => commit((p) => (p.allowFullscreen = v))}
                />
              </>
            )}
            <ToggleRow
              label="Cache-flush helper"
              help="A function that clears _oembed_ post meta after you change the markup."
              checked={oe.cacheNote}
              onChange={(v) => commit((p) => (p.cacheNote = v))}
            />
            <ToggleRow
              label="oembed_ttl filter"
              help="How long a failed lookup is remembered before WordPress retries."
              checked={oe.filterTtl}
              onChange={(v) => commit((p) => (p.filterTtl = v))}
            />
            <ToggleRow
              label="Trust the host for redirects"
              help="Adds it to allowed_redirect_hosts. Unrelated to embedding — only if you need it."
              checked={oe.allowUnsafe}
              onChange={(v) => commit((p) => (p.allowUnsafe = v))}
            />
          </div>

          <div style={{ background: 'var(--gfw-surface-muted)', border: '1px solid var(--gfw-border)', borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Test URL</div>
            <input className="input gfw-mono" value={oe.testUrl} onChange={(e) => commit((p) => (p.testUrl = e.target.value), 'testUrl')} placeholder="https://video.example.com/watch/abc123" spellCheck={false} />
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: test.ok === null ? 'var(--gfw-text-mutest)' : test.ok ? 'var(--gfw-success)' : 'var(--gfw-danger)' }}>
                {test.ok === null ? 'No test yet' : test.ok ? 'Matches' : 'No match'}
              </span>
              <span className="gfw-mono" style={{ fontSize: 11.5, color: 'var(--gfw-text-muted)' }}>{test.detail}</span>
            </div>
          </div>
        </div>
      }
    />
  );
}
