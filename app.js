mapboxgl.accessToken = 'pk.eyJ1IjoibWlrZW5vcnJpcyIsImEiOiJjbWU0eXIyMHQwb3NlMm1wcHNkYXRwYzYxIn0.HrNdh-cFPgqR4SSYgkdHTw';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-81.2497, 42.9836], // London, Ontario
  zoom: 12
});

map.addControl(new mapboxgl.NavigationControl());
