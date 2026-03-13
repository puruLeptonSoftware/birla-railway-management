import { PathLayer, IconLayer, ScatterplotLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import type { InTransitTrain, InTransitStop } from "../../../api/railwaysAPI";

const pathStyleExtension = new PathStyleExtension({ dash: true });

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

const getOwnerColors = (
  rakeOwner: string | undefined,
): {
  travelled: [number, number, number, number];
  future: [number, number, number, number];
} => {
  switch (rakeOwner) {
    case "UTCL":
      // Solid #f15bb5, dotted #9d4edd
      return {
        travelled: [241, 91, 181, 255],
        future: [157, 78, 221, 220],
      };
    case "CCR":
      // Light grey solid, #fcd5ce dotted
      return {
        travelled: [211, 211, 211, 255],
        future: [252, 213, 206, 220],
      };
    case "IR":
    default:
      // Default: green solid, yellow dotted
      return {
        travelled: [0, 200, 0, 255],
        future: [255, 215, 0, 220],
      };
  }
};

export const createInTransitPathLayers = (trains: InTransitTrain[]) => {
  const travelledData: {
    fnr: string;
    path: [number, number][];
    rakeOwner?: string;
  }[] = [];
  const futureData: {
    fnr: string;
    path: [number, number][];
    rakeOwner?: string;
  }[] = [];

  for (const train of trains) {
    const stops = train.stops ?? [];
    if (stops.length < 2) continue;

    const rakeOwner = stops[0]?.rakeOwner;

    const coords = stops.map(
      (s) => [Number(s.LGTD), Number(s.LTTD)] as [number, number],
    );
    const lastReached = getLastReachedIndex(stops);

    if (lastReached > 0) {
      travelledData.push({
        fnr: train.fnr,
        path: coords.slice(0, lastReached + 1),
        rakeOwner,
      });
    }

    if (lastReached < 0) {
      futureData.push({ fnr: train.fnr, path: coords, rakeOwner });
    } else if (lastReached < coords.length - 1) {
      futureData.push({
        fnr: train.fnr,
        path: coords.slice(lastReached),
        rakeOwner,
      });
    }
  }

  const travelledLayer = new PathLayer({
    id: "intransit-travelled",
    data: travelledData,
    getPath: (d) => d.path,
    getColor: (d: { rakeOwner?: string }) =>
      getOwnerColors(d.rakeOwner).travelled,
    getWidth: 3,
    widthUnits: "pixels",
    extensions: [pathStyleExtension],
    getDashArray: [1, 0],
    pickable: false,
  });

  const futureLayer = new PathLayer({
    id: "intransit-future",
    data: futureData,
    getPath: (d) => d.path,
    // Dotted color depends on rakeOwner
    getColor: (d: { rakeOwner?: string }) => getOwnerColors(d.rakeOwner).future,
    getWidth: 3,
    widthUnits: "pixels",
    extensions: [pathStyleExtension],
    getDashArray: [6, 4],
    pickable: false,
  });

  return [travelledLayer, futureLayer];
};

type StationPoint = InTransitStop & {
  pointType: "station";
};

export const createStationLayer = (trains: InTransitTrain[]) => {
  const stations: StationPoint[] = [];

  for (const t of trains) {
    const stops = t.stops ?? [];
    if (stops.length === 0) continue;

    const lastReached = getLastReachedIndex(stops);
    const currentIndex = lastReached >= 0 ? lastReached : 0;

    stops.forEach((stop, idx) => {
      // Skip the station where the train icon is currently shown
      if (idx !== currentIndex) {
        stations.push({ ...stop, pointType: "station" });
      }
    });
  }

  return new ScatterplotLayer<StationPoint>({
    id: "intransit-stations",
    data: stations,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    radiusUnits: "pixels",
    radiusMinPixels: 4,
    radiusMaxPixels: 8,
    getRadius: () => 5,
    // Brand cyan #00b4d8 for strong contrast
    getFillColor: [0, 180, 216, 255],
    getLineColor: [15, 23, 42, 255],
    lineWidthUnits: "pixels",
    lineWidthMinPixels: 1,
    pickable: true,
  });
};

const trainIconMapping = {
  train: {
    x: 0,
    y: 0,
    width: 24,
    height: 24,
    anchorX: 12,
    anchorY: 12,
    // Use baked-in SVG colors (no tinting)
    mask: false,
  },
};

const nextArrowIconMapping = {
  arrow: {
    x: 0,
    y: 0,
    width: 24,
    height: 48,
    anchorX: 12,
    anchorY: 46, // align arrow base (y=46) with current lat/long
    mask: true,
  },
};

const prevArrowIconMapping = {
  arrow: {
    x: 0,
    y: 0,
    width: 24,
    height: 48,
    anchorX: 12,
    // Anchor near the bottom of the shape so the base sits on the station
    anchorY: 0,
    mask: true,
  },
};

type TrainMarker = InTransitStop & {
  nextSttnName?: string;
  nextSttn?: string;
  nextLTTD?: number;
  nextLGTD?: number;
  prevSttnName?: string;
  prevSttn?: string;
  prevLTTD?: number;
  prevLGTD?: number;
  pointType: "train";
};

/** Put selected train marker last so it draws on top when co-located. */
const sortSelectedLast = <T extends { fnr?: string }>(
  arr: T[],
  selectedFrn: string | null,
): T[] => {
  if (!selectedFrn || arr.length <= 1) return arr;
  const selected = arr.filter((m) => String(m.fnr ?? "") === selectedFrn);
  const rest = arr.filter((m) => String(m.fnr ?? "") !== selectedFrn);
  return [...rest, ...selected];
};

export const createTrainMarkerLayer = (
  trains: InTransitTrain[],
  fnrsWithNoRelease: Set<string> = new Set(),
  selectedTrainFrn: string | null = null,
) => {
  const markers: TrainMarker[] = [];

  for (const t of trains) {
    const stops = t.stops ?? [];
    if (stops.length === 0) continue;

    const lastReached = getLastReachedIndex(stops);
    const currentIndex = lastReached >= 0 ? lastReached : 0;
    const current = stops[currentIndex];
    const next =
      currentIndex < stops.length - 1 ? stops[currentIndex + 1] : undefined;
    const prev = currentIndex > 0 ? stops[currentIndex - 1] : undefined;

    markers.push({
      ...current,
      nextSttnName: next?.sttnName,
      nextSttn: next?.sttn,
      nextLTTD: next?.LTTD,
      nextLGTD: next?.LGTD,
      prevSttnName: prev?.sttnName,
      prevSttn: prev?.sttn,
      prevLTTD: prev?.LTTD,
      prevLGTD: prev?.LGTD,
      pointType: "train",
    });
  }

  const hasNoRelease = (m: TrainMarker) =>
    fnrsWithNoRelease.has(String(m.fnr ?? ""));

  const noReleaseMarkers = markers.filter(hasNoRelease);
  const restMarkers = markers.filter((m) => !hasNoRelease(m));

  const emptyNoRelease = sortSelectedLast(
    noReleaseMarkers.filter((m) => m.leFlag === "E"),
    selectedTrainFrn,
  );
  const loadedNoRelease = sortSelectedLast(
    noReleaseMarkers.filter((m) => m.leFlag === "L" || !m.leFlag),
    selectedTrainFrn,
  );

  const emptyAR = sortSelectedLast(
    restMarkers.filter((m) => m.leFlag === "E" && m.loadStts === "AR"),
    selectedTrainFrn,
  );
  const emptyST = sortSelectedLast(
    restMarkers.filter((m) => m.leFlag === "E" && m.loadStts === "ST"),
    selectedTrainFrn,
  );
  const emptyOther = sortSelectedLast(
    restMarkers.filter(
      (m) => m.leFlag === "E" && m.loadStts !== "AR" && m.loadStts !== "ST",
    ),
    selectedTrainFrn,
  );

  const loadedAR = sortSelectedLast(
    restMarkers.filter(
      (m) => (m.leFlag === "L" || !m.leFlag) && m.loadStts === "AR",
    ),
    selectedTrainFrn,
  );
  const loadedST = sortSelectedLast(
    restMarkers.filter(
      (m) => (m.leFlag === "L" || !m.leFlag) && m.loadStts === "ST",
    ),
    selectedTrainFrn,
  );
  const loadedOther = sortSelectedLast(
    restMarkers.filter(
      (m) =>
        (m.leFlag === "L" || !m.leFlag) &&
        m.loadStts !== "AR" &&
        m.loadStts !== "ST",
    ),
    selectedTrainFrn,
  );

  const emptyNoReleaseLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-empty-norelease",
    data: emptyNoRelease,
    iconAtlas: "/icon-atlas/train-empty-norelease.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  const loadedNoReleaseLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-loaded-norelease",
    data: loadedNoRelease,
    iconAtlas: "/icon-atlas/train-loaded-norelease.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  const emptyARLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-empty-ar",
    data: emptyAR,
    iconAtlas: "/icon-atlas/train-empty-ar.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  const emptySTLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-empty-st",
    data: emptyST,
    iconAtlas: "/icon-atlas/train-empty-st.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  const emptyDefaultLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-empty-default",
    data: emptyOther,
    iconAtlas: "/icon-atlas/train-empty-default.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  const loadedARLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-loaded-ar",
    data: loadedAR,
    iconAtlas: "/icon-atlas/train-loaded-ar.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  const loadedSTLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-loaded-st",
    data: loadedST,
    iconAtlas: "/icon-atlas/train-loaded-st.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  const loadedDefaultLayer = new IconLayer<TrainMarker>({
    id: "intransit-trains-loaded-default",
    data: loadedOther,
    iconAtlas: "/icon-atlas/train-loaded-default.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 36,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });

  return [
    emptyNoReleaseLayer,
    loadedNoReleaseLayer,
    emptyARLayer,
    emptySTLayer,
    emptyDefaultLayer,
    loadedARLayer,
    loadedSTLayer,
    loadedDefaultLayer,
  ];
};

/** Icon atlas path for a train marker by leFlag, loadStts, and noRelease. */
const getIconAtlasForMarker = (
  m: TrainMarker,
  fnrsWithNoRelease: Set<string>,
): string => {
  const noRelease = fnrsWithNoRelease.has(String(m.fnr ?? ""));
  if (noRelease) {
    return m.leFlag === "E"
      ? "/icon-atlas/train-empty-norelease.svg"
      : "/icon-atlas/train-loaded-norelease.svg";
  }
  if (m.leFlag === "E") {
    if (m.loadStts === "AR") return "/icon-atlas/train-empty-ar.svg";
    if (m.loadStts === "ST") return "/icon-atlas/train-empty-st.svg";
    return "/icon-atlas/train-empty-default.svg";
  }
  if (m.loadStts === "AR") return "/icon-atlas/train-loaded-ar.svg";
  if (m.loadStts === "ST") return "/icon-atlas/train-loaded-st.svg";
  return "/icon-atlas/train-loaded-default.svg";
};

/** Layer that draws only the selected train on top so it's never hidden by others. */
export const createSelectedTrainTopLayer = (
  trains: InTransitTrain[],
  fnrsWithNoRelease: Set<string>,
  selectedTrainFrn: string | null,
): IconLayer<TrainMarker> | null => {
  if (!selectedTrainFrn) return null;

  const train = trains.find((t) => t.fnr === selectedTrainFrn);
  if (!train) return null;

  const stops = train.stops ?? [];
  if (stops.length === 0) return null;

  const lastReached = getLastReachedIndex(stops);
  const currentIndex = lastReached >= 0 ? lastReached : 0;
  const current = stops[currentIndex];
  const next =
    currentIndex < stops.length - 1 ? stops[currentIndex + 1] : undefined;
  const prev = currentIndex > 0 ? stops[currentIndex - 1] : undefined;

  const marker: TrainMarker = {
    ...current,
    nextSttnName: next?.sttnName,
    nextSttn: next?.sttn,
    nextLTTD: next?.LTTD,
    nextLGTD: next?.LGTD,
    prevSttnName: prev?.sttnName,
    prevSttn: prev?.sttn,
    prevLTTD: prev?.LTTD,
    prevLGTD: prev?.LGTD,
    pointType: "train",
  };

  const iconAtlas = getIconAtlasForMarker(marker, fnrsWithNoRelease);

  return new IconLayer<TrainMarker>({
    id: "intransit-trains-selected-on-top",
    data: [marker],
    iconAtlas,
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: () => 46,
    getPosition: (s) => [Number(s.LGTD), Number(s.LTTD), 0],
    getColor: [255, 255, 255, 255],
    billboard: true,
    pickable: true,
  });
};

type RipplePoint = { lng: number; lat: number };

const RIPPLE_RING_OFFSETS = [0, 0.33, 0.66];
const RIPPLE_MIN_RADIUS_PX = 12;
const RIPPLE_MAX_RADIUS_PX = 38;
const RIPPLE_MAX_ALPHA = 180;

/** Circular ripple waves around the selected train; pass pulsePhase 0..1 for animation. */
export const createSelectedTrainRippleLayers = (
  trains: InTransitTrain[],
  selectedTrainFrn: string | null,
  pulsePhase: number,
): ScatterplotLayer<RipplePoint>[] => {
  if (!selectedTrainFrn) return [];

  const train = trains.find((t) => t.fnr === selectedTrainFrn);
  if (!train?.stops?.length) return [];

  const lastReached = getLastReachedIndex(train.stops);
  const currentIndex = lastReached >= 0 ? lastReached : 0;
  const current = train.stops[currentIndex];
  const lng = Number(current.LGTD);
  const lat = Number(current.LTTD);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];

  const point: RipplePoint = { lng, lat };

  return RIPPLE_RING_OFFSETS.map((offset, index) => {
    const ringPhase = (pulsePhase + offset) % 1;
    const radius =
      RIPPLE_MIN_RADIUS_PX +
      ringPhase * (RIPPLE_MAX_RADIUS_PX - RIPPLE_MIN_RADIUS_PX);
    const alpha = Math.max(0, Math.round((1 - ringPhase) * RIPPLE_MAX_ALPHA));

    return new ScatterplotLayer<RipplePoint>({
      id: `intransit-selected-ripple-${index}`,
      data: [point],
      pickable: false,
      stroked: true,
      filled: false,
      radiusUnits: "pixels",
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 2,
      getPosition: (d) => [d.lng, d.lat, 0],
      getRadius: () => radius,
      getLineColor: () => [59, 130, 246, alpha],
    });
  });
};

