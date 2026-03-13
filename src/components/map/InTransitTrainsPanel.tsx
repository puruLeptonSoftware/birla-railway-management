import { useMemo, useState } from "react";
import { Search, TrainFront } from "lucide-react";
import type { InTransitTrain, InTransitStop } from "../../api/railwaysAPI";

type MapTheme = "LIGHT" | "DARK";

type InTransitTrainsPanelProps = {
  trains: InTransitTrain[];
  selectedTrainFrn: string | null;
  onSelectTrain: (fnr: string) => void;
  focusedFnr: string | null;
  onToggleFocus: (fnr: string) => void;
  theme: MapTheme;
  fnrsWithNoRelease: Set<string>;
  filterByEmpty: boolean;
  filterByLoaded: boolean;
};

const getLastReachedIndex = (stops: InTransitStop[]): number => {
  let last = -1;
  for (let i = 0; i < stops.length; i++) {
    const a = stops[i].arvlTime;
    if (a && a !== "-") {
      last = i;
    }
  }
  return last;
};

const formatDateTime = (value?: string) => {
  if (!value || value === "-") return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type TrainSummary = {
  fnr: string;
  fromLabel: string;
  toLabel: string;
  currentStation: string;
  eta: string;
  statusLabel: string;
  statusColor: string;
  leFlag: "E" | "L";
};

const buildSummary = (
  train: InTransitTrain,
  fnrsWithNoRelease: Set<string>,
): TrainSummary | null => {
  const stops = train.stops ?? [];
  if (stops.length === 0) return null;

  const first = stops[0];
  const last = stops[stops.length - 1];

  const lastReached = getLastReachedIndex(stops);
  const currentIndex = lastReached >= 0 ? lastReached : 0;
  const current = stops[currentIndex];

  const hasNext = currentIndex < stops.length - 1;
  const hasPrev = currentIndex > 0;
  const isNoRelease = fnrsWithNoRelease.has(train.fnr);
  const loadStts = current.loadStts;

  let statusLabel = "En route";
  let statusColor = "#f49cbb";

  if (isNoRelease) {
    statusLabel = "Awaiting departure";
    statusColor = "#c9a227";
  } else if (!hasNext) {
    statusLabel = "Arrived";
    statusColor = "#80b918";
  } else if (loadStts === "ST") {
    statusLabel = "Stabled";
    statusColor = "#a4133c";
  } else if (!hasPrev) {
    statusLabel = "Departing";
    statusColor = "#f49cbb";
  }

  // Use compact station codes in the list to avoid overflow
  const fromCode = first.sttn ?? "-";
  const toCode = last.sttn ?? "-";
  const currentCode = current.sttn ?? "-";
  const leFlag = current.leFlag === "E" ? "E" : "L";

  return {
    fnr: train.fnr,
    fromLabel: fromCode,
    toLabel: toCode,
    currentStation: currentCode,
    eta: formatDateTime(current.ETA),
    statusLabel,
    statusColor,
    leFlag,
  };
};

export function InTransitTrainsPanel({
  trains,
  selectedTrainFrn,
  onSelectTrain,
  focusedFnr,
  onToggleFocus,
  theme,
  fnrsWithNoRelease,
  filterByEmpty,
  filterByLoaded,
}: InTransitTrainsPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ARRIVED" | "STABLED" | "EN_ROUTE" | "AWAITING"
  >("ALL");

  const summaries = useMemo(() => {
    return trains
      .map((t) => buildSummary(t, fnrsWithNoRelease))
      .filter((t): t is TrainSummary => t !== null);
  }, [trains, fnrsWithNoRelease]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const bySearch = summaries.filter((t) => {
      if (!term) return true;
      return (
        t.fnr.toLowerCase().includes(term) ||
        t.fromLabel.toLowerCase().includes(term) ||
        t.toLabel.toLowerCase().includes(term) ||
        t.currentStation.toLowerCase().includes(term) ||
        t.statusLabel.toLowerCase().includes(term)
      );
    });

    const byStatus = bySearch.filter((t) => {
      switch (statusFilter) {
        case "ARRIVED":
          return t.statusLabel === "Arrived";
        case "STABLED":
          return t.statusLabel === "Stabled";
        case "EN_ROUTE":
          return t.statusLabel === "En route" || t.statusLabel === "Departing";
        case "AWAITING":
          return t.statusLabel === "Awaiting departure";
        case "ALL":
        default:
          return true;
      }
    });

    return byStatus.filter((t) => {
      if (!filterByEmpty && !filterByLoaded) return false;
      return (
        (filterByEmpty && t.leFlag === "E") ||
        (filterByLoaded && t.leFlag === "L")
      );
    });
  }, [summaries, search, statusFilter, filterByEmpty, filterByLoaded]);

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        bottom: 14,
        left: 12,
        zIndex: 2000,
        width: 360,
        borderRadius: 12,
        border:
          theme === "DARK"
            ? "1px solid rgba(148,163,184,0.35)"
            : "1px solid #e5e7eb",
        background:
          theme === "DARK"
            ? "rgba(2, 6, 23, 0.9)"
            : "rgba(255, 255, 255, 0.97)",
        boxShadow:
          theme === "DARK"
            ? "0 12px 28px rgba(0,0,0,0.40)"
            : "0 10px 26px rgba(15,23,42,0.16)",
        pointerEvents: "auto",
        overflow: "hidden",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        zoom: 0.88,
      }}
    >
      <div
        style={{
          padding: "10px 12px 6px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrainFront
              size={16}
              color={theme === "DARK" ? "#e2e8f0" : "#0f172a"}
            />
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: theme === "DARK" ? "#e2e8f0" : "#0f172a",
              }}
            >
              In-transit trains
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: theme === "DARK" ? "#38bdf8" : "#2563eb",
              }}
            >
              {filtered.length}/{summaries.length}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 6, position: "relative" }}>
          <Search
            size={14}
            color={theme === "DARK" ? "#94a3b8" : "#64748b"}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="Search by FNR, station or status"
            style={{
              width: "100%",
              height: 34,
              borderRadius: 8,
              border:
                theme === "DARK"
                  ? "1px solid rgba(148,163,184,0.35)"
                  : "1px solid #cbd5e1",
              background:
                theme === "DARK" ? "rgba(15, 23, 42, 0.85)" : "#ffffff",
              color: theme === "DARK" ? "#e2e8f0" : "#0f172a",
              padding: "0 10px 0 30px",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        {/* Status filter pills */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {[
            { id: "ALL", label: "All", color: "#e5e7eb" },
            { id: "ARRIVED", label: "Arrived", color: "#80b918" },
            { id: "STABLED", label: "Stabled", color: "#a4133c" },
            { id: "EN_ROUTE", label: "En route", color: "#f49cbb" },
            { id: "AWAITING", label: "Awaiting dep.", color: "#c9a227" },
          ].map((pill) => {
            const active = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id as typeof statusFilter)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: active
                    ? "1px solid transparent"
                    : theme === "DARK"
                      ? "1px solid rgba(148,163,184,0.4)"
                      : "1px solid #e5e7eb",
                  background: active
                    ? pill.id === "ALL"
                      ? "#e5e7eb"
                      : pill.color
                    : theme === "DARK"
                      ? "rgba(15,23,42,0.85)"
                      : "#ffffff",
                  color: active
                    ? pill.id === "ALL"
                      ? "#111827"
                      : "#ffffff"
                    : theme === "DARK"
                      ? "#e5e7eb"
                      : "#111827",
                  fontSize: 11,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={
          theme === "DARK"
            ? "train-panel-scrollbar train-panel-scrollbar-dark"
            : "train-panel-scrollbar"
        }
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 8px 10px 8px",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              height: 220,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              fontWeight: 600,
              color: theme === "DARK" ? "#94a3b8" : "#64748b",
            }}
          >
            No trains found
          </div>
        ) : (
          filtered.map((t) => {
            const isSelected = selectedTrainFrn === t.fnr;
            const isFocused = focusedFnr === t.fnr;
            return (
              <button
                key={t.fnr}
                onClick={() => onSelectTrain(t.fnr)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 10,
                  border: isSelected
                    ? "1px solid #3b82f6"
                    : theme === "DARK"
                      ? "1px solid rgba(148,163,184,0.35)"
                      : "1px solid #e5e7eb",
                  background: isSelected
                    ? theme === "DARK"
                      ? "rgba(15,23,42,0.95)"
                      : "#eff6ff"
                    : theme === "DARK"
                      ? "rgba(15,23,42,0.9)"
                      : "#ffffff",
                  padding: "8px 10px",
                  marginBottom: 6,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: theme === "DARK" ? "#e5e7eb" : "#111827",
                      letterSpacing: 0.1,
                    }}
                  >
                    {t.fnr}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: t.statusColor,
                        color: "#ffffff",
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "none",
                      }}
                    >
                      {t.statusLabel}
                    </div>
                    <button
                      tabIndex={-1}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleFocus(t.fnr);
                      }}
                      title={
                        isFocused
                          ? "Show all trains"
                          : "Focus this train on map"
                      }
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        border: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        background: "transparent",
                        color: isFocused
                          ? "#dc2626"
                          : theme === "DARK"
                            ? "#64748b"
                            : "#94a3b8",
                        padding: 0,
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        strokeWidth="10"
                      >
                        <path
                          fill="currentColor"
                          strokeWidth="10"
                          d="M3 9a1 1 0 0 0 1-1V5a1 1 0 0 1 1-1h3a1 1 0 0 0 0-2H5a3 3 0 0 0-3 3v3a1 1 0 0 0 1 1m5 11H5a1 1 0 0 1-1-1v-3a1 1 0 0 0-2 0v3a3 3 0 0 0 3 3h3a1 1 0 0 0 0-2m9-7a1 1 0 0 0 0-2h-1.14A4 4 0 0 0 13 8.14V7a1 1 0 0 0-2 0v1.14A4 4 0 0 0 8.14 11H7a1 1 0 0 0 0 2h1.14A4 4 0 0 0 11 15.86V17a1 1 0 0 0 2 0v-1.14A4 4 0 0 0 15.86 13Zm-5 1a2 2 0 1 1 2-2a2 2 0 0 1-2 2m9 1a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 0 0 2h3a3 3 0 0 0 3-3v-3a1 1 0 0 0-1-1M19 2h-3a1 1 0 0 0 0 2h3a1 1 0 0 1 1 1v3a1 1 0 0 0 2 0V5a3 3 0 0 0-3-3"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    columnGap: 10,
                    rowGap: 2,
                    fontSize: 11,
                    color: theme === "DARK" ? "#cbd5e1" : "#4b5563",
                  }}
                >
                  <div>
                    <div style={{ color: "#9ca3af", marginBottom: 1 }}>
                      From
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: theme === "DARK" ? "#e5e7eb" : "#111827",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {t.fromLabel}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", marginBottom: 1 }}>To</div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: theme === "DARK" ? "#e5e7eb" : "#111827",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {t.toLabel}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", marginBottom: 1 }}>
                      Current station
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: theme === "DARK" ? "#e5e7eb" : "#111827",
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {t.currentStation}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#9ca3af", marginBottom: 1 }}>ETA</div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: theme === "DARK" ? "#e5e7eb" : "#111827",
                      }}
                    >
                      {t.eta}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
