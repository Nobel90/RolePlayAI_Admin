# RolePlayAI Admin Dashboard

Admin dashboard for managing dynamic UI settings of the RolePlayAI Launcher. Built with React, TypeScript, Vite, Firebase, and shadcn/ui.

## Features

- Firebase Authentication for secure access
- Dynamic launcher UI customization:
  - Button text and labels
  - News bar management (show/hide, content)
  - Background images (single or slideshow with configurable timings)
  - Sidebar logo and game name
  - Header links (add, edit, remove, reorder)
- Real-time synchronization with the launcher via Firestore
- Modern UI with shadcn/ui components and Tailwind CSS

## Development

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Nobel90/RolePlayAI_Admin.git
cd RolePlayAI_Admin
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file (copy from `.env.example`):
```bash
cp .env.example .env.local
```

4. Fill in your Firebase configuration in `.env.local`:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

5. Start the development server:
```bash
npm run dev
```

## Deployment to Firebase Hosting

### Prerequisites

- Firebase CLI (or use `npx firebase-tools`)
- Firebase project configured

### Deployment Steps

1. **Login to Firebase** (if not already logged in):
```bash
npm run firebase:login
```

2. **Verify Firebase project** (should be `vr-centre-7bdac`):
```bash
npm run firebase:use
```

3. **Build the project**:
```bash
npm run build
```

4. **Deploy to Firebase Hosting**:
```bash
npm run deploy
```

Or deploy manually:
```bash
npx firebase-tools deploy --only hosting
```

### Environment Variables for Production

Firebase Hosting uses build-time environment variables. The `.env.production` file contains the production Firebase configuration and is committed to the repository (Firebase config values are public and safe to commit - security is handled by Firestore rules).

For production builds, Vite automatically uses `.env.production` when running `npm run build`.

### Access Your Deployed Site

After deployment, your site will be available at:
- `https://vr-centre-7bdac.web.app`
- `https://vr-centre-7bdac.firebaseapp.com`

You can also set up a custom domain in the Firebase Console.

## Project Structure

```
RolePlayAI_Admin/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── Dashboard.tsx # Main admin dashboard
│   │   └── Login.tsx     # Authentication component
│   ├── firebase.ts       # Firebase configuration
│   └── App.tsx           # Main app component
├── firebase.json         # Firebase Hosting configuration
├── .firebaserc           # Firebase project configuration
└── .env.example          # Environment variables template
```

## Firebase Security Rules

Make sure your Firestore security rules allow:
- Public read access to `/settings/launcher` (for the launcher to read settings)
- Authenticated write access to `/settings/launcher` (for admin dashboard)

See `firestore.rules` for the recommended rules configuration.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Build and deploy to Firebase Hosting
- `npm run firebase:login` - Login to Firebase
- `npm run firebase:use` - Switch Firebase project

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
