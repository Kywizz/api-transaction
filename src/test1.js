const searchInput = document.querySelector('[data-ideeri="search"]');
const suggestionsDiv = document.querySelector('[data-ideeri="suggestions"]');

async function getSuggestions(query) {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${query}&type=municipality&autocomplete=1`
  );
  const data = await response.json();
  return data.features.map((feature) => feature.properties.label);
}

function showSuggestions(suggestions) {
  suggestionsDiv.innerHTML = '';
  suggestions.forEach((suggestion) => {
    const suggestionLink = document.createElement('a');
    suggestionLink.textContent = suggestion;
    suggestionLink.classList.add('result-ville');
    suggestionLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          suggestion
        )}&type=municipality&autocomplete=1`
      );
      const data = await response.json();
      const coords = data.features[0].geometry.coordinates.reverse();
      addMarker(coords);
      console.log(`Latitude: ${coords[0]}, Longitude: ${coords[1]}`);
    });
    const suggestionDiv = document.createElement('div');
    suggestionDiv.appendChild(suggestionLink);
    suggestionsDiv.appendChild(suggestionDiv);
  });
}

function addMarker(coords) {
  L.marker(coords).addTo(mymap);
}

searchInput.addEventListener('input', async (event) => {
  const query = event.target.value.trim();
  if (query !== '') {
    const suggestions = await getSuggestions(query);
    showSuggestions(suggestions);
  } else {
    suggestionsDiv.innerHTML = '';
  }
});

// Récupérer la div contenant la carte
const mapDiv = document.querySelector('[data-ideeri="map"]');

// Créer la carte en utilisant la div
const mymap = L.map(mapDiv);

// Ajouter une couche de tuiles OSM
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
}).addTo(mymap);

// Créer un tableau pour stocker les coordonnées des marqueurs
const markerCoords = [];

// Récupérer tous les éléments avec l'attribut data-ideeri="gps"
const gpsElements = document.querySelectorAll('[data-ideeri="gps"]');

// Boucler sur les éléments pour ajouter des marqueurs à la carte
gpsElements.forEach(function (gpsElement) {
  // Extraire les coordonnées lat, long à partir du texte de l'élément
  const coords = gpsElement.textContent.split(',');
  const lat = parseFloat(coords[0].trim());
  const long = parseFloat(coords[1].trim());

  // Ajouter les coordonnées à notre tableau de marqueurs
  markerCoords.push([lat, long]);

  // Créer un marqueur pour chaque élément avec l'attribut data-ideeri="gps"
  const marker = L.marker([lat, long]).addTo(mymap);

  // Ajouter une pop-up générée à partir de l'élément avec l'attribut data-ideeri="pop-up"
  const popupElement = gpsElement.closest('[data-ideeri="pop-up"]');
  if (popupElement) {
    marker.bindPopup(popupElement.innerHTML);
  }
});

// Ajuster la vue de la carte pour inclure tous les marqueurs
mymap.fitBounds(markerCoords);
