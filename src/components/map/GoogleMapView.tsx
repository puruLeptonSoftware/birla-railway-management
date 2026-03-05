import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { DeckGL } from "@deck.gl/react";
import type { CSSProperties, ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSON } from "geojson";
import {
  Sun,
  Moon,
  Plus,
  Minus,
  House,
  TrainFront,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "react-toastify";
import { env, isGoogleMapsConfigured } from "../../config/env";
import { fetchTrainTimeline, type RailwayTrain } from "../../api/railwaysAPI";
import { createRailwayTrackLayers } from "./layers/railwayTrackLayers";
import {
  createRailwayTrainLayer,
  trainStatusColors,
} from "./layers/railwayTrainLayer";
import { createSelectedTrainPulseLayers } from "./layers/selectedTrainPulseLayer";
import ApplicationLoader from "../helpComponents/ApplicationLoader";
import RailwayTrainsPanel from "./RailwayTrainsPanel";
import TrainFiltersPanel, { type TrainFilterState } from "./TrainFiltersPanel";

const defaultCenter = { longitude: 78.6569, latitude: 22.9734 };
const defaultZoom = 3;
type MapTheme = "LIGHT" | "DARK";
const statusLegendItems = [
  { label: "Stabled", color: trainStatusColors.stabled.hex },
  { label: "Loaded", color: trainStatusColors.loaded.hex },
  { label: "Intransit", color: trainStatusColors.intransit.hex },
  { label: "Unloaded", color: trainStatusColors.unloaded.hex },
];

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const textStyle: CSSProperties = {
  color: "#0f172a",
  fontSize: 14,
  lineHeight: 1.35,
  fontWeight: 500,
  letterSpacing: "0.01em",
};

const errorIcon: ReactElement = (
  <span
    style={{
      width: 18,
      height: 18,
      borderRadius: "9999px",
      background: "#dc2626",
      color: "#ffffff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1,
    }}
  >
    !
  </span>
);
const toastContent = (icon: ReactElement, text: string) => (
  <div style={rowStyle}>
    {icon}
    <span style={textStyle}>{text}</span>
  </div>
);

const formatDateStr = (dateStr: string | undefined) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear().toString().slice(-2);
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day}${month}${year} ${time}`;
};

function MapOverlayControls({
  theme,
  setTheme,
  onHomeView,
  onZoomIn,
  onZoomOut,
}: {
  theme: MapTheme;
  setTheme: (theme: MapTheme) => void;
  onHomeView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 54,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 2000,
          pointerEvents: "auto",
        }}
      >
        <button
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
          }}
          onClick={() => setTheme(theme === "DARK" ? "LIGHT" : "DARK")}
          title="Toggle theme"
        >
          {theme === "DARK" ? (
            <Moon className="text-gray-900" size={20} />
          ) : (
            <Sun className="text-gray-900" size={20} />
          )}
        </button>

        <button
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
          }}
          onClick={onHomeView}
          title="Default view"
        >
          <House className="text-gray-900" size={20} />
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 2000,
          pointerEvents: "auto",
        }}
      >
        <button
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
          }}
          onClick={onZoomIn}
          title="Zoom in"
        >
          <Plus className="text-gray-900" size={20} />
        </button>
        <button
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
          }}
          onClick={onZoomOut}
          title="Zoom out"
        >
          <Minus className="text-gray-900" size={20} />
        </button>
      </div>
    </>
  );
}

function TrainPanelIsland({
  theme,
  isPanelOpen,
  onOpenTrains,
  isFilterPanelOpen,
  onOpenFilters,
}: {
  theme: MapTheme;
  isPanelOpen: boolean;
  onOpenTrains: () => void;
  isFilterPanelOpen: boolean;
  onOpenFilters: () => void;
}) {
  const panelClass =
    theme === "DARK"
      ? "bg-gray-900/95 text-white border-gray-700 shadow-lg"
      : "bg-white text-gray-900 border-gray-200 shadow-xl";

  const selectedText = theme === "DARK" ? "text-blue-400" : "text-blue-600";
  const buttonClass = (selected: boolean) =>
    `flex flex-col items-center justify-center transition-colors px-1.5 pt-0.5 focus:outline-none ${
      selected
        ? selectedText
        : theme === "DARK"
          ? "text-white hover:text-blue-400"
          : "text-gray-900 hover:text-blue-600"
    }`;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[2100] rounded-xl flex px-2.5 py-2 space-x-2.5 items-center border ${panelClass}`}
      style={{ backdropFilter: "blur(6px)", pointerEvents: "auto" }}
    >
      <button
        onClick={onOpenTrains}
        className={buttonClass(isPanelOpen)}
        style={{ cursor: "pointer" }}
      >
        <TrainFront
          size={17}
          className="mb-1"
          color={
            isPanelOpen
              ? theme === "DARK"
                ? "#60a5fa"
                : "#2563eb"
              : theme === "DARK"
                ? "#ffffff"
                : "#111827"
          }
        />
        <span className="text-[0.78rem] font-semibold mt-0.5 tracking-wide">
          All Trains
        </span>
      </button>
      <button
        onClick={onOpenFilters}
        className={buttonClass(isFilterPanelOpen)}
        style={{ cursor: "pointer" }}
      >
        <SlidersHorizontal
          size={17}
          className="mb-1"
          color={
            isFilterPanelOpen
              ? theme === "DARK"
                ? "#60a5fa"
                : "#2563eb"
              : theme === "DARK"
                ? "#ffffff"
                : "#111827"
          }
        />
        <span className="text-[0.78rem] font-semibold mt-0.5 tracking-wide">
          Filters
        </span>
      </button>
    </div>
  );
}

