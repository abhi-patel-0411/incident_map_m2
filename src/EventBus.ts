import Extent from "@arcgis/core/geometry/Extent";
import MapView from "@arcgis/core/views/MapView";

export type MapViewportEvent = {
  extent: Extent | null;
  zoom: number;
  layerReady: boolean;
};

export type MapViewportListener = (event: MapViewportEvent) => void;

export type MapNavigationEvent = {
  goToTarget?: Parameters<MapView["goTo"]>[0] | null;
  openPopup?: import("@arcgis/core/Graphic").default | null;
  clearGraphics?: boolean;
  highlightFeatures?: import("@arcgis/core/Graphic").default[] | null;
};

export type MapNavigationListener = (event: MapNavigationEvent) => void;

class MapEventBus {
  private readonly listeners = new Set<MapViewportListener>();

  subscribe(listener: MapViewportListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: MapViewportEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

class MapNavigationBus {
  private readonly listeners = new Set<MapNavigationListener>();

  subscribe(listener: MapNavigationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: MapNavigationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const mapEventBus = new MapEventBus();
export const mapNavigationBus = new MapNavigationBus();

// --- FL-015 Shared State Bus ---
export type AppStateEvent = {
  isFetching?: boolean;
  error?: string | null;
};
export type AppStateListener = (event: AppStateEvent) => void;

class AppSharedStateBus {
  private readonly listeners = new Set<AppStateListener>();
  private currentState: AppStateEvent = { isFetching: false, error: null };

  subscribe(listener: AppStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => this.listeners.delete(listener);
  }

  emit(event: AppStateEvent): void {
    this.currentState = { ...this.currentState, ...event };
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}
export const appStateBus = new AppSharedStateBus();
