export type Bounds = [[number, number], [number, number]];
export const defaultMapStyleUrl = "https://tiles.openfreemap.org/styles/liberty";

export function boundsCorners(bounds: Bounds): [number, number][] {
  const [[west, south], [east, north]] = bounds;
  return [[west, north], [east, north], [east, south], [west, south]];
}

export function resizeBoundsFromCorner(bounds: Bounds, cornerIndex: number, point: [number, number]): Bounds {
  const [[west, south], [east, north]] = bounds;
  const [longitude, latitude] = point;
  if (cornerIndex === 0) return normalizeBounds([[longitude, south], [east, latitude]]);
  if (cornerIndex === 1) return normalizeBounds([[west, south], [longitude, latitude]]);
  if (cornerIndex === 2) return normalizeBounds([[west, latitude], [longitude, north]]);
  return normalizeBounds([[longitude, latitude], [east, north]]);
}

export function normalizeBounds(bounds: Bounds): Bounds {
  const west = Math.max(-180, Math.min(bounds[0][0], bounds[1][0]));
  const east = Math.min(180, Math.max(bounds[0][0], bounds[1][0]));
  const south = Math.max(-90, Math.min(bounds[0][1], bounds[1][1]));
  const north = Math.min(90, Math.max(bounds[0][1], bounds[1][1]));
  return [[west, south], [east, north]];
}

export function defaultBounds(center: [number, number]): Bounds {
  return normalizeBounds([
    [center[0] - 0.004, center[1] - 0.0025],
    [center[0] + 0.004, center[1] + 0.0025]
  ]);
}

export function boundsCenter(bounds: Bounds): [number, number] {
  return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
}

export function coordinateToMapPosition(bounds: Bounds, coordinate: [number, number]) {
  const [[west, south], [east, north]] = bounds;
  const longitudeSpan = east - west || 1;
  const latitudeSpan = north - south || 1;
  return {
    x: Math.round(Math.min(96, Math.max(4, ((coordinate[0] - west) / longitudeSpan) * 100))),
    y: Math.round(Math.min(92, Math.max(8, ((north - coordinate[1]) / latitudeSpan) * 100)))
  };
}

export function clampCoordinateToBounds(bounds: Bounds, coordinate: [number, number]): [number, number] {
  const [[west, south], [east, north]] = bounds;
  return [
    Math.min(east, Math.max(west, coordinate[0])),
    Math.min(north, Math.max(south, coordinate[1]))
  ];
}

export function validBounds(value: unknown): value is Bounds {
  return Array.isArray(value) && value.length === 2 && value.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
}
