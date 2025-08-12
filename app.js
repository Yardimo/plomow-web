const { useState, useEffect } = React;

function currency(n){ return `$${Number(n||0).toFixed(2)}` }

function App(){
  const [service, setService] = useState('snow');
  const [address, setAddress] = useState('');
  const [quote, setQuote] = useState(null);
  const [map, setMap] = useState(null);
  const [draw, setDraw] = useState(null);

  // Map init
  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZW5vcnJpcyIsImEiOiJjbWU0eXIyMHQwb3NlMm1wcHNkYXRwYzYxIn0.HrNdh-cFPgqR4SSYgkdHTw';
    const m = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-79.3832, 43.6532],
      zoom: 12,
      attributionControl: false
    });
    m.addControl(new mapboxgl.AttributionControl({ compact:true }));
    m.addControl(new mapboxgl.NavigationControl({ visualizePitch:true }));

    const d = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
      styles: [
        { id:'draw-p-fill',   type:'fill', filter:['all',['==','$type','Polygon'],['!=','mode','static']], paint:{ 'fill-color':'#0054A4','fill-opacity':0.22 }},
        { id:'draw-p-stroke', type:'line', filter:['all',['==','$type','Polygon'],['!=','mode','static']], paint:{ 'line-color':'#0054A4','line-width':2 }},
        { id:'draw-line',     type:'line', filter:['all',['==','$type','LineString'],['!=','mode','static']], paint:{ 'line-color':'#0054A4','line-width':2 }}
      ]
    });
    m.addControl(d);
    setMap(m); setDraw(d);

    const update = () => {
      const data = d.getAll();
      if(!data || data.features.length === 0){ setQuote(null); return; }

      const f = data.features[0];
      let areaM2=0, edgeM=0;
      if (f.geometry.type === 'Polygon') {
        areaM2 = turf.area(f);
        edgeM = turf.length(turf.polygonToLine(f), { units:'meters' });
      } else if (f.geometry.type === 'LineString') {
        edgeM = turf.length(f, { units:'meters' });
      }
      const areaFt2 = areaM2 * 10.7639, edgeFt = edgeM * 3.28084;

      const cfg = { snow:{base:25,perM2:0.02,perM:0.30}, lawn:{base:20,perM2:0.015,perM:0}, leaves:{base:15,perM2:0.012,perM:0}, salt:{base:10,perM2:0.008,perM:0.10} }[service];
      const price = Math.max(cfg.base + cfg.perM2*areaM2 + cfg.perM*edgeM, cfg.base);

      setQuote({ areaM2:Math.round(areaM2), areaFt2:Math.round(areaFt2), edgeM:Math.round(edgeM), edgeFt:Math.round(edgeFt), price:Number(price.toFixed(2)) });
    };

    m.on('draw.create', update);
    m.on('draw.update', update);
    m.on('draw.selectionchange', update);

    return () => m.remove();
  }, [service]);

  // Live color swap for snow/lawn
  useEffect(() => {
    const color = service === 'lawn' ? '#2E9E4D' : '#0054A4';
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-color-dark', color);
    if (map) {
      try {
        map.setPaintProperty('draw-p-fill','fill-color',color);
        map.setPaintProperty('draw-p-stroke','line-color',color);
        map.setPaintProperty('draw-line','line-color',color);
      } catch(e){}
    }
  }, [service, map]);

  // UI actions
  const startPolygon = () => draw?.changeMode('draw_polygon');
  const startLine    = () => draw?.changeMode('draw_line_string');
  const finish       = () => draw?.changeMode('simple_select');
  const clearAll     = () => {
    if (!draw) return;
    const ids = draw.getAll().features.map(f=>f.id);
    ids.forEach(id=>draw.delete(id));
    setQuote(null);
  };
  const saveJob = () => {
    const data = draw?.getAll();
    if(!data || data.features.length===0) return alert('Draw an area or edge first.');
    const KEY='plomow_jobs_v1';
    const list = JSON.parse(localStorage.getItem(KEY)||'[]');
    list.unshift({ id:Math.random().toString(36).slice(2)+Date.now().toString(36), createdAt:new Date().toISOString(), service, address, ...quote, geometry:data });
    localStorage.setItem(KEY, JSON.stringify(list));
    clearAll(); setAddress(''); alert('Request sent! Check Contractor Console.');
  };

  return (
    <div className="form-card">
      <div className="row">
        <select id="service-type" value={service} onChange={e=>setService(e.target.value)}>
          <option value="snow">❄ Snow Removal</option>
          <option value="lawn">🌱 Lawn Cutting</option>
          <option value="leaves">🍂 Leaf Cleanup</option>
          <option value="salt">🧂 Salting</option>
        </select>
        <input placeholder="Address (optional)" value={address} onChange={e=>setAddress(e.target.value)} />
      </div>

      <div className="row controls" style={{marginTop:8}}>
        <button onClick={startPolygon}>+ Add Area</button>
        <button onClick={startLine}>+ Add Edge</button>
        <button onClick={finish}>Finish</button>
        <button onClick={clearAll}>Clear</button>
        <button className="primary" onClick={saveJob} disabled={!quote}>Request</button>
      </div>

      {quote && (
        <div className="metrics">
          <div className="chip">Area: <b>{quote.areaM2}</b> m² / <b>{quote.areaFt2}</b> ft²</div>
          <div className="chip">Edge: <b>{quote.edgeM}</b> m / <b>{quote.edgeFt}</b> ft</div>
          <div className="chip">Estimate: <b>{currency(quote.price)}</b></div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
