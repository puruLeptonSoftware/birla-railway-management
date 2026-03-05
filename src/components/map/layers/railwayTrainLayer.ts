import { IconLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { RailwayTrain } from "../../../api/railwaysAPI";

const trainIconMapping = {
  // train.svg is 32x32; anchor at center to align exactly on lat/lng.
  train: {
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    anchorX: 16,
    anchorY: 16,
    mask: true,
  },
};

export const trainStatusColors = {
  stabled: {
    rgba: [239, 68, 68, 255] as [number, number, number, number],
    hex: "#ef4444",
  },
  loaded: {
    rgba: [14, 165, 233, 255] as [number, number, number, number],
    hex: "#0ea5e9",
  },
  intransit: {
    rgba: [250, 204, 21, 255] as [number, number, number, number],
    hex: "#facc15",
  },
  unloaded: {
    rgba: [34, 197, 94, 255] as [number, number, number, number],
    hex: "#22c55e",
  },
  default: {
    rgba: [156, 163, 175, 255] as [number, number, number, number],
    hex: "#9ca3af",
  },
};

const normalizeStatusKey = (status: string) => status.trim().toLowerCase();

export const getTrainStatusColor = (
  status: string,
): [number, number, number, number] => {
  const key = normalizeStatusKey(status);
  return (
    trainStatusColors[key as keyof typeof trainStatusColors]?.rgba ??
    trainStatusColors.default.rgba
  );
};

export const getTrainStatusHex = (status: string): string => {
  const key = normalizeStatusKey(status);
  return (
    trainStatusColors[key as keyof typeof trainStatusColors]?.hex ??
    trainStatusColors.default.hex
  );
};

export const createRailwayTrainLayer = (
  trains: RailwayTrain[],
  selectedTrainFrn: number | null = null,
) => [
  new ScatterplotLayer<RailwayTrain>({
    id: "train-icon-halo-white",
    data: trains,
    pickable: false,
    filled: true,
    stroked: false,
    radiusUnits: "pixels",
    getRadius: (d) =>
      selectedTrainFrn !== null && d.fnr === selectedTrainFrn ? 16 : 16,
    getFillColor: () => [255, 255, 255, 232],
    getPosition: (d) => [Number(d.LGTD), Number(d.LTTD), 0],
  }),
  new IconLayer<RailwayTrain>({
    id: "train-icons",
    data: trains,
    pickable: true,
    iconAtlas: "/train.svg",
    iconMapping: trainIconMapping,
    getIcon: () => "train",
    sizeScale: 1,
    getSize: (d) =>
      selectedTrainFrn !== null && d.fnr === selectedTrainFrn ? 29 : 29,
    getColor: (d) => getTrainStatusColor(d.status),
    getPosition: (d) => [Number(d.LGTD), Number(d.LTTD), 0],
    getPixelOffset: () => [0, 0],
    billboard: true,
    alphaCutoff: 0.2,
  }),
];
