# Active Context

## Current Status
The Admin Dashboard is fully functional with comprehensive UI customization, DLC management, R2 synchronization, and catalog publishing capabilities.

## Recent Changes

### Latest Version
- **Multi-App Support**: Manage multiple applications from one dashboard
- **Build Type Management**: Separate configurations for Production and Staging
- **R2 Synchronization**: Automatic DLC detection and import from R2 bucket
- **Catalog Publishing**: Generate and publish catalog.json to R2
- **DLC Management**: Full CRUD operations for DLC content
- **UI Customization**: Complete launcher UI settings management

## Key Features Implemented

### UI Customization Tab
- Game title and tagline
- Button text configuration (all states)
- Background images (single or slideshow)
- Background transition and display timing
- Logo URL and game name
- Header links (add, edit, remove, reorder)
- News bar (show/hide, content)

### DLC Management Tab
- DLC list display with metadata
- Add new DLC with form
- Edit existing DLC
- Delete DLC
- Build type-specific DLCs
- DLC hierarchy support (Environment → Character)

### Catalog Publishing Tab
- Preview catalog structure
- Generate catalog.json
- Publish to R2 bucket
- Validation and error handling

### R2 Sync Feature
- Scan R2 bucket for DLCs
- Detect build types automatically
- Read DLC manifests for metadata
- Preview sync changes
- One-click import to Firebase

## Integration Points

### With Launcher
- Settings stored in Firestore
- Launcher reads settings on startup
- Real-time updates via Firestore listeners
- Catalog.json enables DLC discovery

### With R2 Bucket
- Reads DLC information from R2
- Publishes catalog.json to R2
- Detects build types from R2 structure

### With Uploader
- Catalog.json format compatible
- DLC metadata synchronized

## Current Workflow
1. Admin logs in via Firebase Authentication
2. Selects application and build type
3. Configures launcher UI settings
4. Manages DLCs (add/edit/delete or sync from R2)
5. Publishes catalog.json to R2
6. Settings sync to launcher in real-time

## Next Steps
- Enhanced DLC metadata editing
- Bulk DLC operations
- Catalog validation improvements
- R2 sync performance optimization
- Error handling enhancements
