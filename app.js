// Your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZW5vcnJpcyIsImEiOiJjbWU0eXIyMHQwb3NlMm1wcHNkYXRwYzYxIn0.HrNdh-cFPgqR4SSYgkdHTw';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-81.2497, 42.9836], // London, Ontario
  zoom: 12
});

// Add navigation controls (zoom in/out)
map.addControl(new mapboxgl.NavigationControl(), 'top-right');
