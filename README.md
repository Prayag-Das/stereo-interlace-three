# 3D Three Stereo

A lightweight Three.js helper for rendering a stereoscopic interlaced view (horizontal or vertical) of a 3D scene using two perspective cameras.

---

## Prerequisites

- **Node.js** v20.11.1

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/rctheriot/stereo-interlace-three
   cd stereo-three-stereo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will pull in:

   - `three` (^0.174.0) for 3D rendering
   - `vite` (^6.2.0) for development and build tooling

## package.json & Scripts

Our project uses ES modules (`"type": "module"`) and Vite as the dev server and bundler. Key scripts:

- 🛠️ **`npm run dev`**

  - Launches Vite’s development server at `http://localhost:5173/` by default

- 📦 **`npm run build`**

  - Bundles your app into the `dist/` directory for production

- 👁️ **`npm run preview`**

  - Serves the production build locally for a final check

---

## Controls

- **Move Mouse**: Orbit the camera
- **W / A / S / D**: Move forward / left / back / right *(Combine with **F** for fast movement)*
- **Space / Shift**: Move camera up / down *(Combine with **F** for fast movement)*
- **Q / E**: Rotate camera counterclockwise / clockwise
- **R**: Reset camera position and rotation
---

## Responsive Resize

The class automatically listens for `window.resize` events to:

- Update camera aspect ratios
- Resize renderer and post-processing composer
- Recreate render targets at the new resolution

No additional code is needed.

---
