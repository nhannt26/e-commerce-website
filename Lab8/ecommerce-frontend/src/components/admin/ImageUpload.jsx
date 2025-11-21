import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar
} from '@mui/material';
import { CloudUpload, Delete } from '@mui/icons-material';

export default function ImageUpload({ images = [], onChange }) {
  const [previews, setPreviews] = useState(images.map(url => ({ url, isNew: false })));

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      isNew: true
    }));
    
    const updated = [...previews, ...newPreviews];
    setPreviews(updated);
    
    // Pass files to parent
    const allFiles = updated.filter(p => p.isNew).map(p => p.file);
    onChange(allFiles);
  };

  const handleRemove = (index) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    
    const allFiles = updated.filter(p => p.isNew).map(p => p.file);
    onChange(allFiles);
  };

  return (
    <Box>
      <Button
        variant="outlined"
        component="label"
        startIcon={<CloudUpload />}
        sx={{ mb: 2 }}
      >
        Upload Images
        <input
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={handleFileSelect}
        />
      </Button>

      {previews.length > 0 && (
        <ImageList cols={4} rowHeight={164}>
          {previews.map((item, index) => (
            <ImageListItem key={index}>
              <img
                src={item.url}
                alt={`Preview ${index}`}
                loading="lazy"
                style={{ height: 164, objectFit: 'cover' }}
              />
              <ImageListItemBar
                actionIcon={
                  <IconButton
                    sx={{ color: 'white' }}
                    onClick={() => handleRemove(index)}
                  >
                    <Delete />
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}
    </Box>
  );
}