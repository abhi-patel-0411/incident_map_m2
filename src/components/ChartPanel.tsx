import React, { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { filterBus } from "../EventBus";
import type { ActiveFilters } from "../EventBus";

// @ts-ignore Ignore unused
import type { PieValueType } from "@mui/x-charts";

interface ChartWidget {
  id: string;
  type: "bar" | "pie" | "donut" | "horizontal-bar";
  field: string;
}

interface ChartPanelProps {
  layerUrl: string;
  activeFilters: ActiveFilters;
}

export function ChartPanel({
  layerUrl,
  activeFilters,
}: ChartPanelProps): React.JSX.Element {
  const [widgets, setWidgets] = useState<ChartWidget[]>([]);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [newWidgetType, setNewWidgetType] = useState<
    "bar" | "pie" | "donut" | "horizontal-bar"
  >("bar");
  const [newWidgetField, setNewWidgetField] = useState<string>("");

  const layerRef = useRef<FeatureLayer | null>(null);

  useEffect(() => {
    setWidgets([]);
    setIsAddingWidget(false);
    if (!layerUrl) return;

    layerRef.current = new FeatureLayer({ url: layerUrl });

    layerRef.current.load().then((layer) => {
      const types = ["string", "integer", "small-integer", "oid"];
      setAvailableFields(layer.fields.filter((f) => types.includes(f.type)));

      // Auto-add an initial chart if there's a categorical field
      const defaultField = layer.fields.find(
        (f) =>
          f.type === "string" &&
          !["name", "description", "title", "url"].includes(
            f.name.toLowerCase(),
          ),
      );
      if (defaultField) {
        setWidgets([
          { id: `widget-${Date.now()}`, type: "pie", field: defaultField.name },
        ]);
      }
    });
  }, [layerUrl]);

  const addWidget = () => {
    if (newWidgetField) {
      setWidgets((prev) => [
        ...prev,
        {
          id: `widget-${Date.now()}`,
          type: newWidgetType,
          field: newWidgetField,
        },
      ]);
      setIsAddingWidget(false);
    }
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        background: "#ffffff",
        borderRight: "1px solid #d1d5db",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2,
          background: "#f8fafc",
          borderBottom: "1px solid #d1d5db",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#111827" }}>
          Insights
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setIsAddingWidget(!isAddingWidget)}
          disabled={!layerUrl}
        >
          + Widget
        </Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {!layerUrl && (
          <Typography
            variant="body2"
            sx={{ color: "#64748b", textAlign: "center", mt: 4 }}
          >
            Add a layer to view charts.
          </Typography>
        )}

        {isAddingWidget && availableFields.length > 0 && (
          <Card elevation={0} sx={{ border: "1px dashed #cbd5e1" }}>
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <FormControl size="small">
                <InputLabel>Chart Type</InputLabel>
                <Select
                  value={newWidgetType}
                  label="Chart Type"
                  onChange={(e) => setNewWidgetType(e.target.value as any)}
                >
                  <MenuItem value="bar">Bar Chart</MenuItem>
                  <MenuItem value="pie">Pie Chart</MenuItem>
                  <MenuItem value="donut">Donut Chart</MenuItem>
                  <MenuItem value="horizontal-bar">
                    Horizontal Bar Chart
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel>Category Field</InputLabel>
                <Select
                  value={newWidgetField}
                  label="Category Field"
                  onChange={(e) => setNewWidgetField(e.target.value as string)}
                >
                  {availableFields.map((f) => (
                    <MenuItem key={f.name} value={f.name}>
                      {f.alias || f.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={addWidget}
                  disabled={!newWidgetField}
                >
                  Add
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setIsAddingWidget(false)}
                >
                  Cancel
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {widgets.map((w) => (
          <ChartWidgetRenderer
            key={w.id}
            widget={w}
            layerUrl={layerUrl}
            activeFilters={activeFilters}
            fields={availableFields}
            onSelectCategory={(val: any) => {
              if (w.field && val != null) {
                filterBus.toggleFilter(w.field, val);
              }
            }}
            onRemove={() => removeWidget(w.id)}
          />
        ))}
      </Box>
    </Box>
  );
}

function ChartWidgetRenderer({
  widget,
  layerUrl,
  activeFilters,
  fields,
  onSelectCategory,
  onRemove,
}: any) {
  const [data, setData] = useState<
    { label: string; value: number; originalValue: any; color?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // We only re-fetch the chart statistics based on OTHER filters.
  // We exclude this chart's own field from the SQL so clicking its own bars doesn't hide everything else.
  const relevantFilters = { ...activeFilters };
  delete relevantFilters[widget.field];
  const chartFilterClause = filterBus.getSqlClause(relevantFilters);

  // We want to highlight the UI bars/pie slices that are actively filtered
  const activeSelectionsForThisChart = activeFilters[widget.field] || [];

  useEffect(() => {
    let active = true;
    setLoading(true);

    const layer = new FeatureLayer({ url: layerUrl });
    const query = layer.createQuery();

    query.where = chartFilterClause || "1=1";
    query.groupByFieldsForStatistics = [widget.field];
    query.outStatistics = [
      {
        statisticType: "count",
        onStatisticField: widget.field,
        outStatisticFieldName: "record_count",
      } as any,
    ];
    query.orderByFields = ["record_count DESC"]; // Top ones
    query.num = 15; // Limit to 15 categories for clean charts

    layer
      .queryFeatures(query)
      .then((res) => {
        if (!active) return;

        const chartData = res.features.map((f) => {
          const val = f.attributes[widget.field];
          return {
            label: val == null ? "Unknown" : String(val),
            value: f.attributes["record_count"] as number,
            originalValue: val,
          };
        });

        setData(chartData);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Widget fetch failed", e);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [layerUrl, widget.field, chartFilterClause]);

  const fieldAlias =
    fields.find((f: any) => f.name === widget.field)?.alias || widget.field;

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid #e2e8f0",
        position: "relative",
        overflow: "visible",
      }}
    >
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{ position: "absolute", top: 4, right: 4, zIndex: 10 }}
      >
        ✕
      </IconButton>
      <CardContent sx={{ p: 2, pt: 3 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, mb: 1, textAlign: "center", color: "#334155" }}
        >
          {fieldAlias}
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : data.length === 0 ? (
          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", color: "#94a3b8" }}
          >
            No data
          </Typography>
        ) : (
          <Box sx={{ width: "100%", height: 200, cursor: "pointer" }}>
            {widget.type === "bar" && (
              <BarChart
                xAxis={[
                  {
                    scaleType: "band",
                    data: data.map((d) => d.label),
                    tickLabelStyle: {
                      angle: 45,
                      textAnchor: "start",
                      fontSize: 10,
                      fill: "#64748b",
                    },
                  },
                ]}
                yAxis={[
                  {
                    tickLabelStyle: {
                      fontSize: 10,
                      fill: "#64748b",
                    },
                  },
                ]}
                series={[
                  {
                    data: data.map((d) => d.value),
                    valueFormatter: (value) => `${value} items`,
                  },
                ]}
                colors={["#3b82f6"]}
                onItemClick={(_e, params) => {
                  const clickedData = data[params.dataIndex];
                  if (clickedData) onSelectCategory(clickedData.originalValue);
                }}
                margin={{ left: 45, right: 10, top: 10, bottom: 65 }}
              />
            )}
            {widget.type === "pie" && (
              <PieChart
                series={[
                  {
                    data: data.map((d, i) => ({
                      id: i,
                      value: d.value,
                      label: d.label,
                      color:
                        activeSelectionsForThisChart.length === 0 ||
                        activeSelectionsForThisChart.includes(d.originalValue)
                          ? undefined
                          : "#e2e8f0",
                    })),
                    highlightScope: { fade: "global", highlight: "item" },
                    valueFormatter: (value) => `${value.value} items`,
                  },
                ]}
                margin={{ left: 10, right: 10, top: 10, bottom: 20 }}
                onItemClick={(_e, params) => {
                  const clickedData = data[params.dataIndex];
                  if (clickedData) onSelectCategory(clickedData.originalValue);
                }}
              />
            )}
            {widget.type === "horizontal-bar" && (
              <BarChart
                layout="horizontal"
                yAxis={[
                  {
                    scaleType: "band",
                    data: data.map((d) => d.label),
                    tickLabelStyle: {
                      fontSize: 10,
                      fill: "#64748b",
                    },
                  },
                ]}
                xAxis={[
                  {
                    tickLabelStyle: {
                      fontSize: 10,
                      fill: "#64748b",
                    },
                  },
                ]}
                series={[
                  {
                    data: data.map((d) => d.value),
                    valueFormatter: (value) => `${value} items`,
                  },
                ]}
                colors={["#10b981"]}
                onItemClick={(_e, params) => {
                  const clickedData = data[params.dataIndex];
                  if (clickedData) onSelectCategory(clickedData.originalValue);
                }}
                margin={{ left: 80, right: 10, top: 10, bottom: 25 }}
              />
            )}
            {widget.type === "donut" && (
              <PieChart
                series={[
                  {
                    data: data.map((d, i) => ({
                      id: i,
                      value: d.value,
                      label: d.label,
                      color:
                        activeSelectionsForThisChart.length === 0 ||
                        activeSelectionsForThisChart.includes(d.originalValue)
                          ? undefined
                          : "#e2e8f0",
                    })),
                    innerRadius: 40,
                    paddingAngle: 2,
                    cornerRadius: 4,
                    highlightScope: { fade: "global", highlight: "item" },
                    valueFormatter: (value) => `${value.value} items`,
                  },
                ]}
                margin={{ left: 10, right: 10, top: 10, bottom: 20 }}
                onItemClick={(_e, params) => {
                  const clickedData = data[params.dataIndex];
                  if (clickedData) onSelectCategory(clickedData.originalValue);
                }}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
