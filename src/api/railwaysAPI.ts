import mockData from "../mock-data/mock-data";
import intransitData from "../mock-data/intransit";
import metaData from "../mock-data/meta-data";
import loadingData from "../mock-data/loading-data";

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Test mode: return mock data for now. Disable when real API is ready.
export const TEST_MODE = true;

export type RailwayTrain = {
  loadId: string;
  sttn: string;
  arvlTime: string;
  dprtTime: string;
  sttnName: string;
  dvsnCode: string;
  zone: string;
  rptdNrptd: string;
  crntFlag: string;
  nodeFlag: string;
  trvdKMS: string;
  r_KMS: string;
  ETA: string;
  status: string;
  plantType: string;
  packType: string;
  commodity: string;
  LTTD: number;
  LGTD: number;
  rakeId: string;
  loadName: string;
  locoName: string;
  exArvlTime: string;
  sqnc: number;
  CREATION_DATE: string;
  fnr: number;
};

export type RailwayTrainTimeline = RailwayTrain[][];

const isTimelineMockData = (data: unknown): data is RailwayTrainTimeline =>
  Array.isArray(data) && data.length > 0 && Array.isArray(data[0]);

export const fetchTrainTimeline = async (
  authToken: string | null = null,
): Promise<RailwayTrainTimeline> => {
  if (TEST_MODE) {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    if (isTimelineMockData(mockData)) {
      return mockData as RailwayTrainTimeline;
    }
    return [mockData as RailwayTrain[]];
  }

  const trains = await fetchTrains(authToken);
  return [trains];
};

export const fetchTrains = async (
  authToken: string | null = null,
): Promise<RailwayTrain[]> => {
  try {
    if (TEST_MODE) {
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      if (isTimelineMockData(mockData)) {
        return (mockData[0] ?? []) as RailwayTrain[];
      }
      return mockData as RailwayTrain[];
    }

    if (!authToken) {
      throw new Error("Authentication required to fetch train data");
    }

    const response = await fetch(`${BASE_URL}/maps/trains`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ currentDate: new Date().toISOString() }),
    });

    if (!response.ok) {
      throw new Error(`Unable to load train data: HTTP ${response.status}`);
    }

    const apiData = (await response.json()) as RailwayTrain[];
    return apiData;
  } catch (error) {
    console.error("Error fetching train data:", error);
    throw error;
  }
};

// --- In-transit mock API (fnr -> station timeline) ---

export type InTransitStop = {
  tranSqnc: number | null;
  sttnSqnc: number | null;
  loadId: string;
  sttn: string;
  arvlTime: string;
  dprtTime: string;
  sttnName: string;
  dvsnCode: string;
  zone: string;
  rptdNrptd: string;
  crntFlag: string;
  nodeFlag: string;
  trvdKMS: number | string;
  r_KMS: number | string;
  ETA: string;
  LTTD: number;
  LGTD: number;
  rakeId: string;
  loadName: string;
  locoName: string;
  exArvlTime: string;
  sqnc: number;
  CREATION_DATE: string;
  fnr: string;
  FNRDate: string;
  metWithDate: string;
  // Optional metadata, enriched from meta-data.ts
  leFlag?: string;
  rakeOwner?: string;
  loadStts?: string;
};

export type InTransitTrain = {
  fnr: string;
  stops: InTransitStop[];
};

// --- Meta-data mock API (fnr -> leFlag / rakeOwner) ---

export type TrainMeta = {
  fnr: string;
  leFlag: string;
  rakeOwner: string;
  loadStts: string;
};

type MetaMap = Record<
  string,
  {
    leFlag: string;
    rakeOwner: string;
    loadStts: string;
  }
>;

const rawMetaMap = metaData as MetaMap;

export const fetchTrainMeta = async (): Promise<MetaMap> => {
  // Mimic API latency
  await new Promise((resolve) => window.setTimeout(resolve, 200));
  return rawMetaMap;
};

// --- Loading data mock API (fnr -> placementTime / arrivalTime / releaseTime) ---

export type LoadingEntry = {
  placementTime: string;
  arrivalTime: string;
  releaseTime: string | null;
};

type LoadingDataMap = Record<string, LoadingEntry>;

const rawLoadingData = loadingData as LoadingDataMap;

/** Fetches loading data (mock). Returns map of fnr -> loading entry. */
export const fetchLoadingData = async (): Promise<LoadingDataMap> => {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return rawLoadingData;
};

/** Returns set of fnr that have no releaseTime (null or undefined). */
export const getFnrWithNoReleaseTime = (
  data: LoadingDataMap,
): Set<string> => {
  const set = new Set<string>();
  for (const [fnr, entry] of Object.entries(data)) {
    if (entry?.releaseTime == null || entry?.releaseTime === "") {
      set.add(fnr);
    }
  }
  return set;
};

const sortStopsBySqnc = (stops: InTransitStop[]): InTransitStop[] =>
  stops.slice().sort((a, b) => a.sqnc - b.sqnc);

export const fetchInTransitTrains = async (): Promise<InTransitTrain[]> => {
  // Mimic API latency for a smoother UX
  await new Promise((resolve) => window.setTimeout(resolve, 300));

  const meta = await fetchTrainMeta();

  return Object.entries(intransitData).map(([fnr, rawStops]) => {
    const stops = sortStopsBySqnc(rawStops as InTransitStop[]);
    const metaForFnr = meta[fnr];

    const enrichedStops =
      metaForFnr != null
        ? stops.map((s) => ({
            ...s,
            leFlag: metaForFnr.leFlag,
            rakeOwner: metaForFnr.rakeOwner,
            loadStts: metaForFnr.loadStts,
          }))
        : stops;

    return { fnr, stops: enrichedStops };
  });
};
