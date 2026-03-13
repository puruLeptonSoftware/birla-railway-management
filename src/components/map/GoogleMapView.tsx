import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { DeckGL } from "@deck.gl/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sun, Moon, Plus, Minus, House } from "lucide-react";
import { env, isGoogleMapsConfigured } from "../../config/env";
import {
  fetchInTransitTrains,
  fetchLoadingData,
  getFnrWithNoReleaseTime,
  type InTransitTrain,
  type InTransitStop,
} from "../../api/railwaysAPI";
import {
  createInTransitLayers,
  createNextStationArrowLayer,
  createPrevStationArrowLayer,
} from "./layers/inTransitLayers";
import ApplicationLoader from "../helpComponents/ApplicationLoader";
import { InTransitTrainsPanel } from "./InTransitTrainsPanel";

const defaultCenter = { longitude: 78.6569, latitude: 22.9734 };
const defaultZoom = 4;
// Google Maps max zoom is ~20; keep train focus at max-1
const maxMapZoom = 20;
const trainFocusZoom = maxMapZoom - 5;
type MapTheme = "LIGHT" | "DARK";

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

      {/* Line legend, beside map controls (bottom-right) */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 112,
          padding: "6px 8px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.96)",
          boxShadow: "0 10px 24px rgba(15,23,42,0.3)",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 1900,
          pointerEvents: "auto",
          maxWidth: 260,
          zoom: 0.9,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <img
            src="/icon-atlas/legend-ir.svg"
            alt="Indian Railways track"
            style={{ width: 52, height: 24 }}
          />
          <span style={{ fontSize: 11, color: "#334155" }}>
            <strong>Indian Railway track</strong>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <img
            src="/icon-atlas/legend-utcl.svg"
            alt="Ultratrack railway track"
            style={{ width: 52, height: 24 }}
          />
          <span style={{ fontSize: 11, color: "#334155" }}>
            <strong>Ultratrack Railway track</strong>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <img
            src="/icon-atlas/legend-ccr.svg"
            alt="Third party railway track"
            style={{ width: 52, height: 24 }}
          />
          <span style={{ fontSize: 11, color: "#334155" }}>
            <strong>Third Party Railway track</strong>
          </span>
        </div>
      </div>
    </>
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
  const [loaderMessage, setLoaderMessage] = useState(
    "Loading in-transit trains...",
  );
  const [theme, setTheme] = useState<MapTheme>("LIGHT");
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: defaultCenter.longitude,
    latitude: defaultCenter.latitude,
    zoom: defaultZoom,
  });
  const [inTransitTrains, setInTransitTrains] = useState<InTransitTrain[]>([]);
  const [fnrsWithNoRelease, setFnrsWithNoRelease] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTrainFrn, setSelectedTrainFrn] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [filterByEmpty, setFilterByEmpty] = useState(true);
  const [filterByLoaded, setFilterByLoaded] = useState(true);
  const viewStateRef = useRef<MapViewState>(viewState);
  const flyAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  const getLastReachedIndex = (stops: InTransitStop[]): number => {
    let last = -1;
    for (let i = 0; i < stops.length; i++) {
      const a = stops[i].arvlTime;
      if (a && a !== "-") last = i;
    }
    return last;
  };

  const trainsForMap = useMemo(() => {
    if (!filterByEmpty && !filterByLoaded) return [];
    return inTransitTrains.filter((train) => {
      const stops = train.stops ?? [];
      if (stops.length === 0) return false;
      const idx = getLastReachedIndex(stops);
      const current = stops[idx >= 0 ? idx : 0];
      const leFlag = current?.leFlag;
      const isEmpty = leFlag === "E";
      const isLoaded = leFlag === "L" || !leFlag;
      return (filterByEmpty && isEmpty) || (filterByLoaded && isLoaded);
    });
  }, [inTransitTrains, filterByEmpty, filterByLoaded]);

  const smoothMoveTo = (
    longitude: number,
    latitude: number,
    zoom: number,
    duration = 1400,
  ) => {
    if (flyAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(flyAnimationFrameRef.current);
    }

    const start = viewStateRef.current;
    const startTime = performance.now();
    // Smoother ease-in-out so zoom feels less "jumpy"
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easeInOutCubic(progress);

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
    setViewState((prev) => ({
      ...prev,
      zoom: Math.min(maxMapZoom, prev.zoom + 1),
    }));
  };

  const zoomOut = () => {
    setViewState((prev) => ({ ...prev, zoom: Math.max(2, prev.zoom - 1) }));
  };

  const hasStartedLoadingRef = useRef(false);
  const hasLoadedDataRef = useRef(false);
  const firstPaintDoneRef = useRef(false);

  useEffect(() => {
    return () => {
      if (flyAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(flyAnimationFrameRef.current);
      }
    };
  }, []);

  // Animate ripple phase when a train is selected (1.2s loop)
  useEffect(() => {
    if (!selectedTrainFrn) return;
    const start = performance.now();
    let rafId: number;
    const animate = (now: number) => {
      setPulsePhase(((now - start) / 1200) % 1);
      rafId = window.requestAnimationFrame(animate);
    };
    rafId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(rafId);
  }, [selectedTrainFrn]);

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
    if (inTransitTrains.length === 0) return [];
    const baseLayers = createInTransitLayers(
      trainsForMap,
      fnrsWithNoRelease,
      selectedTrainFrn,
      pulsePhase,
    );

    // Separate train icon layers so we can always keep them on top.
    const trainLayers = baseLayers.filter(
      (layer: any) =>
        typeof layer?.id === "string" &&
        layer.id.startsWith("intransit-trains"),
    );
    const nonTrainLayers = baseLayers.filter(
      (layer: any) =>
        !(typeof layer?.id === "string") ||
        !layer.id.startsWith("intransit-trains"),
    );

    // Only show direction arrows when sufficiently zoomed in on a train
    const showArrows = viewState.zoom >= trainFocusZoom - 5;

    const nextArrowLayer =
      showArrows &&
      createNextStationArrowLayer(
        trainsForMap,
        selectedTrainFrn,
        theme === "DARK",
      );

    const prevArrowLayer =
      showArrows &&
      createPrevStationArrowLayer(
        trainsForMap,
        selectedTrainFrn,
        theme === "DARK",
      );

    const arrowLayers = [prevArrowLayer, nextArrowLayer].filter(
      Boolean,
    ) as unknown as any[];

    return [...nonTrainLayers, ...arrowLayers, ...trainLayers];
  }, [
    inTransitTrains,
    trainsForMap,
    fnrsWithNoRelease,
    selectedTrainFrn,
    pulsePhase,
    theme,
    viewState.zoom,
  ]);

  useEffect(() => {
    if (!mapLoaded || hasLoadedDataRef.current) {
      return;
    }

    hasLoadedDataRef.current = true;

    const loadData = async () => {
      try {
        setIsDataLoading(true);
        setLoaderMessage("Loading in-transit trains...");

        const [trains, loadingData] = await Promise.all([
          fetchInTransitTrains(),
          fetchLoadingData(),
        ]);
        setInTransitTrains(trains);
        setFnrsWithNoRelease(getFnrWithNoReleaseTime(loadingData));
      } catch (error) {
        console.error("Failed to load in-transit trains:", error);
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
      <APIProvider
        apiKey={env.googleMapsApiKey}
        libraries={["places"]}
        region="IN"
      >
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
            if (!object) {
              setSelectedTrainFrn(null);
              return;
            }

            // Clicking on a train: select it and smoothly zoom in close to max zoom
            if ("fnr" in object) {
              const stop = object as InTransitStop & { fnr: string | number };
              setSelectedTrainFrn(String(stop.fnr));

              if (!("LGTD" in object) || !("LTTD" in object)) return;
              const lng = Number((object as { LGTD: number }).LGTD);
              const lat = Number((object as { LTTD: number }).LTTD);
              if (Number.isFinite(lng) && Number.isFinite(lat)) {
                // Slightly longer duration for a very smooth fly-to on train focus
                smoothMoveTo(lng, lat, trainFocusZoom, 1600);
              }
              return;
            }

            // Clicking on any other point with coordinates: pan/zoom moderately
            if (!("LGTD" in object) || !("LTTD" in object)) return;
            const lng = Number((object as { LGTD: number }).LGTD);
            const lat = Number((object as { LTTD: number }).LTTD);
            if (Number.isFinite(lng) && Number.isFinite(lat)) {
              const targetZoom = Math.max(viewState.zoom, 8.4);
              smoothMoveTo(lng, lat, targetZoom, 800);
            }
          }}
          getTooltip={({ object }) => {
            if (!object) return null;

            // Tooltip for static station points - styled similar to train tooltip but simpler
            if (
              "pointType" in object &&
              (object as any).pointType === "station"
            ) {
              const stop = object as InTransitStop;
              const stationLabel = `${stop.sttnName ?? "-"} (${stop.sttn ?? "-"})`;
              const lat =
                stop.LTTD !== undefined
                  ? `${Number(stop.LTTD).toFixed(4)}°`
                  : "-";
              const lng =
                stop.LGTD !== undefined
                  ? `${Number(stop.LGTD).toFixed(4)}°`
                  : "-";

              return {
                html: `
                  <div style="background:#ffffff;padding:10px 12px;border-radius:12px;min-width:270px;max-width:340px;border:1px solid #e5e7eb;box-shadow:0 12px 28px rgba(15,23,42,0.35);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                      <div style="font-size:13px;font-weight:700;color:#0f172a;">
                        ${stationLabel}
                      </div>
                      <div style="padding:2px 8px;border-radius:999px;background:#f97316;color:#ffffff;font-size:11px;font-weight:600;">
                        ${stop.zone ?? "-"} · ${stop.dvsnCode ?? "-"}
                      </div>
                    </div>
                    <div style="display:flex;justify-content:flex-start;font-size:11px;color:#4b5563;">
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Lat / Long</div>
                        <div style="font-weight:600;color:#111827;">${lat}, ${lng}</div>
                      </div>
                    </div>
                  </div>
                `,
                style: {
                  backgroundColor: "transparent",
                  color: "inherit",
                  fontSize: "11px",
                  borderRadius: "10px",
                  border: "none",
                  boxShadow: "none",
                  padding: "0px",
                  minWidth: "56px",
                  marginLeft: "14px",
                  marginTop: "18px",
                },
                className: "tooltip-hover",
              };
            }

            // Rich tooltip for train (current station) points
            if ("sttnName" in object && "sttn" in object && "fnr" in object) {
              const stop = object as InTransitStop & {
                nextSttnName?: string;
                nextSttn?: string;
                nextLTTD?: number;
                nextLGTD?: number;
                prevSttnName?: string;
                prevSttn?: string;
                prevLTTD?: number;
                prevLGTD?: number;
                loadStts?: string;
              };
              const headerLabel = `${stop.fnr ?? "-"}`;
              const stationLabel = `${stop.sttnName ?? "-"} (${stop.sttn ?? "-"})`;
              const arrival = formatDateTime(stop.arvlTime);
              const departure = formatDateTime(stop.dprtTime);
              const eta = formatDateTime(stop.ETA);
              const hasNextStation = stop.nextSttnName || stop.nextSttn;
              const nextStation = hasNextStation
                ? `${stop.nextSttnName ?? "-"} (${stop.nextSttn ?? "-"})`
                : "";
              const hasPrevStation = stop.prevSttnName || stop.prevSttn;
              const prevStation = hasPrevStation
                ? `${stop.prevSttnName ?? "-"} (${stop.prevSttn ?? "-"})`
                : "-";
              const prevStationLabel = hasPrevStation
                ? prevStation
                : "Starting journey";
              const prevLatLngLabel = hasPrevStation
                ? `${stop.prevLTTD !== undefined ? `${Number(stop.prevLTTD).toFixed(4)}°` : "-"}, ${stop.prevLGTD !== undefined ? `${Number(stop.prevLGTD).toFixed(4)}°` : "-"}`
                : "Starting journey";

              // Status badge: Arrived (green), Stabled (red), Departing (pink), En route (pink)
              const status = !hasNextStation
                ? { label: "Arrived", bg: "#80b918" }
                : stop.loadStts === "ST"
                  ? { label: "Stabled", bg: "#a4133c" }
                  : !hasPrevStation
                    ? { label: "Departing", bg: "#f49cbb" }
                    : { label: "En route", bg: "#f49cbb" };
              const statusBadge = `<span style="padding:2px 8px;border-radius:999px;background:${status.bg};color:#ffffff;font-size:11px;font-weight:600;">${status.label}</span>`;
              const currentLat =
                stop.LTTD !== undefined
                  ? `${Number(stop.LTTD).toFixed(4)}°`
                  : "-";
              const currentLng =
                stop.LGTD !== undefined
                  ? `${Number(stop.LGTD).toFixed(4)}°`
                  : "-";
              const nextLat =
                stop.nextLTTD !== undefined
                  ? `${Number(stop.nextLTTD).toFixed(4)}°`
                  : "-";
              const nextLng =
                stop.nextLGTD !== undefined
                  ? `${Number(stop.nextLGTD).toFixed(4)}°`
                  : "-";

              return {
                html: `
                  <div style="background:#ffffff;padding:10px 12px;border-radius:12px;min-width:270px;max-width:340px;border:1px solid #e5e7eb;box-shadow:0 12px 28px rgba(15,23,42,0.35);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                      <div style="font-size:13px;font-weight:700;color:#0f172a;">
                        ${headerLabel}
                      </div>
                      ${statusBadge}
                    </div>
                    <div style="font-size:11px;color:#9ca3af;margin-bottom:2px;">
                      Station
                    </div>
                    <div style="font-size:12px;font-weight:600;color:#1f2937;margin-bottom:10px;white-space:normal;word-wrap:break-word;">
                      ${stationLabel}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;color:#4b5563;">
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Arrived</div>
                        <div style="font-weight:600;color:#111827;">${arrival}</div>
                      </div>
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Departed</div>
                        <div style="font-weight:600;color:#111827;">${departure}</div>
                      </div>
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">ETA</div>
                        <div style="font-weight:600;color:#111827;">${eta}</div>
                      </div>
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Current lat / long</div>
                        <div style="font-weight:600;color:#111827;">${currentLat}, ${currentLng}</div>
                      </div>
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Prev station</div>
                        <div style="font-weight:600;color:#111827;">${prevStationLabel}</div>
                      </div>
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Prev lat / long</div>
                        <div style="font-weight:600;color:#111827;">${prevLatLngLabel}</div>
                      </div>
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Next station</div>
                        <div style="font-weight:600;color:#111827;">${hasNextStation ? nextStation : "Arrived at destination"}</div>
                      </div>
                      <div>
                        <div style="color:#9ca3af;margin-bottom:1px;">Next lat / long</div>
                        <div style="font-weight:600;color:#111827;">${hasNextStation ? `${nextLat}, ${nextLng}` : "Arrived at destination"}</div>
                      </div>
                    </div>
                  </div>
                `,
                style: {
                  backgroundColor: "transparent",
                  color: "inherit",
                  fontSize: "11px",
                  borderRadius: "10px",
                  border: "none",
                  boxShadow: "none",
                  padding: "0px",
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

        {/* Train legend: bottom right – empty vs loaded, then color coding */}
        <div
          style={{
            position: "absolute",
            bottom: 108,
            right: 12,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.96)",
            // boxShadow: "0 10px 24px rgba(15,23,42,0.3)",
            border: "1px solid #e5e7eb",
            display: "flex",
            flexDirection: "row",
            gap: 16,
            zIndex: 1900,
            pointerEvents: "auto",
            maxWidth: 360,
          }}
        >
          {/* Left: train type – checkboxes for Empty / Loaded */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minWidth: 90,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 2,
              }}
            >
              Train type
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              <input
                type="checkbox"
                checked={filterByEmpty}
                onChange={(e) => setFilterByEmpty(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: "#2563eb" }}
              />
              <img
                src="/icon-atlas/legend-train-empty.svg"
                alt=""
                style={{ width: 28, height: 28 }}
              />
              <span style={{ fontSize: 11, color: "#334155" }}>Empty</span>
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              <input
                type="checkbox"
                checked={filterByLoaded}
                onChange={(e) => setFilterByLoaded(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: "#2563eb" }}
              />
              <img
                src="/icon-atlas/legend-train-loaded.svg"
                alt=""
                style={{ width: 28, height: 28 }}
              />
              <span style={{ fontSize: 11, color: "#334155" }}>Loaded</span>
            </label>
          </div>

          {/* Right: status / load (single column, with separator) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 142,
              paddingLeft: 12,
              borderLeft: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              Status / load
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#80b918",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: "#334155" }}>Arrived</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#a4133c",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: "#334155" }}>Stabled</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#f49cbb",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: "#334155" }}>En route</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#c9a227",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: "#334155" }}>
                  Awaiting departure
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Left-side in-transit trains list */}
        <InTransitTrainsPanel
            trains={inTransitTrains}
            selectedTrainFrn={selectedTrainFrn}
            filterByEmpty={filterByEmpty}
            filterByLoaded={filterByLoaded}
            onSelectTrain={(fnr) => {
              setSelectedTrainFrn(fnr);
              const train = inTransitTrains.find((t) => t.fnr === fnr);
              if (!train) return;
              const stops = train.stops ?? [];
              if (stops.length === 0) return;
              const lastReachedIndex = (() => {
                let last = -1;
                for (let i = 0; i < stops.length; i++) {
                  const a = stops[i].arvlTime;
                  if (a && a !== "-") {
                    last = i;
                  }
                }
                return last;
              })();
              const currentIndex =
                lastReachedIndex >= 0 ? lastReachedIndex : 0;
              const current = stops[currentIndex];
              const lng = Number(current.LGTD);
              const lat = Number(current.LTTD);
              if (Number.isFinite(lng) && Number.isFinite(lat)) {
                smoothMoveTo(lng, lat, trainFocusZoom, 1400);
              }
            }}
            theme={theme}
            fnrsWithNoRelease={fnrsWithNoRelease}
          />
      </APIProvider>

      {(showFirstLoadPreloader || isDataLoading) && (
        <ApplicationLoader theme={theme} message={loaderMessage} />
      )}
    </div>
  );
}
