import { Icon } from './Icon';

/**
 * A multi-select pill with a small checkbox square + checkmark inside (Supports,
 * Taxonomies, and similar "pick any number of these" fields). Distinct from a plain
 * `.chip` (used for single-select/radio-style pills like output modes or sort order),
 * which has no inner checkbox.
 */
export function CheckboxChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={active} onClick={onClick} className={`chip chip-checkbox${active ? ' is-active' : ''}`}>
      <span className="chip-checkbox-box">{active && <Icon name="check" size={9} style={{ color: '#fff' }} />}</span>
      {children}
    </button>
  );
}
