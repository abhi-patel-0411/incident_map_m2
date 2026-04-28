import React, { useState } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";
import "@esri/calcite-components/components/calcite-navigation";
import "@esri/calcite-components/components/calcite-shell";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import useMediaQuery from "@mui/material/useMediaQuery";

import { MapPanel } from "./components/MapPanel";
import { ListPanel } from "./components/ListPanel";
import { ChartPanel } from "./components/ChartPanel";
import { BottomSheet } from "./components/BottomSheet";
import { LayerModal } from "./components/LayerModal";
import { MapSettingsPanel } from "./components/MapSettingsPanel";
import type { MapSettings } from "./components/MapSettingsPanel";
import { appStateBus, filterBus } from "./EventBus";
import type { ActiveFilters } from "./EventBus";

const DEFAULT_FEATURE_LAYER =
  "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/Hospitals2/FeatureServer/0/query";

export function App(): React.JSX.Element {
  const [activeLayerUrl, setActiveLayerUrl] = useState<string>("");
  const [draftLayerUrl, setDraftLayerUrl] = useState<string>(
    DEFAULT_FEATURE_LAYER,
  );
  const [isLayerModalOpen, setIsLayerModalOpen] = useState<boolean>(false);
  const [appError, setAppError] = React.useState<string | null>(null);

  const [filterClause, setFilterClause] = useState<string>("1=1");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});

  React.useEffect(() => {
    const unsubApp = appStateBus.subscribe((state) => {
      if (state.error) setAppError(state.error);
    });

    // Subscribe to Universal Filter Bus
    const unsubFilter = filterBus.subscribe((state) => {
      setFilterClause(state.sqlClause);
      setActiveFilters(state.filters);
    });

    return () => {
      unsubApp();
      unsubFilter();
    };
  }, []);
  const [layerModalError, setLayerModalError] = useState<string>("");

  const [mapSettings, setMapSettings] = useState<MapSettings>({
    basemap: "streets",
    debounceTime: 400,
    minZoom: 0,
    maxZoom: 24,
    layerVisible: true,
    featureLimit: 100,
  });

  const openLayerModal = (): void => {
    setDraftLayerUrl(activeLayerUrl || DEFAULT_FEATURE_LAYER);
    setLayerModalError("");
    setIsLayerModalOpen(true);
  };

  const closeLayerModal = (): void => {
    setIsLayerModalOpen(false);
    setLayerModalError("");
  };

  const applyLayerUrl = (): void => {
    const nextUrl = draftLayerUrl.trim();
    if (nextUrl.length === 0) {
      setLayerModalError("Layer URL is required.");
      return;
    }

    try {
      const parsed = new URL(nextUrl);
      if (!parsed.protocol.startsWith("http")) {
        setLayerModalError(
          "Use an http or https ArcGIS FeatureServer layer URL.",
        );
        return;
      }
    } catch {
      setLayerModalError("Please enter a valid URL.");
      return;
    }

    setActiveLayerUrl(nextUrl);
    closeLayerModal();
  };

  const handleRemoveLayer = (): void => {
    setActiveLayerUrl("");
    closeLayerModal();
  };

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 899px)");

  return (
    <calcite-shell className="app-root">
      <calcite-navigation
        slot="header"
        style={{
          height: "56px",
          borderBottom: "1px solid #e2e8f0",
          zIndex: 100,
          position: "relative",
        }}
      >
        <Box
          slot="logo"
          sx={{
            display: "flex",
            alignItems: "center",
            px: { xs: 1.5, sm: 3 },
            gap: { xs: 1.5, sm: 2 },
            height: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.1,
                letterSpacing: "-0.5px",
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}
            >
              Incident Mapper
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "#6b7280",
                fontWeight: 600,
                letterSpacing: "0.2px",
                fontSize: { xs: "0.65rem", sm: "0.75rem" },
              }}
            >
              Live Spatial Intelligence
            </Typography>
          </Box>
        </Box>
        <Box
          slot="content-end"
          sx={{
            display: "flex",
            alignItems: "center",
            mr: { xs: 1.5, sm: 3 },
            height: "100%",
          }}
        >
          <MapSettingsPanel
            settings={mapSettings}
            onSettingsChange={setMapSettings}
          />
          <Button
            variant="contained"
            disableElevation
            onClick={openLayerModal}
            sx={{
              borderRadius: "24px",
              px: { xs: 2, sm: 3 },
              py: { xs: 0.5, sm: 0.75 },
              textTransform: "none",
              fontWeight: 700,
              fontSize: { xs: "0.8rem", sm: "0.9rem" },
              background: "linear-gradient(135deg, #111827 0%, #374151 100%)",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              },
            }}
          >
            {activeLayerUrl ? "Manage Layer" : "+ Add Layer"}
          </Button>
        </Box>
      </calcite-navigation>

      <Box
        sx={{
          display: isMobile ? "block" : "grid",
          position: isMobile ? "relative" : "static",
          height: "calc(100dvh - 56px)", // Full height below header
          width: "100%",
          background: "#f3f4f6", // soft modern background
          overflow: "hidden",

          // Tablet layout
          ...(isTablet
            ? {
                gridTemplateColumns: "1fr",
                gridTemplateRows: "60% 40%",
              }
            : {}),

          // Default Desktop
          ...(!isMobile && !isTablet
            ? {
                gridTemplateColumns: "300px 1fr 340px",
                gridTemplateRows: "1fr",
              }
            : {}),

          // Regular Desktop (lg: 1200px - 1535px)
          "@media (min-width: 1200px)": {
            gridTemplateColumns: "320px 1fr 400px",
          },

          // Large/Ultrawide Displays (xl: 1536px+)
          "@media (min-width: 1536px)": {
            gridTemplateColumns: "360px 1fr 500px",
          },
        }}
      >
        {isMobile || isTablet ? (
          <>
            <Box sx={{ height: "100%", width: "100%" }}>
              <MapPanel
                layerUrl={activeLayerUrl}
                settings={mapSettings}
                filterClause={filterClause}
              />
            </Box>
            <BottomSheet>
              <ListPanel
                layerUrl={activeLayerUrl}
                settings={mapSettings}
                filterClause={filterClause}
              />
            </BottomSheet>
          </>
        ) : (
          <>
            <ChartPanel
              layerUrl={activeLayerUrl}
              activeFilters={activeFilters}
            />
            <MapPanel
              layerUrl={activeLayerUrl}
              settings={mapSettings}
              filterClause={filterClause}
            />
            <ListPanel
              layerUrl={activeLayerUrl}
              settings={mapSettings}
              filterClause={filterClause}
            />
          </>
        )}
      </Box>

      <LayerModal
        isOpen={isLayerModalOpen}
        onClose={closeLayerModal}
        draftLayerUrl={draftLayerUrl}
        setDraftLayerUrl={setDraftLayerUrl}
        layerModalError={layerModalError}
        activeLayerUrl={activeLayerUrl}
        onApply={applyLayerUrl}
        onRemoveLayer={handleRemoveLayer}
      />

      <Snackbar
        open={Boolean(appError)}
        autoHideDuration={6000}
        onClose={() => setAppError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAppError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {appError}
        </Alert>
      </Snackbar>
    </calcite-shell>
  );
}
