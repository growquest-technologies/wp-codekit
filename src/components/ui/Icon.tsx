import type { ComponentType, CSSProperties, SVGProps } from 'react';
import {
  MagnifyingGlassIcon,
  ArrowRightIcon,
  CheckIcon,
  StarIcon,
  EyeIcon,
  InformationCircleIcon,
  XMarkIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  CodeBracketIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  DocumentIcon,
  ArrowsPointingOutIcon,
  PlayIcon,
  Bars3BottomLeftIcon,
  H1Icon,
  ListBulletIcon,
  NumberedListIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';

export type IconName =
  | 'search'
  | 'arrowRight'
  | 'check'
  | 'star'
  | 'preview'
  | 'info'
  | 'close'
  | 'clear'
  | 'chevronDown'
  | 'chevronUp'
  | 'arrowUp'
  | 'arrowDown'
  | 'shuffle'
  | 'plus'
  | 'trash'
  | 'dragHandle'
  | 'duplicate'
  | 'code'
  | 'link'
  | 'warning'
  | 'error'
  | 'undo'
  | 'redo'
  | 'file'
  | 'expand'
  | 'play'
  | 'paragraph'
  | 'heading'
  | 'bulleted'
  | 'numbered'
  | 'quote'
  | 'brace';

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Heroicons (24/outline) component per icon name. Replaces the earlier Lineicons
 * webfont — that font's own codepoints for `bulleted`/`numbered` (copied verbatim
 * from the design source's own lookup table) turned out to resolve to unrelated
 * glyphs (`lni-align-text-left` / `lni-badge-number`) once cross-checked against
 * the complete Lineicons icon-name-to-codepoint map, and that build of Lineicons
 * has no true bulleted/numbered-list glyph at all. Heroicons has real
 * `ListBulletIcon`/`NumberedListIcon`, so it replaced Lineicons everywhere rather
 * than mixing two icon systems.
 */
const ICONS: Record<IconName, HeroIcon> = {
  search: MagnifyingGlassIcon,
  arrowRight: ArrowRightIcon,
  check: CheckIcon,
  star: StarIcon,
  preview: EyeIcon,
  info: InformationCircleIcon,
  close: XMarkIcon,
  clear: XCircleIcon,
  chevronDown: ChevronDownIcon,
  chevronUp: ChevronUpIcon,
  arrowUp: ArrowUpIcon,
  arrowDown: ArrowDownIcon,
  shuffle: ArrowPathIcon,
  plus: PlusIcon,
  trash: TrashIcon,
  dragHandle: EllipsisVerticalIcon,
  duplicate: DocumentDuplicateIcon,
  code: CodeBracketIcon,
  link: LinkIcon,
  warning: ExclamationTriangleIcon,
  error: ExclamationCircleIcon,
  undo: ArrowUturnLeftIcon,
  redo: ArrowUturnRightIcon,
  file: DocumentIcon,
  expand: ArrowsPointingOutIcon,
  play: PlayIcon,
  paragraph: Bars3BottomLeftIcon,
  heading: H1Icon,
  bulleted: ListBulletIcon,
  numbered: NumberedListIcon,
  quote: ChatBubbleBottomCenterTextIcon,
  brace: CodeBracketIcon,
};

export function Icon({ name, size = 15, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  const Component = ICONS[name];
  return <Component aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, color: 'currentColor', ...style }} strokeWidth={2} />;
}

/** Name lookup so call sites can write `GLYPH.search` etc. instead of string literals. */
export const GLYPH = {
  search: 'search',
  arrowRight: 'arrowRight',
  check: 'check',
  star: 'star',
  preview: 'preview',
  info: 'info',
  close: 'close',
  clear: 'clear',
  chevronDown: 'chevronDown',
  chevronUp: 'chevronUp',
  plus: 'plus',
  trash: 'trash',
  drag: 'dragHandle',
  dragHandle: 'dragHandle',
  duplicate: 'duplicate',
  code: 'code',
  link: 'link',
  warning: 'warning',
  error: 'error',
  undo: 'undo',
  redo: 'redo',
  file: 'file',
  expand: 'expand',
  play: 'play',
} as const satisfies Record<string, IconName>;
