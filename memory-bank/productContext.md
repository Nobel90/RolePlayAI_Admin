# Product Context

## Problem
Administrators need a centralized way to:
- Customize launcher UI without code changes
- Manage DLC content and metadata
- Synchronize content between storage systems
- Generate catalogs for launcher discovery
- Configure settings for different build types

## Solution
This React web application provides:
- **Dashboard Interface**: Tabbed interface for different configuration areas
- **UI Customization**: Real-time editing of launcher appearance settings
- **DLC Management**: Add, edit, and manage DLC content with metadata
- **R2 Sync**: Automatically detect and import DLCs from R2 bucket
- **Catalog Publishing**: Generate and publish catalog.json to R2
- **Multi-App Support**: Manage multiple applications from one dashboard

## User Experience Goals
- Simple, intuitive interface for configuration
- Real-time preview of changes
- Clear feedback on save operations
- Easy DLC management with metadata
- One-click R2 synchronization
- Visual feedback for all operations

## Integration Points
- **Launcher**: Settings stored in Firestore, read by launcher in real-time
- **R2 Bucket**: Reads DLC information, publishes catalog.json
- **Firebase**: Authentication and Firestore for settings storage
- **Uploader**: Catalog.json format compatible with Uploader workflow
