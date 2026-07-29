import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { GeneratorShell } from '../../components/generator/GeneratorShell';
import { CopyableCodePreview } from '../../components/generator/CopyableCodePreview';
import { useEditorState } from '../../lib/useEditorState';
import { Icon } from '../../components/ui/Icon';
import { ListingPreview } from '../../components/readme/ListingPreview';
import { BlockEditor } from '../../components/readme/BlockEditor';
import { FaqEditor } from '../../components/readme/FaqEditor';
import { ScreenshotRow } from '../../components/readme/ScreenshotsEditor';
import { VersionedEntryRow } from '../../components/readme/ChangelogEditor';
import { ChevronDownIcon, CloseIcon } from '../../components/readme/icons';
import { useDragReorder, reorderArray } from '../../lib/dragReorder';
import {
  BLOCK_TYPES,
  SECTION_TITLES,
  applyFixToProject,
  freshProject,
  makeBlock,
  makeTemplateProject,
  migrateLegacyListBlocks,
  parseProjectFile,
  parseReadmeText,
  serializeProjectFile,
  serializeReadme,
  uid,
  validateProject,
  type BlockType,
  type ProjectMeta,
  type ReadmeProject,
} from '../../generators/readmeStudio';

type TemplateKind = 'empty' | 'basic' | 'woocommerce' | 'gutenberg' | 'utility';

const TEMPLATE_OPTIONS: { key: TemplateKind; label: string }[] = [
  { key: 'empty', label: 'Empty' },
  { key: 'basic', label: 'Basic Plugin' },
  { key: 'woocommerce', label: 'WooCommerce Extension' },
  { key: 'gutenberg', label: 'Gutenberg Block Plugin' },
  { key: 'utility', label: 'Utility Plugin' },
];

// Icon shown per block type in the "add element" row — mirrors the source's
// addMenuItems icon map (`{ paragraph, subheading:heading, blockquote:quote,
// code:brace, video:play }`). Lists are authored inside a paragraph's rich text
// (Tiptap), not a separate block type. 'code' is excluded from the add-element
// menu — code blocks are only ever created via readme.txt import, never added
// freeform. 'blockquote' is excluded for now too (not removed from the data model
// or the readme.txt parser — existing/imported blockquote blocks still render and
// edit normally, they just can't be added new from this menu right now).
const BLOCK_TYPE_ICON: Record<BlockType, 'paragraph' | 'heading' | 'quote' | 'brace' | 'play'> = {
  paragraph: 'paragraph', subheading: 'heading', blockquote: 'quote', code: 'brace', video: 'play',
};
const ADDABLE_BLOCK_TYPES = BLOCK_TYPES.filter((t) => t.type !== 'code' && t.type !== 'blockquote');

// "+ Add …" affordances (question / screenshot / version / notice) are a dashed,
// transparent-background button in the source — not the solid `.btn-ghost` used
// for dialog actions elsewhere on this page.
const dashedAddBtnStyle = {
  alignSelf: 'flex-start' as const, fontSize: 12, border: '1px dashed var(--gfw-border-dashed)',
  background: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: 'var(--gfw-text-body)',
};

function moveInArray<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = arr.slice();
  const tmp = copy[index];
  copy[index] = copy[j];
  copy[j] = tmp;
  return copy;
}

