import { Icon } from '../ui/Icon';

/** Thin wrappers around the shared <Icon> set for the icons Readme Studio's editor
 * chrome needs repeatedly. Kept in one place so every block/faq/screenshot/version
 * row stays visually consistent. */

export function ChevronUpIcon({ size = 16 }: { size?: number }) {
  return <Icon name="chevronUp" size={size} />;
}

export function ChevronDownIcon({ size = 16 }: { size?: number }) {
  return <Icon name="chevronDown" size={size} />;
}

export function TrashIcon({ size = 16 }: { size?: number }) {
  return <Icon name="trash" size={size} />;
}

export function CloseIcon({ size = 13 }: { size?: number }) {
  return <Icon name="close" size={size} />;
}

export function DuplicateIcon({ size = 16 }: { size?: number }) {
  return <Icon name="duplicate" size={size} />;
}
