# System Patterns

## Architecture
The application is a React SPA (Single Page Application) built with:
- **React 19**: UI framework with hooks
- **TypeScript**: Type safety throughout
- **Vite**: Build tool and dev server
- **Firebase**: Authentication and Firestore
- **shadcn/ui**: UI component library
- **Tailwind CSS**: Styling

## Core Components

### Dashboard (`src/components/Dashboard.tsx`)
- Main admin interface with tabs
- UI settings management
- DLC management integration
- Catalog publishing
- Multi-app and build type selection

### DLC Manager (`src/components/DLCManager.tsx`)
- DLC list display
- Add/edit DLC forms
- DLC metadata management
- Build type-specific DLCs

### Catalog Publisher (`src/components/CatalogPublisher.tsx`)
- Catalog generation UI
- Preview catalog structure
- Publish to R2 bucket

### R2 Sync Button (`src/components/R2SyncButton.tsx`)
- R2 bucket scanning
- DLC detection and import
- Preview sync changes
- Apply sync to Firebase

### Login (`src/components/Login.tsx`)
- Firebase Authentication UI
- Email/password login

## Services

### Catalog Publisher Service (`src/services/catalogPublisher.ts`)
- Generates catalog.json structure
- Builds DLC catalog entries
- Validates catalog data
- Publishes to R2 bucket

### R2 Sync Service (`src/services/r2Sync.ts`)
- Scans R2 bucket structure
- Detects build types (production/staging)
- Reads DLC manifests for metadata
- Generates sync preview
- Imports DLCs to Firebase

## Data Flow

```
┌──────────────┐
│   Admin UI   │
│  (React)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Firestore   │
│  (Firebase)  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Launcher   │
│  (Electron)  │
└──────────────┘

┌──────────────┐
│   R2 Bucket  │
│ (Cloudflare) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  R2 Sync     │
│  Service     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Firestore   │
└──────────────┘
```

## Firestore Structure
```
apps/
  {appId}/
    ui: { ... launcher UI settings ... }
    news: { ... news bar settings ... }
    builds/
      production/
        version: string
        dlcs: { [dlcId]: DLC }
      staging/
        version: string
        dlcs: { [dlcId]: DLC }
```

## Catalog Structure
```typescript
{
  catalogVersion: "1.0",
  lastUpdated: "ISO timestamp",
  generatedBy: "admin-site",
  builds: {
    production: {
      baseGame: {
        version: string,
        manifestUrl: string,
        minLauncherVersion: string
      },
      dlcs: DLCCatalogEntry[]
    },
    staging: { ... }
  }
}
```

## Key Features

### Multi-App Architecture
- Support for multiple applications
- Each app has independent settings
- Default app: "RolePlayAI"
- App selection dropdown

### Build Type Support
- Separate configurations for Production and Staging
- Build type switcher in UI
- Per-build DLC management
- Per-build version tracking

### R2 Synchronization
- Scans R2 bucket for DLC folders
- Reads manifest files for metadata
- Detects new and updated DLCs
- Preview before applying changes
- One-click import to Firebase

### Catalog Publishing
- Generates catalog.json from Firebase data
- Validates catalog structure
- Publishes to R2 bucket
- Updates lastUpdated timestamp

### Real-time Sync
- Firestore real-time listeners
- Launcher reads settings on startup
- Changes reflect immediately in launcher
- No manual refresh needed

## UI Components (shadcn/ui)
- Button, Card, Input, Label, Switch, Textarea, Tabs
- Consistent styling with Tailwind CSS
- Accessible components
- Dark theme support

## Error Handling
- Try-catch blocks in async operations
- User-friendly error messages
- Loading states for async operations
- Success feedback on operations
