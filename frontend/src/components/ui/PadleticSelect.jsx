import { Children, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function getOptionItems(children) {
  return Children.toArray(children)
    .filter(Boolean)
    .flatMap((child) => {
      if (!child?.props) return [];
      if (child.type === "option") {
        const rawValue = child.props.value ?? child.props.children ?? "";
        return [{
          value: String(rawValue),
          label: child.props.children,
          disabled: Boolean(child.props.disabled)
        }];
      }
      if (child.type === "optgroup") {
        return getOptionItems(child.props.children);
      }
      return [];
    });
}

export default function PadleticSelect({
  value,
  onChange,
  children,
  disabled = false,
  className = "",
  id,
  name,
  "aria-label": ariaLabel,
  title,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const [android, setAndroid] = useState(false);
  const options = useMemo(() => getOptionItems(children), [children]);
  const stringValue = value == null ? "" : String(value);
  const active = options.find((item) => item.value === stringValue);

  useEffect(() => setAndroid(isAndroidDevice()), []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!android) {
    return (
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={className}
        id={id}
        name={name}
        aria-label={ariaLabel}
        title={title}
        {...rest}
      >
        {children}
      </select>
    );
  }

  const choose = (nextValue) => {
    if (disabled) return;
    onChange?.({
      target: { value: nextValue, name },
      currentTarget: { value: nextValue, name }
    });
    setOpen(false);
  };

  const sheet = open && typeof document !== "undefined" ? createPortal(
    <div className="padletic-select-layer" role="presentation">
      <button
        type="button"
        className="padletic-select-backdrop"
        aria-label="Zamknij listę"
        onClick={() => setOpen(false)}
      />
      <div className="padletic-select-sheet" role="dialog" aria-modal="true" aria-label={ariaLabel || title || "Wybierz opcję"}>
        <div className="padletic-select-sheet-head">
          <div>
            <span>PADLETIC</span>
            <strong>{ariaLabel || title || "Wybierz opcję"}</strong>
          </div>
          <button type="button" className="padletic-select-close" onClick={() => setOpen(false)} aria-label="Zamknij">×</button>
        </div>
        <div className={`padletic-select-options${options.length <= 6 ? " compact" : ""}`} role="listbox">
          {options.map((item, index) => (
            <button
              type="button"
              role="option"
              aria-selected={item.value === stringValue}
              key={`${item.value}-${index}`}
              disabled={item.disabled}
              className={`padletic-select-option${item.value === stringValue ? " active" : ""}`}
              onClick={() => choose(item.value)}
            >
              <span>{item.label}</span>
              <i aria-hidden="true">{item.value === stringValue ? "✓" : ""}</i>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        className={`padletic-select-trigger ${className}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={title}
        onClick={() => setOpen(true)}
      >
        <span>{active?.label ?? "Wybierz"}</span>
        <span className="padletic-select-chevron" aria-hidden="true">⌄</span>
      </button>
      {sheet}
    </>
  );
}
