// ========= Config =========
const MAPBOX_TOKEN = 'pk.eyJ1IjoibWlrZW5vcnJpcyIsImEiOiJjbWU0eXIyMHQwb3NlMm1wcHNkYXRwYzYxIn0.HrNdh-cFPgqR4SSYgkdHTw'; // replace me
const STORAGE_KEY = 'plomow_jobs_v1';

// ========= State =========
let map, draw;
let service = 'snow';
let quote = null;

// ========= Helpers =========
function currency(n){ return `$${(Number(n)||0).toFixed(2)}`; }

function estimatePrice(service, areaM2, edgeM){
  const cfg = {
    snow:   { base:25, perM2:0.02,  perM:0.30 },
    lawn:   { base:20, perM2:0.015, perM:0.00 },
    leaves: { base:15, perM2:0.012, perM:0.00 },
    salt:   { base:10, perM2:0.008, perM:0.10 },
  }[service];
  const raw = cfg.base + cfg.perM2*areaM2 + cfg.perM*edgeM;
  return Math.max(raw, cfg.base);
}

function setDynamicColor() {
  const color = service === 'lawn' ? '#2E9E4D' : '#0054A4';
  document.documentElement.style.setProperty('--primary-color', color);
  document.documentElement.style.setProperty('--primary-color-dark', color);
  // update draw layer colors if layers exist
  try {
    map.setPaintProperty('draw-p-fill','fill-color',color);
    map.setPaintProperty('draw-p-stroke','line-color',color);
    map.setPaintProperty('draw-line','line-color',color);
  } catch(e){}
}

function updateMetricsUI(){
  const metrics = document.getElementById('metrics');
  const btnRequest = document.getElementById('btn-request');
  if (!quote) {
    metrics.style.display = 'none';
    btnRequest.disabled = true;
    return;
  }
  metrics.style.display = 'grid';
  btnRequest.disabled = false;
  document.getElementById('m-area-m2').textContent = quote.areaM2;
  document.getElementById('m-area-ft2').textContent = quote.areaFt2;
  document.getElementById('m-edge-m').textContent = quote.edgeM;
  document.getElementById('m-edge-ft').textContent = quote.edgeFt;
  document.getElementById('m-price').textContent = currency(quote.price);
}

// ========= Map init =========
(function init(){
  mapboxgl.accessToken = MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-79.3832, 43.6532], // Toronto
    zoom: 12,
    attributionControl: false
  });
  map.addControl(new mapboxgl.AttributionControl({ compact:true }));
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch:true }));

  draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {},
    defaultMode: 'simple_select',
    styles: [
      { id:'draw-p-fill',   type:'fill',
        filter:['all',['==','$type','Polygon'],['!=','mode','static']],
        paint:{ 'fill-color':'#0054A4','fill-opacity':0.22 } },
      { id:'draw-p-stroke', type:'line',
        filter:['all',['==','$type','Polygon'],['!=','mode','static']],
        paint:{ 'line-color':'#0054A4','line-width':2 } },
      { id:'draw-line',     type:'line',
        filter:['all',['==','$type','LineString'],['!=','mode','static']],
        paint:{ 'line-color':'#0054A4','line-width':2 } }
    ]
  });
  map.addControl(draw);

  // listen for draw changes
  const recompute = () => {
    const data = draw.getAll();
    if (!data || data.features.length === 0){ quote = null; updateMetricsUI(); return; }

    const f = data.features[0];
    let areaM2 = 0, edgeM = 0;
    if (f.geometry.type === 'Polygon') {
      areaM2 = turf.area(f);
      edgeM = turf.length(turf.polygonToLine(f), { units:'meters' });
    } else if (f.geometry.type === 'LineString') {
      edgeM = turf.length(f, { units:'meters' });
    }
    const areaFt2 = Math.round(areaM2 * 10.7639);
    const edgeFt  = Math.round(edgeM * 3.28084);
    const price   = estimatePrice(service, areaM2, edgeM);

    quote = {
      areaM2: Math.round(areaM2),
      areaFt2,
      edgeM: Math.round(edgeM),
      edgeFt,
      price: Number(price.toFixed(2))
    };
    updateMetricsUI();
  };

  map.on('draw.create', recompute);
  map.on('draw.update', recompute);
  map.on('draw.selectionchange', recompute);

  // UI events
  document.getElementById('service-type').addEventListener('change', (e)=>{
    service = e.target.value;
    setDynamicColor();
    // recompute with new pricing
    const data = draw.getAll();
    if (data && data.features.length) { // force recompute
      map.fire('draw.update');
    }
  });

  document.getElementById('btn-area').addEventListener('click', ()=> draw.changeMode('draw_polygon'));
  document.getElementById('btn-edge').addEventListener('click', ()=> draw.changeMode('draw_line_string'));
  document.getElementById('btn-finish').addEventListener('click', ()=> draw.changeMode('simple_select'));
  document.getElementById('btn-clear').addEventListener('click', ()=>{
    const ids = (draw.getAll().features||[]).map(f=>f.id);
    ids.forEach(id=>draw.delete(id));
    quote = null; updateMetricsUI();
  });

  document.getElementById('btn-request').addEventListener('click', ()=>{
    if (!quote) return;
    const job = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      service,
      address: document.getElementById('address').value || '',
      ...quote,
      geometry: draw.getAll()
    };
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    list.unshift(job);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // reset
    document.getElementById('btn-clear').click();
    document.getElementById('address').value = '';
    alert('Request sent! Open the Contractor Console.');
  });

  // initial theme color
  setDynamicColor();
})();