type NextArrowDatum = {
  current: InTransitStop;
  next: InTransitStop;
};

const computeBearingDegrees = (
  from: InTransitStop,
  to: InTransitStop,
): number => {
  // Approximate direction in lon/lat plane: x = longitude, y = latitude.
  const dx = Number(to.LGTD) - Number(from.LGTD);
  const dy = Number(to.LTTD) - Number(from.LTTD);
  const θ = Math.atan2(dy, dx); // radians, from +x axis counter-clockwise
  return (θ * 180) / Math.PI - 90;
};

const computePrevBearingDegrees = (
  from: InTransitStop,
  to: InTransitStop,
): number => {
  // Approximate direction in lon/lat plane: x = longitude, y = latitude.
  const dx = Number(to.LGTD) - Number(from.LGTD);
  const dy = Number(to.LTTD) - Number(from.LTTD);
  const θ = Math.atan2(dy, dx); // radians, from +x axis counter-clockwise
  return (θ * 180) / Math.PI - 90 - 180;
};

export const createNextStationArrowLayer = (
  trains: InTransitTrain[],
  selectedFrn: string | null,
  isDarkTheme: boolean,
) => {
  if (!selectedFrn) return null;

  const train = trains.find((t) => t.fnr === selectedFrn);
  if (!train) return null;

  const stops = train.stops ?? [];
  if (stops.length < 2) return null;

  const lastReached = getLastReachedIndex(stops);
  const currentIndex = lastReached >= 0 ? lastReached : 0;
  if (currentIndex >= stops.length - 1) return null;

  const current = stops[currentIndex];
  const next = stops[currentIndex + 1];

  const data: NextArrowDatum[] = [{ current, next }];

  return new IconLayer<NextArrowDatum>({
    id: "intransit-next-station-arrow",
    data,
    iconAtlas: "/icon-atlas/next-station-arrow.svg",
    iconMapping: nextArrowIconMapping,
    getIcon: () => "arrow",
    sizeScale: 1,
    getSize: () => 48,
    getPosition: (d) => [Number(d.current.LGTD), Number(d.current.LTTD), 0],
    // Black on light map, #f1faee on dark map
    getColor: isDarkTheme ? [241, 250, 238, 255] : [0, 0, 0, 255],
    getAngle: (d) => computeBearingDegrees(d.current, d.next),
    billboard: true,
    pickable: false,
  });
};

