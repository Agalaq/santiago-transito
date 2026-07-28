const STATUS_COLORS = {
  normal: "#31d07c",
  medium: "#f7c948",
  high: "#ff8a3d",
  critical: "#ff3f5f",
  closed: "#a56bff",
  unavailable: "#77859a"
};

const state = {
  data: null,
  selectedId: null,
  category: "all",
  layers: new Map(),
  timer: null
};

const elements = {
  updatedAt: document.querySelector("#updatedAt"),
  refreshButton: document.querySelector("#refreshButton"),
  overallLabel: document.querySelector("#overallLabel"),
  modeBadge: document.querySelector("#modeBadge"),
  averageSpeed: document.querySelector("#averageSpeed"),
  monitoredCount: document.querySelector("#monitoredCount"),
  criticalCount: document.querySelector("#criticalCount"),
  normalCount: document.querySelector("#normalCount"),
  roadList: document.querySelector("#roadList"),
  categoryFilter: document.querySelector("#categoryFilter"),
  dataNotice: document.querySelector("#dataNotice"),
  locateButton: document.querySelector("#locateButton"),
  toast: document.querySelector("#toast")
};

const map = L.map("map", {
  center: [-33.4489, -70.6693],
  zoom: 11,
  zoomControl: true,
  preferCanvas: true
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(isoDate) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(isoDate));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 3600);
}

function matchesFilter(corridor) {
  if (state.category === "all") return true;
  return corridor.category.toLowerCase().includes(state.category.toLowerCase());
}

function popupContent(corridor) {
  const speed = corridor.available ? `${corridor.currentSpeed} km/h` : "Sin datos";
  const freeFlow = corridor.available ? `${corridor.freeFlowSpeed} km/h` : "—";
  const delay = corridor.available ? `${corridor.delayMinutes} min` : "—";

  return `
    <div class="popup-title">${escapeHtml(corridor.name)}</div>
    <div class="popup-grid">
      <span>Estado</span><strong>${escapeHtml(corridor.status.label)}</strong>
      <span>Velocidad</span><strong>${speed}</strong>
      <span>Flujo libre</span><strong>${freeFlow}</strong>
      <span>Demora</span><strong>${delay}</strong>
    </div>
  `;
}

function renderMap(corridors) {
  state.layers.forEach(layer => map.removeLayer(layer));
  state.layers.clear();

  corridors.forEach(corridor => {
    const geometry = corridor.shape?.length >= 2 ? corridor.shape : corridor.points;
    const color = STATUS_COLORS[corridor.status.level] ?? STATUS_COLORS.unavailable;

    const outline = L.polyline(geometry, {
      color: "#07111f",
      weight: 11,
      opacity: 0.76,
      lineCap: "round",
      interactive: false
    }).addTo(map);

    const line = L.polyline(geometry, {
      color,
      weight: state.selectedId === corridor.id ? 8 : 6,
      opacity: 0.95,
      lineCap: "round"
    })
      .bindPopup(popupContent(corridor), { maxWidth: 270 })
      .on("click", () => selectCorridor(corridor.id, false))
      .addTo(map);

    state.layers.set(corridor.id, { line, outline });
  });
}

function roadCard(corridor) {
  const speed = corridor.available ? corridor.currentSpeed : "—";
  const meta = corridor.available
    ? `${corridor.status.label} · demora ${corridor.delayMinutes} min`
    : corridor.status.label;

  return `
    <article class="road-card ${state.selectedId === corridor.id ? "active" : ""}"
      data-road-id="${escapeHtml(corridor.id)}"
      tabindex="0"
      role="button"
      aria-label="Ver ${escapeHtml(corridor.name)} en el mapa">
      <i class="status-indicator status-${escapeHtml(corridor.status.level)}"></i>
      <div class="road-main">
        <strong class="road-name">${escapeHtml(corridor.name)}</strong>
        <div class="road-meta">
          <span>${escapeHtml(corridor.category)}</span>
          <span>•</span>
          <span>${escapeHtml(meta)}</span>
        </div>
      </div>
      <div class="road-speed">
        <strong>${speed}</strong>
        <span>km/h</span>
      </div>
    </article>
  `;
}

