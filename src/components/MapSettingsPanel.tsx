import React, { useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";


// Material Icons
function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

function SpeedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.38,8.57l-1.23,1.85c1.39,1.48,2.22,3.47,2.22,5.67c0,4.52-3.61,8.18-8.08,8.18c-4.47,0-8.08-3.67-8.08-8.18 c0-2.2,0.84-4.19,2.22-5.67L6.2,8.57C4.42,10.45,3.29,13.06,3.29,16.08c0,5.62,4.51,10.18,10,10.18c5.49,0,10-4.56,10-10.18 C23.29,13.06,22.16,10.45,20.38,8.57z"/>
      <path d="M13.29,15.4V7.51h-2v7.89c-0.89,0.36-1.5,1.25-1.5,2.27c0,1.38,1.12,2.5,2.5,2.5s2.5-1.12,2.5-2.5 C14.79,16.65,14.18,15.76,13.29,15.4z"/>
      <path d="M12.29,3C7.94,3,4.1,5.32,2.02,8.96L3.75,10c1.78-3.15,5.13-5.25,8.96-5.25c3.83,0,7.18,2.1,8.96,5.25l1.73-1.04 C21.32,5.32,17.48,3,13.12,3L12.29,3z"/>
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/>
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
    </svg>
  );
}

export interface MapSettings {
  basemap: string;
  debounceTime: number;
  minZoom: number;
  maxZoom: number;
  layerVisible: boolean;
  featureLimit: number;
}

interface MapSettingsPanelProps {
  settings: MapSettings;
  onSettingsChange: (settings: MapSettings) => void;
}

export function MapSettingsPanel({ settings, onSettingsChange }: MapSettingsPanelProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key: keyof MapSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const handleZoomChange = (_event: Event, newValue: number | number[]) => {
    const limits = newValue as number[];
    onSettingsChange({
      ...settings,
      minZoom: limits[0],
      maxZoom: limits[1],
    });
  };

  return (
    <>
      <Tooltip title="Map Settings">
        <IconButton onClick={() => setIsOpen(true)} sx={{ color: '#4b5563', mr: 1 }}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      <Drawer anchor="right" open={isOpen} onClose={() => setIsOpen(false)}>
        <Box sx={{ 
          width: { xs: '100vw', sm: 480 }, 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          bgcolor: '#fafafa' 
        }}>
          {/* Header */}
          <Box sx={{ 
            px: 4, 
            py: 3, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid',
            borderColor: 'divider',
            background: '#ffffff',
            position: 'sticky',
            top: 0,
            zIndex: 10 
          }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1.5, letterSpacing: '-0.02em' }}>
                <SettingsIcon />
                Settings
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Configure map behavior and appearance
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setIsOpen(false)} 
              sx={{ 
                bgcolor: 'action.hover', 
                color: 'text.secondary', 
                '&:hover': { bgcolor: 'action.selected', color: 'text.primary' } 
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ flex: 1, overflowY: 'auto', p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            
            {/* Basemap Switcher */}
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, mb: 2, letterSpacing: '0.1em' }}>
                <LayersIcon /> VISUALS
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3, bgcolor: '#ffffff', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 2px 4px rgba(0,0,0,0.02)' }}>
                <FormControl fullWidth>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>Base Map Style</Typography>
                  <Select
                    value={settings.basemap}
                    onChange={(e) => handleChange("basemap", e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="streets">Streets</MenuItem>
                    <MenuItem value="satellite">Satellite</MenuItem>
                    <MenuItem value="topo-vector">Topographic</MenuItem>
                    <MenuItem value="dark-gray-vector">Dark Gray Tracker</MenuItem>
                    <MenuItem value="osm">OpenStreetMap</MenuItem>
                  </Select>
                </FormControl>
                <Divider sx={{ borderColor: 'divider' }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.layerVisible}
                      onChange={(e) => handleChange("layerVisible", e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Feature Layer
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Toggle data visualization visibility
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0, justifyContent: 'space-between', flexDirection: 'row-reverse' }}
                />
              </Box>
            </Box>

            {/* Performance Controls */}
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, mb: 2, letterSpacing: '0.1em' }}>
                <SpeedIcon /> PERFORMANCE
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, p: 3, bgcolor: '#ffffff', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 2px 4px rgba(0,0,0,0.02)' }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Debounce Delay
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Buffer time before fetching records
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 700, bgcolor: 'primary.50', px: 1, py: 0.5, borderRadius: 1 }}>
                      {settings.debounceTime}ms
                    </Typography>
                  </Box>
                  <Slider
                    value={settings.debounceTime}
                    onChange={(_, value) => handleChange("debounceTime", value)}
                    min={50}
                    max={2000}
                    step={50}
                    color="primary"
                    sx={{ mt: 2 }}
                  />
                </Box>

                <Divider sx={{ borderColor: 'divider' }} />

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        Query Data Limit
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Max features requested globally
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ color: 'error.main', fontWeight: 700, bgcolor: 'error.50', px: 1, py: 0.5, borderRadius: 1 }}>
                      {settings.featureLimit}
                    </Typography>
                  </Box>
                  <Slider
                    value={settings.featureLimit}
                    onChange={(_, value) => handleChange("featureLimit", value)}
                    min={10}
                    max={1000}
                    step={10}
                    color="error"
                    sx={{ mt: 2 }}
                  />
                </Box>
              </Box>
            </Box>
            
            {/* Zoom Clamping */}
            <Box>
               <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, mb: 2, letterSpacing: '0.1em' }}>
                <ZoomIcon /> NAVIGATION
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3, bgcolor: '#ffffff', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0px 2px 4px rgba(0,0,0,0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Zoom Level Frame
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Clamp the viewable map scales
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ color: 'success.main', fontWeight: 700, bgcolor: 'success.50', px: 1, py: 0.5, borderRadius: 1 }}>
                    Z{settings.minZoom} - Z{settings.maxZoom}
                  </Typography>
                </Box>
                <Slider
                  value={[settings.minZoom, settings.maxZoom]}
                  onChange={handleZoomChange}
                  min={0}
                  max={24}
                  step={1}
                  disableSwap
                  color="success"
                  sx={{ mt: 2 }}
                />
              </Box>
            </Box>

          </Box>
        </Box>
      </Drawer>
    </>
  );
}