export function ReadmeStudio() {
  const { state: project, commit, undo, redo, canUndo, canRedo, savedLabel } = useEditorState<ReadmeProject>('readme-studio-v1', freshProject);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [unparsed, setUnparsed] = useState<string[]>([]);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [contributorsDraft, setContributorsDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');

  useEffect(() => {
    if (!newProjectOpen && !importOpen && !previewExpanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNewProjectOpen(false);
        setImportOpen(false);
        setPreviewExpanded(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [newProjectOpen, importOpen, previewExpanded]);

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const readmeFileInput = useRef<HTMLInputElement | null>(null);
  const jsonFileInput = useRef<HTMLInputElement | null>(null);
  const { bind } = useDragReorder();

  const issues = useMemo(() => validateProject(project), [project]);
  const rawText = useMemo(() => serializeReadme(project), [project]);

  function replaceProject(next: ReadmeProject) {
    commit((draft) => {
      Object.keys(draft).forEach((k) => delete (draft as unknown as Record<string, unknown>)[k]);
      Object.assign(draft, next);
    });
  }

  // One-time migration: projects saved before the standalone "List" block type was
  // removed (lists now live inside a paragraph's rich text) may still have legacy
  // `type: 'list'` blocks in localStorage — fold them into equivalent paragraph text.
  useEffect(() => {
    const migrated = migrateLegacyListBlocks(project);
    if (migrated !== project) replaceProject(migrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function registerRef(id: string) {
    return (el: HTMLElement | null) => {
      fieldRefs.current[id] = el;
    };
  }

  function focusField(targetId: string) {
    const el = fieldRefs.current[targetId];
    if (el) {
      el.focus();
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function handleFix(fixKey: string) {
    const issue = issues.find((i) => i.fixKey === fixKey);
    if (issue) commit((draft) => Object.assign(draft, applyFixToProject(draft, issue)));
  }

  // ── meta ──────────────────────────────────────────────
  function updateMeta<K extends keyof ProjectMeta>(field: K, value: ProjectMeta[K]) {
    commit((p) => {
      p.meta[field] = value;
    });
  }
  function addCustomMeta() {
    commit((p) => p.meta.custom.push({ id: uid('cm'), name: '', value: '' }));
  }
  function updateCustomMeta(id: string, field: 'name' | 'value', value: string) {
    commit((p) => {
      const c = p.meta.custom.find((x) => x.id === id);
      if (c) c[field] = value;
    });
  }
  function removeCustomMeta(id: string) {
    commit((p) => {
      p.meta.custom = p.meta.custom.filter((c) => c.id !== id);
    });
  }
  function addChip(field: 'contributors' | 'tags', raw: string) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    commit((p) => {
      p.meta[field].push(...parts);
    });
  }
  function removeChip(field: 'contributors' | 'tags', index: number) {
    commit((p) => {
      p.meta[field].splice(index, 1);
    });
  }
  function reorderChip(field: 'contributors' | 'tags', from: number, to: number) {
    if (from === to) return;
    commit((p) => {
      p.meta[field] = reorderArray(p.meta[field], from, to);
    });
  }

  // ── sections ──────────────────────────────────────────
  function toggleSectionEnabled(id: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === id);
      if (s && s.kind !== 'description') s.enabled = !s.enabled;
    });
  }
  function toggleCollapse(id: string) {
    setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  }
  function clearSection(id: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === id);
      if (!s) return;
      if (s.kind === 'description' || s.kind === 'installation') s.blocks = [];
      else if (s.kind === 'screenshots') s.screenshots = [];
      else if (s.kind === 'faq') s.faqs = [];
      else if (s.kind === 'changelog') s.versions = [];
      else if (s.kind === 'upgradeNotice') s.notices = [];
    });
  }

  // ── generic blocks (description / installation) ──────
  function addBlock(sectionId: string, type: BlockType) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && (s.kind === 'description' || s.kind === 'installation')) s.blocks.push(makeBlock(type));
    });
  }
  function updateBlockText(sectionId: string, blockId: string, text: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || (s.kind !== 'description' && s.kind !== 'installation')) return;
      const b = s.blocks.find((x) => x.id === blockId);
      if (b && (b.type === 'paragraph' || b.type === 'subheading' || b.type === 'blockquote' || b.type === 'code')) b.data.text = text;
    });
  }
  function updateBlockVideoUrl(sectionId: string, blockId: string, url: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || (s.kind !== 'description' && s.kind !== 'installation')) return;
      const b = s.blocks.find((x) => x.id === blockId);
      if (b && b.type === 'video') b.data.url = url;
    });
  }
  function deleteBlock(sectionId: string, blockId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || (s.kind !== 'description' && s.kind !== 'installation')) return;
      s.blocks = s.blocks.filter((b) => b.id !== blockId);
    });
  }
  function moveBlock(sectionId: string, blockId: string, dir: -1 | 1) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || (s.kind !== 'description' && s.kind !== 'installation')) return;
      const i = s.blocks.findIndex((b) => b.id === blockId);
      if (i === -1) return;
      s.blocks = moveInArray(s.blocks, i, dir);
    });
  }
  function reorderBlock(sectionId: string, from: number, to: number) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || (s.kind !== 'description' && s.kind !== 'installation')) return;
      s.blocks = reorderArray(s.blocks, from, to);
    });
  }
  // ── FAQ ────────────────────────────────────────────────
  function addFAQ(sectionId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'faq') s.faqs.push({ id: uid('faq'), question: '', answer: '' });
    });
  }
  function updateFAQField(sectionId: string, faqId: string, field: 'question' | 'answer', value: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'faq') return;
      const f = s.faqs.find((x) => x.id === faqId);
      if (f) f[field] = value;
    });
  }
  function deleteFAQ(sectionId: string, faqId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'faq') s.faqs = s.faqs.filter((f) => f.id !== faqId);
    });
  }
  function duplicateFAQ(sectionId: string, faqId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'faq') return;
      const idx = s.faqs.findIndex((f) => f.id === faqId);
      if (idx === -1) return;
      s.faqs.splice(idx + 1, 0, { ...s.faqs[idx], id: uid('faq') });
    });
  }
  function moveFAQ(sectionId: string, faqId: string, dir: -1 | 1) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'faq') return;
      const i = s.faqs.findIndex((f) => f.id === faqId);
      if (i === -1) return;
      s.faqs = moveInArray(s.faqs, i, dir);
    });
  }
  function reorderFAQ(sectionId: string, from: number, to: number) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'faq') s.faqs = reorderArray(s.faqs, from, to);
    });
  }

  // ── screenshots ────────────────────────────────────────
  function addScreenshot(sectionId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'screenshots') s.screenshots.push({ id: uid('shot'), description: '', filename: '' });
    });
  }
  function updateScreenshot(sectionId: string, shotId: string, value: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'screenshots') return;
      const sh = s.screenshots.find((x) => x.id === shotId);
      if (sh) sh.description = value;
    });
  }
  function deleteScreenshot(sectionId: string, shotId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'screenshots') s.screenshots = s.screenshots.filter((x) => x.id !== shotId);
    });
  }
  function moveScreenshot(sectionId: string, shotId: string, dir: -1 | 1) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'screenshots') return;
      const i = s.screenshots.findIndex((x) => x.id === shotId);
      if (i === -1) return;
      s.screenshots = moveInArray(s.screenshots, i, dir);
    });
  }
  function reorderScreenshot(sectionId: string, from: number, to: number) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'screenshots') s.screenshots = reorderArray(s.screenshots, from, to);
    });
  }

  // ── changelog ────────────────────────────────────────
  function addVersion(sectionId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'changelog') s.versions.unshift({ id: uid('ver'), version: '', description: '' });
    });
  }
  function newVersionFromPrevious(sectionId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'changelog') return;
      const prev = s.versions[0];
      let nextVersion = '';
      if (prev && /^\d+\.\d+\.\d+$/.test(prev.version)) {
        const parts = prev.version.split('.').map(Number);
        parts[2] += 1;
        nextVersion = parts.join('.');
      }
      s.versions.unshift({ id: uid('ver'), version: nextVersion, description: '' });
    });
  }
  function updateVersionField(sectionId: string, verId: string, field: 'version' | 'description', value: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'changelog') return;
      const v = s.versions.find((x) => x.id === verId);
      if (v) v[field] = value;
    });
  }
  function deleteVersion(sectionId: string, verId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'changelog') s.versions = s.versions.filter((v) => v.id !== verId);
    });
  }
  function moveVersion(sectionId: string, verId: string, dir: -1 | 1) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'changelog') return;
      const i = s.versions.findIndex((v) => v.id === verId);
      if (i === -1) return;
      s.versions = moveInArray(s.versions, i, dir);
    });
  }
  function reorderVersion(sectionId: string, from: number, to: number) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'changelog') s.versions = reorderArray(s.versions, from, to);
    });
  }

  // ── upgrade notices ────────────────────────────────────
  function addNotice(sectionId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'upgradeNotice') s.notices.push({ id: uid('notice'), version: '', description: '' });
    });
  }
  function updateNoticeField(sectionId: string, noticeId: string, field: 'version' | 'description', value: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'upgradeNotice') return;
      const n = s.notices.find((x) => x.id === noticeId);
      if (n) n[field] = value;
    });
  }
  function deleteNotice(sectionId: string, noticeId: string) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'upgradeNotice') s.notices = s.notices.filter((n) => n.id !== noticeId);
    });
  }
  function moveNotice(sectionId: string, noticeId: string, dir: -1 | 1) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (!s || s.kind !== 'upgradeNotice') return;
      const i = s.notices.findIndex((n) => n.id === noticeId);
      if (i === -1) return;
      s.notices = moveInArray(s.notices, i, dir);
    });
  }
  function reorderNotice(sectionId: string, from: number, to: number) {
    commit((p) => {
      const s = p.sections.find((x) => x.id === sectionId);
      if (s && s.kind === 'upgradeNotice') s.notices = reorderArray(s.notices, from, to);
    });
  }

  // ── import / export / templates ─────────────────────────
  function exportProjectJSON() {
    const blob = new Blob([serializeProjectFile(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'readme-studio-project.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function importReadmeText(text: string) {
    const { project: p, unparsed: u } = parseReadmeText(text);
    replaceProject(p);
    setUnparsed(u);
    setImportOpen(false);
    setImportText('');
  }
  function importProjectJSONText(text: string) {
    try {
      replaceProject(parseProjectFile(text));
      setImportOpen(false);
    } catch {
      /* invalid JSON — leave the current project untouched */
    }
  }
  function onReadmeFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => importReadmeText(String(r.result || ''));
    r.readAsText(f);
    e.target.value = '';
  }
  function onJsonFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => importProjectJSONText(String(r.result || ''));
    r.readAsText(f);
    e.target.value = '';
  }
  function applyTemplate(kind: TemplateKind) {
    replaceProject(makeTemplateProject(kind));
    setNewProjectOpen(false);
  }

  const shortDescLen = project.meta.shortDescription.length;

  return (
    <>
    <GeneratorShell
      category="core"
      title="Readme Studio"
      description={
        <>
          Build a <span className="gfw-mono" style={{ fontSize: 12 }}>readme.txt</span> the plugin directory accepts on the first try — with a live listing preview.
        </>
      }
      code={rawText}
      filename="readme.txt"
      language="plain"
      editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: () => setNewProjectOpen(true), savedLabel }}
      issues={issues.map((i) => ({ severity: i.severity, message: i.message, targetId: i.targetId, fix: i.fixKey, fixLabel: i.fixKey ? 'Fix automatically' : undefined }))}
      onFix={handleFix}
      onFocusField={focusField}
      primaryTabLabel="Preview"
      primaryTabContent={
        <div style={{ background: '#F0F0F1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: '#FFF6E5', color: '#8A5B00', fontSize: 11 }}>
            <span>Approximate rendering — WordPress.org may differ slightly.</span>
            <button
              type="button"
              onClick={() => setPreviewExpanded(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1px solid #8A5B00', background: 'none', color: '#8A5B00', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}
            >
              <Icon name="expand" size={11} /> Expand
            </button>
          </div>
          <div style={{ padding: 20 }}>
            <ListingPreview project={project} />
          </div>
        </div>
      }
      secondaryTab={{ label: 'Raw readme.txt', content: <CopyableCodePreview code={rawText} filename="readme.txt" language="plain" /> }}
      extraActions={
        <button type="button" className="gen-toolbar-btn" onClick={() => setImportOpen(true)}>
          Import
        </button>
      }
      form={
        <div>
          {/* Metadata card */}
          <div className="field-card field-card-primary">
            <div className="field-card-title">Plugin metadata</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="rs-name">Plugin name</label>
                <input id="rs-name" ref={registerRef('meta-name')} className="input" value={project.name} onChange={(e) => commit((p) => (p.name = e.target.value))} />
              </div>

              <ChipField
                label="Contributors"
                fieldRef={registerRef('meta-contributors')}
                values={project.meta.contributors}
                draft={contributorsDraft}
                onDraftChange={setContributorsDraft}
                onAdd={(v) => addChip('contributors', v)}
                onRemove={(i) => removeChip('contributors', i)}
                onReorder={(from, to) => reorderChip('contributors', from, to)}
                bind={bind}
                listKey="chip:contributors"
              />
              <ChipField
                label="Tags"
                fieldRef={registerRef('meta-tags')}
                values={project.meta.tags}
                draft={tagsDraft}
                onDraftChange={setTagsDraft}
                onAdd={(v) => addChip('tags', v)}
                onRemove={(i) => removeChip('tags', i)}
                onReorder={(from, to) => reorderChip('tags', from, to)}
                bind={bind}
                listKey="chip:tags"
              />

              <div>
                <label className="field-label" htmlFor="rs-donate">Donate link</label>
                <input id="rs-donate" className="input" value={project.meta.donateLink} onChange={(e) => updateMeta('donateLink', e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="rs-php">Requires PHP</label>
                <input id="rs-php" className="input gfw-mono" value={project.meta.requiresPHP} onChange={(e) => updateMeta('requiresPHP', e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="rs-req">Requires at least</label>
                <input id="rs-req" ref={registerRef('meta-requiresAtLeast')} className="input gfw-mono" value={project.meta.requiresAtLeast} onChange={(e) => updateMeta('requiresAtLeast', e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="rs-tested">Tested up to</label>
                <input id="rs-tested" className="input gfw-mono" value={project.meta.testedUpTo} onChange={(e) => updateMeta('testedUpTo', e.target.value)} />
              </div>

              <div>
                <label className="field-label" htmlFor="rs-stable">Stable tag</label>
                <input id="rs-stable" ref={registerRef('meta-stableTag')} className="input gfw-mono" value={project.meta.stableTag} onChange={(e) => updateMeta('stableTag', e.target.value)} />
              </div>
              <div>
                <label className="field-label" htmlFor="rs-license">License</label>
                <input id="rs-license" ref={registerRef('meta-license')} className="input" value={project.meta.license} onChange={(e) => updateMeta('license', e.target.value)} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="rs-licenseuri">License URI</label>
                <input id="rs-licenseuri" className="input" value={project.meta.licenseURI} onChange={(e) => updateMeta('licenseURI', e.target.value)} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div className="field-label">Custom metadata</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {project.meta.custom.map((cm) => (
                    <div key={cm.id} style={{ display: 'flex', gap: 6 }}>
                      <input className="input" placeholder="Field name" value={cm.name} onChange={(e) => updateCustomMeta(cm.id, 'name', e.target.value)} style={{ width: '38%' }} />
                      <input className="input" placeholder="Value" value={cm.value} onChange={(e) => updateCustomMeta(cm.id, 'value', e.target.value)} style={{ flex: 1 }} />
                      <button
                        type="button"
                        aria-label="Remove custom field"
                        title="Remove custom field"
                        onClick={() => removeCustomMeta(cm.id)}
                        style={{ width: 32, height: 32, border: '1px solid var(--gfw-border)', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCustomMeta}
                    style={{ alignSelf: 'flex-start', fontSize: 12, border: '1px dashed var(--gfw-border-dashed)', background: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: 'var(--gfw-text-body)' }}
                  >
                    + Add custom field
                  </button>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="field-label" htmlFor="rs-shortdesc" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Short description</span>
                  <span className="gfw-mono" style={{ color: shortDescLen > 150 ? '#B45309' : 'var(--gfw-text-mutest)' }}>
                    {shortDescLen}/150
                  </span>
                </label>
                <textarea id="rs-shortdesc" ref={registerRef('meta-shortDescription')} className="textarea" rows={2} value={project.meta.shortDescription} onChange={(e) => updateMeta('shortDescription', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {project.sections.map((section) => {
              const expanded = !collapsed[section.id];
              return (
                <div
                  key={section.id}
                  ref={registerRef(section.id + '-body')}
                  style={{ background: '#fff', border: '1px solid var(--gfw-border)', borderRadius: 8, opacity: section.enabled ? 1 : 0.55 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: expanded ? '1px solid var(--gfw-border)' : 'none' }}>
                    <button
                      type="button"
                      aria-label="Collapse section"
                      title="Collapse section"
                      onClick={() => toggleCollapse(section.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gfw-text-mutest)', display: 'flex', alignItems: 'center', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }}
                    >
                      <ChevronDownIcon />
                    </button>
                    <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{SECTION_TITLES[section.kind]}</div>
                    <button
                      type="button"
                      title="Clear contents"
                      aria-label="Clear section contents"
                      onClick={() => clearSection(section.id)}
                      style={{ width: 32, height: 32, border: '1px solid var(--gfw-border)', background: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      <Icon name="clear" />
                    </button>
                    {section.kind !== 'description' && (
                      <button
                        type="button"
                        aria-label={section.enabled ? 'Disable section' : 'Enable section'}
                        title={section.enabled ? 'Disable section' : 'Enable section'}
                        onClick={() => toggleSectionEnabled(section.id)}
                        style={{ width: 34, height: 18, borderRadius: 10, border: 'none', background: section.enabled ? 'var(--gfw-accent)' : 'var(--gfw-border-dashed)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <span style={{ position: 'absolute', top: 2, left: section.enabled ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .12s' }} />
                      </button>
                    )}
                  </div>

                  {expanded && (
                    <div style={{ padding: 14 }}>
                      {(section.kind === 'description' || section.kind === 'installation') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {section.blocks.map((block, bi) => (
                            <BlockEditor
                              key={block.id}
                              block={block}
                              index={bi}
                              count={section.blocks.length}
                              dragBind={bind(`block:${section.id}`, bi, (from, to) => reorderBlock(section.id, from, to))}
                              onMoveUp={() => moveBlock(section.id, block.id, -1)}
                              onMoveDown={() => moveBlock(section.id, block.id, 1)}
                              onDelete={() => deleteBlock(section.id, block.id)}
                              onChangeText={(text) => updateBlockText(section.id, block.id, text)}
                              onChangeVideoUrl={(url) => updateBlockVideoUrl(section.id, block.id, url)}
                              registerRef={registerRef(block.id + '-text')}
                            />
                          ))}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {ADDABLE_BLOCK_TYPES.map((t) => (
                              <button key={t.type} type="button" className="chip" style={{ fontSize: 11.5, padding: '5px 11px' }} onClick={() => addBlock(section.id, t.type)}>
                                <Icon name={BLOCK_TYPE_ICON[t.type]} size={13} />
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {section.kind === 'faq' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {section.faqs.map((faq, fi) => (
                            <FaqEditor
                              key={faq.id}
                              faq={faq}
                              index={fi}
                              count={section.faqs.length}
                              dragBind={bind(`faq:${section.id}`, fi, (from, to) => reorderFAQ(section.id, from, to))}
                              onChangeQuestion={(v) => updateFAQField(section.id, faq.id, 'question', v)}
                              onChangeAnswer={(v) => updateFAQField(section.id, faq.id, 'answer', v)}
                              onMoveUp={() => moveFAQ(section.id, faq.id, -1)}
                              onMoveDown={() => moveFAQ(section.id, faq.id, 1)}
                              onDuplicate={() => duplicateFAQ(section.id, faq.id)}
                              onDelete={() => deleteFAQ(section.id, faq.id)}
                              registerRef={registerRef(faq.id + '-question')}
                            />
                          ))}
                          <button type="button" style={dashedAddBtnStyle} onClick={() => addFAQ(section.id)}>
                            + Add question
                          </button>
                        </div>
                      )}

                      {section.kind === 'screenshots' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {section.screenshots.map((shot, si) => (
                            <ScreenshotRow
                              key={shot.id}
                              screenshot={shot}
                              number={si + 1}
                              index={si}
                              count={section.screenshots.length}
                              dragBind={bind(`screenshot:${section.id}`, si, (from, to) => reorderScreenshot(section.id, from, to))}
                              onChangeDescription={(v) => updateScreenshot(section.id, shot.id, v)}
                              onMoveUp={() => moveScreenshot(section.id, shot.id, -1)}
                              onMoveDown={() => moveScreenshot(section.id, shot.id, 1)}
                              onDelete={() => deleteScreenshot(section.id, shot.id)}
                              registerRef={registerRef(shot.id + '-desc')}
                            />
                          ))}
                          <button type="button" style={dashedAddBtnStyle} onClick={() => addScreenshot(section.id)}>
                            + Add screenshot
                          </button>
                        </div>
                      )}

                      {section.kind === 'changelog' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {section.versions.map((v, vi) => (
                            <VersionedEntryRow
                              key={v.id}
                              entry={v}
                              index={vi}
                              count={section.versions.length}
                              dragBind={bind(`version:${section.id}`, vi, (from, to) => reorderVersion(section.id, from, to))}
                              onChangeVersion={(val) => updateVersionField(section.id, v.id, 'version', val)}
                              onChangeDescription={(val) => updateVersionField(section.id, v.id, 'description', val)}
                              onMoveUp={() => moveVersion(section.id, v.id, -1)}
                              onMoveDown={() => moveVersion(section.id, v.id, 1)}
                              onDelete={() => deleteVersion(section.id, v.id)}
                              descriptionPlaceholder="Description…"
                              registerVersionRef={registerRef(v.id + '-version')}
                              registerDescriptionRef={registerRef(v.id + '-description')}
                            />
                          ))}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" style={{ ...dashedAddBtnStyle, alignSelf: undefined }} onClick={() => addVersion(section.id)}>
                              + New version
                            </button>
                            <button type="button" style={{ ...dashedAddBtnStyle, alignSelf: undefined }} onClick={() => newVersionFromPrevious(section.id)}>
                              + New version from previous
                            </button>
                          </div>
                        </div>
                      )}

                      {section.kind === 'upgradeNotice' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {section.notices.map((n, ni) => (
                            <VersionedEntryRow
                              key={n.id}
                              entry={n}
                              index={ni}
                              count={section.notices.length}
                              dragBind={bind(`notice:${section.id}`, ni, (from, to) => reorderNotice(section.id, from, to))}
                              onChangeVersion={(val) => updateNoticeField(section.id, n.id, 'version', val)}
                              onChangeDescription={(val) => updateNoticeField(section.id, n.id, 'description', val)}
                              onMoveUp={() => moveNotice(section.id, n.id, -1)}
                              onMoveDown={() => moveNotice(section.id, n.id, 1)}
                              onDelete={() => deleteNotice(section.id, n.id)}
                              descriptionPlaceholder="Notice text…"
                              registerVersionRef={registerRef(n.id + '-version')}
                              registerDescriptionRef={registerRef(n.id + '-description')}
                            />
                          ))}
                          <button type="button" style={dashedAddBtnStyle} onClick={() => addNotice(section.id)}>
                            + Add notice
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      }
    />

    {newProjectOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New project"
        onKeyDown={(e) => e.key === 'Escape' && setNewProjectOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(38,34,28,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      >
        <div style={{ background: '#fff', borderRadius: 10, padding: 22, width: 420, maxWidth: '90vw' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>New project</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TEMPLATE_OPTIONS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTemplate(t.key)}
                className="btn btn-ghost"
                style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: 13, fontWeight: 600, padding: '10px 12px' }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setNewProjectOpen(false)} style={{ marginTop: 16, border: 'none', background: 'none', color: 'var(--gfw-text-mutest)', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    )}

    {importOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import readme"
        onKeyDown={(e) => e.key === 'Escape' && setImportOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(38,34,28,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      >
        <div style={{ background: '#fff', borderRadius: 10, padding: 22, width: 560, maxWidth: '92vw' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Import readme.txt</div>
          <input ref={readmeFileInput} type="file" accept=".txt" onChange={onReadmeFileChange} style={{ fontSize: 12, marginBottom: 10 }} />
          <textarea
            className="textarea gfw-mono"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="…or paste readme.txt contents here"
            rows={8}
            style={{ width: '100%', fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => importText.trim() && importReadmeText(importText)}>
              Import
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportProjectJSON}>
              Export project (.json)
            </button>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              Import project (.json)
              <input ref={jsonFileInput} type="file" accept=".json" onChange={onJsonFileChange} style={{ display: 'none' }} />
            </label>
          </div>
          {unparsed.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--gfw-border)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gfw-text-mutest)', marginBottom: 6 }}>Unparsed content from last import</div>
              <div style={{ maxHeight: 100, overflowY: 'auto', fontFamily: 'var(--gfw-font-mono)', fontSize: 11, background: 'var(--gfw-surface-sunken)', borderRadius: 6, padding: 8, whiteSpace: 'pre-wrap' }}>
                {unparsed.join('\n')}
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {previewExpanded && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Expanded listing preview"
        onKeyDown={(e) => e.key === 'Escape' && setPreviewExpanded(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(38,34,28,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: 30, overflowY: 'auto' }}
      >
        <div style={{ background: '#F0F0F1', borderRadius: 10, maxWidth: 1000, width: '100%', maxHeight: '100%', overflowY: 'auto', position: 'relative' }}>
          <button
            type="button"
            aria-label="Close expanded preview"
            title="Close expanded preview"
            onClick={() => setPreviewExpanded(false)}
            style={{ position: 'sticky', top: 12, left: '100%', transform: 'translateX(-44px)', width: 32, height: 32, borderRadius: 6, border: '1px solid #DCDCDE', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
          >
            <Icon name="close" size={13} />
          </button>
          <div style={{ marginTop: -32, padding: '0 20px 20px' }}>
            <ListingPreview project={project} />
          </div>
        </div>
      </div>
    )}
    </>
  );
}

interface ChipFieldProps {
  label: string;
  values: string[];
  draft: string;
  onDraftChange: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  fieldRef: (el: HTMLElement | null) => void;
  bind: ReturnType<typeof useDragReorder>['bind'];
  listKey: string;
}

function ChipField({ label, values, draft, onDraftChange, onAdd, onRemove, onReorder, fieldRef, bind, listKey }: ChipFieldProps) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div ref={fieldRef as React.Ref<HTMLDivElement>} style={{ border: '1px solid var(--gfw-border)', borderRadius: 6, padding: 6, display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fff' }}>
        {values.map((value, index) => {
          const db = bind(listKey, index, onReorder);
          // A duplicate (case-insensitive) value is flagged in amber, exactly like the
          // source's `chip()` helper — not the drag-over state, which the source doesn't
          // highlight on chips at all.
          const isDuplicate = values.some((v2, j) => j !== index && v2.toLowerCase() === value.toLowerCase());
          return (
            <span
              key={index}
              draggable={db.draggable}
              onDragStart={db.onDragStart}
              onDragOver={db.onDragOver}
              onDrop={db.onDrop}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, borderRadius: 5, padding: '3px 6px', fontSize: 12,
                background: isDuplicate ? '#FFF1E0' : 'var(--gfw-accent-tint)',
                color: isDuplicate ? '#8A5B00' : 'var(--gfw-accent)',
              }}
              className="gfw-mono"
            >
              {value}
              <button type="button" aria-label={`Remove ${value}`} onClick={() => onRemove(index)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}>
                <CloseIcon />
              </button>
            </span>
          );
        })}
        <input
          aria-label={`Add ${label.toLowerCase()}`}
          placeholder="add…"
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(',')) {
              onAdd(v);
              onDraftChange('');
            } else onDraftChange(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (draft.trim()) onAdd(draft);
              onDraftChange('');
            } else if (e.key === 'Backspace' && !draft && values.length) {
              onRemove(values.length - 1);
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              onAdd(draft);
              onDraftChange('');
            }
          }}
          style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 70 }}
        />
      </div>
    </div>
  );
}
