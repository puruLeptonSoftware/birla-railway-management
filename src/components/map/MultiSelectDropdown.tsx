import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

type MultiSelectDropdownProps = {
  theme: "LIGHT" | "DARK";
  label: string;
  placeholder: string;
  options: string[];
  selectedValues: string[];
  onToggleValue: (value: string) => void;
};

export default function MultiSelectDropdown({
  theme,
  label,
  placeholder,
  options,
  selectedValues,
  onToggleValue,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 190,
  });

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4;
      const viewportBottomPadding = 12;
      const spaceBelow = window.innerHeight - rect.bottom - viewportBottomPadding;
      const maxHeight = Math.max(120, Math.min(220, spaceBelow - gap));

      setMenuPosition({
        top: rect.bottom + gap,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTriggerArea = containerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTriggerArea && !clickedMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const panelBorder =
    theme === "DARK" ? "1px solid rgba(148,163,184,0.35)" : "1px solid #e5e7eb";
  const textColor = theme === "DARK" ? "#e2e8f0" : "#0f172a";

  const summaryText = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length <= 2) return selectedValues.join(", ");
    return `${selectedValues.length} selected`;
  }, [placeholder, selectedValues]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: theme === "DARK" ? "#cbd5e1" : "#334155",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          minHeight: 36,
          borderRadius: 8,
          border: panelBorder,
          background: theme === "DARK" ? "rgba(15, 23, 42, 0.8)" : "#ffffff",
          color: textColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: selectedValues.length > 0 ? 700 : 500,
          textAlign: "left",
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            paddingRight: 10,
          }}
        >
          {summaryText}
        </span>
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={
              theme === "DARK"
                ? "train-panel-scrollbar train-panel-scrollbar-dark"
                : "train-panel-scrollbar"
            }
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              zIndex: 2600,
              borderRadius: 8,
              border: panelBorder,
              background:
                theme === "DARK"
                  ? "rgba(15, 23, 42, 0.97)"
                  : "rgba(248,250,252,0.98)",
              maxHeight: menuPosition.maxHeight,
              overflowY: "auto",
              padding: "6px",
              boxShadow:
                theme === "DARK"
                  ? "0 10px 24px rgba(0,0,0,0.35)"
                  : "0 8px 20px rgba(15,23,42,0.14)",
              display: "grid",
              gap: 2,
            }}
          >
            {options.map((value) => {
              const active = selectedValues.includes(value);
              return (
                <label
                  key={value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 6px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: textColor,
                    background: active
                      ? theme === "DARK"
                        ? "rgba(37,99,235,0.22)"
                        : "rgba(37,99,235,0.1)"
                      : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggleValue(value)}
                    style={{ cursor: "pointer" }}
                  />
                  <span>{value}</span>
                </label>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