export function GoogleMapView() {
  type MapViewState = {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFirstLoadPreloader, setShowFirstLoadPreloader] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState("Loading railway map...");
  const [theme, setTheme] = useState<MapTheme>("LIGHT");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: defaultCenter.longitude,
    latitude: defaultCenter.latitude,
    zoom: defaultZoom,
  });
  const [tracksGeoJson, setTracksGeoJson] = useState<GeoJSON | null>(null);
  const [trains, setTrains] = useState<RailwayTrain[]>([]);
  const [selectedTrainFrn, setSelectedTrainFrn] = useState<number | null>(null);
  const [panelPulseTrainFrn, setPanelPulseTrainFrn] = useState<number | null>(
    null,
  );
  const [pulsePhase, setPulsePhase] = useState(0);
  const [isTrainPanelOpen, setIsTrainPanelOpen] = useState(true);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [filters, setFilters] = useState<TrainFilterState>({
    zones: [],
    statuses: [],
    packTypes: [],
    commodities: [],
    plantTypes: [],
  });
  const viewStateRef = useRef<MapViewState>(viewState);
  const flyAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  const filteredTrains = useMemo(() => {
    const normalize = (value: string | undefined) =>
      (value || "").trim().toLowerCase();
    const includesFilter = (selected: string[], value: string | undefined) =>
      selected.length === 0 ||
      selected.some((item) => normalize(item) === normalize(value));

    return trains.filter((train) => {
      return (
        includesFilter(filters.zones, train.zone) &&
        includesFilter(filters.statuses, train.status) &&
        includesFilter(filters.packTypes, train.packType) &&
        includesFilter(filters.commodities, train.commodity) &&
        includesFilter(filters.plantTypes, train.plantType)
      );
    });
  }, [trains, filters]);

  const smoothMoveTo = (
    longitude: number,
    latitude: number,
    zoom: number,
    duration = 900,
  ) => {
    if (flyAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(flyAnimationFrameRef.current);
    }

    const start = viewStateRef.current;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(progress);

      setViewState({
        longitude: start.longitude + (longitude - start.longitude) * eased,
        latitude: start.latitude + (latitude - start.latitude) * eased,
        zoom: start.zoom + (zoom - start.zoom) * eased,
      });

      if (progress < 1) {
        flyAnimationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        flyAnimationFrameRef.current = null;
      }
    };

    flyAnimationFrameRef.current = window.requestAnimationFrame(animate);
  };

  const setHomeView = () => {
    smoothMoveTo(
      defaultCenter.longitude,
      defaultCenter.latitude,
      defaultZoom,
      800,
    );
  };

  const zoomIn = () => {
    setViewState((prev) => ({ ...prev, zoom: Math.min(20, prev.zoom + 1) }));
  };

  const zoomOut = () => {
    setViewState((prev) => ({ ...prev, zoom: Math.max(2, prev.zoom - 1) }));
  };

  const hasStartedLoadingRef = useRef(false);
  const hasLoadedDataRef = useRef(false);
  const firstPaintDoneRef = useRef(false);
  const pulseTimerRef = useRef<number | null>(null);
  const timelinePlaybackTimerRef = useRef<number | null>(null);
  const timelineFramesRef = useRef<RailwayTrain[][]>([]);
  const timelineFrameIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      if (flyAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(flyAnimationFrameRef.current);
      }
      if (pulseTimerRef.current !== null) {
        window.clearInterval(pulseTimerRef.current);
      }
      if (timelinePlaybackTimerRef.current !== null) {
        window.clearInterval(timelinePlaybackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (panelPulseTrainFrn === null) {
      if (pulseTimerRef.current !== null) {
        window.clearInterval(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
      setPulsePhase(0);
      return;
    }

    if (pulseTimerRef.current !== null) {
      window.clearInterval(pulseTimerRef.current);
    }
    pulseTimerRef.current = window.setInterval(() => {
      setPulsePhase((prev) => (prev + 0.035) % 1);
    }, 40);

    return () => {
      if (pulseTimerRef.current !== null) {
        window.clearInterval(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, [panelPulseTrainFrn]);

  useEffect(() => {
    if (firstPaintDoneRef.current) {
      return;
    }

    let animationFrameId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      if (!firstPaintDoneRef.current) {
        firstPaintDoneRef.current = true;
        setShowFirstLoadPreloader(false);
      }
    }, 30000);

    const checkGoogleCanvasVisibility = () => {
      if (firstPaintDoneRef.current) {
        return;
      }

      const googleLogo = document.querySelector('img[alt="Google"]');
      if (googleLogo) {
        firstPaintDoneRef.current = true;
        setShowFirstLoadPreloader(false);
        return;
      }

      animationFrameId = window.requestAnimationFrame(
        checkGoogleCanvasVisibility,
      );
    };

    checkGoogleCanvasVisibility();

    return () => {
      window.clearTimeout(timeoutId);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const layers = useMemo(() => {
    const builtLayers = [];
    if (tracksGeoJson) {
      builtLayers.push(...createRailwayTrackLayers(tracksGeoJson));
    }
    const pulseTrain =
      panelPulseTrainFrn !== null
        ? (filteredTrains.find((train) => train.fnr === panelPulseTrainFrn) ??
          null)
        : null;
    if (pulseTrain) {
      builtLayers.push(
        ...createSelectedTrainPulseLayers(pulseTrain, pulsePhase),
      );
    }
    if (filteredTrains.length > 0) {
      builtLayers.push(
        ...createRailwayTrainLayer(filteredTrains, selectedTrainFrn),
      );
    }
    return builtLayers;
  }, [
    tracksGeoJson,
    filteredTrains,
    selectedTrainFrn,
    panelPulseTrainFrn,
    pulsePhase,
  ]);

  useEffect(() => {
    if (
      selectedTrainFrn !== null &&
      !filteredTrains.some((train) => train.fnr === selectedTrainFrn)
    ) {
      setSelectedTrainFrn(null);
      setPanelPulseTrainFrn(null);
    }
  }, [filteredTrains, selectedTrainFrn]);

  useEffect(() => {
    if (!mapLoaded || hasLoadedDataRef.current) {
      return;
    }

    hasLoadedDataRef.current = true;

    const loadData = async () => {
      let trainsLoadingToastId: string | number | null = null;
      try {
        // Phase 1: Map + routes under global fullscreen loader.
        setIsDataLoading(true);
        setLoaderMessage("Loading Railways routes.");
        const trackResponse = await fetch("/Railway Track.json");
        if (!trackResponse.ok) {
          throw new Error(`Track load failed: HTTP ${trackResponse.status}`);
        }
        const trackJson = (await trackResponse.json()) as GeoJSON;
        setTracksGeoJson(trackJson);

        // Routes are ready: hide global loader before train stream starts.
        setIsDataLoading(false);

        // Phase 2: Train layer via toast loading state only.
        trainsLoadingToastId = toast.loading("Loading train positions.", {
          closeButton: false,
        });
        const timelineFrames = await fetchTrainTimeline();
        timelineFramesRef.current = timelineFrames;
        timelineFrameIndexRef.current = 0;
        setTrains(timelineFrames[0] ?? []);

        if (timelinePlaybackTimerRef.current !== null) {
          window.clearInterval(timelinePlaybackTimerRef.current);
          timelinePlaybackTimerRef.current = null;
        }
        if (timelineFrames.length > 1) {
          // Mock websocket stream: push next train array every second.
          timelinePlaybackTimerRef.current = window.setInterval(() => {
            const frames = timelineFramesRef.current;
            if (frames.length === 0) return;
            timelineFrameIndexRef.current =
              (timelineFrameIndexRef.current + 1) % frames.length;
            setTrains(frames[timelineFrameIndexRef.current] ?? []);
          }, 1000);
        }

        if (trainsLoadingToastId !== null) {
          toast.dismiss(trainsLoadingToastId);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (trainsLoadingToastId !== null) {
          toast.dismiss(trainsLoadingToastId);
        }
        toast.error(toastContent(errorIcon, `Failed to load map data: ${message}`), {
          icon: false,
        });
      } finally {
        setIsDataLoading(false);
      }
    };

    void loadData();
  }, [mapLoaded]);

  if (!isGoogleMapsConfigured) {
    return (
      <div className="map-placeholder">
        <h2>Google Maps key missing</h2>
        <p>
          Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code>railway-management/.env</code>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isTrainPanelOpen && (
        <RailwayTrainsPanel
          trains={filteredTrains}
          selectedTrainFrn={selectedTrainFrn}
          onSelectTrain={(train) => {
            setSelectedTrainFrn(train.fnr);
            setPanelPulseTrainFrn(train.fnr);
            smoothMoveTo(Number(train.LGTD), Number(train.LTTD), 8.4, 1000);
          }}
          theme={theme}
          onClose={() => setIsTrainPanelOpen(false)}
        />
      )}
      {isFilterPanelOpen && (
        <TrainFiltersPanel
          theme={theme}
          filters={filters}
          onToggleFilter={(key, value) => {
            setFilters((prev) => {
              const current = prev[key];
              const exists = current.includes(value);
              return {
                ...prev,
                [key]: exists
                  ? current.filter((item) => item !== value)
                  : [...current, value],
              };
            });
          }}
          onClearFilters={() =>
            setFilters({
              zones: [],
              statuses: [],
              packTypes: [],
              commodities: [],
              plantTypes: [],
            })
          }
          onClose={() => setIsFilterPanelOpen(false)}
        />
      )}
      <TrainPanelIsland
        theme={theme}
        isPanelOpen={isTrainPanelOpen}
        onOpenTrains={() => setIsTrainPanelOpen((prev) => !prev)}
        isFilterPanelOpen={isFilterPanelOpen}
        onOpenFilters={() => setIsFilterPanelOpen((prev) => !prev)}
      />
      <APIProvider apiKey={env.googleMapsApiKey} libraries={["places"]} region="IN">
        <DeckGL
          viewState={viewState}
          controller={true}
          layers={layers}
          onViewStateChange={({ viewState: nextViewState }) => {
            const next = nextViewState as {
              longitude: number;
              latitude: number;
              zoom: number;
            };
            setViewState({
              longitude: Number(next.longitude),
              latitude: Number(next.latitude),
              zoom: Number(next.zoom),
            });
          }}
          onClick={({ object }) => {
            if (object && "fnr" in object) {
              const train = object as RailwayTrain;
              setSelectedTrainFrn(train.fnr);
              setPanelPulseTrainFrn(null);
              smoothMoveTo(Number(train.LGTD), Number(train.LTTD), 8.4, 900);
            }
          }}
          getTooltip={({ object }) => {
            if (!object) return null;

            if ("properties" in object) {
              const category = String(
                (object as { properties?: { Category?: string } }).properties
                  ?.Category ?? "Unknown",
              );
              return {
                html: `
                  <div style="background:#ffffff;padding:4px 6px;border-radius:6px;min-width:96px;">
                    <div style="color:#1e293b;font-size:11px;font-weight:600;">Railway Track</div>
                    <div style="color:#374151;font-size:10px;margin-top:2px;">${category}</div>
                  </div>
                `,
                style: {
                  backgroundColor: "#ffffff",
                  color: "inherit",
                  fontSize: "9px",
                  borderRadius: "6px",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "none",
                  padding: "6px",
                  minWidth: "56px",
                  marginLeft: "14px",
                  marginTop: "18px",
                },
                className: "tooltip-hover",
              };
            }

            if ("loadId" in object) {
              const train = object as RailwayTrain;
              return {
                html: `
                  <div style="background:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-width:190px;max-width:240px;">
                    <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb;">
                      <div style="font-size:14px;font-weight:700;color:#1f2937;margin-bottom:4px;">FRN: ${train.fnr ?? "-"}</div>
                      <div style="font-size:11px;color:#4b5563;">${train.sttnName} (${train.sttn})</div>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <span style="font-size:10px;color:#374151;">Zone</span>
                      <span style="font-size:10px;font-weight:700;color:#111827;">${train.zone || "-"}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <span style="font-size:10px;color:#374151;">Plant Type</span>
                      <span style="font-size:10px;font-weight:600;color:#111827;">${train.plantType || "-"}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <span style="font-size:10px;color:#374151;">Pack Type</span>
                      <span style="font-size:10px;font-weight:600;color:#111827;">${train.packType || "-"}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <span style="font-size:10px;color:#374151;">Commodity Type</span>
                      <span style="font-size:10px;font-weight:600;color:#111827;">${train.commodity || "-"}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                      <span style="font-size:10px;color:#374151;">ETA</span>
                      <span style="font-size:10px;font-weight:600;color:#111827;">${formatDateStr(train.ETA)}</span>
                    </div>
                  </div>
                `,
                style: {
                  backgroundColor: "#ffffff",
                  color: "inherit",
                  fontSize: "10px",
                  borderRadius: "6px",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "none",
                  padding: "6px",
                  minWidth: "56px",
                  marginLeft: "14px",
                  marginTop: "18px",
                },
                className: "tooltip-hover",
              };
            }

            return null;
          }}
          getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
        >
          <Map
            mapId={env.googleMapsMapId || undefined}
            colorScheme={theme}
            gestureHandling="greedy"
            disableDefaultUI={true}
            onTilesLoaded={() => {
              if (hasStartedLoadingRef.current) {
                return;
              }
              hasStartedLoadingRef.current = true;
              setMapLoaded(true);
            }}
          />
        </DeckGL>
        <MapOverlayControls
          theme={theme}
          setTheme={setTheme}
          onHomeView={setHomeView}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />
      </APIProvider>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 102,
          zIndex: 2000,
          pointerEvents: "none",
          borderRadius: 6,
          padding: "4px 8px",
          border:
            theme === "DARK"
              ? "1px solid rgba(255,255,255,0.3)"
              : "1px solid #e5e7eb",
          background:
            theme === "DARK"
              ? "rgba(17, 24, 39, 0.9)"
              : "rgba(255,255,255,0.96)",
          color: theme === "DARK" ? "#ffffff" : "#111827",
          boxShadow:
            theme === "DARK"
              ? "0 8px 18px rgba(0,0,0,0.35)"
              : "0 4px 12px rgba(0,0,0,0.12)",
          minWidth: 124,
          minHeight: 64,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {statusLegendItems.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.3,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "9999px",
                background: item.color,
                display: "inline-block",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
              }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {(showFirstLoadPreloader || isDataLoading) && (
        <ApplicationLoader theme={theme} message={loaderMessage} />
      )}
    </div>
  );
}
