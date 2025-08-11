const { useEffect, useRef, useState } = React;

/** -------- Repo-wide helpers (shared with contractor.js idea) -------- */
const JobStore = {
  key: 'plomow_jobs_v1',
  all() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
    catch { return []; }
  },
  save(list) {
    localStorage.setItem(this.key, JSON.stringify(list));
    window.dispatchEvent(new Event('plomow:jobs:update'));
  },
  create(job) {
    const list = this.all();
    list.unshift(job);
    this.save(list);
  },
  update(id, patch) {
    const list = this.all().map(j => j.id === id ? { ...j, ...patch } : j);
    this.save(list);
  }
};

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function currency(n){ return `$${n.toFixed(2)}` }

function priceEstimate(service, areaM2, edgeM){
  const cfg = {
    snow:   { base:25, perM2:0.02, perM:0.30 },
    lawn:   { base:20, perM2:0.015, perM:0.00 },
    leaves: { base:15, perM2:0.012, perM:0.00 },
    salt:   { base:10, perM2:0.008, perM:0.10 },
  }[service];
  const raw = cfg.base + cfg.perM2*areaM2 + cfg.perM*edgeM;
  return Math.max(raw, cfg.base);
}

function App(){
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [service, setService] = useState('snow');
  const [address, setAddress] = useState('');
  const [metrics, setMetrics] = useState({ areaM2:0, areaFt2:0, edgeM:0, edgeFt:0 });
  const [price, setPrice] = useState(0);
  const [featureId, setFeatureId] = useState(null);

  useEffect(()=>{
    // 1) Insert your Mapbox token
    mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZW5vcnJpcyIsImEiOiJjbWU0eXIyMHQwb3NlMm1wcHNkYXRwYzYxIn0.HrNdh-cFPgqR4SSYgkdHTw';

    // 2) Init map
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-81.233, 42.983], // London, ON
      zoom: 13,
      attributionControl: false
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }));

    // 3) Draw controls
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
      styles: [
        { id:'gl-draw-polygon-fill', type:'fill', filter:['all',['==','$type','Polygon'],['!=','mode','static']], paint:{ 'fill-color':'#3aa3ff', 'fill-opacity':0.2 }},
        { id:'gl-draw-polygon-stroke', type:'line', filter:['all',['==','$type','Polygon'],['!=','mode','static']], paint:{ 'line-color':'#3aa3ff', 'line-width':2 }},
        { id:'gl-draw-line', type:'line', filter:['all',['==','$type','LineString'],['!=','mode','static']], paint:{ 'line-color':'#3aa3ff', 'line-width':2 }},
      ]
    });
    map.addControl(draw);

    function updateMetrics(){
      const sel = draw.getSelected();
      const all = draw.getAll();
      let f = sel.features[0] || (featureId && all.features.find(x=>x.id===featureId));
      if(!f){ setMetrics({ areaM2:0, areaFt2:0, edgeM:0, edgeFt:0 }); setPrice(0); return; }
      let areaM2 = 0, edgeM = 0;
      if(f.geometry.type === 'Polygon'){
        areaM2 = turf.area(f); // m²
        edgeM = turf.length(turf.polygonToLine(f), { units:'meters' });
      } else if (f.geometry.type === 'LineString'){
        areaM2 = 0;
        edgeM = turf.length(f, { units:'meters' });
      }
      const areaFt2 = areaM2 * 10.7639;
      const edgeFt = edgeM * 3.28084;
      setMetrics({ areaM2, areaFt2, edgeM, edgeFt });
      setPrice(priceEstimate(service, areaM2, edgeM));
    }

    map.on('draw.create', e=>{ setFeatureId(e.features[0].id); updateMetrics(); });
    map.on('draw.update', updateMetrics);
    map.on('draw.selectionchange', updateMetrics);

    mapRef.current = map; drawRef.current = draw;
    return ()=> map.remove();
  },[]);

  useEffect(()=>{ setPrice(priceEstimate(service, metrics.areaM2, metrics.edgeM)); },
    [service, metrics.areaM2, metrics.edgeM]);

  function startPolygon(){ drawRef.current?.changeMode('draw_polygon'); }
  function startLine(){ drawRef.current?.changeMode('draw_line_string'); }
  function finish(){ drawRef.current?.changeMode('simple_select'); }
  function undo(){ try { drawRef.current?.trash(); setFeatureId(null); setMetrics({ areaM2:0, areaFt2:0, edgeM:0, edgeFt:0 }); setPrice(0);} catch(e){} }
  function clearAll(){
    const ids = drawRef.current?.getAll().features.map(f=>f.id) || [];
    ids.forEach(id=>drawRef.current.delete(id));
    setFeatureId(null); setMetrics({ areaM2:0, areaFt2:0, edgeM:0, edgeFt:0 }); setPrice(0);
  }

  function saveQuote(){
    const geometry = drawRef.current?.getAll();
    if(!geometry || geometry.features.length === 0){
      toast('Please draw an area or edge first.');
      return;
    }
    const job = {
      id: uid(),
      createdAt: new Date().toISOString(),
      service, address,
      areaM2: Math.round(metrics.areaM2),
      areaFt2: Math.round(metrics.areaFt2),
      edgeM: Math.round(metrics.edgeM),
      edgeFt: Math.round(metrics.edgeFt),
      price: Number(price.toFixed(2)),
      status: 'open',
      geometry
    };
    JobStore.create(job);
    toast('Request sent! Contractors will see this job.');
    clearAll();
    setAddress('');
  }

  function toast(msg){
    const t = document.getElementById('toast');
    t.style.display='block'; t.textContent = msg;
    setTimeout(()=> t.style.display='none', 1500);
  }

  return (
    <>
      <div id="toast" className="toast">toast</div>
      <div className="draw-hint">Tap + Add Area or + Add Edge, place points, then Finish. Close polygon by tapping the first point.</div>
      <div className="map-wrap"><div id="map"></div></div>

      <div className="panel">
        <div className="card stack">
          <div className="row">
            <select value={service} onChange={e=>setService(e.target.value)} className="pill" aria-label="Service">
              <option value="snow">❄ Snow Removal</option>
              <option value="lawn">🌱 Lawn Cutting</option>
              <option value="leaves">🍂 Leaf Cleanup</option>
              <option value="salt">🧂 Salting</option>
            </select>
            <input className="pill" placeholder="Address (optional)" value={address} onChange={e=>setAddress(e.target.value)} />
          </div>
          <div className="row controls">
            <button onClick={startPolygon}>+ Add Area</button>
            <button onClick={startLine}>+ Add Edge</button>
            <button onClick={finish}>Finish</button>
            <button onClick={undo}>Undo</button>
            <button onClick={clearAll}>Clear</button>
          </div>
          <div className="row" style={{alignItems:'center'}}>
            <div className="pill" style={{textAlign:'center'}}>
              <div className="badge">Area</div>
              <div><b>{Math.round(metrics.areaM2)}</b> m² • <b>{Math.round(metrics.areaFt2)}</b> ft²</div>
            </div>
            <div className="pill" style={{textAlign:'center'}}>
              <div className="badge">Edge</div>
              <div><b>{Math.round(metrics.edgeM)}</b> m • <b>{Math.round(metrics.edgeFt)}</b> ft</div>
            </div>
            <div className="pill" style={{textAlign:'center'}}>
              <div className="badge">Estimate</div>
              <div><b>{currency(price || 0)}</b></div>
            </div>
          </div>
          <div className="row controls">
            <button className="primary" onClick={saveQuote} disabled={!(metrics.areaM2>0 || metrics.edgeM>0)}>Request Service</button>
          </div>
        </div>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