type PrevArrowDatum = {
  current: InTransitStop;
  prev: InTransitStop;
};

export const createPrevStationArrowLayer = (
  trains: InTransitTrain[],
  selectedFrn: string | null,
  isDarkTheme: boolean,
) => {
  if (!selectedFrn) return null;

  const train = trains.find((t) => t.fnr === selectedFrn);
  if (!train) return null;

  const stops = train.stops ?? [];
  if (stops.length < 2) return null;

  const lastReached = getLastReachedIndex(stops);
  const currentIndex = lastReached >= 0 ? lastReached : 0;
  if (currentIndex <= 0) return null;

  const current = stops[currentIndex];
  const prev = stops[currentIndex - 1];

  // If the previous stop does not have a real station code/name,
  // treat this as the start of journey and do not draw a prev arrow.
  if (!prev.sttnName && !prev.sttn) {
    return null;
  }

  const data: PrevArrowDatum[] = [{ current, prev }];

  return new IconLayer<PrevArrowDatum>({
    id: "intransit-prev-station-arrow",
    data,
    iconAtlas: "/icon-atlas/prev-station-arrow.svg",
    iconMapping: prevArrowIconMapping,
    getIcon: () => "arrow",
    sizeScale: 1,
    getSize: () => 64,
    getPosition: (d) => [Number(d.current.LGTD), Number(d.current.LTTD), 0],
    // Black on light map, #f1faee on dark map
    getColor: isDarkTheme ? [241, 250, 238, 255] : [0, 0, 0, 255],
    getAngle: (d) => computePrevBearingDegrees(d.current, d.prev),
    billboard: true,
    pickable: false,
  });
};

export const createInTransitLayers = (
  trains: InTransitTrain[],
  fnrsWithNoRelease: Set<string> = new Set(),
  selectedTrainFrn: string | null = null,
  pulsePhase: number = 0,
) => {
  const pathLayers = createInTransitPathLayers(trains);
  const stationLayer = createStationLayer(trains);
  const trainLayers = createTrainMarkerLayer(
    trains,
    fnrsWithNoRelease,
    selectedTrainFrn,
  );
  const rippleLayers = createSelectedTrainRippleLayers(
    trains,
    selectedTrainFrn,
    pulsePhase,
  );
  const selectedTopLayer = createSelectedTrainTopLayer(
    trains,
    fnrsWithNoRelease,
    selectedTrainFrn,
  );

  return [
    ...pathLayers,
    stationLayer,
    ...trainLayers,
    ...rippleLayers,
    ...(selectedTopLayer ? [selectedTopLayer] : []),
  ];
};
