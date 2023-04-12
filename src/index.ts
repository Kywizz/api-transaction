// Récupération du champ de recherche et de la liste de suggestions
const searchInput = document.querySelector('[data-ideeri="search"]');
const suggestionsList = document.querySelector('[data-ideeri="suggestions"]');

// Récupération de l'objet URLSearchParams correspondant à la chaîne de requête de l'URL actuelle
const urlParams = new URLSearchParams(window.location.search);

// Récupération de la valeur du paramètre "Ville"
const ville = urlParams.get('Ville');

// Si la valeur est définie, appeler la fonction getAutocompleteSuggestions() avec la valeur comme paramètre
if (ville) {
  getAutocompleteSuggestions(ville).then((suggestions) => {
    // Récupération des coordonnées de la suggestion sélectionnée
    const { latitude } = suggestions[0];
    const { longitude } = suggestions[0];

    // Ajout du marqueur à la position de la suggestion sélectionnée
    addMarker(latitude, longitude, null, true, { popup: false, markerColor: 'green' });

    // Centrage de la carte sur la position de la suggestion sélectionnée
    map.setView([latitude, longitude], 13);
  });
}

// Fonction qui envoie une requête à l'API d'autocomplétion de data.gouv et renvoie les suggestions renvoyées
async function getAutocompleteSuggestions(query) {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${query}&type=municipality`;
  const response = await fetch(url);
  const data = await response.json();
  const suggestions = data.features.map((feature) => ({
    label: feature.properties.label,
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
    postcode: feature.properties.postcode, // ajout du code postal
  }));
  return suggestions;
}

// Fonction qui affiche les suggestions dans la liste
function showSuggestions(suggestions) {
  suggestionsList.innerHTML = '';
  suggestions.forEach((suggestion) => {
    const suggestionElement = document.createElement('a');
    suggestionElement.setAttribute('href', '#');
    suggestionElement.classList.add('result-ville');

    const suggestionLabel = suggestion.label + ', ' + suggestion.postcode; // modification de l'affichage
    suggestionElement.textContent = suggestionLabel;

    suggestionElement.addEventListener('click', (event) => {
      event.preventDefault();
      searchInput.value = suggestion.label;
      const { latitude } = suggestion;
      const { longitude } = suggestion;
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('Ville', suggestion.label);
      window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
      const suggestionSelectedEvent = new CustomEvent('suggestionSelected', {
        detail: {
          latitude: latitude,
          longitude: longitude,
        },
      });
      document.dispatchEvent(suggestionSelectedEvent);
      suggestionsList.innerHTML = '';
    });

    suggestionsList.appendChild(suggestionElement);
  });
}

// Fonction qui gère les événements de saisie dans le champ de recherche
async function handleSearchInput() {
  const query = searchInput.value;

  // Si le champ de recherche est vide, on efface la liste de suggestions
  if (query === '') {
    suggestionsList.innerHTML = '';
    return;
  }

  // Sinon, on envoie une requête à l'API d'autocomplétion de data.gouv avec le terme de recherche
  const suggestions = await getAutocompleteSuggestions(query);

  // Affichage des suggestions dans la liste
  showSuggestions(suggestions);
}

// Ajout d'un événement de saisie dans le champ de recherche
searchInput.addEventListener('input', handleSearchInput);

/// Récupération de l'élément de la carte
const mapContainer = document.querySelector('[data-ideeri="map"]');

// Initialisation de la carte Leaflet
const map = L.map(mapContainer).setView([48.856614, 2.3522219], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; OpenStreetMap contributors',
  maxZoom: 18,
}).addTo(map);

// Récupération de tous les éléments ayant l'attribut data-ideeri="rayon"
const rayonElements = document.querySelectorAll('[data-ideeri="rayon"]');

// Boucle sur tous les éléments et ajout d'un écouteur d'événement "input"
// Boucle sur tous les éléments et ajout d'un écouteur d'événement "input"
rayonElements.forEach((element) => {
  element.addEventListener('input', () => {
    if (autocompleteMarkers.length > 0 && autocompleteMarkers[0]._circle) {
      const circleRadius = parseFloat(element.value) || 2000;
      autocompleteMarkers[0]._circle.setRadius(circleRadius);

      // Boucle sur tous les éléments ayant l'attribut data-ideeri="pop-up"
      const popupElements = document.querySelectorAll('[data-ideeri="pop-up"]');
      popupElements.forEach((element) => {
        // Récupération de la position GPS de l'élément
        const gpsCoords = element.querySelector('[data-ideeri="gps"]').innerText.trim().split(',');
        const latitude = parseFloat(gpsCoords[0]);
        const longitude = parseFloat(gpsCoords[1]);

        // Calcul de la distance entre la position GPS de l'élément et la position du cercle
        const distance = map.distance([latitude, longitude], autocompleteMarkers[0].getLatLng());

        // Si la distance est inférieure ou égale au rayon du cercle, afficher l'élément. Sinon, le masquer.
        if (distance <= autocompleteMarkers[0]._circle.getRadius()) {
          element.style.display = 'block';
        } else {
          element.style.display = 'none';
        }
      });
    }
  });
});

// Initialisation d'un groupe de couches pour les marqueurs
const markersGroup = L.layerGroup().addTo(map);

// Initialisation d'un tableau pour stocker les marqueurs provenant de l'autocomplétion
const autocompleteMarkers = [];

// Appel initial de la fonction pour afficher les marqueurs provenant des éléments ayant l'attribut data-ideeri="gps"
updateMap();

function addMarker(latitude, longitude, popupContent, isAutocomplete, markerOptions) {
  // Définition des options du marqueur
  const defaultMarkerOptions = {
    popup: true,
    popupContent: popupContent,
    markerColor: 'blue',
  };
  const options = Object.assign({}, defaultMarkerOptions, markerOptions);

  // Création du marqueur avec les options spécifiées
  const marker = L.marker([latitude, longitude], {
    icon: new L.Icon({
      iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${options.markerColor}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
  });

  // Ajout du marqueur au groupe de couches ou directement à la carte
  if (isAutocomplete) {
    // Suppression des anciens marqueurs provenant de l'autocomplétion et de leurs cercles
    autocompleteMarkers.forEach((m) => {
      m.remove();
      if (m._circle) {
        map.removeLayer(m._circle);
      }
    });
    autocompleteMarkers.length = 0; // Réinitialisation du tableau

    // Ajout du nouveau marqueur et de son cercle rouge
    marker.addTo(map);
    autocompleteMarkers.push(marker);
    const circle = L.circle([latitude, longitude], {
      radius: 2000,
      color: 'red',
      opacity: 0.5,
      fillOpacity: 0.2,
    }).addTo(map);
    marker._circle = circle;

    // Centrage de la carte sur le nouveau marqueur
    let centerOnMarker = false;
    autocompleteMarkers.forEach((m) => {
      if (m.getLatLng().equals([latitude, longitude])) {
        centerOnMarker = true;
      }
    });

    if (centerOnMarker) {
      map.setView([latitude, longitude]);
    } else {
      map.setView([latitude, longitude], 13);
    }

    updateMap();
  } else {
    marker.addTo(markersGroup);
  }

  // Ajout de la pop-up si spécifiée
  if (options.popup) {
    marker.bindPopup(options.popupContent).openPopup();
  }
}

// Fonction pour mettre à jour la carte en fonction des éléments ayant l'attribut data-ideeri="gps"
function updateMap() {
  // Récupération de tous les éléments ayant l'attribut data-ideeri="gps"
  const gpsElements = document.querySelectorAll('[data-ideeri="gps"]');

  // Suppression de tous les marqueurs précédemment ajoutés (sauf les marqueurs provenant de l'autocomplétion)
  markersGroup.eachLayer((layer) => {
    if (!autocompleteMarkers.includes(layer)) {
      markersGroup.removeLayer(layer);
    }
  });

  // Boucle sur tous les éléments et ajout d'un marqueur pour chacun
  gpsElements.forEach((element) => {
    // Récupération des coordonnées GPS
    const gpsCoords = element.innerText.trim().split(',');
    const latitude = parseFloat(gpsCoords[0]);
    const longitude = parseFloat(gpsCoords[1]);

    // Récupération du contenu de la div parente pour la pop-up
    const popupContent = element.closest('[data-ideeri="pop-up"]').innerHTML;

    // Ajout du marqueur à la position donnée avec la pop-up associée
    addMarker(latitude, longitude, popupContent, false, { markerColor: 'red' });
  });

  // Récupération du cercle rouge s'il existe
  const circle = autocompleteMarkers.length > 0 ? autocompleteMarkers[0]._circle : null;

  // Si un cercle rouge existe, afficher/masquer les éléments en fonction de leur distance par rapport au cercle
  if (circle) {
    // Boucle sur tous les éléments ayant l'attribut data-ideeri="pop-up"
    const popupElements = document.querySelectorAll('[data-ideeri="pop-up"]');
    popupElements.forEach((element) => {
      // Récupération de la position GPS de l'élément
      const gpsCoords = element.querySelector('[data-ideeri="gps"]').innerText.trim().split(',');
      const latitude = parseFloat(gpsCoords[0]);
      const longitude = parseFloat(gpsCoords[1]);

      // Calcul de la distance entre la position GPS de l'élément et la position du cercle
      const distance = map.distance([latitude, longitude], circle.getLatLng());

      // Si la distance est inférieure ou égale au rayon du cercle, afficher l'élément. Sinon, le masquer.
      if (distance <= circle.getRadius()) {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    });
  }
}

// Ajout d'un écouteur d'événement "moveend" sur la carte pour mettre à jour l'affichage des éléments ayant l'attribut data-ideeri="pop-up"
map.on('moveend', () => {
  // Récupération de tous les éléments ayant l'attribut data-ideeri="pop-up"
  const popupElements = document.querySelectorAll('[data-ideeri="pop-up"]');

  // Boucle sur tous les éléments
  popupElements.forEach((element) => {
    // Récupération de la position GPS de l'élément
    const gpsCoords = element.querySelector('[data-ideeri="gps"]').innerText.trim().split(',');
    const latitude = parseFloat(gpsCoords[0]);
    const longitude = parseFloat(gpsCoords[1]);

    // Calcul de la distance entre la position GPS de l'élément et la position du cercle
    const distance = map.distance([latitude, longitude], autocompleteMarkers[0].getLatLng());

    // Si la distance est inférieure ou égale au rayon du cercle, afficher l'élément. Sinon, le masquer.
    if (distance <= autocompleteMarkers[0]._circle.getRadius()) {
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  });
});

// Écouteur d'événement qui met à jour la carte en temps réel en fonction des éléments ayant l'attribut data-ideeri="gps"
document.querySelector('#map-data').addEventListener('DOMSubtreeModified', updateMap);

// Écouteur d'événement qui récupère les coordonnées
// Écouteur d'événement qui récupère les coordonnées de la suggestion sélectionnée
document.addEventListener('suggestionSelected', (event) => {
  const { latitude } = event.detail;
  const { longitude } = event.detail;

  // Ajout d'un marqueur à la position de la suggestion sélectionnée (en supprimant les anciens marqueurs provenant de l'autocomplétion)
  addMarker(latitude, longitude, null, true, { popup: false, markerColor: 'green' });

  // Centrage de la carte sur la position de la suggestion sélectionnée
  map.setView([latitude, longitude], 13);
});
