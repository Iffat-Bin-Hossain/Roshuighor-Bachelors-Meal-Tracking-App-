import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface MenuItem {
  category: string;
  name: string;
}

const keyOf = (i: MenuItem) => `${i.category}:${i.name.toLowerCase()}`;

/**
 * Multi-select dropdown with options grouped by category.
 * The panel opens in normal document flow (not absolutely positioned) so it never gets
 * clipped inside a scrolling modal or bottom sheet on small phones.
 */
export function MultiSelect(props: {
  id: string;
  options: MenuItem[];
  value: MenuItem[];
  onChange: (v: MenuItem[]) => void;
  categories: { key: string; label: string }[];
  placeholder: string;
  searchPlaceholder: string;
  noMatchesLabel: string;
  clearLabel: string;
  selectedLabel: (n: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const selected = useMemo(() => new Set(props.value.map(keyOf)), [props.value]);
  const catLabel = (k: string) => props.categories.find((c) => c.key === k)?.label || k;

  const toggle = (item: MenuItem) => {
    const k = keyOf(item);
    props.onChange(selected.has(k) ? props.value.filter((v) => keyOf(v) !== k) : [...props.value, item]);
  };

  const needle = q.trim().toLowerCase();
  const groups = props.categories
    .map((c) => ({
      ...c,
      items: props.options.filter((o) => o.category === c.key && (!needle || o.name.toLowerCase().includes(needle)))
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="ms" ref={rootRef}>
      <button
        type="button"
        id={props.id}
        className={`ms-trigger ${open ? 'open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {props.value.length === 0 ? (
          <span className="ms-placeholder">{props.placeholder}</span>
        ) : (
          <span className="ms-chips">
            {props.value.map((v) => (
              <span key={keyOf(v)} className={`chip chip-${v.category}`}>
                {v.name}
                <span
                  role="button"
                  tabIndex={-1}
                  className="chip-x"
                  aria-label={`${v.name} ✕`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                >
                  <X size={12} />
                </span>
              </span>
            ))}
          </span>
        )}
        <ChevronDown size={16} className="ms-caret" />
      </button>

      {open && (
        <div className="ms-panel" role="listbox" aria-multiselectable="true">
          <div className="ms-search">
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={props.searchPlaceholder} autoFocus />
          </div>
          <div className="ms-list">
            {groups.length === 0 && <p className="ms-empty">{props.noMatchesLabel}</p>}
            {groups.map((g) => (
              <div key={g.key} className="ms-group">
                <p className={`ms-group-title cat-text-${g.key}`}>{g.label}</p>
                {g.items.map((item) => {
                  const on = selected.has(keyOf(item));
                  return (
                    <button
                      type="button"
                      key={keyOf(item)}
                      role="option"
                      aria-selected={on}
                      className={`ms-option ${on ? 'on' : ''}`}
                      onClick={() => toggle(item)}
                    >
                      <span className="ms-check">{on && <Check size={13} />}</span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="ms-foot">
            <span>{props.selectedLabel(props.value.length)}</span>
            {props.value.length > 0 && (
              <button type="button" className="link-btn" onClick={() => props.onChange([])}>
                {props.clearLabel}
              </button>
            )}
          </div>
        </div>
      )}
      {/* catLabel kept for screen readers on chips */}
      <span className="sr-only">{props.value.map((v) => `${catLabel(v.category)}: ${v.name}`).join(', ')}</span>
    </div>
  );
}
