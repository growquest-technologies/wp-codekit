/** Bare iOS-style toggle switch (role="switch"), matching the source design exactly. */
export function Toggle({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (checked: boolean) => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => onChange(!checked)}
      className="toggle-switch"
      data-on={checked}
    >
      <span className="toggle-knob" />
    </button>
  );
}

/** Label + help text + Toggle, in the row shape every boolean field in the app uses. */
export function ToggleRow({
  label,
  help,
  checked,
  onChange,
  toggleRef,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Forwarded to the underlying switch button — for validation "jump to field" focus. */
  toggleRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <div className="toggle-row">
      <div className="toggle-row-text">
        <div className="toggle-row-label">{label}</div>
        {help && <div className="toggle-row-help">{help}</div>}
      </div>
      <button
        ref={toggleRef}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={label}
        onClick={() => onChange(!checked)}
        className="toggle-switch"
        data-on={checked}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}
