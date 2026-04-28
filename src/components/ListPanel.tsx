import React, { useEffect, useRef, useState, useMemo } from "react";
import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Pagination from "@mui/material/Pagination";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { mapEventBus, mapNavigationBus, appStateBus } from "../EventBus";
import type { MapSettings } from "./MapSettingsPanel";
import { Filter } from "./Filter";

// Dynamic helpers to extract display info from ANY feature layer
const getDynamicTitle = (attributes: Record<string, unknown>) => {
  // 🔥 Priority-based detection
  if (attributes.place) return String(attributes.place); // ✅ earthquake
  if (attributes.name) return String(attributes.name);
  if (attributes.NAME) return String(attributes.NAME);
  if (attributes.title) return String(attributes.title);

  // fallback logic
  const keys = Object.keys(attributes).filter(
    (k) => !["objectid", "fid", "shape", "globalid"].includes(k.toLowerCase()),
  );

  if (keys.length === 0) return "Unknown Feature";

  return attributes[keys[0]] ? String(attributes[keys[0]]) : "Unnamed Feature";
};

const getDynamicDescription = (attributes: Record<string, unknown>) => {
  const keys = Object.keys(attributes).filter(
    (k) =>
      k.toLowerCase() !== "objectid" &&
      k.toLowerCase() !== "fid" &&
      k.toLowerCase() !== "shape" &&
      k.toLowerCase() !== "globalid",
  );

  const descKeys = keys.slice(1, 3);
  if (descKeys.length === 0) return "No additional details dynamically found";
  return descKeys.map((k) => `${k}: ${attributes[k] || "N/A"}`).join(" | ");
};

const getDynamicDetails = (attributes: Record<string, unknown>) => {
  const keys = Object.keys(attributes).filter(
    (k) =>
      ![
        "objectid",
        "fid",
        "shape",
        "globalid",
        "name",
        "name",
        "title",
        "place",
      ].includes(k.toLowerCase()),
  );

  // Grab up to 4 meaningful attributes to show as responsive tags
  const detailKeys = keys.slice(0, 4);
  if (detailKeys.length === 0) return [];

  return detailKeys.map((k) => ({
    label: k,
    value: attributes[k] != null ? String(attributes[k]) : "N/A",
  }));
};

const INITIAL_ZOOM = 2;
const LIST_ITEM_FOCUS_ZOOM = 10;

const FilterIcon = () => (
  <svg fill="currentColor" viewBox="0 0 20 20" width="20" height="20">
    <path
      fillRule="evenodd"
      d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
      clipRule="evenodd"
    />
  </svg>
);

