import { X } from "lucide-react";
import MultiSelectDropdown from "./MultiSelectDropdown";

export type TrainFilterState = {
  zones: string[];
  statuses: string[];
  packTypes: string[];
  commodities: string[];
  plantTypes: string[];
};

type TrainFiltersPanelProps = {
  theme: "LIGHT" | "DARK";
  filters: TrainFilterState;
  onToggleFilter: (key: keyof TrainFilterState, value: string) => void;
  onClearFilters: () => void;
  onClose: () => void;
};

const zoneOptions = [
  "North A",
  "North B",
  "Central",
  "Gujarat",
  "Mumbai",
  "East A",
  "East B",
  "ROM",
  "South",
];

const statusOptions = ["Loaded", "Intransit", "Unloaded", "Stabled"];
const packTypeOptions = ["Bag", "Bulk"];
const commodityOptions = ["Bag Cement", "Bulk Cement", "Clinker", "Fly Ash"];
const plantTypeOptions = ["IU", "GU", "BT"];

export default function TrainFiltersPanel({
  theme,
  filters,
  onToggleFilter,
  onClearFilters,
  onClose,
}: TrainFiltersPanelProps) {
  const panelBg =
    theme === "DARK" ? "rgba(2, 6, 23, 0.9)" : "rgba(255,255,255,0.97)";
  const panelBorder =
    theme === "DARK" ? "1px solid rgba(148,163,184,0.35)" : "1px solid #e5e7eb";
  const textColor = theme === "DARK" ? "#e2e8f0" : "#0f172a";

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        right: 12,
        zIndex: 2000,
        width: 318,
        maxHeight: "calc(100% - 28px)",
        borderRadius: 12,
        border: panelBorder,
        background: panelBg,
        boxShadow:
          theme === "DARK"
            ? "0 12px 28px rgba(0,0,0,0.38)"
            : "0 10px 26px rgba(15,23,42,0.14)",
        backdropFilter: "blur(3px)",
        display: "flex",
        flexDirection: "column",
        // overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          borderBottom:
            theme === "DARK"
              ? "1px solid rgba(148,163,184,0.22)"
              : "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>
          Train Filters
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onClearFilters}
            style={{
              borderRadius: 6,
              border: panelBorder,
              background: "transparent",
              color: textColor,
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: panelBorder,
              background: "transparent",
              color: textColor,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div
        className={
          theme === "DARK"
            ? "train-panel-scrollbar train-panel-scrollbar-dark"
            : "train-panel-scrollbar"
        }
        style={{ overflowY: "auto", padding: "12px", display: "grid", gap: 12 }}
      >
        <MultiSelectDropdown
          theme={theme}
          label="Zone"
          placeholder="Select Zone"
          options={zoneOptions}
          selectedValues={filters.zones}
          onToggleValue={(value) => onToggleFilter("zones", value)}
        />
        <MultiSelectDropdown
          theme={theme}
          label="Status"
          placeholder="Select Status"
          options={statusOptions}
          selectedValues={filters.statuses}
          onToggleValue={(value) => onToggleFilter("statuses", value)}
        />
        <MultiSelectDropdown
          theme={theme}
          label="Pack Type"
          placeholder="Select Pack Type"
          options={packTypeOptions}
          selectedValues={filters.packTypes}
          onToggleValue={(value) => onToggleFilter("packTypes", value)}
        />
        <MultiSelectDropdown
          theme={theme}
          label="Commodity"
          placeholder="Select Commodity"
          options={commodityOptions}
          selectedValues={filters.commodities}
          onToggleValue={(value) => onToggleFilter("commodities", value)}
        />
        <MultiSelectDropdown
          theme={theme}
          label="Plant Type"
          placeholder="Select Plant Type"
          options={plantTypeOptions}
          selectedValues={filters.plantTypes}
          onToggleValue={(value) => onToggleFilter("plantTypes", value)}
        />
      </div>
    </div>
  );
}
