// Récupération du champ de recherche et de la liste de suggestions
const searchInput = document.querySelector('[data-ideeri="search"]');
const suggestionsList = document.querySelector('[data-ideeri="suggestions"]');

// Fonction qui envoie une requête à l'API d'autocomplétion de data.gouv et renvoie les suggestions renvoyées
async function getAutocompleteSuggestions(query) {
  // Construction de l'URL de l'API d'autocomplétion de data.gouv avec le terme de recherche
  const url = `https://api-adresse.data.gouv.fr/search/?q=${query}&type=municipality`;

  // Envoi de la requête à l'API et récupération de la réponse au format JSON
  const response = await fetch(url);
  const data = await response.json();

  // Récupération des suggestions de la réponse de l'API
  const suggestions = data.features.map((feature) => ({
    label: feature.properties.label,
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
  }));

  // Renvoi des suggestions
  return suggestions;
}

// Fonction qui affiche les suggestions dans la liste
function showSuggestions(suggestions) {
  suggestionsList.innerHTML = '';
  suggestions.forEach((suggestion) => {
    const suggestionElement = document.createElement('li');
    suggestionElement.textContent = suggestion.label;

    // Ajout d'un événement de clic sur chaque suggestion
    suggestionElement.addEventListener('click', () => {
      // Remplissage du champ de recherche avec la suggestion sélectionnée
      searchInput.value = suggestion.label;

      // Récupération des coordonnées de la suggestion sélectionnée
      const latitude = suggestion.latitude;
      const longitude = suggestion.longitude;

      // Événement personnalisé qui envoie les coordonnées de la suggestion sélectionnée
      const event = new CustomEvent('suggestionSelected', {
        detail: {
          latitude: latitude,
          longitude: longitude,
        },
      });
      document.dispatchEvent(event);
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

// Initialisation d'un groupe de couches pour les marqueurs
const markersGroup = L.layerGroup().addTo(map);

// Initialisation d'un tableau pour stocker les marqueurs provenant de l'autocomplétion
const autocompleteMarkers = [];

// Récupération de l'élément input qui porte l'attribut data-ideeri="rayon"
const rayonInput = document.querySelector('[data-ideeri="rayon"]');

// Écouteur d'événement qui récupère la valeur en temps réel
rayonInput.addEventListener('input', (event) => {
  const rayonValue = event.target.value;
  console.log(rayonValue); // Affichage de la valeur dans la console

  // Mise à jour du rayon des cercles des marqueurs d'autocomplétion
autocompleteMarkers.forEach((marker) => {
  marker._circle.setRadius(rayonValue);
});

  // Ici, tu peux ajouter le code qui te permet de mettre à jour la carte en fonction de la valeur du rayon
  // Par exemple, tu peux appeler une fonction updateMap() en passant la valeur du rayon en argument
  // updateMap(rayonValue);
});


// Appel initial de la fonction pour afficher les marqueurs provenant des éléments ayant l'attribut data-ideeri="gps"
updateMap();

function addMarker(latitude, longitude, popupContent, isAutocomplete, markerOptions) {
    // Définition des options du marqueur
    const defaultMarkerOptions = {
        popup: true,
        popupContent: popupContent,
        markerColor: 'blue'
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
            shadowSize: [41, 41]
        })
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
        const circle = L.circle([latitude, longitude], { radius: 2000, color: 'red', opacity: 0.5, fillOpacity: 0.2 }).addTo(map);
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


function updateMap() {
  // Récupération de tous les éléments ayant l'attribut data-ideeri="gps"
  const gpsElements = document.querySelectorAll('[data-ideeri="gps"]');

  // Suppression de tous les marqueurs précédemment ajoutés (sauf les marqueurs provenant de l'autocomplétion)
  markersGroup.eachLayer((layer) => {
    if (!autocompleteMarkers.includes(layer)) {
      markersGroup.removeLayer(layer);
    }
  });

  // Masquage des éléments qui ne sont pas dans le cercle
  gpsElements.forEach((element) => {
    const gpsCoords = element.innerText.trim().split(',');
    const latitude = parseFloat(gpsCoords[0]);
    const longitude = parseFloat(gpsCoords[1]);

    // Vérification si l'élément est dans le cercle
    const isInCircle = map.getBounds().contains([latitude, longitude]);

    // Masquage de l'élément s'il n'est pas dans le cercle
    if (!isInCircle) {
      element.style.display = "none";
    } else {
      element.style.display = "block";
    }

    const popupContent = element.closest('[data-ideeri="pop-up"]').innerHTML;

    // Ajout du marqueur à la position donnée avec la pop-up associée
    addMarker(latitude, longitude, popupContent, false, { markerColor: 'red' });
  });
}


// Écouteur d'événement qui met à jour la carte en temps réel en fonction des éléments ayant l'attribut data-ideeri="gps"
document.querySelector('#map-data').addEventListener('DOMSubtreeModified', updateMap);

// Écouteur d'événement qui récupère les coordonnées
// Écouteur d'événement qui récupère les coordonnées de la suggestion sélectionnée
document.addEventListener('suggestionSelected', (event) => {
const latitude = event.detail.latitude;
const longitude = event.detail.longitude;

// Ajout d'un marqueur à la position de la suggestion sélectionnée (en supprimant les anciens marqueurs provenant de l'autocomplétion)
addMarker(latitude, longitude, null, true, { popup: false, markerColor: 'green' });

// Centrage de la carte sur la position de la suggestion sélectionnée
map.setView([latitude, longitude], 13);

});


