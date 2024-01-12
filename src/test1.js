document.addEventListener('DOMContentLoaded', async () => {
  // Ajout d'un délai avant d'éxécuter le script
  setTimeout(async () => {
    console.log("Map ideeri 2.5.6 / Liam");

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
    let currentRadius = 2000;


    // Pour les éléments input
    const updateInputs = document.querySelectorAll('[data-ideeri-map="CallProperty"]');
    updateInputs.forEach(input => {
      input.addEventListener('change', () => {
        // Introduire un délai avant de mettre à jour le compteur
        setTimeout(() => {
          updatePropertyCount();
        }, 500); // 500 millisecondes, ajustez selon le besoin
      });
    });


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
          'https://uploads-ssl.webflow.com/652e41ea42a2918351b533e4/653a84b6bd5b88c8ea1946e8_64a27771d886f6640a7bdc62_Rond.png', // Remplacez ceci par l'URL de votre image
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

        // Ajuster le zoom pour inclure le cercle entier
        map.fitBounds(dataGouvCircle.getBounds(), { padding: [50, 50] }); // Ajout d'un padding pour assurer la visibilité totale du cercle
      } else {
        // Si aucun cercle n'est présent, appliquer le zoom standard
        if (!dataGouvCircle || !dataGouvCircle.getRadius()) {
          map.setView([lat, lon], 15); // Niveau de zoom fixe
        }
        markers.push(newMarker);
      }

      updateMapView();
      hideOutsidePopups();
      updatePropertyCount();
    }

    function updateMapView() {
      // Ne pas ajuster la vue si un marqueur de ville spécifique (DataGouvMarker) est présent
      if (!dataGouvMarker) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds());
      }
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
      // Vérifier si le cercle est défini et a un rayon non nul
      if (!dataGouvCircle || !dataGouvCircle.getRadius()) {
        // Si le cercle n'est pas défini ou n'a pas de rayon, tous les pop-ups restent visibles
        document.querySelectorAll("[data-ideeri-map='pop-up']").forEach((popup) => {
          popup.style.display = '';
        });
        return; // Quitter la fonction tôt
      }

      // La logique existante pour masquer ou afficher les pop-ups en fonction de leur position par rapport au cercle
      const popups = document.querySelectorAll("[data-ideeri-map='pop-up']");
      const circleCenter = dataGouvCircle.getLatLng();
      popups.forEach((popup) => {
        const gpsElement = popup.querySelector("[data-ideeri-map='gps']");
        const coords = gpsElement.textContent.split(',').map(Number);
        const point = L.latLng(coords[0], coords[1]);
        if (circleCenter.distanceTo(point) > dataGouvCircle.getRadius()) {
          popup.style.display = 'none';
        } else {
          popup.style.display = '';
        }
      });
      updatePropertyCount();
    }




    function updatePropertyCount() {
      const propertyCountElement = document.querySelector("#propertyCount");
      const visiblePopups = document.querySelectorAll("[data-ideeri-map='pop-up']:not([style*='display: none'])");
      const checkedCheckboxes = document.querySelectorAll("[data-ideeri-map='CallProperty']:checked");

      let label;

      // Si une seule checkbox est cochée, utilisez son label, sinon utilisez 'Bien immobilier'
      if (checkedCheckboxes.length === 1) {
        label = checkedCheckboxes[0].getAttribute('ideeri-label');
      } else {
        label = 'Bien immobilier';
      }

      const bien = visiblePopups.length > 1 ? 's' : '';
      propertyCountElement.textContent = `${visiblePopups.length} ${label}${bien} à vendre`;
    }




    function updateMunicipalityInfo(feature) {
      const municipalityInfoElement = document.querySelector("#municipalityInfo");
      const municipality = feature.properties.municipality;
      const postalCode = feature.properties.postcode;

      municipalityInfoElement.textContent = ` à ${municipality} ${postalCode}`;
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
            a.classList.add('result-ville-item');
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
              updateMunicipalityInfo(feature);
              updatePropertyCount();

              // Update the URL with the new city
              const newCity = input.value;
              const urlParams = new URLSearchParams(window.location.search);
              urlParams.set('Ville', newCity);
              const newURL = `${window.location.pathname}?${urlParams.toString()}`;
              window.history.pushState({}, '', newURL);
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


    // Fonction pour mettre à jour le rayon du cercle
    function updateCircleRadius(newRadius) {
      if (gpsCoordinates && dataGouvMarker) {
        if (dataGouvCircle) {
          map.removeLayer(dataGouvCircle);
        }
        const radius = parseFloat(newRadius) * 1000;
        currentRadius = radius;
        dataGouvCircle = L.circle([gpsCoordinates.latitude, gpsCoordinates.longitude], {
          radius: radius,
          color: 'red',
        }).addTo(map);
        map.fitBounds(dataGouvCircle.getBounds(), { padding: [50, 50] });
        hideOutsidePopups();

      }
      updatePropertyCount();
    }

    // Gestionnaire d'événements pour le changement de rayon
    radiusInput.addEventListener('input', (event) => {
      updateCircleRadius(event.target.value);
    });



    // ...

    // Initial marker load
    addGpsMarkers();

    // Fetch coordinates for city from URL and add a marker
    // Fetch coordinates for city from URL and add a marker
    const city = getCityParam();
    if (city) {
      const coordinates = await fetchCoordinates(city);
      gpsCoordinates = {
        latitude: coordinates[1],
        longitude: coordinates[0],
      };
      addMarker(coordinates[1], coordinates[0], true, city);
      hideOutsidePopups();
      input.value = city;
    }

  }, 800);
});