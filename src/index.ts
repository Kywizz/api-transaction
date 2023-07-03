document.addEventListener('DOMContentLoaded', async () => {
  const input = document.querySelector("[data-ideeri-map='search']");
  const suggestions = document.querySelector("[data-ideeri-map='suggestions']");
  const mapDiv = document.querySelector("[data-ideeri-map='map']");
  const filterButtons = document.querySelectorAll("[data-ideeri-map='Filter']");
  const radiusInput = document.querySelector("[data-ideeri-map='rayon']");

  const map = L.map(mapDiv, { maxZoom: 14.5 }).setView([46.603354, 1.888334], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  let gpsCoordinates = null;
  let markers = [];
  let dataGouvMarker = null;
  let dataGouvCircle = null;

  async function fetchCoordinates(city) {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(city)}&limit=1`
    );
    const data = await response.json();
    return data.features[0].geometry.coordinates;
  }

  function getCityParam() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('Ville');
  }

  function clearMarkers() {
    markers.forEach((marker) => {
      map.removeLayer(marker);
    });
    markers = [];
  }

  function updateURL(city) {
    if (history.pushState) {
      const newurl =
        window.location.protocol +
        '//' +
        window.location.host +
        window.location.pathname +
        '?Ville=' +
        encodeURIComponent(city);
      window.history.pushState({ path: newurl }, '', newurl);
    }
  }

  function addMarker(
    lat,
    lon,
    isDataGouvMarker = false,
    city = null,
    popupElement = null,
    initialRadius = 2000
  ) {
    const myIcon = L.icon({
      iconUrl:
        'https://uploads-ssl.webflow.com/645b5544855ad21ebaa042ed/64a27771d886f6640a7bdc62_Rond.png', // Remplacez ceci par l'URL de votre image
      iconSize: [15, 15], // Changez ces valeurs en fonction de la taille de votre image
      iconAnchor: [7.5, 7.5],
      popupAnchor: [-3, -76],
    });

    const markerOptions = isDataGouvMarker ? {} : { icon: myIcon };
    const newMarker = L.marker([lat, lon], markerOptions);
    if (!isDataGouvMarker && popupElement) {
      const popTitleElement = popupElement.querySelector("[data-ideeri-map='pop-titre']");
      const popDescriptionElement = popupElement.querySelector("[data-ideeri-map='pop-up-loc']");
      const popPhotoElement = popupElement.querySelector("[data-ideeri-map='pop-up-photo']");
      const popTypeElement = popupElement.querySelector("[data-ideeri-map='pop-up-type']");
      const newPopupContent = document.createElement('div');

      if (popPhotoElement) {
        newPopupContent.append(popPhotoElement.cloneNode(true));
      }

      if (popDescriptionElement) {
        newPopupContent.append(popDescriptionElement.cloneNode(true));
      }

      if (popTypeElement) {
        newPopupContent.append(popTypeElement.cloneNode(true));
      }

      if (popTitleElement) {
        newPopupContent.append(popTitleElement.cloneNode(true));
      }

      newMarker.bindPopup(newPopupContent);
    }
    newMarker.addTo(map);

    if (isDataGouvMarker) {
      if (dataGouvMarker) {
        map.removeLayer(dataGouvMarker);
      }
      dataGouvMarker = newMarker;
      if (dataGouvCircle) {
        map.removeLayer(dataGouvCircle);
      }
      dataGouvCircle = L.circle([lat, lon], { radius: initialRadius, color: 'red' }).addTo(map);
    } else {
      markers.push(newMarker);
    }

    updateMapView();
    hideOutsidePopups();
  }

  function updateMapView() {
    const group = new L.featureGroup(markers.concat(dataGouvMarker ? [dataGouvMarker] : []));
    map.fitBounds(group.getBounds());
  }

  function addGpsMarkers() {
    const gpsElements = document.querySelectorAll("[data-ideeri-map='gps']");
    gpsElements.forEach((element) => {
      const coords = element.textContent.split(',').map(Number);
      if (coords.length === 2) {
        const popupElement = element.closest("[data-ideeri-map='pop-up']");
        addMarker(coords[0], coords[1], false, null, popupElement);
      }
    });
  }

  function hideOutsidePopups() {
    const popups = document.querySelectorAll("[data-ideeri-map='pop-up']");
    popups.forEach((popup) => {
      const gpsElement = popup.querySelector("[data-ideeri-map='gps']");
      const coords = gpsElement.textContent.split(',').map(Number);
      if (dataGouvCircle && !dataGouvCircle.getBounds().contains(coords)) {
        popup.style.display = 'none';
      } else {
        popup.style.display = '';
      }
    });
  }

  function updateHeading(feature) {
    const headingElement = document.querySelector("[data-ideeri-map='heading']");
    const visiblePopups = document.querySelectorAll(
      "[data-ideeri-map='pop-up']:not([style*='display: none'])"
    );
    const { municipality } = feature.properties;
    const postalCode = feature.properties.postcode;

    const bien = visiblePopups.length > 1 ? 'Biens immobiliers' : 'Bien immobilier';
    const headingContent = `${visiblePopups.length} ${bien} à vendre à ${municipality} ${postalCode}`;
    headingElement.textContent = headingContent;
  }

  input.addEventListener('input', async (event) => {
    const searchTerm = event.target.value;

    if (searchTerm.length >= 3) {
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchTerm)}&limit=5`
        );
        const data = await response.json();

        suggestions.innerHTML = '';
        data.features.forEach((feature) => {
          const a = document.createElement('a');
          a.textContent = feature.properties.label;
          a.href = '#';
          a.classList.add('Result-ville');
          a.addEventListener('click', (event) => {
            event.preventDefault();

            const { coordinates } = feature.geometry;

            input.value = feature.properties.label;

            gpsCoordinates = {
              latitude: coordinates[1],
              longitude: coordinates[0],
            };

            // add marker with default radius of 2km
            addMarker(gpsCoordinates.latitude, gpsCoordinates.longitude, true, input.value);

            suggestions.innerHTML = '';

            // Update heading with city, postal code, and department info
            updateHeading(feature);
          });
          suggestions.appendChild(a);
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des données d'autocomplétion :", error);
      }
    } else {
      suggestions.innerHTML = '';
    }
  });

  // ...

  filterButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      // <-- add async here
      if (gpsCoordinates && dataGouvMarker) {
        if (dataGouvCircle) {
          map.removeLayer(dataGouvCircle);
        }
        const radius = parseFloat(radiusInput.value) * 1000; // Convert km to m
        dataGouvCircle = L.circle([gpsCoordinates.latitude, gpsCoordinates.longitude], {
          radius: radius,
          color: 'red',
        }).addTo(map);
      } else {
        console.log('Aucune adresse sélectionnée');
      }

      // Clear previous markers and add new ones
      clearMarkers();
      setTimeout(addGpsMarkers, 500);
      hideOutsidePopups();

      // Update heading
      if (dataGouvMarker) {
        // Wait for some time to allow popups to update
        await new Promise((resolve) => setTimeout(resolve, 500)); // <-- you can use await here now

        const visiblePopups = document.querySelectorAll(
          "[data-ideeri-map='pop-up']:not([style*='display: none'])"
        );
        const headingElement = document.querySelector("[data-ideeri-map='heading']");
        const bien = visiblePopups.length > 1 ? 'Biens immobiliers' : 'Bien immobilier';
        const headingContent = `${visiblePopups.length} ${bien} à vendre à ${input.value}`;
        headingElement.textContent = headingContent;
      }
    });
  });

  // ...

  // Initial marker load
  addGpsMarkers();

  // Fetch coordinates for city from URL and add a marker
  const city = getCityParam();
  if (city) {
    const coordinates = await fetchCoordinates(city);
    addMarker(coordinates[1], coordinates[0], true, city);
    hideOutsidePopups();
  }
});
