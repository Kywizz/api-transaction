const searchInput = document.querySelector('[data-ideeri="search"]');
const suggestionsDiv = document.querySelector('[data-ideeri="suggestions"]');
const mapDiv = document.querySelector('[data-ideeri="map"]');
const mymap = L.map(mapDiv);
const markerCoords = [];
let lastMarker;
let lastCircle;
let ville;

async function getSuggestions(query) {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${query}&type=municipality&autocomplete=1`
  );
  const data = await response.json();
  return data.features.map((feature) => feature.properties.label);
}
async function showSuggestions(suggestions) {
  suggestionsDiv.innerHTML = '';
  const selectedVille = ville ? ville.toLowerCase() : null;

  for (const suggestion of suggestions) {
    const suggestionLink = document.createElement('a');
    suggestionLink.textContent = suggestion;
    suggestionLink.classList.add('result-ville');
    suggestionLink.href = '#';

    suggestionLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          suggestion
        )}&type=municipality&autocomplete=1`
      );
      const data = await response.json();
      const lat = parseFloat(data.features[0].geometry.coordinates[1]);
      const long = parseFloat(data.features[0].geometry.coordinates[0]);
      const marker = L.marker([lat, long]).addTo(mymap);
      marker.bindPopup(suggestion);
      mymap.setView([lat, long], 13);
      if (lastMarker) {
        lastMarker.removeFrom(mymap);
      }
      if (lastCircle) {
        lastCircle.removeFrom(mymap);
      }
      lastMarker = marker;
      lastCircle = L.circle([lat, long], {
        radius: 2000,
        fillColor: '#f03',
        color: '#f03',
      }).addTo(mymap);
      const radiusInput = document.querySelector('[data-ideeri="input"]');
      radiusInput.value = lastCircle.getRadius();
      radiusInput.addEventListener('input', () => {
        const newRadius = parseFloat(radiusInput.value);
        lastCircle.setRadius(newRadius);
      });

      // Add the parameter to the URL
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('Ville', suggestion);
      let newUrl = window.location.pathname;
      if (urlParams.toString() !== '') {
        newUrl += '?' + urlParams.toString();
      }
      window.history.pushState({}, '', newUrl);
    });

    if (selectedVille === suggestion.toLowerCase()) {
      suggestionLink.click();
    }

    const suggestionDiv = document.createElement('div');
    suggestionDiv.appendChild(suggestionLink);
    suggestionsDiv.appendChild(suggestionDiv);
  }
}

async function loadMap() {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  }).addTo(mymap);

  const gpsElements = document.querySelectorAll('[data-ideeri="gps"]');
  gpsElements.forEach(function (gpsElement) {
    const coords = gpsElement.textContent.split(',');
    const lat = parseFloat(coords[0].trim());
    const long = parseFloat(coords[1].trim());
    markerCoords.push([lat, long]);
    const marker = L.marker([lat, long]).addTo(mymap);
    const popupElement = gpsElement.closest('[data-ideeri="pop-up"]');
    if (popupElement) {
      marker.bindPopup(popupElement.innerHTML);
    }
  });

  mymap.fitBounds(markerCoords);

  await getVilleFromURL();
  await showSuggestions();
}

async function getVilleFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  ville = urlParams.get('Ville');
  if (ville) {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        ville
      )}&type=municipality&autocomplete=1`
    );
    const data = await response.json();
    const lat = parseFloat(data.features[0].geometry.coordinates[1]);
    const long = parseFloat(data.features[0].geometry.coordinates[0]);
    const marker = L.marker([lat, long]).addTo(mymap);
    marker.bindPopup(ville);
    mymap.setView([lat, long], 13);
    if (lastMarker) {
      lastMarker.removeFrom(mymap);
    }
    if (lastCircle) {
      lastCircle.removeFrom(mymap);
    }
    lastMarker = marker;
    lastCircle = L.circle([lat, long], {
      radius: 2000,
      fillColor: '#f03',
      color: '#f03',
    }).addTo(mymap);
  }
}

function updateMapData() {
  const mapDataDiv = document.getElementById('map-data');
  const newGpsElements = mapDataDiv.querySelectorAll('[data-ideeri="gps"]');

  // Remove old markers
  markerCoords.length = 0;
  mymap.eachLayer((layer) => {
    if (layer instanceof L.Marker && layer !== lastMarker) {
      mymap.removeLayer(layer);
    }
  });

  // Add new markers
  newGpsElements.forEach(function (gpsElement) {
    const coords = gpsElement.textContent.split(',');
    const lat = parseFloat(coords[0].trim());
    const long = parseFloat(coords[1].trim());
    markerCoords.push([lat, long]);
    const marker = L.marker([lat, long]).addTo(mymap);
    const popupElement = gpsElement.closest('[data-ideeri="pop-up"]');
    if (popupElement) {
      marker.bindPopup(popupElement.innerHTML);
    }
  });

  mymap.fitBounds(markerCoords);
}

document.addEventListener('DOMContentLoaded', loadMap);

searchInput.addEventListener('input', async (event) => {
  const query = event.target.value.trim();
  if (query !== '') {
    const suggestions = await getSuggestions(query);
    showSuggestions(suggestions);
    ville = null;
  } else {
    suggestionsDiv.innerHTML = '';
  }
});

// Add a listener to update the map data when needed
document.getElementById('update-map-data-button').addEventListener('click', updateMapData);
