/* =========================
   PLOMOW script.js
   Dynamic brand color swap
   ========================= */

// Colors matching your brand
const snowColor = '#0054A4'; // Plomow Blue
const lawnColor = '#2E9E4D'; // Plomow Green

/**
 * Sets the --dynamic CSS variable so
 * all gradient buttons, highlights, etc.
 * change color instantly.
 * @param {string} service - "snow" or "lawn"
 */
function setDynamicColor(service) {
  const root = document.documentElement;

  if (service === 'snow') {
    root.style.setProperty('--dynamic', snowColor);
  } else if (service === 'lawn') {
    root.style.setProperty('--dynamic', lawnColor);
  } else {
    console.warn(`Unknown service: ${service}`);
  }
}

// Example: binding to radio buttons or a dropdown
document.addEventListener('DOMContentLoaded', () => {
  const serviceSelector = document.querySelector('#service-type');

  if (serviceSelector) {
    serviceSelector.addEventListener('change', (e) => {
      setDynamicColor(e.target.value);
    });

    // Initialize on page load
    setDynamicColor(serviceSelector.value);
  }
});

/**
 * Example: calling directly in code
 * (if you switch service from a button click)
 */
// setDynamicColor('snow');
// setDynamicColor('lawn');
