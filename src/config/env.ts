const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as
  | string
  | undefined;
const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_ID as
  | string
  | undefined;

export const env = {
  googleMapsApiKey: GOOGLE_MAPS_API_KEY?.trim() ?? "",
  googleMapsMapId: GOOGLE_MAPS_MAP_ID?.trim() ?? "",
};

export const isGoogleMapsConfigured = env.googleMapsApiKey.length > 0;

