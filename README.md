# Railway Management

Initial baseline project for railway UI development.

## Current Scope

- Render Google Map successfully.
- Reuse the same environment variable names used in `infosys-flight-management`:
  - `VITE_GOOGLE_MAPS_API_KEY`
  - `VITE_GOOGLE_MAPS_ID`

## Setup

1. Copy `.env.example` to `.env`.
2. Add your existing keys from the `infosys-flight-management` setup.
3. Run:

```bash
npm install
npm run dev
```

## Project Structure

- `src/components/map/GoogleMapView.tsx`: Map rendering component.
- `src/config/env.ts`: Centralized environment variable access.
- `src/App.tsx`: Shell layout and map placement.