function renderRoads(corridors) {
  const visible = corridors.filter(matchesFilter);

  elements.roadList.innerHTML = visible.length
    ? visible.map(roadCard).join("")
    : '<div class="loading-card">No hay vías para este filtro.</div>';

  elements.roadList.querySelectorAll("[data-road-id]").forEach(card => {
    const activate = () => selectCorridor(card.dataset.roadId, true);
    card.addEventListener("click", activate);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });
}

function renderSummary(data) {
  elements.updatedAt.textContent = formatTime(data.updatedAt);
  elements.overallLabel.textContent = data.summary.status.label;
  elements.averageSpeed.textContent = data.summary.averageSpeed;
  elements.monitoredCount.textContent = `${data.summary.available}/${data.summary.monitored}`;
  elements.criticalCount.textContent = data.summary.critical;
  elements.normalCount.textContent = data.summary.normal;

  elements.modeBadge.textContent = data.mode === "live" ? "DATOS REALES" : "MODO DEMO";
  elements.modeBadge.classList.toggle("demo", data.mode !== "live");

  elements.dataNotice.textContent = data.mode === "live"
    ? `Fuente: ${data.provider}. El panel se actualiza automáticamente cada ${data.refreshSeconds} segundos.`
    : "Modo demostración activo. Agrega TOMTOM_API_KEY en las variables de entorno de Netlify para usar tráfico real.";
}

function selectCorridor(id, moveMap) {
  state.selectedId = id;
  const corridor = state.data?.corridors.find(item => item.id === id);
  if (!corridor) return;

  renderRoads(state.data.corridors);
  renderMap(state.data.corridors);

  const layer = state.layers.get(id)?.line;
  if (layer && moveMap) {
    map.fitBounds(layer.getBounds(), { padding: [45, 45], maxZoom: 13 });
    layer.openPopup();
  }
}

async function loadTraffic({ manual = false } = {}) {
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = "Actualizando…";

  try {
    const response = await fetch(`/api/traffic${manual ? `?refresh=${Date.now()}` : ""}`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Error ${response.status}`);
    }

    const data = await response.json();
    state.data = data;
    renderSummary(data);
    renderRoads(data.corridors);
    renderMap(data.corridors);

    if (manual) showToast("Información de tránsito actualizada.");

    window.clearInterval(state.timer);
    state.timer = window.setInterval(
      () => loadTraffic(),
      Math.max(30, data.refreshSeconds || 60) * 1000
    );
  } catch (error) {
    console.error(error);
    showToast("No fue posible obtener la información. Revisa la configuración de Netlify.");
    elements.dataNotice.textContent = "Error al consultar la función /api/traffic.";
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = "Actualizar";
  }
}

elements.refreshButton.addEventListener("click", () => loadTraffic({ manual: true }));

elements.categoryFilter.addEventListener("change", event => {
  state.category = event.target.value;
  if (state.data) renderRoads(state.data.corridors);
});

elements.locateButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showToast("Tu navegador no permite obtener la ubicación.");
    return;
  }

  elements.locateButton.textContent = "Buscando…";
  navigator.geolocation.getCurrentPosition(
    position => {
      const coords = [position.coords.latitude, position.coords.longitude];
      map.setView(coords, 14);
      L.circleMarker(coords, {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#28a8ff",
        fillOpacity: 1
      })
        .addTo(map)
        .bindPopup("Tu ubicación aproximada")
        .openPopup();
      elements.locateButton.textContent = "Mi ubicación";
    },
    () => {
      showToast("No se pudo acceder a tu ubicación.");
      elements.locateButton.textContent = "Mi ubicación";
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
  );
});

loadTraffic();
