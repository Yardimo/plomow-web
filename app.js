const { useState, useEffect } = React;

function App() {
  const [service, setService] = useState("snow");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    // Init Mapbox
    mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN';
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-79.3832, 43.6532], // Toronto
      zoom: 12
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    });

    map.addControl(draw);

    map.on('draw.create', updateQuote);
    map.on('draw.update', updateQuote);
    map.on('draw.delete', () => setQuote(null));

    function updateQuote(e) {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const area = turf.area(data);
        const sqMeters = area.toFixed(2);
        const sqFeet = (area * 10.7639).toFixed(2);
        let pricePerSqFt = service === "snow" ? 0.12 : 0.08;
        let total = (sqFeet * pricePerSqFt).toFixed(2);

        setQuote({
          sqMeters,
          sqFeet,
          total
        });
      } else {
        setQuote(null);
      }
    }
  }, [service]);

  return (
    <div className="app-container">
      <div className="form-card">
        <h2>Book Your Service</h2>

        <label htmlFor="service-type">Service Type</label>
        <select
          id="service-type"
          value={service}
          onChange={e => setService(e.target.value)}
          className="pill"
        >
          <option value="snow">❄ Snow Removal</option>
          <option value="lawn">🌱 Lawn Cutting</option>
          <option value="leaves">🍂 Leaf Cleanup</option>
          <option value="salt">🧂 Salting</option>
        </select>

        <label>Service Address</label>
        <input
          type="text"
          placeholder="Enter your address"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />

        <div id="map" style={{ height: "300px", borderRadius: "12px", overflow: "hidden", marginTop: "12px" }}></div>

        {quote && (
          <div className="quote-box">
            <p><strong>Area:</strong> {quote.sqMeters} m² / {quote.sqFeet} ft²</p>
            <p><strong>Estimated Price:</strong> ${quote.total}</p>
          </div>
        )}

        <button className="primary-btn">
          Request Service
        </button>
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
