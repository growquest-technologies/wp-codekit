import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CodePreview } from '../../components/generator/CodePreview';
import { ToggleRow } from '../../components/ui/Toggle';
import { useEditorState } from '../../lib/useEditorState';
import { useCopyFlash } from '../../lib/useCopyFlash';
import { trackEvent } from '../../lib/analytics';
import {
  INSTALL_STEPS_TEMPLATE,
  OVERRIDE_RULES,
  PREMIUM,
  WPORG_FALLBACK,
  applyFix,
  buildFiles,
  derive,
  freshProject,
  mapWporgThemes,
  refPaths,
  refSignature,
  screenshotBytes,
  slugify,
  validate,
  wporgSearchUrl,
  zipBlob,
  type ChildTheme,
  type EnqueueMode,
  type GeneratedFile,
  type ThemeResult,
  type ThemeSource,
} from '../../generators/childTheme';

const SCREENSHOT_ACCENT = '#3858E9';

const SOURCE_CHOICES: [ThemeSource, string][] = [
  ['wporg', 'wordpress.org'],
  ['premium', 'Premium themes'],
  ['custom', 'Type it in'],
];

const ENQUEUE_CHOICES: [EnqueueMode, string, string][] = [
  ['stack', 'Enqueue the parent, then the child', "Loads the parent's style.css, then this theme's on top as a dependency. The right default for a classic theme."],
  ['handle', "Depend on the parent's own handle", 'The parent already enqueues its stylesheet — name that handle instead of loading style.css twice.'],
  ['none', 'No enqueue', 'For block themes styled through theme.json, and for frameworks like Genesis that have no front-end CSS in style.css.'],
];

const INCLUDE_TOGGLES: { key: keyof ChildTheme['options']; label: string; help: string }[] = [
  { key: 'functions', label: 'functions.php', help: 'The enqueue and anything else PHP-side. A child theme can be style.css alone, but rarely is.' },
  { key: 'textdomain', label: "Load the child's translations", help: 'load_child_theme_textdomain() against a languages/ folder in this theme.' },
  { key: 'copyMods', label: "Copy the parent's Customiser settings on activation", help: 'Runs once on after_switch_theme so the site does not reset to defaults.' },
  { key: 'setupHook', label: 'Theme setup stub at priority 11', help: "An after_setup_theme callback that runs after the parent's, for add_theme_support() changes." },
  { key: 'themeJson', label: 'theme.json', help: "Merged over the parent's — declare only the keys you are changing." },
  { key: 'rtl', label: 'rtl.css', help: 'Picked up automatically on right-to-left locales.' },
  { key: 'screenshot', label: 'Generated screenshot.png', help: '1200 × 900, written into the .zip so the Themes grid is not a grey box.' },
];

const FILE_NOTES: Record<string, string> = {
  'style.css': 'the header that names the parent',
  'functions.php': 'enqueue and hooks',
  'theme.json': "merged over the parent's",
  'rtl.css': 'auto-loaded on RTL locales',
  'screenshot.png': '1200 × 900',
};

function formatMeta(t: ThemeResult): string {
  const bits: string[] = [];
  if (t.author) bits.push('by ' + t.author);
  if (t.installs) bits.push(t.installs >= 1000000 ? Math.round(t.installs / 1000000) + 'M+ installs' : t.installs >= 1000 ? Math.round(t.installs / 1000) + 'k+ installs' : t.installs + '+ installs');
  if (t.rating) bits.push(Math.round((t.rating / 20) * 10) / 10 + '★');
  if (t.note) bits.push(t.note);
  return bits.join(' · ');
}

function saveBlob(blob: Blob, name: string) {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* ignore */
  }
}

