const stationPinClickHandlers = new WeakMap<HTMLElement, () => void>();

export function createStationPinElement(options: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  const markerRoot = document.createElement("div");
  markerRoot.className = "platzguide-station-marker";
  markerRoot.innerHTML = `
    <button type="button" class="platzguide-station-pin" draggable="false">
      <svg class="platzguide-station-pin__svg" viewBox="0 0 46 56" aria-hidden="true">
        <path class="platzguide-station-pin__body" d="M23 53C19.2 42.5 7 36.9 7 21.8C7 11.4 14.2 4 23 4C31.8 4 39 11.4 39 21.8C39 36.9 26.8 42.5 23 53Z" />
        <circle class="platzguide-station-pin__center" cx="23" cy="21.5" r="11.5" />
        <svg class="platzguide-station-pin__icon" x="14" y="12.5" viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path d="M12 3.75 14.05 9.95 20.25 12 14.05 14.05 12 20.25 9.95 14.05 3.75 12 9.95 9.95 12 3.75Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          <circle cx="12" cy="12" r="2.1" fill="currentColor" />
        </svg>
      </svg>
    </button>
  `;
  const button = markerRoot.querySelector<HTMLButtonElement>(".platzguide-station-pin");
  if (!button) throw new Error("Stationsmarker konnte nicht erstellt werden.");
  button.addEventListener("dragstart", (event) => event.preventDefault());
  button.addEventListener("click", (event) => {
    if (markerRoot.dataset.dragged === "true") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    stationPinClickHandlers.get(markerRoot)?.();
  });
  updateStationPinElement(markerRoot, options);
  return markerRoot;
}

export function updateStationPinElement(markerRoot: HTMLElement, {
  stationId,
  label,
  color,
  longitude,
  latitude,
  onClick
}: {
  stationId?: string;
  label: string;
  color: string;
  longitude?: number;
  latitude?: number;
  onClick: () => void;
}) {
  const button = markerRoot.querySelector<HTMLButtonElement>(".platzguide-station-pin");
  if (!button) return;
  markerRoot.style.setProperty("--pin-color", color);
  markerRoot.dataset.stationId = stationId ?? "";
  markerRoot.dataset.longitude = Number.isFinite(longitude) ? String(longitude) : "";
  markerRoot.dataset.latitude = Number.isFinite(latitude) ? String(latitude) : "";
  button.setAttribute("aria-label", `${label} öffnen`);
  button.title = label;
  stationPinClickHandlers.set(markerRoot, onClick);
}
