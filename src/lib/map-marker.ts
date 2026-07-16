export function createStationPinElement({ label, color, onClick }: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "platzguide-station-pin";
  element.style.setProperty("--pin-color", color);
  element.setAttribute("aria-label", `${label} öffnen`);
  element.title = label;
  element.innerHTML = `
    <svg class="platzguide-station-pin__svg" viewBox="0 0 46 56" aria-hidden="true">
      <path class="platzguide-station-pin__body" d="M23 53C19.2 42.5 7 36.9 7 21.8C7 11.4 14.2 4 23 4C31.8 4 39 11.4 39 21.8C39 36.9 26.8 42.5 23 53Z" />
      <circle class="platzguide-station-pin__center" cx="23" cy="21.5" r="11.5" />
      <svg class="platzguide-station-pin__icon" x="14" y="12.5" viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path d="M12 3.75 14.05 9.95 20.25 12 14.05 14.05 12 20.25 9.95 14.05 3.75 12 9.95 9.95 12 3.75Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        <circle cx="12" cy="12" r="2.1" fill="currentColor" />
      </svg>
    </svg>
  `;
  element.addEventListener("click", onClick);
  return element;
}

export function setStationPinDragImage(event: DragEvent, { label, color }: { label: string; color: string }) {
  const preview = document.createElement("div");
  preview.className = "platzguide-station-drag-image";
  preview.appendChild(createStationPinElement({ label, color, onClick: () => undefined }));
  document.body.appendChild(preview);
  event.dataTransfer?.setDragImage(preview, 23, 52);
  window.setTimeout(() => preview.remove(), 0);
}
