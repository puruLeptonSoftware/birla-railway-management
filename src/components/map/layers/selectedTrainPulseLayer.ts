import { ScatterplotLayer } from "@deck.gl/layers";
import type { RailwayTrain } from "../../../api/railwaysAPI";

const ringOffsets = [0, 0.33, 0.66];

export const createSelectedTrainPulseLayers = (
  selectedTrain: RailwayTrain | null,
  pulsePhase: number,
) => {
  if (!selectedTrain) {
    return [];
  }

  return ringOffsets.map((offset, index) => {
    const ringPhase = (pulsePhase + offset) % 1;
    const radius = 16 + ringPhase * 34; // px
    const alpha = Math.max(0, Math.round((1 - ringPhase) * 165));

    return new ScatterplotLayer<RailwayTrain>({
      id: `selected-train-pulse-${index}`,
      data: [selectedTrain],
      pickable: false,
      stroked: true,
      filled: false,
      radiusUnits: "pixels",
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 2,
      getPosition: (d) => [Number(d.LGTD), Number(d.LTTD), 0],
      getRadius: () => radius,
      getLineColor: () => [120, 120, 120, alpha],
    });
  });
};
