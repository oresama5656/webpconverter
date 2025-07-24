# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebP image converter tool with multiple interfaces:
- **Main converter** (`server.js`): Full-featured drag & drop web interface with quality adjustment and batch processing
- **Simple converter** (`simple-web-app.js`): Lightweight converter running on port 3001
- **Resize converter** (`app.js`): Advanced converter with intelligent resizing based on image dimensions

## Common Commands

### Development
```bash
npm install           # Install dependencies
npm start            # Start main server (port 3000)
npm run dev          # Start development server (same as start)
npm run simple       # Start simple converter (port 3001)
npm run resize       # Start resize converter with advanced features
npm run build        # Build project (echo command)
```

### Batch Files (Windows)
```bash
start.bat           # Start main server
start-simple.bat    # Start simple converter
start-resize.bat    # Start resize converter
start-app.bat       # Start main application
```

### Executable Generation
```bash
npm run pkg         # Generate Windows executable using pkg
```

## Architecture

### Core Components
- **Express servers**: Multiple server configurations for different use cases
- **Sharp.js**: Image processing engine for WebP conversion and resizing
- **Multer**: File upload handling with memory and disk storage options
- **Archiver**: ZIP file creation for batch downloads

### Server Configurations
1. **Main Server** (`server.js`): 
   - Port 3000
   - Disk-based file storage in `temp_uploads/`
   - Output to `converted_files/`
   - Full UI with quality controls

2. **Simple Server** (`simple-web-app.js`):
   - Port 3001
   - Disk-based storage
   - Output to `output_webp_resize/`
   - Minimal interface

3. **Resize Server** (`app.js`):
   - Configurable port (default 3000)
   - Memory-based storage
   - Intelligent scaling based on image dimensions
   - Advanced resize algorithms

### File Structure
- `input_images/`: Source images for testing
- `temp_uploads/`: Temporary file storage during processing
- `converted_files/`: Output from main converter
- `output_webp_resize/`: Output from simple/resize converters
- `netlify/functions/`: Serverless functions for Netlify deployment

## Image Processing

### Supported Formats
- Input: PNG, JPG, JPEG, WebP
- Output: WebP format only

### Processing Features
- Quality adjustment (0.25-1.0 scale)
- Image enhancement options
- Intelligent resizing based on longest dimension
- Batch processing with ZIP download
- 50MB file size limit per upload

## Deployment

### Local Development
The project runs on multiple ports simultaneously. Main server on 3000, simple converter on 3001.

### Netlify Deployment
- Build command: `npm run build`
- Functions directory: `netlify/functions`
- Static files served from root directory
- Serverless Sharp.js processing via Netlify Functions

## Dependencies

### Core Dependencies
- `express`: Web server framework
- `sharp`: High-performance image processing
- `multer`: File upload middleware
- `archiver`: ZIP file creation
- `cors`: Cross-origin resource sharing

### Development Tools
- `pkg`: Executable generation for Windows deployment