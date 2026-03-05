import mockData from "../mock-data/mock-data";

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
