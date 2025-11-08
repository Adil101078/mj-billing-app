# PWA Icons Instructions

The PWA requires the following icon files in the `/public` directory:

## Required Icons:

1. **pwa-192x192.png** - 192x192 pixels
2. **pwa-512x512.png** - 512x512 pixels
3. **apple-touch-icon.png** - 180x180 pixels (for iOS)
4. **masked-icon.svg** - SVG icon for Safari pinned tabs

## How to Create Icons:

### Option 1: Use existing favicon.png
You can use the existing `favicon.png` and resize it to create the PWA icons:

1. Open `favicon.png` in an image editor (Photoshop, GIMP, etc.)
2. Resize and export:
   - 192x192 pixels → save as `pwa-192x192.png`
   - 512x512 pixels → save as `pwa-512x512.png`
   - 180x180 pixels → save as `apple-touch-icon.png`

### Option 2: Use Online Tool
Visit https://realfavicongenerator.net/ and upload your favicon.png to automatically generate all required icons.

### Option 3: Create Simple Icons
For now, you can copy the favicon.png and rename it:
```bash
# In the public directory
cp favicon.png pwa-192x192.png
cp favicon.png pwa-512x512.png
cp favicon.png apple-touch-icon.png
```

## For masked-icon.svg:
Create a simple SVG file with your logo/icon in monochrome (black on transparent background).

---

**Note**: The PWA is configured and will work once these icons are in place. Until then, default browser icons will be used.
