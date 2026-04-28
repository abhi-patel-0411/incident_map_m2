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

// --- Universal Filter Bus ---
export type ActiveFilters = Record<string, string[] | number[]>;

export type FilterStateEvent = {
  filters: ActiveFilters;
  sqlClause: string;
};

export type FilterStateListener = (event: FilterStateEvent) => void;

class FilterStateBus {
  private readonly listeners = new Set<FilterStateListener>();
  private currentFilters: ActiveFilters = {};

  subscribe(listener: FilterStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getSqlClause(filters: ActiveFilters): string {
    const conditions: string[] = [];
    for (const [field, values] of Object.entries(filters)) {
      if (values.length > 0) {
        if (typeof values[0] === "string") {
          const stringVals = values.map(
            (v) => `'${String(v).replace(/'/g, "''")}'`,
          );
          conditions.push(`${field} IN (${stringVals.join(", ")})`);
        } else {
          conditions.push(`${field} IN (${values.join(", ")})`);
        }
      }
    }
    return conditions.length > 0 ? conditions.join(" AND ") : "1=1";
  }

  getState(): FilterStateEvent {
    return {
      filters: { ...this.currentFilters },
      sqlClause: this.getSqlClause(this.currentFilters),
    };
  }

  toggleFilter(field: string, value: string | number): void {
    const currentValues = this.currentFilters[field] || [];
    const index = currentValues.indexOf(value as never);

    const newValues = [...currentValues] as never[];
    if (index >= 0) {
      newValues.splice(index, 1);
    } else {
      newValues.push(value as never);
    }

    if (newValues.length === 0) {
      delete this.currentFilters[field];
    } else {
      this.currentFilters[field] = newValues;
    }

    this.emit();
  }

  setFilter(field: string, values: string[] | number[]): void {
    if (values.length === 0) {
      delete this.currentFilters[field];
    } else {
      this.currentFilters[field] = values;
    }
    this.emit();
  }

  clearAll(): void {
    this.currentFilters = {};
    this.emit();
  }

  private emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const filterBus = new FilterStateBus();
