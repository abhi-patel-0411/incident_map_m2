import React, { useEffect, useState, useRef } from "react";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

interface FilterProps {
  layerUrl: string;
  onFilterChange?: (clause: string) => void;
}

export function Filter({
  layerUrl,
  onFilterChange,
}: FilterProps): React.JSX.Element | null {
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<string>("");
  const [uniqueValues, setUniqueValues] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isLoadingValues, setIsLoadingValues] = useState<boolean>(false);

  const layerRef = useRef<FeatureLayer | null>(null);

  useEffect(() => {
    // Reset states when URL changes
    setAvailableFields([]);
    setSelectedField("");
    setUniqueValues([]);
    setSelectedValues([]);
    if (onFilterChange) onFilterChange("1=1");

    if (!layerUrl) {
      layerRef.current = null;
      return;
    }

    layerRef.current = new FeatureLayer({
      url: layerUrl,
    });

    let isCancelled = false;

    layerRef.current
      .load()
      .then((layer) => {
        if (isCancelled) return;
        const allowedTypes = [
          "string",
          "integer",
          "small-integer",
          "double",
          "single",
          "oid",
        ];
        setAvailableFields(
          layer.fields.filter((f) => allowedTypes.includes(f.type)),
        );
      })
      .catch((e) =>
        console.error("Error loading layer metadata for filter", e),
      );

    return () => {
      isCancelled = true;
    };
  }, [layerUrl, onFilterChange]);

  useEffect(() => {
    if (!selectedField || !layerRef.current) {
      setUniqueValues([]);
      setSelectedValues([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingValues(true);

    const fetchValues = async () => {
      try {
        const fieldConfig = availableFields.find(
          (f) => f.name === selectedField,
        );

        // Handle Coded Domains First
        if (fieldConfig?.domain?.codedValues) {
          if (!isCancelled) {
            const domainValues = fieldConfig.domain.codedValues.map(
              (d: any) => ({
                value: String(d.code),
                label: d.name,
              }),
            );
            setUniqueValues(domainValues);
            setSelectedValues([]);
          }
          return;
        }

        const query = layerRef.current!.createQuery();
        query.where = "1=1";
        // Use groupByFieldsForStatistics instead of returnDistinctValues
        query.groupByFieldsForStatistics = [selectedField];
        query.outStatistics = [
          {
            statisticType: "count",
            onStatisticField: selectedField,
            outStatisticFieldName: "count",
          } as any,
        ];
        query.outFields = [selectedField];
        query.returnGeometry = false;
        query.orderByFields = [`${selectedField} ASC`];
        query.num = 50; // Performance limit

        const result = await layerRef.current!.queryFeatures(query);
        if (!isCancelled) {
          // Extract matching case variants via Set
          const rawValues = result.features
            .map((f) => f.attributes[selectedField])
            .filter((v) => v !== null && v !== undefined && v !== "");

          const unique = Array.from(new Set(rawValues)).map((v) => ({
            value: String(v),
            label: String(v),
          }));

          setUniqueValues(unique);
          setSelectedValues([]);
        }
      } catch (e) {
        console.error("Error fetching unique values", e);
      } finally {
        if (!isCancelled) {
          setIsLoadingValues(false);
        }
      }
    };

    fetchValues();

    return () => {
      isCancelled = true;
    };
  }, [selectedField]); // removed onFilterChange from dependencies to prevent auto-trigger edge cases

  const handleApply = () => {
    if (!onFilterChange) return;

    if (!selectedField || selectedValues.length === 0) {
      onFilterChange("1=1");
      return;
    }

    const field = availableFields.find((f) => f.name === selectedField);
    if (!field) return;

    if (field.type === "string") {
      const vals = selectedValues
        .map((v) => `'${v.replace(/'/g, "''")}'`)
        .join(", ");
      onFilterChange(`${selectedField} IN (${vals})`);
    } else {
      const vals = selectedValues.join(", ");
      onFilterChange(`${selectedField} IN (${vals})`);
    }
  };

  const handleClear = () => {
    setSelectedField("");
    setSelectedValues([]);
    if (onFilterChange) onFilterChange("1=1");
  };

  if (!layerUrl || availableFields.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexDirection: { xs: "column", sm: "row" },
      }}
    >
      <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
        <InputLabel id="filter-field-label">Filter Field</InputLabel>
        <Select
          labelId="filter-field-label"
          value={selectedField}
          label="Filter Field"
          onChange={(e) => setSelectedField(e.target.value as string)}
          sx={{ backgroundColor: "#fff" }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {availableFields.map((f) => (
            <MenuItem key={f.name} value={f.name}>
              {f.alias || f.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedField && (
        <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
          <InputLabel id="filter-value-label">
            {isLoadingValues ? "Loading..." : "Value(s)"}
          </InputLabel>
          <Select
            labelId="filter-value-label"
            multiple
            value={selectedValues}
            label={isLoadingValues ? "Loading..." : "Value(s)"}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedValues(typeof val === "string" ? val.split(",") : val);
            }}
            disabled={isLoadingValues || uniqueValues.length === 0}
            sx={{ backgroundColor: "#fff" }}
          >
            {uniqueValues.map((v) => (
              <MenuItem key={v.value} value={v.value}>
                {v.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {selectedField && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={selectedValues.length === 0 && selectedField !== ""}
            sx={{ textTransform: "none", px: 2, borderRadius: 1.5 }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleClear}
            sx={{ textTransform: "none", px: 2, borderRadius: 1.5 }}
          >
            Clear
          </Button>
        </Box>
      )}
    </Box>
  );
}
