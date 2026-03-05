import { GoogleMapView } from "./components/map/GoogleMapView";

function App() {
  return (
    <main className="app-shell">
      <section className="map-container">
        <GoogleMapView />
      </section>
    </main>
  );
}

export default App;
