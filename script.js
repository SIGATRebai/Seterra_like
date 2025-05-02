document.addEventListener('DOMContentLoaded', () => {
    // Définition des limites de la carte
    const bounds = [[-120, -220], [120, 220]];
    
    // Initialisation de la carte Leaflet
    const map = L.map('map', {
        center: [20, 0], // Position initiale de la carte
        zoom: 2,         // Niveau de zoom initial
        minZoom: 2,      // Niveau de zoom minimum
        maxBounds: bounds,  // Limites maximales de la carte
        maxBoundsViscosity: 1.0 // Empêche le déplacement en dehors des limites
    });

    // Chargement du fond de carte Mapbox
    L.tileLayer('https://api.mapbox.com/styles/v1/ty25nfc/cm91akxb6009c01s68yl53d6s/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHkyNW5mYyIsImEiOiJjbTczNjE2c2QwaDNmMnJxcjV3M2ZwaDQzIn0.8K2RI1qRzFKdglqNJS9NSg', {
        tileSize: 512,
        zoomOffset: -1,
        attribution: '© <a href="https://www.mapbox.com/">Mapbox | OSM Contributor</a>',
        accessToken: 'pk.eyJ1IjoidHkyNW5mYyIsImEiOiJjbTczNjE2c2QwaDNmMnJxcjV3M2ZwaDQzIn0.8K2RI1qRzFKdglqNJS9NSg'
    }).addTo(map);
  
    // Initialisation de plusieurs variables
    let targetMonument; // Monument cible à trouver
    let remainingMonuments = []; // Liste des monuments restant à trouver
    let allMonuments = []; // Liste de tous les monuments
    let timer; // Variable pour le timer
    let seconds = 0; // Compteur de secondes pour le timer
    let clickCount = 0;  // Compteur de clics
    let successfulAttempts = 0; // Compteur pour les réussites
    let totalAttempts = 0; // Compteur total d'essais

    // Récupération des éléments HTML pour afficher les infos
    const targetMonumentElement = document.getElementById("target-monument");
    const timerElement = document.getElementById("bubble-timer");
    const remainingElement = document.getElementById("bubble-remaining");
    const startButton = document.getElementById("str-btn");
    const nextButton = document.getElementById("next-btn");
    const clickCountElement = document.getElementById("bubble-clicks");
    const successPercentageElement = document.getElementById("bubble-success");

    // Ajout du sélecteur pour choisir un continent
    const continentSelect = document.createElement("select");
    continentSelect.id = "continent";
    document.querySelector(".sidebar").insertBefore(continentSelect, startButton);

    // Fonction pour mettre à jour les options du menu déroulant des continents
    function updateContinentOptions() { 
        const continents = [...new Set(allMonuments.map(m => m.continent))];
        continentSelect.innerHTML = '<option value="all">Tous les continents</option>' +
            continents.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    // Fonction pour filtrer les monuments en fonction du continent sélectionné
    function filterMonuments() { 
        const selectedContinent = continentSelect.value;
        remainingMonuments = selectedContinent === "all" 
            ? [...allMonuments]  // Clonage pour éviter d'altérer l'original
            : allMonuments.filter(m => m.continent === selectedContinent);
        totalFilteredMonuments = remainingMonuments.length;  // Stocke le total des monuments filtrés
        totalAttempts = 0; // Réinitialise le nombre total d'essais à chaque nouveau filtre
        updateRemainingCount();
        addMarkers();  // Ajoute d'abord les marqueurs
        setNewTarget(); // Puis sélectionne la cible, sans supprimer de `remainingMonuments`
        updateSuccessPercentage(); // Met à jour le pourcentage de réussite au début
    }

    // Gestion du bouton Start Timer pour démarrer le jeu
    startButton.addEventListener("click", startGame);
  
    function startGame() {
        successfulAttempts = 0;  // Réinitialise les réussites
        totalAttempts = 0;  // Réinitialise le nombre total d'essais
        updateSuccessPercentage();  // Met à jour l'affichage du pourcentage de réussite
        filterMonuments();
        startTimer();
    }

    // Fonction pour charger les données des monuments
    function loadMonuments() {
        fetch('https://raw.githubusercontent.com/SIGATRebai/Seterra_like/refs/heads/main/MONUMENTS_100.geojson')
          .then(response => response.json())
          .then(data => {
              allMonuments = data.features.map(feature => ({
                  name: feature.properties.nom,
                  coords: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
                  image: feature.properties.Photo,
                  continent: feature.properties.Continent,
                  country: feature.properties.name_fr
            }));
            updateContinentOptions();
            filterMonuments(); // Lance le filtrage et l'affichage après le chargement des données
        })
    }

    // Fonction pour sélectionner un nouveau monument cible à trouver
    function setNewTarget() {
        if (remainingMonuments.length === 0) {
            targetMonumentElement.innerText = "Quiz terminé !";
            stopTimer();
            alert("Félicitations ! Vous avez trouvé tous les monuments en " + formatTime(seconds));
            return;
        }

        const index = Math.floor(Math.random() * remainingMonuments.length);
        targetMonument = remainingMonuments[index]; // Sélectionne un monument sans le supprimer
        targetMonumentElement.innerText = targetMonument.name;
        clickCount = 0;  // Réinitialiser le compteur de clics
        updateClickCountDisplay();
    }
    
    // Ajout des marqueurs pour chaque monument
    function addMarkers() {
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
                map.removeLayer(layer);
            }
        });

        remainingMonuments.forEach(monument => {
            // Création d'un cercle avec un halo
            let marker = L.circleMarker(monument.coords, {
                radius: 10, // Taille du cercle
                fillColor: '#ff5733', // Couleur de remplissage
                color: '#fff', // Couleur du contour
                weight: 3, // Épaisseur du contour
                opacity: 1,
                fillOpacity: 0.7 // Opacité du remplissage (halo)
            }).addTo(map);

            // Ajout d'un pop-up avec des informations sur le monument
            marker.bindPopup(`
                <div class="popup-container">
                    <!-- Texte courbé au-dessus -->
                    <svg class="popup-text-svg" viewBox="0 0 150 50">
                        <defs>
                            <path id="topCurve" d="M 18 50 A 55 60 0 0 1 135 45" /> /* Permet de changer la courbure du texte */
                        </defs>
                        <text>
                            <textPath href="#topCurve" startOffset="50%" text-anchor="middle">
                                ${monument.country}
                            </textPath>
                        </text>
                    </svg>

                    <!-- Image ronde -->
                    <div class="popup-circle">
                        <img src="${monument.image}" onerror="this.style.display='none';">
                    </div>

                    <!-- Flèche vers le point -->
                    <div class="popup-arrow"></div>
                </div>
            `);
            // Afficher le pop-up lorsque le curseur passe sur le cercle
            marker.on('mouseover', function (e) {
                marker.openPopup();
            });
            marker.on('mouseout', function () {
                marker.closePopup();
            });

            // Vérification de la réponse lorsque l'on clique sur le point
            marker.on('click', () => checkAnswer(monument));
        });
    }

    // Fonction pour vérifier la réponse après un clic sur un monument
    function checkAnswer(clickedMonument) {
        clickCount++;  // Incrémenter le nombre de clics
        updateClickCountDisplay(); // Met à jour l'affichage du nombre de clics

        totalAttempts++; // Augmentez le nombre total d'essais

        let score = 0;

        // Calcul du score en fonction du nombre de clics
        if (clickCount === 1) {
            score = 100; // Premier clic = 100%
        } else if (clickCount === 2) {
            score = 50;  // Deuxième clic = 50%
        } else if (clickCount === 3) {
            score = 25;  // Troisième clic = 25%
        } else {
            score = 0;   // Clics suivants = 0%
        }

        // Si le joueur trouve le monument
        if (clickedMonument.name === targetMonument.name) {
            successfulAttempts += score; // Augmentez le nombre de réussites par le score
            remainingMonuments = remainingMonuments.filter(m => m.name !== targetMonument.name);
            updateRemainingCount();  // Met à jour l'affichage du nombre de monuments restants
            setNewTarget(); // Sélectionne un nouveau monument
            addMarkers(); // Recharge les marqueurs pour ne plus afficher l’ancien
            updateSuccessPercentage(); // Mise à jour du pourcentage de réussite
        } else {
            // Après 3 clics incorrects, le monument est automatiquement trouvé
            if (clickCount >= 3) {
                // Zoom sur le bon monument (targetMonument, pas clickedMonument)
                map.setView(targetMonument.coords, 3);

                // Crée un marker temporaire pour clignoter
                let flashingMarker = L.circleMarker(targetMonument.coords, {
                    radius: 10,
                    fillColor: '#ff0000',
                    color: '#fff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(map);

                // Clignotement
                let isRed = true;
                let blinkInterval = setInterval(() => {
                    flashingMarker.setStyle({
                        fillColor: isRed ? '#ffff00' : '#ff0000',
                        fillOpacity: isRed ? 0.3 : 0.9
                    });
                    isRed = !isRed;
                }, 300);

                // Après 2 secondes, on arrête tout et passe au suivant
                setTimeout(() => {
                    clearInterval(blinkInterval);
                    map.removeLayer(flashingMarker);

                    remainingMonuments = remainingMonuments.filter(m => m.name !== targetMonument.name);
                    updateRemainingCount();
                    setNewTarget();
                    addMarkers();
                    updateSuccessPercentage();
                }, 2000);
            }
        }
    }

    // Mise à jour du nombre de monuments restants
    function updateRemainingCount() {
        remainingElement.innerHTML = `<span class="clics-text">Reste</span> ${remainingMonuments.length} / ${totalFilteredMonuments}`;
    }

    // Mise à jour du nombre de clics restants
    function updateClickCountDisplay() {
        clickCountElement.innerHTML = `<span class="clics-text">Clics</span> ${3 - clickCount}`;
    }

    // Calcul et mise à jour du pourcentage de réussite
    function updateSuccessPercentage() {
        const percentage = (successfulAttempts / (totalFilteredMonuments * 100)) * 100;
        successPercentageElement.innerHTML = `<span class="clics-text">Réussite</span>${percentage.toFixed(2)}%`;
    }

    // Timer
    function startTimer() {
        if (timer) {
            clearInterval(timer);
        }
        seconds = 0;
        updateTimerDisplay();
        timer = setInterval(() => {
            seconds++;
            updateTimerDisplay();
        }, 1000);
    }
    function stopTimer() {
        clearInterval(timer);
    }
   function updateTimerDisplay() {
    timerElement.querySelector('.bubble-value').textContent = formatTime(seconds);
}
   function formatTime(totalSeconds) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
    // Sélection de la nouvelle cible avec le bouton "Next"
    nextButton.addEventListener("click", setNewTarget);
    
    loadMonuments();
});
