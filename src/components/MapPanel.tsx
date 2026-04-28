import React, { useEffect, useRef, useState } from "react";
import MapView from "@arcgis/core/views/MapView";
import Map from "@arcgis/core/Map";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { mapEventBus, mapNavigationBus } from "../EventBus";
import type { MapSettings } from "./MapSettingsPanel";

const INITIAL_CENTER: [number, number] = [-40, 28];
const INITIAL_ZOOM = 2;

export function MapPanel({ layerUrl, settings, filterClause = "1=1" }: { layerUrl: string, settings: MapSettings, filterClause?: string }): React.JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const layerRef = useRef<FeatureLayer | null>(null);
  const isInitializingRef = useRef(false);
  const isLayerReadyRef = useRef(false);
  const [isMapLoading, setIsMapLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isInitializingRef.current || !mapContainerRef.current) {
      return;
    }

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    isInitializingRef.current = true;
    isLayerReadyRef.current = false;

    // Explicitly tell other panels (like ListPanel) that the map is NOT ready for the new layer
    mapEventBus.emit({
      extent: null,
      zoom: INITIAL_ZOOM,
      layerReady: false,
    });

    const featureLayer = layerUrl
      ? new FeatureLayer({
          url: layerUrl,
          outFields: ["*"],
          visible: settings.layerVisible,
        })
      : null;
    
    layerRef.current = featureLayer;

    const map = new Map({
      basemap: settings.basemap,
      layers: featureLayer ? [featureLayer] : [],
    });

    const view = new MapView({
      container: mapContainerRef.current,
      map,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      constraints: {
        snapToZoom: false,
        minZoom: settings.minZoom,
        maxZoom: settings.maxZoom,
      },
    });

    viewRef.current = view;

    const viewWatchHandle = reactiveUtils.watch(
      () => [view.extent?.xmin, view.extent?.ymin, view.extent?.xmax, view.extent?.ymax, view.zoom],
      () => {
        if (!view.extent) {
          return;
        }

        if (featureLayer && !isLayerReadyRef.current) {
          return;
        }

        mapEventBus.emit({
          extent: view.extent.clone(),
          zoom: view.zoom ?? INITIAL_ZOOM,
          layerReady: !featureLayer || isLayerReadyRef.current,
        });
      },
      { initial: true },
    );

    const unsubscribeNavigation = mapNavigationBus.subscribe(async ({ goToTarget, openPopup, clearGraphics }: any) => {
      try {
        if (view) {
          if (clearGraphics || goToTarget) {
            view.graphics.removeAll();
          }

          if (goToTarget) {
            await view.goTo(goToTarget);
          }
          if (openPopup && openPopup.geometry) {
            const loc: any = openPopup.geometry.type === "point" ? openPopup.geometry : (openPopup.geometry as any).extent?.center;
            if (view.popup) {
              view.popup.open({
                features: [openPopup],
                location: loc || view.center
              });
            }
          } else {
            if (view.popup) {
              view.popup.visible = false;
            }
          }
        }
      } catch {
        // Ignore interrupted goTo operations (e.g., rapid user interactions)
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName))) {
        return;
      }

      const currentZoom = view.zoom ?? INITIAL_ZOOM;

      if (event.key === "+" || event.key === "=" || event.key === "Add") {
        event.preventDefault();
        mapNavigationBus.emit({
          goToTarget: {
            target: view.center,
            zoom: currentZoom + 1,
          },
        });
        return;
      }

      if (event.key === "-" || event.key === "_" || event.key === "Subtract") {
        event.preventDefault();
        mapNavigationBus.emit({
          goToTarget: {
            target: view.center,
            zoom: currentZoom - 1,
          },
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    if (featureLayer) {
      setIsMapLoading(true);
      view
        .whenLayerView(featureLayer)
        .then((layerView) => {
          reactiveUtils.when(
            () => !view.updating && !layerView.updating,
            () => {
              isLayerReadyRef.current = true;
              setIsMapLoading(false);

              if (view.extent) {
                mapEventBus.emit({
                  extent: view.extent.clone(),
                  zoom: view.zoom ?? INITIAL_ZOOM,
                  layerReady: true,
                });
              }
            },
            { once: true }
          );
        })
        .catch(() => {
          setIsMapLoading(false);
        });
    } else {
      isLayerReadyRef.current = true;
      setIsMapLoading(false);
    }

    isInitializingRef.current = false;

    return () => {
      unsubscribeNavigation();
      window.removeEventListener("keydown", handleKeyDown);
      viewWatchHandle.remove();
      view.destroy();
      viewRef.current = null;
      isLayerReadyRef.current = false;
      isInitializingRef.current = false;
      setIsMapLoading(false);
    };
  }, [layerUrl]); // We intentionally do not include settings here because we want to update them dynamically without reloading the map.

  // Dynamic Settings Updaters
  useEffect(() => {
    if (!viewRef.current || !viewRef.current.map) return;
    
    viewRef.current.map.basemap = settings.basemap as any;
    
    // Apply zoom constraints
    (viewRef.current.constraints as any).minZoom = settings.minZoom;
    (viewRef.current.constraints as any).maxZoom = settings.maxZoom;
  }, [settings.basemap, settings.minZoom, settings.maxZoom]);

  useEffect(() => {
    if (!layerRef.current || !viewRef.current) return;

    const layer = layerRef.current;
    const view = viewRef.current;
    
    // Apply the filter securely to the layer
    layer.definitionExpression = filterClause;

    if (filterClause && filterClause !== "1=1") {
      setIsMapLoading(true);
      
      view.whenLayerView(layer).then((layerView) => {
        // Wait until ArcGIS finishes applying the new definitionExpression visually
        reactiveUtils.whenOnce(() => !layerView.updating).then(async () => {
          try {
            // Using layerView for client-side querying is much faster for large datasets (1000+ features)
            // It searches what was just loaded rather than making another full server roundtrip
            const query = layerView.createQuery();
            
            // Fast count check before downloading geometries
            const count = await layerView.queryFeatureCount(query);

            view.graphics.removeAll();
            if (view.popup) view.popup.visible = false;

            if (count === 1) {
              query.returnGeometry = true;
              query.outFields = ["*"];
              const result = await layerView.queryFeatures(query);
              const features = result.features;
              
              if (features.length > 0 && features[0].geometry) {
                // Single feature zooms in closely
                await view.goTo({
                  target: features[0].geometry,
                  zoom: 15
                });
                
                // Automatically open popup if it's the only one found
                view.openPopup({
                  features: [features[0]],
                  location: features[0].geometry.type === "point" ? features[0].geometry : (features[0].geometry as any).extent?.center
                });
              }
            } else if (count > 1) {
              // Multiple features: grab the mathematical bounding box instead of processing 1000+ geometries
              const extentResult = await layerView.queryExtent(query);
              if (extentResult && extentResult.extent) {
                // .expand(1.2) gives 20% buffering around the clustered points
                await view.goTo(extentResult.extent.expand(1.2), {
                  duration: 600, // Smooth transition
                  easing: "ease-in-out"
                });
              }
            } else {
              console.log("No data matches the applied filter.");
            }
          } catch (e) {
            console.error("Filter mapping/zoom failed:", e);
          } finally {
            setIsMapLoading(false);
          }
        });
      });
    } else {
      // Clear graphics and popup if the filter is completely cleared back to 1=1
      view.graphics.removeAll();
      if (view.popup) view.popup.visible = false;
    }
  }, [filterClause]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.visible = settings.layerVisible;
    }
  }, [settings.layerVisible]);

  return (
    <Box sx={{ minWidth: 0, position: "relative", height: "100%", width: "100%" }}>
      {isMapLoading && (
        <Box
          sx={{
            position: "absolute",
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(4px)",
            borderRadius: "24px",
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 100,
            border: "1px solid #e2e8f0"
          }}
        >
          <CircularProgress size={18} sx={{ color: '#4f46e5' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155" }}>
            Loading Map Layer...
          </Typography>
        </Box>
      )}
      <div ref={mapContainerRef} style={{ marginTop: "8px", height: "calc(100% - 10px)", width: "100%" }} />
    </Box>
  );
}
