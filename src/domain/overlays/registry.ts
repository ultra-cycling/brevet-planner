import { daylightOverlay } from './daylightOverlay';
import { gradientOverlay } from './gradientOverlay';
import type { RouteOverlay } from './RouteOverlay';

/** Lookup of the available route overlays by id, in the order they are offered. */
export class OverlayRegistry {
  private readonly overlays = new Map<string, RouteOverlay>();

  constructor(overlays: RouteOverlay[] = []) {
    overlays.forEach((o) => this.register(o));
  }

  register(overlay: RouteOverlay): void {
    if (this.overlays.has(overlay.id)) throw new Error(`Overlay "${overlay.id}" is already registered`);
    this.overlays.set(overlay.id, overlay);
  }

  get(id: string): RouteOverlay | undefined {
    return this.overlays.get(id);
  }

  list(): RouteOverlay[] {
    return [...this.overlays.values()];
  }
}

export function createDefaultOverlayRegistry(): OverlayRegistry {
  return new OverlayRegistry([gradientOverlay, daylightOverlay]);
}
