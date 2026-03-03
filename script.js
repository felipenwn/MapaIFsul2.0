const borders = [
    [-28.239057466703663, -52.360110462617754],
    [-28.241515486440136, -52.35980740662215],
    [-28.241312229263894, -52.35702894634385],
    [-28.23871479265864, -52.35736670056089]
];

const center = borders.reduce(
    (acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng],
    [0, 0]
).map(v => v / borders.length);

var map = L.map('map', {
    boxZoom: false,
    center: center,
    maxBounds: borders,
    maxBoundsViscosity: 0.9,
    zoom: 18,
    zoomControl: false // Oculta o padrão superior-esquerdo
});

// Adiciona no canto inferior direito
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 18,
    maxZoom: 21,
    attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'jpg'
}).addTo(map);

// Elementos da Interface
const mapContainer = document.getElementById('map-container');
const buildingView = document.getElementById('building-view');
const btnBack = document.getElementById('btn-back');
const charactersContainer = document.getElementById('characters-container');
const buildingTitle = document.getElementById('building-title');

// Ícone customizado Animado
const customIcon = L.divIcon({
    className: 'custom-icon',
    html: `
        <div class="pulse-marker-wrapper">
            <div class="pulse-marker-core"></div>
            <div class="pulse-marker-ring"></div>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Dados dos Personagens 2D
const buildingCharacters = [
    { id: 1, name: "Maria Silva", role: "Recepcionista", x: "30%", y: "70%", svg: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria&backgroundColor=b6e3f4" },
    { id: 2, name: "João Souza", role: "Segurança", x: "65%", y: "60%", svg: "https://api.dicebear.com/7.x/avataaars/svg?seed=João&backgroundColor=c0aede" },
    { id: 3, name: "Ana Costa", role: "Coordenadora", x: "50%", y: "80%", svg: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=ffdfbf" }
];

async function loadMarkers() {
    try {
        const response = await fetch('./markers.json');
        const data = await response.json();

        data.forEach(el => {
            switch (el.type) {
                case 'marker':
                    const isBuilding = el.name.toLowerCase().includes('prédio');
                    let markerOptions = {};

                    if (isBuilding) {
                        markerOptions = { icon: customIcon };
                    }

                    const marker = L.marker(el.location, markerOptions);

                    // Apenas adiciona popup para locais não-prédio
                    if (!isBuilding) {
                        marker.bindPopup(`<b>${el.name}</b>${el.description ? '<hr>' + el.description : ''}`);
                    }

                    marker.addTo(map);

                    if (isBuilding) {
                        // Clique no Prédio - Transição!
                        marker.on('click', () => {
                            enterBuilding(el.name, el.location);
                        });
                    }
                    break;

                case 'area':
                    L.polygon(el.locations, { color: '#4f46e5', weight: 2, fillOpacity: 0.3 })
                        .bindPopup(`<b>${el.name}</b>${el.description ? '<hr>' + el.description : ''}`)
                        .addTo(map);
                    break;

                default:
                    break;
            }
        });
    }
    catch (error) {
        console.error('Falha ao carregar marcadores!\n', error);
    }
}

// ---- Máquina de Transições (Leaflet + GSAP) ----

function enterBuilding(buildingName, location) {
    // 1. Fechar popups ativos
    map.closePopup();

    // 2. Zoom in suave no Leaflet até maxZoom
    map.flyTo(location, 21, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.5
    });

    // Aguarda o fim da animação do flyTo
    map.once('moveend', () => {
        // Popula infos do prédio e cria personagens na DOM
        buildingTitle.textContent = buildingName;
        renderCharacters();

        buildingView.classList.remove('hidden');

        const tl = gsap.timeline();

        // 3. Fake Crossfade
        tl.to(mapContainer, {
            opacity: 0,
            duration: 0.8,
            ease: "power2.inOut"
        })
            .to(buildingView, {
                opacity: 1,
                duration: 0.8,
                ease: "power2.inOut"
            }, "-=0.4")
            .from(".char-wrapper", {
                y: 50,
                opacity: 0,
                duration: 0.6,
                stagger: 0.15,
                ease: "back.out(1.7)"
            });

        mapContainer.style.pointerEvents = 'none';
        buildingView.style.pointerEvents = 'auto';
    });
}

btnBack.addEventListener('click', () => {
    // Reverta a animação da interface
    const tl = gsap.timeline({
        onComplete: () => {
            buildingView.classList.add('hidden');
            charactersContainer.innerHTML = '';

            // Voltar o zoom no mapa para o centro inicial
            map.flyTo(center, 18, {
                animate: true,
                duration: 1.5,
                easeLinearity: 0.5
            });

            mapContainer.style.pointerEvents = 'auto';
            buildingView.style.pointerEvents = 'none';
        }
    });

    tl.to(".char-wrapper", {
        y: 20,
        opacity: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: "power1.in"
    })
        .to(buildingView, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.inOut"
        })
        .to(mapContainer, {
            opacity: 1,
            duration: 0.6,
            ease: "power2.inOut"
        }, "-=0.3");
});

function renderCharacters() {
    charactersContainer.innerHTML = '';

    buildingCharacters.forEach(char => {
        const charEl = document.createElement('div');
        charEl.className = 'char-wrapper absolute group cursor-pointer pointer-events-auto flex flex-col items-center justify-end';
        charEl.style.left = char.x;
        charEl.style.top = char.y;
        charEl.style.transform = 'translate(-50%, -100%)';
        // Base de colisão/z-index artificial
        charEl.style.zIndex = parseInt(char.y);

        charEl.innerHTML = `
            <div class="char-tooltip absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-white text-gray-800 px-4 py-2 rounded-xl shadow-2xl w-max flex flex-col items-center border border-gray-100 transform origin-bottom group-hover:scale-100 scale-95 transition-transform">
                <span class="font-bold text-sm leading-tight text-gray-900">${char.name}</span>
                <span class="text-xs text-indigo-600 font-semibold tracking-wide">${char.role}</span>
                <div class="absolute -bottom-2 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-100"></div>
            </div>
            
            <div class="char-img bg-white/50 backdrop-blur rounded-full p-1 shadow-lg border-2 border-white/80 transition-shadow group-hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                <img src="${char.svg}" class="w-20 h-20 rounded-full bg-indigo-50" alt="${char.name}">
            </div>
        `;

        charactersContainer.appendChild(charEl);

        // Hover - Pulo Suave
        charEl.addEventListener('mouseenter', () => {
            gsap.to(charEl.querySelector('.char-img'), {
                y: -12,
                duration: 0.3,
                ease: "back.out(2)",
                yoyo: true,
                repeat: 1
            });
        });

        // Click - Celebração/Aceno (Rotação repetida)
        charEl.addEventListener('click', () => {
            gsap.fromTo(charEl.querySelector('.char-img'),
                { rotation: -15 },
                {
                    rotation: 15, duration: 0.15, yoyo: true, repeat: 3, ease: "sine.inOut", onComplete: () => {
                        gsap.to(charEl.querySelector('.char-img'), { rotation: 0, duration: 0.2 });
                    }
                }
            );
        });
    });
}

loadMarkers();

/////////////////////////////////////////////////////////////////////////////////////////////

map.on('click', function (e) {
    if (e.originalEvent.shiftKey) {
        const { lat, lng } = e.latlng;
        const text = lat + ', ' + lng;
        navigator.clipboard.writeText(text);
    }
});