import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DEFAULT_OPTIONS = Array.from({ length: 36 }, (_, index) => {
  const total = 6 * 60 + index * 30;
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
});

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const touchMac = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  return /Android|iPhone|iPad|iPod/i.test(ua) || touchMac ||
    (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches && window.innerWidth <= 900);
}

export default function PadleticTimePicker({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  placeholder = "Wybierz godzinę",
  allowEmpty = false,
  emptyLabel = "Dowolna",
  ariaLabel = "Wybierz godzinę",
  className = ""
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const rootRef = useRef(null);
  const normalized = useMemo(() => options.map((item) =>
    typeof item === "string" ? { value: item, label: item } : item
  ), [options]);
  const active = normalized.find((item) => String(item.value) === String(value ?? ""));

  useEffect(() => setMobile(isMobileDevice()), []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previous = document.body.style.overflow;
    if (mobile) document.body.style.overflow = "hidden";
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    const outside = (event) => {
      if (!mobile && rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, mobile]);

  const choose = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  const optionsUi = (
    <div className={`padletic-picker-options${normalized.length > 12 ? " time-grid" : ""}`} role="listbox">
      {allowEmpty && (
        <button type="button" role="option" aria-selected={!value} className={!value ? "active" : ""} onClick={() => choose("")}>
          <span>{emptyLabel}</span><i>{!value ? "✓" : ""}</i>
        </button>
      )}
      {normalized.map((item, index) => {
        const selected = String(item.value) === String(value ?? "");
        return (
          <button key={`${item.value}-${index}`} type="button" role="option" aria-selected={selected} disabled={item.disabled}
            className={selected ? "active" : ""} onClick={() => choose(item.value)}>
            <span>{item.label}</span><i>{selected ? "✓" : ""}</i>
          </button>
        );
      })}
    </div>
  );

  const mobileSheet = open && mobile && typeof document !== "undefined" ? createPortal(
    <div className="padletic-picker-layer">
      <button type="button" className="padletic-picker-backdrop" aria-label="Zamknij" onClick={() => setOpen(false)} />
      <section className="padletic-picker-sheet" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <header><div><small>PADLETIC</small><strong>{ariaLabel}</strong></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
        {optionsUi}
      </section>
    </div>, document.body
  ) : null;

  return (
    <div ref={rootRef} className={`padletic-time-picker ${className}`.trim()}>
      <button type="button" className="padletic-picker-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={!value ? "is-placeholder" : ""}>{active?.label ?? (allowEmpty && !value ? emptyLabel : placeholder)}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {mobileSheet}
      {open && !mobile && <div className="padletic-picker-popover">{optionsUi}</div>}
    </div>
  );
}
