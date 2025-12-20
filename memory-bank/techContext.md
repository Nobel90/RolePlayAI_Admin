# Tech Context

## Framework
- **React**: ^19.2.0 - UI framework
- **TypeScript**: ~5.9.3 - Type safety
- **Vite**: ^7.2.4 - Build tool and dev server

## Main Dependencies
- **`firebase`**: ^12.6.0 - Firebase SDK (Auth, Firestore)
- **`@radix-ui/react-*`**: UI component primitives
  - react-label, react-slot, react-switch, react-tabs
- **`lucide-react`**: ^0.554.0 - Icon library
- **`class-variance-authority`**: ^0.7.1 - Component variants
- **`clsx`**: ^2.1.1 - Conditional class names
- **`tailwind-merge`**: ^3.4.0 - Tailwind class merging

## Dev Dependencies
- **`@vitejs/plugin-react`**: ^5.1.1 - Vite React plugin
- **`typescript`**: ~5.9.3 - TypeScript compiler
- **`typescript-eslint`**: ^8.46.4 - TypeScript ESLint
- **`eslint`**: ^9.39.1 - Linting
- **`tailwindcss`**: ^3.4.18 - CSS framework
- **`autoprefixer`**: ^10.4.22 - CSS autoprefixer
- **`postcss`**: ^8.5.6 - CSS processing

## Build System
- **Vite**: Fast dev server and production builds
- **Scripts**:
  - `npm run dev`: Start development server
  - `npm run build`: Build for production
  - `npm run preview`: Preview production build
  - `npm run deploy`: Build and deploy to Firebase Hosting
  - `npm run lint`: Run ESLint

## Firebase Integration
- **Authentication**: Email/password login
- **Firestore**: Real-time database for settings
- **Hosting**: Production deployment
- **Configuration**: Environment variables
  - `.env.local` for development
  - `.env.production` for production builds

## Firebase Project
- **Project ID**: `vr-centre-7bdac`
- **Hosting URLs**:
  - `https://vr-centre-7bdac.web.app`
  - `https://vr-centre-7bdac.firebaseapp.com`

## R2 Integration
- **Base URL**: `https://pub-f87e49b41fad4c0fad84e94d65ed13cc.r2.dev`
- **Bucket**: `vrcentre-roleplay-ai-bucket`
- **Operations**:
  - Read DLC manifests
  - Publish catalog.json
  - Detect build types

## Deployment
- **Platform**: Firebase Hosting
- **Build Command**: `npm run build`
- **Deploy Command**: `npm run deploy` or `npx firebase-tools deploy --only hosting`
- **Environment Variables**: Build-time (Vite)
- **Firebase CLI**: Use `npx firebase-tools` or install globally

## Security
- **Firestore Rules**: Configured in `firestore.rules`
  - Public read access to `/settings/launcher`
  - Authenticated write access
- **Firebase Config**: Public values (security via Firestore rules)
- **Authentication**: Required for admin access

## Platform Support
- **Development**: Local dev server (Vite)
- **Production**: Firebase Hosting (web)
- **Browser**: Modern browsers (Chrome, Firefox, Safari, Edge)

## File Structure
```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── Login.tsx        # Authentication
│   ├── DLCManager.tsx   # DLC management
│   ├── CatalogPublisher.tsx  # Catalog publishing
│   └── R2SyncButton.tsx # R2 synchronization
├── services/
│   ├── catalogPublisher.ts  # Catalog generation
│   └── r2Sync.ts        # R2 sync logic
├── types/
│   ├── catalog.ts       # Catalog types
│   ├── dlc.ts          # DLC types
│   ├── settings.ts     # Settings types
│   └── index.ts        # Re-exports
├── utils/
│   └── migration.ts    # Data migration utilities
├── firebase.ts         # Firebase configuration
└── App.tsx            # Root component
```
