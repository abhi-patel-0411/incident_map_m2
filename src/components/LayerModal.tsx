import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

interface LayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftLayerUrl: string;
  setDraftLayerUrl: (url: string) => void;
  layerModalError: string;
  activeLayerUrl: string;
  onApply: () => void;
  onRemoveLayer: () => void;
}

export function LayerModal({
  isOpen,
  onClose,
  draftLayerUrl,
  setDraftLayerUrl,
  layerModalError,
  activeLayerUrl,
  onApply,
  onRemoveLayer
}: LayerModalProps): React.JSX.Element {
  
  return (
    <Modal open={isOpen} onClose={onClose}>
      <Paper elevation={6} sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "calc(100% - 32px)",
        maxWidth: 560,
        p: 3,
      }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, fontWeight: 700 }}>
          {activeLayerUrl ? "Manage Feature Layer" : "Add Feature Layer"}
        </Typography>
        <TextField
          label="ArcGIS FeatureServer URL"
          fullWidth
          value={draftLayerUrl}
          onChange={(event) => setDraftLayerUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onApply();
            }
          }}
          error={layerModalError.length > 0}
          helperText={layerModalError}
          sx={{ mb: { xs: 2, sm: 3 }, mt: 2 }}
          size="small"
        />
        <Box sx={{ 
          display: "flex", 
          flexDirection: { xs: "column", sm: "row" }, 
          gap: { xs: 2, sm: 1.5 }, 
          justifyContent: "flex-end" 
        }}>
          {activeLayerUrl && (
            <Button variant="outlined" color="error" onClick={onRemoveLayer} sx={{ mr: { sm: "auto" }, order: { xs: 3, sm: 1 } }}>
              Remove Layer
            </Button>
          )}
          <Button variant="text" onClick={onClose} sx={{ order: { xs: 2, sm: 2 } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={onApply} sx={{ order: { xs: 1, sm: 3 } }}>
            {activeLayerUrl ? "Update Layer" : "Add Layer"}
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
}
