# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebP image converter tool with:
- **HTML client** (`client-webp-converter.html`): Web-based interface for WebP conversion
- **Command-line converter** (`convert-resize.js`): Node.js script for batch image processing with intelligent resizing

## Common Commands

### Development
```bash
npm install                    # Install dependencies
node convert-resize.js 0.5     # Convert images with 50% scale
node convert-resize.js 0.25 --no-enhance  # Convert without enhancement
npm run build                  # Build project (echo command)
```

### Batch Files (Windows)
```bash
start-resize.bat    # Start resize converter
```

### Executable Generation
```bash
npm run pkg         # Generate Windows executable using pkg (targets convert-resize.js)
```

## Architecture

### Core Components
- **Sharp.js**: High-performance image processing engine for WebP conversion and resizing
- **Client-side converter**: HTML interface for web-based image conversion
- **Command-line tool**: Node.js script for batch processing with intelligent scaling

### Processing Modes
1. **Command-line Processing** (`convert-resize.js`):
   - Batch processing from `input_images/` folder
   - Output to `output_webp_resize/`
   - Intelligent scaling based on image dimensions
   - Quality enhancement options
   - Temporary files stored in `temp_images/`

2. **Web Interface** (`client-webp-converter.html`):
   - Browser-based image conversion
   - Drag & drop functionality
   - Client-side processing

### File Structure
- `input_images/`: Source images for batch processing
- `temp_images/`: Temporary files during enhancement processing
- `output_webp_resize/`: Output directory for converted WebP files
- `client-webp-converter.html`: Web-based converter interface
- `convert-resize.js`: Command-line batch processing tool

## Image Processing

### Supported Formats
- Input: PNG, JPG, JPEG, WebP
- Output: WebP format only

### Processing Features
- Scale factor adjustment (0 < scale <= 1.0)
- Quality enhancement with intelligent upscaling
- Automatic scaling based on image dimensions:
  - ≤800px: 2.0x upscale
  - ≤1200px: 1.5x upscale  
  - >1200px: no upscaling
- Batch processing from folders or specific files
- Lanczos3 resampling for high-quality resizing

## Deployment

### Local Development
The project consists of:
1. Command-line tool for batch processing
2. Static HTML file for web-based conversion

### Static Deployment
- Build command: `npm run build`
- Static HTML file can be served from any web server
- Client-side processing requires modern browser with WebAssembly support

## Dependencies

### Core Dependencies
- `sharp`: High-performance image processing
- `archiver`: ZIP file creation (for potential web interface features)
- `express`: Web server framework (for potential server features)
- `multer`: File upload middleware (for potential server features)
- `cors`: Cross-origin resource sharing (for potential server features)

### Development Tools
- `pkg`: Executable generation for Windows deployment