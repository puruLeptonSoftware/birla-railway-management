import { GeoJsonLayer } from "@deck.gl/layers";
import type { GeoJSON } from "geojson";

const trackColorByCategory: Record<string, [number, number, number, number]> = {
  "Broad Gauge": [37, 99, 235, 242],
  "Meter Gauge": [124, 58, 237, 242],
  "Narrow Gauge": [234, 88, 12, 242],
};

export const createRailwayTrackLayers = (tracksGeoJson: GeoJSON) => {
  return [
    new GeoJsonLayer({
      id: "railway-tracks-base",
      data: tracksGeoJson,
      stroked: true,
      filled: false,
      lineWidthMinPixels: 4.2,
      getLineColor: [15, 23, 42, 72],
      pickable: false,
    }),
    new GeoJsonLayer({
      id: "railway-tracks-main",
      data: tracksGeoJson,
      stroked: true,
      filled: false,
      lineWidthMinPixels: 2.4,
      getLineColor: (feature) => {
        const category = (feature as { properties?: { Category?: string } }).properties
          ?.Category;
        return trackColorByCategory[category ?? ""] ?? [14, 165, 233, 242];
      },
      pickable: false,
    }),
  ];
};

