import { useEffect, useMemo, useState } from "react";
import { List, type RowComponentProps } from "react-window";
import { Search, TrainFront, X } from "lucide-react";
import type { RailwayTrain } from "../../api/railwaysAPI";
import { getTrainStatusHex } from "./layers/railwayTrainLayer";

type RailwayTrainsPanelProps = {
  trains: RailwayTrain[];
  selectedTrainFrn: number | null;
  onSelectTrain: (train: RailwayTrain) => void;
  theme: "LIGHT" | "DARK";
  onClose: () => void;
};

type TrainRowProps = {
  trains: RailwayTrain[];
  loadedCount: number;
  isLoadingMore: boolean;
  selectedTrainFrn: number | null;
  onSelectTrain: (train: RailwayTrain) => void;
  theme: "LIGHT" | "DARK";
};

const rowHeight = 128;
const pageSize = 80;

const formatDateTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const TrainRow = ({
  index,
  style,
  trains,
  loadedCount,
  isLoadingMore,
  selectedTrainFrn,
  onSelectTrain,
  theme,
}: RowComponentProps<TrainRowProps>) => {
  const isSkeleton = index >= loadedCount && isLoadingMore;
  if (isSkeleton) {
    return (
      <div style={{ ...style, padding: "6px 8px" }}>
        <div
          style={{
            width: "100%",
            borderRadius: 10,
            border:
              theme === "DARK"
                ? "1px solid rgba(148,163,184,0.22)"
                : "1px solid #e5e7eb",
            background: theme === "DARK" ? "rgba(15, 23, 42, 0.78)" : "#f8fafc",
            padding: "10px 10px",
          }}
        >
          <div
            style={{
              height: 14,
              width: "48%",
              borderRadius: 6,
              background: theme === "DARK" ? "rgba(148,163,184,0.28)" : "#e2e8f0",
              animation: "app-pulse 1.2s ease-in-out infinite",
            }}
          />
          <div
            style={{
              marginTop: 8,
              height: 12,
              width: "38%",
              borderRadius: 6,
              background: theme === "DARK" ? "rgba(148,163,184,0.22)" : "#e2e8f0",
              animation: "app-pulse 1.2s ease-in-out infinite",
            }}
          />
          <div
            style={{
              marginTop: 8,
              height: 11,
              width: "68%",
              borderRadius: 6,
              background: theme === "DARK" ? "rgba(148,163,184,0.2)" : "#e2e8f0",
              animation: "app-pulse 1.2s ease-in-out infinite",
            }}
          />
          <div
            style={{
              marginTop: 8,
              height: 11,
              width: "58%",
              borderRadius: 6,
              background: theme === "DARK" ? "rgba(148,163,184,0.18)" : "#e2e8f0",
              animation: "app-pulse 1.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    );
  }

  const train = trains[index];
  const isSelected = selectedTrainFrn !== null && selectedTrainFrn === train.fnr;
  const statusColor = getTrainStatusHex(train.status);

  return (
    <div style={{ ...style, padding: "6px 8px" }}>
      <button
        onClick={() => onSelectTrain(train)}
        style={{
          width: "100%",
          borderRadius: 10,
          border: isSelected ? `1px solid ${statusColor}` : "1px solid rgba(148,163,184,0.25)",
          background: isSelected
            ? theme === "DARK"
              ? "rgba(15, 23, 42, 0.95)"
              : "#eef2ff"
            : theme === "DARK"
            ? "rgba(15, 23, 42, 0.82)"
            : "#ffffff",
          color: theme === "DARK" ? "#e2e8f0" : "#0f172a",
          boxShadow: isSelected
            ? "0 8px 24px rgba(15,23,42,0.16)"
            : "0 3px 10px rgba(15,23,42,0.08)",
          textAlign: "left",
          padding: "10px 10px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "9999px",
                background: statusColor,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              FRN: {train.fnr ?? "-"}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: statusColor,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            {train.status || "-"}
          </span>
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 600,
            opacity: 0.95,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Zone: {train.zone || "-"}
        </div>

        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Plant: {train.plantType || "-"} | Pack: {train.packType || "-"}
        </div>
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Commodity: {train.commodity || "-"}
        </div>
        <div
          style={{
            marginTop: 4,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            opacity: 0.9,
            gap: 8,
          }}
        >
          <span>ETA: {formatDateTime(train.ETA)}</span>
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 120,
            }}
          >
            {train.sttnName || "-"}
          </span>
        </div>
      </button>
    </div>
  );
};

export default function RailwayTrainsPanel({
  trains,
  selectedTrainFrn,
  onSelectTrain,
  theme,
  onClose,
}: RailwayTrainsPanelProps) {
  const [search, setSearch] = useState("");
  const [listHeight, setListHeight] = useState(460);
  const [loadedCount, setLoadedCount] = useState(pageSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const updateHeight = () => {
      const next = Math.max(280, window.innerHeight - 210);
      setListHeight(next);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const filteredTrains = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return trains;
    }
    return trains.filter((train) => {
      return (
        (train.loadId || "").toLowerCase().includes(term) ||
        String(train.fnr || "").toLowerCase().includes(term) ||
        (train.sttn || "").toLowerCase().includes(term) ||
        (train.sttnName || "").toLowerCase().includes(term) ||
        (train.rakeId || "").toLowerCase().includes(term) ||
        (train.status || "").toLowerCase().includes(term)
      );
    });
  }, [search, trains]);

  const visibleTrains = useMemo(
    () => filteredTrains.slice(0, loadedCount),
    [filteredTrains, loadedCount],
  );
  const hasMore = loadedCount < filteredTrains.length;
  const rowCount = visibleTrains.length + (isLoadingMore ? 8 : 0);

  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: 12,
        zIndex: 2000,
        width: 340,
        borderRadius: 12,
        border: theme === "DARK" ? "1px solid rgba(148,163,184,0.35)" : "1px solid #e5e7eb",
        background: theme === "DARK" ? "rgba(2, 6, 23, 0.88)" : "rgba(255, 255, 255, 0.97)",
        boxShadow: theme === "DARK" ? "0 12px 28px rgba(0,0,0,0.38)" : "0 10px 26px rgba(15,23,42,0.14)",
        pointerEvents: "auto",
        overflow: "hidden",
        backdropFilter: "blur(3px)",
      }}
    >
      <div style={{ padding: "10px 12px", borderBottom: theme === "DARK" ? "1px solid rgba(148,163,184,0.22)" : "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrainFront size={16} color={theme === "DARK" ? "#e2e8f0" : "#0f172a"} />
            <div style={{ fontSize: 14, fontWeight: 700, color: theme === "DARK" ? "#e2e8f0" : "#0f172a" }}>All Trains</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme === "DARK" ? "#cbd5e1" : "#334155" }}>
              {filteredTrains.length}/{trains.length}
            </div>
            <button
              onClick={onClose}
              title="Close panel"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: theme === "DARK" ? "1px solid rgba(148,163,184,0.35)" : "1px solid #cbd5e1",
                background: theme === "DARK" ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: theme === "DARK" ? "#e2e8f0" : "#0f172a",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div style={{ marginTop: 10, position: "relative" }}>
          <Search
            size={14}
            color={theme === "DARK" ? "#94a3b8" : "#64748b"}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLoadedCount(pageSize);
              setIsLoadingMore(false);
            }}
            placeholder="Search train, station, rake, status"
            style={{
              width: "100%",
              height: 34,
              borderRadius: 8,
              border: theme === "DARK" ? "1px solid rgba(148,163,184,0.35)" : "1px solid #cbd5e1",
              background: theme === "DARK" ? "rgba(15, 23, 42, 0.8)" : "#ffffff",
              color: theme === "DARK" ? "#e2e8f0" : "#0f172a",
              padding: "0 10px 0 30px",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      </div>

      {filteredTrains.length === 0 ? (
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
        <List
          rowCount={rowCount}
          rowHeight={rowHeight}
          className={theme === "DARK" ? "train-panel-scrollbar train-panel-scrollbar-dark" : "train-panel-scrollbar"}
          rowComponent={TrainRow}
          rowProps={{
            trains: visibleTrains,
            loadedCount: visibleTrains.length,
            isLoadingMore,
            selectedTrainFrn,
            onSelectTrain,
            theme,
          }}
          overscanCount={8}
          onRowsRendered={({ stopIndex }) => {
            if (!hasMore || isLoadingMore) return;
            if (stopIndex >= visibleTrains.length - 6) {
              setIsLoadingMore(true);
              window.setTimeout(() => {
                setLoadedCount((prev) =>
                  Math.min(prev + pageSize, filteredTrains.length),
                );
                setIsLoadingMore(false);
              }, 260);
            }
          }}
          style={{
            height: listHeight,
            width: "100%",
            padding: "6px 0",
          }}
        />
      )}
    </div>
  );
}