export function ChildThemeGenerator() {
  const { state: ct, commit, undo, redo, reset, canUndo, canRedo, savedLabel } = useEditorState<ChildTheme>('child-theme-generator-v1', freshProject);

  const [activeFile, setActiveFile] = useState('style.css');
  const [source, setSource] = useState<ThemeSource>('wporg');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ThemeResult[]>([]);
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'live' | 'offline'>('idle');
  const [zipFlash, setZipFlash] = useState(false);

  const reqToken = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFlash = useCopyFlash();

  const fetchWporg = useCallback((q: string) => {
    const token = ++reqToken.current;
    setApiStatus('loading');
    fetch(wporgSearchUrl(q))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('http'))))
      .then((json) => {
        if (token !== reqToken.current) return;
        setResults(mapWporgThemes(json));
        setApiStatus('live');
      })
      .catch(() => {
        if (token === reqToken.current) {
          setResults([]);
          setApiStatus('offline');
        }
      });
  }, []);

  useEffect(() => {
    fetchWporg('');
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(value: string) {
    setQuery(value);
    if (source !== 'wporg') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchWporg(value.trim()), 320);
  }

  function switchSource(next: ThemeSource) {
    setSource(next);
    if (next === 'wporg' && apiStatus !== 'live') fetchWporg(query.trim());
  }

  function pickParent(theme: ThemeResult) {
    commit((p) => {
      p.parent.name = theme.name;
      p.parent.slug = theme.slug;
      p.parent.isBlock = !!theme.block;
      p.parent.knownCase = /[A-Z]/.test(theme.slug);
      p.parent.author = theme.author || '';
      p.parent.note = theme.note || '';
      const childSlug = slugify(theme.slug) + '-child';
      p.child.name = theme.name + ' Child';
      p.child.description = 'Child theme for ' + theme.name + '.';
      p.child.textDomain = childSlug;
      if (p.child.slugMode === 'custom') p.child.slug = childSlug;
      p.parentHandle = '';
      if (theme.slug === 'genesis') p.enqueueMode = 'none';
      else if (theme.block) p.options.themeJson = true;
    });
  }

  function fix(kind: string) {
    commit((draft) => Object.assign(draft, applyFix(draft, kind)));
  }

  const d = useMemo(() => derive(ct), [ct]);
  const files = useMemo(() => buildFiles(ct), [ct]);
  const active: GeneratedFile = useMemo(() => files.find((f) => f.name === activeFile) ?? files[0], [files, activeFile]);
  const issues = useMemo(() => validate(ct, d), [ct, d]);

  function downloadActiveFile() {
    if (active.lang === 'image') {
      saveBlob(new Blob([screenshotBytes(d.childName, d.parentName, d.childSlug)] as BlobPart[], { type: 'image/png' }), 'screenshot.png');
    } else {
      saveBlob(new Blob([active.code], { type: 'text/plain' }), active.name);
    }
    trackEvent('code_downloaded', { generator: 'Child Theme Generator', category: 'design', filename: active.name });
  }

  function downloadZip() {
    const enc = new TextEncoder();
    const entries = files.map((f) =>
      f.lang === 'image'
        ? { name: d.childSlug + '/screenshot.png', data: screenshotBytes(d.childName, d.parentName, d.childSlug) }
        : { name: d.childSlug + '/' + f.name, data: enc.encode(f.code) },
    );
    saveBlob(zipBlob(entries), d.childSlug + '.zip');
    trackEvent('code_downloaded', { generator: 'Child Theme Generator', category: 'design', filename: d.childSlug + '.zip' });
    setZipFlash(true);
    setTimeout(() => setZipFlash(false), 1800);
  }

  const q = query.trim().toLowerCase();
  const list: ThemeResult[] =
    source === 'premium'
      ? PREMIUM.filter((t) => !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q))
      : apiStatus === 'live'
        ? results
        : WPORG_FALLBACK.filter((t) => !q || t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));

  const apiStateMap: Record<string, [string, string]> = {
    idle: ['Connecting to wordpress.org', 'var(--gfw-text-mutest)'],
    loading: ['Searching wordpress.org…', 'var(--gfw-text-mutest)'],
    live: ['Live from the wordpress.org theme API', 'var(--gfw-success)'],
    offline: ['wordpress.org unreachable — bundled list', 'var(--gfw-warning)'],
  };
  const [apiStatusLabel, apiStatusColor] = source === 'premium' ? ['Bundled list of premium parents', '#8A5B00'] : apiStateMap[apiStatus];

  let parentNote = ct.parent.note ? ct.parent.note + ' ' : '';
  parentNote += d.parentSlug ? 'Template: ' + d.parentSlug + " — copied character for character from the parent's folder name." : "Pick a theme above, or type the parent's folder name straight into the field.";

  const parentNameBorder = String(ct.parent.name || '').trim() ? 'var(--gfw-border)' : '#B45309';
  const parentSlugBorder = d.parentSlug ? (/\s/.test(d.parentSlug) ? '#B91C1C' : 'var(--gfw-border)') : '#B91C1C';
  const childNameBorder = String(ct.child.name || '').trim() ? 'var(--gfw-border)' : '#B45309';
  const childSlugBorder = d.childSlug && d.childSlug !== d.parentSlug ? 'var(--gfw-border)' : '#B91C1C';
  const childSlugValue = ct.child.slugMode === 'custom' ? ct.child.slug : d.childSlug;

  return (
    <GeneratorShell
      category="design"
      title="Child Theme Generator"
      description="Search wordpress.org for the parent, and the Template header, folder name and enqueue all come out matching it — including the themes whose folder is capitalised."
      code={active.lang === 'image' ? '' : active.code}
      filename={d.childSlug + '.zip'}
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
      issues={issues}
      onFix={fix}
      downloadOverride={{ label: zipFlash ? 'Zipped' : 'Download .zip', onClick: downloadZip }}
      primaryTabLabel="Files"
      primaryTabContent={
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="gen-code-toprow">
            {files.map((f) => (
              <button key={f.name} onClick={() => setActiveFile(f.name)} className={`chip gfw-mono${active.name === f.name ? ' is-active' : ''}`}>
                {f.name}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => (active.lang === 'image' ? downloadActiveFile() : copyFlash.copy(active.code))}
              className="gen-code-copy-btn"
            >
              {active.lang === 'image' ? 'Save file' : copyFlash.label}
            </button>
          </div>
          <div className="gen-code-hint gfw-mono">wp-content/themes/{d.childSlug}/{active.name}</div>
          {active.lang === 'image' ? (
            <div style={{ background: '#F0F0F1', padding: 18 }}>
              <div style={{ width: '100%', aspectRatio: '4 / 3', border: '1px solid #C3C4C7', borderRadius: 3, background: SCREENSHOT_ACCENT, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '7%' }}>
                <div style={{ position: 'absolute', top: '-18%', right: '-12%', width: '56%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.05 }}>{d.childName}</div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', marginTop: 8 }}>Child theme of {d.parentName || 'the parent'}</div>
                <div className="gfw-mono" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 16 }}>{childSlugValue}</div>
              </div>
              <div style={{ fontSize: 11.5, color: '#787C82', lineHeight: 1.6, marginTop: 12 }}>Generated at 1200 × 900 and written into the .zip. WordPress shows it at 387 × 290 in the themes grid, so replace it with a real screenshot of the front page before you hand the theme over.</div>
            </div>
          ) : (
            <CodePreview code={active.code} filename={active.name} language={active.lang === 'php' ? 'php' : 'plain'} />
          )}
        </div>
      }
      secondaryTab={{
        label: 'Themes',
        content: (
          <div style={{ background: '#F0F0F1', margin: '-14px -16px -18px', padding: '16px 18px 40px' }}>
            <div style={{ fontSize: 10.5, color: '#787C82', marginBottom: 10 }}>Appearance › Themes, after the .zip is uploaded and activated</div>
            {!d.parentSlug && (
              <div style={{ background: '#fff', borderLeft: '4px solid #D63638', padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#1D2327', lineHeight: 1.5 }}>
                The parent theme is missing. Please install the “{d.parentSlug}” parent theme.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(178px, 1fr))', gap: 14 }}>
              <div style={{ background: '#fff', border: '1px solid #C3C4C7', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
                <div style={{ aspectRatio: '4 / 3', background: SCREENSHOT_ACCENT, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 14 }}>
                  <div style={{ position: 'absolute', top: '-18%', right: '-12%', width: '56%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                  <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1 }}>{d.childName}</div>
                  <div className="gfw-mono" style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{childSlugValue}</div>
                </div>
                <div style={{ padding: '9px 11px', borderTop: '1px solid #DCDCDE', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1D2327' }}>Active:</span>
                  <span style={{ fontSize: 13, color: '#1D2327' }}>{d.childName}</span>
                </div>
                <div style={{ padding: '0 11px 10px', fontSize: 11.5, color: '#646970' }}>Version {ct.child.version} · child of {d.parentName || 'the parent theme'}</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #DCDCDE' }}>
                <div style={{ aspectRatio: '4 / 3', background: 'repeating-linear-gradient(135deg, #EFEDE7, #EFEDE7 10px, #E7E4DC 10px, #E7E4DC 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="gfw-mono" style={{ fontSize: 11.5, color: '#787C82' }}>{ct.parent.slug}</span>
                </div>
                <div style={{ padding: '9px 11px', borderTop: '1px solid #DCDCDE', fontSize: 13, fontWeight: 600, color: '#1D2327' }}>{d.parentName || 'the parent theme'}</div>
                <div style={{ padding: '0 11px 10px', fontSize: 11.5, color: '#646970' }}>Parent — keep it installed and updated</div>
              </div>
            </div>
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #C3C4C7' }}>
              <div style={{ padding: '9px 12px', borderBottom: '1px solid #DCDCDE', fontSize: 13, fontWeight: 600, color: '#1D2327' }}>In the .zip</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 12px', borderBottom: '1px solid #F0F0F1' }}>
                <span className="gfw-mono" style={{ fontSize: 12, color: '#1D2327' }}>{d.childSlug}/</span>
                <span style={{ flex: 1, minWidth: 4 }} />
                <span style={{ fontSize: 11, color: '#787C82' }}>the folder WordPress installs</span>
              </div>
              {files.map((f) => (
                <div key={f.name} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 12px 7px 26px', borderBottom: '1px solid #F0F0F1' }}>
                  <span className="gfw-mono" style={{ fontSize: 12, color: '#1D2327' }}>{f.name}</span>
                  <span style={{ flex: 1, minWidth: 4 }} />
                  <span style={{ fontSize: 11, color: '#787C82' }}>{FILE_NOTES[f.name] || ''}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: '#787C82', lineHeight: 1.6 }}>Upload the .zip at Appearance › Themes › Add New › Upload Theme, then activate. The parent stays installed and keeps receiving updates — that is the whole point of the arrangement.</div>
          </div>
        ),
      }}
      extraSecondaryTabs={[
        {
          label: 'Reference',
          content: (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div className="gfw-mono" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>Template: {d.parentSlug}</div>
              <div style={{ fontSize: 12, color: 'var(--gfw-text-mutest)', marginBottom: 14 }}>The one header that makes a theme a child theme</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 18 }}>{refSignature(d.childName, d.parentSlug)}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Installing it</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                {INSTALL_STEPS_TEMPLATE(d).map((text, i) => (
                  <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: '50%', background: 'var(--gfw-accent-tint)', color: 'var(--gfw-accent-strong)', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55, color: 'var(--gfw-text-strong)' }}>{text}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>What overrides what</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {OVERRIDE_RULES.map((ov) => (
                  <div key={ov.what} style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '9px 11px', background: 'var(--gfw-surface-sunken)' }}>
                    <div className="gfw-mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gfw-text-strong)' }}>{ov.what}</div>
                    <div style={{ fontSize: 12, color: 'var(--gfw-text-strong)', lineHeight: 1.55, marginTop: 3 }}>{ov.rule}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Paths, child vs parent</div>
              <pre className="gfw-mono" style={{ border: '1px solid var(--gfw-border)', borderRadius: 7, padding: '12px 14px', background: 'var(--gfw-surface-sunken)', fontSize: 11.5, lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: 18 }}>{refPaths(d)}</pre>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Why not @import</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>Every tutorial written before 2014 opens the child style.css with @import url('../parent/style.css'). It still works, and it still costs you a round trip: the browser has to download and parse the child stylesheet before it discovers the parent one, so the two never download in parallel. wp_enqueue_style() with the parent as a dependency gives the same order without the serial fetch.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>functions.php loads first, not instead</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65, marginBottom: 18 }}>The child's functions.php runs before the parent's — both files run. So you cannot redefine a plain parent function, and anything you hook at the same priority as the parent runs earlier than it. To replace parent behaviour, either the parent wrapped the function in function_exists() (pluggable), or you remove_action() its callback from a later hook.</div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', marginBottom: 8 }}>Customiser settings do not come across</div>
              <div style={{ fontSize: 12.5, color: 'var(--gfw-text-strong)', lineHeight: 1.65 }}>
                theme_mods are stored per stylesheet, so activating a child starts from an empty Customiser and unassigned menu locations.{' '}
                {ct.options.copyMods
                  ? "The activation snippet in functions.php copies the parent's across once, leaving anything WordPress has already set on the child alone."
                  : 'Turn on “Copy the parent\'s Customiser settings on activation” to carry them across on the first switch.'}
              </div>
            </div>
          ),
        },
      ]}
      form={
        <div>
          <div className="field-card field-card-primary">
            <div className="field-card-header">
              <div className="field-card-title">Parent theme</div>
              <div className="field-card-desc" style={{ display: 'flex', alignItems: 'center', gap: 6, color: apiStatusColor }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: apiStatusColor, display: 'inline-block' }} />
                {apiStatusLabel}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 11 }}>
              {SOURCE_CHOICES.map(([v, l]) => (
                <button key={v} type="button" onClick={() => switchSource(v)} className={`chip${source === v ? ' is-active' : ''}`}>
                  {l}
                </button>
              ))}
            </div>

            {source !== 'custom' && (
              <div>
                <input
                  className="input"
                  value={query}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder={source === 'premium' ? 'Filter the premium list — Divi, Avada, Flatsome…' : 'Search wordpress.org — Astra, Kadence, Twenty Twenty-Five…'}
                  spellCheck={false}
                />
                <div style={{ marginTop: 9, border: '1px solid var(--gfw-border)', borderRadius: 7, background: '#fff', maxHeight: 266, overflowY: 'auto' }}>
                  {list.map((t) => {
                    const sel = t.slug === ct.parent.slug;
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => pickParent(t)}
                        style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 11, alignItems: 'center', padding: '9px 11px', border: 'none', borderBottom: '1px solid #F3F1EC', background: sel ? '#F3F7FF' : '#fff', cursor: 'pointer' }}
                      >
                        <div
                          style={{
                            width: 46, height: 35, borderRadius: 4, flexShrink: 0, overflow: 'hidden', backgroundColor: '#EFEDE7', backgroundSize: 'cover', backgroundPosition: 'center top',
                            backgroundImage: t.thumb ? `url("${t.thumb}")` : 'repeating-linear-gradient(135deg, #EFEDE7, #EFEDE7 7px, #E7E4DC 7px, #E7E4DC 14px)',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 650, color: '#26221C' }}>{t.name}</span>
                            <span className="gfw-mono" style={{ fontSize: 11, color: 'var(--gfw-text-mutest)' }}>{t.slug}</span>
                            {t.block && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', background: '#EEF1FE', color: '#2A46C4', borderRadius: 4, padding: '2px 6px' }}>Block theme</span>}
                            {t.premium && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', background: '#F6EEE2', color: '#8A5B00', borderRadius: 4, padding: '2px 6px' }}>Premium</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--gfw-text-mutest)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatMeta(t)}</div>
                        </div>
                        {sel && <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--gfw-success)', flexShrink: 0 }}>Selected</span>}
                      </button>
                    );
                  })}
                  {list.length === 0 && (
                    <div style={{ padding: '22px 12px', textAlign: 'center', fontSize: 12.5, color: 'var(--gfw-text-mutest)' }}>
                      {apiStatus === 'loading' ? 'Searching…' : `Nothing matched “${query}”. Switch to “Type it in” and enter the folder name yourself.`}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginTop: 12 }}>
              <div>
                <label className="field-label">parent name</label>
                <input className="input" value={ct.parent.name} onChange={(e) => commit((p) => (p.parent.name = e.target.value), 'parentName')} placeholder="Astra" style={{ borderColor: parentNameBorder }} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>parent folder (Template)</label>
                <input
                  className="input gfw-mono"
                  value={ct.parent.slug}
                  onChange={(e) => commit((p) => { p.parent.slug = e.target.value; p.parent.knownCase = false; }, 'parentSlug')}
                  placeholder="astra"
                  spellCheck={false}
                  style={{ borderColor: parentSlugBorder }}
                />
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 10 }}>{parentNote}</div>
          </div>

          <div className="field-card">
            <div className="field-card-title">Child theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              <div>
                <label className="field-label">theme name</label>
                <input className="input" value={ct.child.name} onChange={(e) => commit((p) => (p.child.name = e.target.value), 'childName')} placeholder="Astra Child" style={{ borderColor: childNameBorder }} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>folder name{ct.child.slugMode === 'custom' ? '' : ' (auto)'}</label>
                <input
                  className="input gfw-mono"
                  value={childSlugValue}
                  onChange={(e) => commit((p) => { p.child.slugMode = 'custom'; p.child.slug = e.target.value; }, 'childSlug')}
                  placeholder="astra-child"
                  spellCheck={false}
                  style={{ borderColor: childSlugBorder }}
                />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>version</label>
                <input className="input gfw-mono" value={ct.child.version} onChange={(e) => commit((p) => (p.child.version = e.target.value), 'version')} placeholder="1.0.0" spellCheck={false} />
              </div>
              <div>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>text domain</label>
                <input className="input gfw-mono" value={ct.child.textDomain} onChange={(e) => commit((p) => (p.child.textDomain = e.target.value), 'td')} placeholder="astra-child" spellCheck={false} />
              </div>
              <div>
                <label className="field-label">author</label>
                <input className="input" value={ct.child.author} onChange={(e) => commit((p) => (p.child.author = e.target.value), 'author')} placeholder="Your name" />
              </div>
              <div>
                <label className="field-label">author URI</label>
                <input className="input" value={ct.child.authorUri} onChange={(e) => commit((p) => (p.child.authorUri = e.target.value), 'authorUri')} placeholder="https://example.com" spellCheck={false} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="field-label">description</label>
              <input className="input" value={ct.child.description} onChange={(e) => commit((p) => (p.child.description = e.target.value), 'desc')} placeholder="Child theme for Astra." />
            </div>
          </div>

          <div className="field-card">
            <div className="field-card-header">
              <div className="field-card-title">Parent stylesheet</div>
              <div className="field-card-desc">never @import</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {ENQUEUE_CHOICES.map(([v, label, help]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => commit((p) => (p.enqueueMode = v))}
                  className="card card-link"
                  style={{ textAlign: 'left', cursor: 'pointer', padding: '10px 12px', borderColor: ct.enqueueMode === v ? 'var(--gfw-accent)' : undefined, background: ct.enqueueMode === v ? 'var(--gfw-accent-tint)' : undefined }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: ct.enqueueMode === v ? 'var(--gfw-accent-strong)' : 'var(--gfw-text-strong)' }}>{label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--gfw-text-muted)', lineHeight: 1.5 }}>{help}</div>
                </button>
              ))}
            </div>
            {ct.enqueueMode === 'handle' && (
              <div style={{ marginTop: 11 }}>
                <label className="field-label gfw-mono" style={{ fontSize: 11 }}>the parent's own style handle</label>
                <input
                  className="input gfw-mono"
                  style={{ maxWidth: 320, borderColor: String(ct.parentHandle || '').trim() ? 'var(--gfw-border)' : '#B91C1C' }}
                  value={ct.parentHandle}
                  onChange={(e) => commit((p) => (p.parentHandle = e.target.value), 'handle')}
                  placeholder="astra-theme-css"
                  spellCheck={false}
                />
                <div className="field-hint" style={{ marginTop: 6 }}>Find it in the parent's functions.php — the first argument of its wp_enqueue_style() call.</div>
              </div>
            )}
          </div>

          <div className="field-card">
            <div className="field-card-title">Include in the theme</div>
            {INCLUDE_TOGGLES.map((tg) => (
              <ToggleRow
                key={tg.key}
                label={tg.label}
                help={tg.help}
                checked={!!ct.options[tg.key]}
                onChange={(v) => commit((p) => { (p.options[tg.key] as boolean) = v; })}
              />
            ))}
          </div>
        </div>
      }
    />
  );
}
