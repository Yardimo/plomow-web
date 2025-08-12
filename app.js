// ===== Config =====
mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZW5vcnJpcyIsImEiOiJjbWU0eXIyMHQwb3NlMm1wcHNkYXRwYzYxIn0.HrNdh-cFPgqR4SSYgkdHTw'; // public token
const STORAGE_KEY = 'plomow_jobs_v1';

// ===== State =====
let map, draw, currentService = 'snow';
let quote = null;

// ===== Helpers =====
const $ = (sel)=>document.querySelector(sel);
const currency = (n)=>`$${(Number(n)||0).toFixed(2)}`;

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

function setThemeByService(){
  const color = currentService === 'lawn' ? '#2E9E4D' : '#0054A4';
  document.documentElement.style.setProperty('--dynamic', color);

  // Try to update draw layer paints if present
  [
    'gl-draw-polygon-fill-inactive',
    'gl-draw-polygon-stroke-inactive',
    'gl-draw-line-inactive',
    'gl-draw-polygon-fill-active',
    'gl-draw-polygon-stroke-active',
    'gl-draw-line-active'
  ].forEach(id=>{
    try{
      const layer = map.getLayer(id);
      if(!layer) return;
      if(layer.type==='fill') map.setPaintProperty(id,'fill-color',color);
      if(layer.type==='line') map.setPaintProperty(id,'line-color',color);
    }catch(e){}
  });
}

function updateMetricsUI(){
  const metrics = $('#metrics');
  const btn = $('#btn-request');
  if(!quote){ metrics.style.display='none'; btn.disabled=true; return; }

  metrics.style.display='grid';
  btn.disabled=false;
  $('#m-area-m2').textContent = quote.areaM2;
  $('#m-area-ft2').textContent = quote.areaFt2;
  $('#m-edge-m').textContent  = quote.edgeM;
  $('#m-edge-ft').textContent = quote.edgeFt;
  $('#m-price').textContent   = currency(quote.price);
}

// ===== Map & UI =====
(function init(){
  // Map
  map = new mapboxgl.Map({
    container:'map',
    style:'mapbox://styles/mapbox/streets-v12',
    center:[-81.233, 42.983], // London, ON
    zoom:12,
    attributionControl:false
  });
  map.addControl(new mapboxgl.AttributionControl({ compact:true }));
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch:true }));

  // Geocoder (autocomplete)
  const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl,
    placeholder:'Search address',
    marker:false,
    proximity:{ longitude:-81.233, latitude:42.983 },
  });
  map.addControl(geocoder, 'top-left');

  geocoder.on('result', e=>{
    const place = e.result?.place_name || '';
    $('#address').value = place;
    if(e.result?.center) map.easeTo({ center:e.result.center, zoom:16 });
  });

  // Draw
  draw = new MapboxDraw({
    displayControlsDefault:false,
    controls:{},
    defaultMode:'simple_select'
  });
  map.addControl(draw);

  // Recompute metrics on draw changes
  const recompute = ()=>{
    const data = draw.getAll();
    if(!data || data.features.length===0){ quote=null; updateMetricsUI(); return; }

    const f = data.features[0];
    let areaM2=0, edgeM=0;
    if(f.geometry.type==='Polygon'){
      areaM2 = turf.area(f);
      edgeM  = turf.length(turf.polygonToLine(f), { units:'meters' });
    } else if (f.geometry.type==='LineString'){
      edgeM = turf.length(f, { units:'meters' });
    }
    const areaFt2 = Math.round(areaM2 * 10.7639);
    const edgeFt  = Math.round(edgeM * 3.28084);
    const price   = estimatePrice(currentService, areaM2, edgeM);

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
  $('#service-type').addEventListener('change', e=>{
    currentService = e.target.value;
    setThemeByService();
    if(draw.getAll().features.length) recompute();
  });

  $('#btn-area').addEventListener('click', ()=> draw.changeMode('draw_polygon'));
  $('#btn-edge').addEventListener('click', ()=> draw.changeMode('draw_line_string'));
  $('#btn-finish').addEventListener('click', ()=> draw.changeMode('simple_select'));

  $('#btn-clear').addEventListener('click', ()=>{
    const ids = (draw.getAll().features||[]).map(f=>f.id);
    ids.forEach(id=>draw.delete(id));
    quote=null; updateMetricsUI();
  });

  $('#btn-request').addEventListener('click', ()=>{
    if(!quote) return;
    const job = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      service: currentService,
      address: $('#address').value || '',
      ...quote,
      geometry: draw.getAll()
    };
    const list = JSON.parse(localStorage.getItem('plomow_jobs_v1')||'[]');
    list.unshift(job);
    localStorage.setItem('plomow_jobs_v1', JSON.stringify(list));
    // reset
    $('#btn-clear').click();
    $('#address').value='';
    alert('Request sent! Open the Contractor Console.');
  });

  // Initial brand color
  setThemeByService();
})();