export function ListPanel({
  layerUrl,
  settings,
  filterClause = "1=1",
  onFilterChange,
}: {
  layerUrl: string;
  settings: MapSettings;
  filterClause?: string;
  onFilterChange?: (clause: string) => void;
}): React.JSX.Element {
  const [features, setFeatures] = useState<Graphic[]>([]);
  const [zoom, setZoom] = useState<number>(INITIAL_ZOOM);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10); // Configurable 10 / 25 / 50
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<number>>(
    new Set(),
  );

  const layerRef = useRef<FeatureLayer | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const lastFilterRef = useRef<string>(filterClause || "1=1");
  const filterChangeTime = useRef<number>(0);

  // Preserve map state here to trigger queries on settings changes
  const [mapState, setMapState] = useState<{
    extent: any | null;
    layerReady: boolean;
  }>({
    extent: null,
    layerReady: false,
  });

  useEffect(() => {
    // Whenever layerUrl changes, immediately clear old data and explicitly disable readiness
    setFeatures([]);
    setError("");
    setSelectedFeatureIds(new Set());
    setMapState((prev) => ({ ...prev, layerReady: false }));
    // We intentionally don't emit onFilterChange("1=1") here anymore because Filter.tsx will handle its own reset when layerUrl changes

    if (!layerUrl) {
      layerRef.current = null;
      setLoading(false);
      return;
    }

    setLoading(true);
    layerRef.current = new FeatureLayer({
      url: layerUrl,
    });

    return () => {
      layerRef.current = null;
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [layerUrl]); // CRITICAL FIX: Removed filterClause dependency

  // Automatically zoom map to filtered results when the filter changes
  useEffect(() => {
    if (!layerRef.current || !mapState.layerReady) return;

    // Prioritize selected features if any
    if (selectedFeatureIds.size > 0) {
      const currentLayer = layerRef.current;
      currentLayer
        .load()
        .then(() => {
          const query = currentLayer.createQuery();
          query.objectIds = Array.from(selectedFeatureIds);
          return currentLayer.queryExtent(query);
        })
        .then((response) => {
          if (response.extent) {
            const e = response.extent;
            if (e.xmin === e.xmax && e.ymin === e.ymax) {
              mapNavigationBus.emit({
                goToTarget: { target: e.center, zoom: LIST_ITEM_FOCUS_ZOOM },
              });
            } else {
              mapNavigationBus.emit({
                goToTarget: { target: e.clone().expand(1.2) },
              });
            }
          }
        })
        .catch((err) =>
          console.error("Failed to zoom to selected features", err),
        );
      return;
    }

    if (filterClause && filterClause !== "1=1") {
      const currentLayer = layerRef.current;
      currentLayer
        .load()
        .then(() => {
          const query = currentLayer.createQuery();
          query.where = filterClause;
          // Don't limit to map extent spatial reference to avoid bounding box calculation issues
          return currentLayer.queryExtent(query);
        })
        .then((response) => {
          if (response.extent) {
            const e = response.extent;

            if (e.xmin === e.xmax && e.ymin === e.ymax) {
              // It's a single point mathematically. The map needs a tight fallback zoom so it doesn't get confused
              mapNavigationBus.emit({
                goToTarget: { target: e.center, zoom: LIST_ITEM_FOCUS_ZOOM },
                clearGraphics: true,
              });
            } else {
              // It's a region, zoom accurately to the bounds of that region.
              mapNavigationBus.emit({
                goToTarget: { target: e.clone().expand(1.2) },
                clearGraphics: true,
              });
            }
          }
        })
        .catch((err) => {
          console.error("Failed to zoom to filtered extent", err);
        });
    } else if (filterClause === "1=1" || !filterClause) {
      // Clear graphics when there is no filter
      mapNavigationBus.emit({ clearGraphics: true });
    }
    // Intentionally omit mapState.extent so we don't zoom on every pan
  }, [filterClause, mapState.layerReady, selectedFeatureIds]);

  useEffect(() => {
    const unsubscribe = mapEventBus.subscribe(
      ({ extent, zoom: zoomLevel, layerReady }) => {
        setZoom(zoomLevel);
        setMapState({ extent, layerReady });
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!mapState.layerReady || !layerRef.current) return;

    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = window.setTimeout(async () => {
      const currentLayer = layerRef.current;
      if (!currentLayer) return;

      if (!isCancelled) {
        setLoading(true);
        appStateBus.emit({ isFetching: true, error: null });
        setError("");
      }

      try {
        // 1. Ensure layer is fully loaded before querying to avoid metadata errors
        await currentLayer.load();

        // Reject layers that don't support capabilities
        if (currentLayer.capabilities && !currentLayer.capabilities.query) {
          throw new Error("This layer does not support querying features.");
        }

        const query = currentLayer.createQuery();
        query.where = filterClause || "1=1"; // Standard fallback to prevent malformed default queries

        if (lastFilterRef.current !== filterClause) {
          lastFilterRef.current = filterClause || "1=1";
          filterChangeTime.current = Date.now();
        }

        // Apply bounds filtering ALWAYS to keep map view synchronized with list
        if (mapState.extent) {
          query.geometry = mapState.extent; // Strict border containment, no expansion
          query.spatialRelationship = "intersects"; // Faster spatial index check instead of strict geometry contains
          query.outSpatialReference = mapState.extent.spatialReference; // Hard lock the spatial ref
        }

        // Use all fields to prevent ArcGIS missing-field crash errors.
        query.outFields = ["*"];
        query.returnGeometry = false; // 🚀 MEGA OPTIMIZATION: Don't fetch expensive polygons for the list
        query.num = settings.featureLimit;

        let result = await currentLayer.queryFeatures(query);

        if (!isCancelled) {
          setFeatures(result.features);
          setPage(1); // Reset page on new data
        }
      } catch (queryError) {
        if (!isCancelled) {
          const errorMsg =
            queryError instanceof Error
              ? queryError.message
              : "Unable to query visible features";
          setError(errorMsg);
          setFeatures([]);
          appStateBus.emit({ error: errorMsg }); // FL-015: propagate error to global snackbar
        }
      } finally {
        if (!isCancelled && layerRef.current === currentLayer) {
          setLoading(false);
          appStateBus.emit({ isFetching: false });
        }
      }
    }, settings.debounceTime); // Dynamic debounce from settings

    return () => {
      isCancelled = true;
    };
  }, [
    mapState,
    layerUrl,
    settings.debounceTime,
    settings.featureLimit,
    filterClause,
  ]);

  const handleChangePage = (
    _event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
    setPage(value);

    // Scroll list back to top when page changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const paginatedFeatures = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return features.slice(startIndex, startIndex + rowsPerPage);
  }, [features, page, rowsPerPage]);

  const renderedFeatures = useMemo(() => {
    return paginatedFeatures.map((feature, idx) => {
      const attributes = feature.attributes as Record<string, unknown>;
      // Calculate true index based on page
      const index = (page - 1) * rowsPerPage + idx;

      const objectIdField = layerRef.current?.objectIdField || "";
      let objectId = objectIdField ? attributes[objectIdField] : null;

      if (objectId == null) {
        objectId =
          attributes.OBJECTID ?? attributes.objectid ?? attributes.FID ?? index;
      }

      const isSelected = selectedFeatureIds.has(Number(objectId));

      return (
        <Card
          key={String(objectId)}
          elevation={0}
          sx={{
            border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
            backgroundColor: isSelected ? "#eff6ff" : "inherit",
            borderRadius: 2,
            cursor: "pointer",
            transition: "all 0.2s",
            "&:hover": {
              backgroundColor: isSelected ? "#eff6ff" : "#f8fafc",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            },
          }}
          onClick={async () => {
            if (feature.geometry != null) {
              mapNavigationBus.emit({
                goToTarget: {
                  target: feature.geometry,
                  zoom: LIST_ITEM_FOCUS_ZOOM,
                },
                openPopup: feature,
              });
              return;
            }

            // Fallback: Geometry wasn't fetched to save bandwidth. Fetch it on click!
            if (layerRef.current && objectId != null) {
              try {
                const geomQuery = layerRef.current.createQuery();
                geomQuery.objectIds = [Number(objectId)];
                geomQuery.returnGeometry = true;
                geomQuery.outFields = ["*"]; // Need fields for popup
                const res = await layerRef.current.queryFeatures(geomQuery);

                if (
                  res.features.length > 0 &&
                  res.features[0].geometry != null
                ) {
                  mapNavigationBus.emit({
                    goToTarget: {
                      target: res.features[0].geometry,
                      zoom: LIST_ITEM_FOCUS_ZOOM,
                    },
                    openPopup: res.features[0],
                  });
                }
              } catch (err) {
                console.error("Failed to zoom to feature geometry:", err);
              }
            }
          }}
        >
          <CardContent
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: { xs: 1.5, sm: 2 },
              p: { xs: 1.5, sm: 2 },
              "&:last-child": { pb: { xs: 1.5, sm: 2 } },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Checkbox
                checked={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  const newSet = new Set(selectedFeatureIds);
                  if (isSelected) {
                    newSet.delete(Number(objectId));
                  } else {
                    newSet.add(Number(objectId));
                  }
                  setSelectedFeatureIds(newSet);
                }}
                size="small"
                sx={{ p: 0, mb: 1, color: "#cbd5e1" }}
              />
              <Avatar
                sx={{
                  bgcolor: isSelected ? "#3b82f6" : "#eff6ff",
                  color: isSelected ? "#ffffff" : "#3b82f6",
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  fontWeight: 700,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </Avatar>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: "#1e293b",
                  lineHeight: 1.3,
                  mb: 1,
                  fontSize: { xs: "0.95rem", sm: "1.05rem" },
                  wordBreak: "break-word",
                }}
              >
                {getDynamicTitle(attributes)}
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {getDynamicDetails(attributes).map((detail, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "stretch",
                      background: "#f8fafc",
                      borderRadius: 1.5,
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      maxWidth: "100%",
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        px: { xs: 0.75, sm: 1 },
                        py: 0.25,
                        fontSize: { xs: "0.65rem", sm: "0.7rem" },
                        fontWeight: 700,
                        color: "#475569",
                        background: "#f1f5f9",
                        borderRight: "1px solid #e2e8f0",
                        textTransform: "uppercase",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {detail.label}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        px: { xs: 0.75, sm: 1 },
                        py: 0.25,
                        fontSize: { xs: "0.7rem", sm: "0.75rem" },
                        color: "#0f172a",
                        fontWeight: 500,
                        maxWidth: { xs: "120px", sm: "180px" },
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {detail.value}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Fallback string if no keys found */}
              {getDynamicDetails(attributes).length === 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "#64748b",
                    lineHeight: 1.4,
                    mt: 0.5,
                    fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  }}
                >
                  {getDynamicDescription(attributes)}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      );
    });
  }, [paginatedFeatures, page, rowsPerPage, selectedFeatureIds]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Box
      sx={{
        marginTop: isMobile ? 0 : "8px",
        background: "#ffffff",
        boxShadow: isMobile ? "none" : "-8px 0 32px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: isMobile ? "100%" : "calc(100% - 8px)",
        position: "relative",
        zIndex: 10,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 3 },
          pb: { xs: 1.5, md: 2.5 },
          flexShrink: 0,
          background: "#f8fafc",
          borderBottom: "1px solid #d1d5db",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "#111827",
                letterSpacing: "-0.5px",
                mb: 0.5,
                lineHeight: 1.2,
                fontSize: { xs: "1.25rem", md: "1.5rem" },
              }}
            >
              Visible Data
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)",
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: "#6b7280",
                  fontWeight: 600,
                  fontSize: { xs: "0.75rem", md: "0.875rem" },
                }}
              >
                Zoom Level {zoom.toFixed(1)}
              </Typography>
            </Box>
            {filterClause && filterClause !== "1=1" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 0.5,
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontWeight: 600,
                  }}
                >
                  Active Filter: {filterClause}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {selectedFeatureIds.size > 0 && (
              <Button
                variant="outlined"
                size="small"
                color="secondary"
                onClick={() => setSelectedFeatureIds(new Set())}
                sx={{ textTransform: "none", borderRadius: 2, py: 0.25 }}
              >
                Clear Selection ({selectedFeatureIds.size})
              </Button>
            )}
            {layerUrl && !loading && (
              <Typography
                variant="body2"
                sx={{
                  color: "#3b82f6",
                  fontWeight: 700,
                  backgroundColor: "#eff6ff",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                }}
              >
                {features.length} Features
              </Typography>
            )}
            {layerUrl && (
              <IconButton
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                color={isFilterOpen ? "primary" : "default"}
                sx={{
                  backgroundColor: isFilterOpen ? "#eff6ff" : "transparent",
                  "&:hover": { backgroundColor: "#e2e8f0" },
                }}
              >
                <FilterIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Dynamic Filter UI extracted to Filter component */}
        {layerUrl && (
          <Collapse in={isFilterOpen}>
            <Box sx={{ pt: 1 }}>
              <Filter layerUrl={layerUrl} onFilterChange={onFilterChange} />
            </Box>
          </Collapse>
        )}
      </Box>

      <Box
        ref={scrollContainerRef}
        className="scrollable-content"
        sx={{
          flex: 1,
          overflowY: "auto",
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2, md: 3 },
          backgroundColor: "#ffffff",
        }}
      >
        {!layerUrl && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
            Please add a feature layer to view records in this extent.
          </Alert>
        )}

        {layerUrl && loading && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {[1, 2, 3, 4, 5].map((skeletonKey) => (
              <Card
                key={skeletonKey}
                elevation={0}
                sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                    p: 2,
                  }}
                >
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton
                      variant="text"
                      width="60%"
                      height={24}
                      sx={{ mb: 0.5 }}
                    />
                    <Skeleton variant="text" width="90%" height={20} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {layerUrl && !loading && error.length > 0 && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {layerUrl &&
          !loading &&
          error.length === 0 &&
          features.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              No features present in the current map bounds. Pan or zoom out to
              discover data.
            </Alert>
          )}

        {layerUrl && !loading && features.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            {renderedFeatures}
          </Box>
        )}
      </Box>

      {/* Sticky Pagination at the bottom */}
      {layerUrl && !loading && features.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            p: 2,
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: "#64748b", fontWeight: 600 }}
            >
              Pagesize:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1); // Reset page when changing page size
              }}
              size="small"
              sx={{
                height: 32,
                fontSize: "0.875rem",
                ".MuiSelect-select": { py: 0.5 },
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </Box>
          <Pagination
            count={Math.ceil(features.length / rowsPerPage)}
            page={page}
            onChange={handleChangePage}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
