import { Link } from 'react-router-dom';
import { TOOLS } from '../data/tools';

const ABOUT_SECTIONS = [
  {
    label: 'The idea',
    title: 'A generator should teach you the API',
    body: 'Every field is labelled with the argument it maps to, so the form doubles as documentation. You leave knowing which key does what — not just holding a snippet you are afraid to edit.',
    points: [
      'Argument names shown beside every input',
      'Defaults match WordPress core defaults, not our opinions',
      'Links to the developer handbook on every generated function',
    ],
  },
  {
    label: 'How it works',
    title: 'Entirely in your browser',
    body: 'There is no account, no server-side rendering and no telemetry on your inputs. The generators are JavaScript; your plugin details never leave the tab.',
    points: [
      'Nothing uploaded, nothing stored remotely',
      'Work persists locally so a refresh does not lose it',
      'Works offline once the page has loaded',
    ],
  },
  {
    label: 'Output',
    title: 'Three ways out',
    body: 'A snippet is fine for a functions.php tweak. A file is better for a plugin. A scaffold is what you want when the generator is the start of something real.',
    points: [
      'Copy to clipboard, formatted to WordPress coding standards',
      'Download a single .php or .txt file',
      'Zip-ready plugin scaffold with header, folders and bootstrap',
    ],
  },
];

export function About() {
  const stats = [
    { label: 'Generators', value: String(TOOLS.length) },
    { label: 'Accounts required', value: '0' },
    { label: 'Data sent to us', value: 'None' },
  ];

  return (
    <div className="gfw-container" style={{ padding: '60px 28px 90px', display: 'flex', flexWrap: 'wrap', gap: 'clamp(34px,4vw,64px)' }}>
      <div style={{ flex: '1 1 420px', minWidth: 0 }}>
        <h1 style={{ fontSize: 'clamp(30px,3.8vw,40px)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--gfw-text-strong)', marginBottom: 18, maxWidth: 600, lineHeight: 1.08 }}>
          Generators that show you what you're building.
        </h1>
        <p style={{ fontSize: 'clamp(16px,1.55vw,18px)', lineHeight: 1.6, color: 'var(--gfw-text-muted)', maxWidth: 620, marginBottom: 40 }}>
          Most WordPress code generators are a form and a text area. You fill in twenty fields, get a wall of PHP, paste it into your plugin, reload the admin and find out whether you guessed right. We think that's backwards.
        </p>

        {ABOUT_SECTIONS.map((ab) => (
          <div key={ab.label} style={{ borderTop: '1px solid var(--gfw-border)', padding: '28px 0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 28px' }}>
              <h2 style={{ flex: '0 0 150px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gfw-text-mutest)', paddingTop: 4 }}>
                {ab.label}
              </h2>
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <h3 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.018em', color: 'var(--gfw-text-strong)', marginBottom: 11 }}>{ab.title}</h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--gfw-text-muted)', marginBottom: 14 }}>{ab.body}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {ab.points.map((pt) => (
                    <li key={pt} style={{ display: 'flex', gap: 10, fontSize: 14.5, lineHeight: 1.55, color: 'var(--gfw-text-body)' }}>
                      <span style={{ color: 'var(--gfw-accent)', fontWeight: 700, flexShrink: 0 }}>—</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside style={{ flex: '0 1 300px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="gfw-eyebrow" style={{ marginBottom: 16 }}>By the numbers</div>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: '11px 0', borderBottom: '1px solid var(--gfw-border-muted)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 13.5, color: 'var(--gfw-text-muted)' }}>{s.label}</span>
              <span style={{ fontFamily: 'var(--gfw-font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--gfw-text-strong)' }}>{s.value}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--gfw-dark)', borderRadius: 12, padding: 22, color: 'var(--gfw-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gfw-dark-text-muted)', marginBottom: 12 }}>
            Missing a generator?
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gfw-dark-code)', marginBottom: 18 }}>
            The build order is set by what people ask for. Send us the function you keep writing by hand.
          </p>
          <Link to="/contact" className="btn btn-primary btn-sm">Request a generator</Link>
        </div>
      </aside>
    </div>
  );
}
