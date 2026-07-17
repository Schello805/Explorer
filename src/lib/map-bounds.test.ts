import { describe, expect, it } from "vitest";
import { clampCoordinateToBounds, coordinateToMapPosition, type Bounds } from "@/lib/map-bounds";

const bounds: Bounds = [[10.31, 49.34], [10.33, 49.36]];

describe("map bounds", () => {
  it("keeps valid station coordinates unchanged", () => {
    expect(clampCoordinateToBounds(bounds, [10.32, 49.35])).toEqual([10.32, 49.35]);
  });

  it("keeps station drops inside the configured camp area", () => {
    expect(clampCoordinateToBounds(bounds, [10.4, 49.2])).toEqual([10.33, 49.34]);
  });

  it("derives the same legacy percentage from stored coordinates", () => {
    expect(coordinateToMapPosition(bounds, [10.32, 49.35])).toEqual({ x: 50, y: 50 });
  });
});
