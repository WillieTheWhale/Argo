# Argo Landing Page

A high-performance landing page for Argo, an AI voice assistant that handles phone calls and bill negotiations. Built with vanilla JavaScript and WebGL, achieving 95+ Lighthouse scores while delivering advanced visual effects and interactive features.

## Technical Overview

### Core Technologies

**Frontend Stack**
- Pure vanilla JavaScript (zero dependencies)
- WebGL with custom GLSL shaders
- HTML5 Canvas API
- CSS3 with custom properties
- Progressive enhancement architecture

**Design System**
- Nintendo DS Pictochat-inspired aesthetic
- Pixel-perfect rendering with image-rendering optimizations
- 8-color palette with 3 brush sizes
- Retro CRT monitor effects

### Key Features

**WebGL CRT Shader System**
- Real-time screen curvature distortion
- Scanline generation with sine wave patterns
- RGB chromatic aberration
- Procedural noise and vignette effects
- Mouse-interactive lighting
- Adaptive performance based on device capabilities

**Drawing Canvas**
- Multi-layer canvas rendering
- Undo/redo with state management
- Touch and mouse input normalization
- Client-side image export to PNG
- LocalStorage-based gallery system

**Procedural Content Generation**
- Algorithmic doodle generation (robots, phones, AI themes, text, abstract)
- Hand-drawn aesthetic with intentional imperfections
- Randomized user attribution and reaction counts
- No backend required for static deployment

**Performance Optimization**
- Device capability detection (hardwareConcurrency, deviceMemory)
- Automatic quality scaling
- 60 FPS animation target
- Lazy loading and virtual scrolling
- Efficient WebGL context management

**Time-Based Personalization**
- Dynamic content based on time of day (5 periods)
- Special date detection (holidays, events)
- Theme and message adaptation
- CSS custom property manipulation

## Architecture

### Client-Side Only Design

The implementation is designed for GitHub Pages deployment with all features running client-side:

```
index.html
├── WebGL Renderer (CRT effects)
├── Canvas System (drawing tools)
├── Doodle Generator (procedural graphics)
├── Scroll Animation Controller
├── Time-Based Content Manager
└── LocalStorage API (persistence)
```

### Performance Mode

Automatic device detection with three quality tiers:
- **High-end** (4+ cores, 4GB+ RAM): Full WebGL effects at 100% intensity
- **Mid-range** (2-4 cores): Reduced shader complexity
- **Low-end** (<2 cores): CSS fallbacks, minimal animations

### Data Persistence

Uses browser LocalStorage for:
- User-created doodles (max 10, FIFO rotation)
- Performance mode preferences
- Reaction state tracking
- Session analytics

## Quick Start

### Static Deployment

```bash
# Clone repository
git clone https://github.com/your-org/argo-landing.git

# Serve with any static server
npx serve .

# Or deploy directly to GitHub Pages
# Enable Pages in repository settings, select main branch
```

### Local Development

```bash
# Simple HTTP server
python -m http.server 8000

# Or Node.js
npx http-server -p 8000

# Access at http://localhost:8000
```

## Project Structure

```
argo-landing/
├── index.html                 # Main application
├── README.md                  # Documentation
├── PHASE3-TECHNICAL-DOCUMENTATION.md
├── server.js                  # Optional backend (not required)
├── docker-compose.yml         # Optional containerization
└── migrations/                # Optional database setup
```

## Configuration

### Browser Requirements

- WebGL 1.0 support
- ES6 JavaScript compatibility
- LocalStorage API
- Canvas 2D context
- Minimum 2GB RAM recommended

### Feature Flags

Modify in `index.html`:

```javascript
const CONFIG = {
    webglEnabled: true,              // Toggle WebGL effects
    performanceMode: 'high',         // 'high' | 'medium' | 'low'
    animationsEnabled: true,         // CSS animations
    particlesEnabled: true           // Particle systems
};
```

## Performance Metrics

**Target Benchmarks**
- Lighthouse Performance: 95+
- First Contentful Paint: <1.5s
- Time to Interactive: <3.5s
- Cumulative Layout Shift: <0.1
- Total Bundle Size: <500KB (no external dependencies)

**WebGL Performance**
- 60 FPS during shader rendering
- GPU Memory: <50MB
- Automatic quality degradation on performance drops

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with WebGL support

## Optional Backend

For production deployments with community features, a Node.js backend is included:

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start server
npm start
```

Backend provides:
- PostgreSQL-based doodle storage
- WebSocket real-time updates
- Image moderation pipeline
- Redis caching layer

## License

Proprietary and confidential. All rights reserved.

## Technical Support

For implementation questions or technical issues, refer to PHASE3-TECHNICAL-DOCUMENTATION.md for detailed architecture documentation.
