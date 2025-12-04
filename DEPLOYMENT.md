# Deployment Guide for RolePlayAI Admin

## Prerequisites

1. **Firebase CLI installed and logged in**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Environment Variables for Production**
   
   For production builds, you have two options:

   ### Option A: Use .env.production file (Recommended for CI/CD)
   
   Create a `.env.production` file in the project root:
   ```
   VITE_FIREBASE_API_KEY=AIzaSyDigbqsTEMSRXz_JgqBAIJ1BKmr6Zb7DzQ
   VITE_FIREBASE_AUTH_DOMAIN=vr-centre-7bdac.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=vr-centre-7bdac
   VITE_FIREBASE_STORAGE_BUCKET=vr-centre-7bdac.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=236273910700
   VITE_FIREBASE_APP_ID=1:236273910700:web:10d6825337bfd26fb43009
   VITE_FIREBASE_MEASUREMENT_ID=G-7P6X25QK1R
   ```

   ### Option B: Use Firebase Hosting Build Settings
   
   In Firebase Console:
   1. Go to Hosting → Build Settings
   2. Add environment variables:
      - `VITE_FIREBASE_API_KEY`
      - `VITE_FIREBASE_AUTH_DOMAIN`
      - `VITE_FIREBASE_PROJECT_ID`
      - `VITE_FIREBASE_STORAGE_BUCKET`
      - `VITE_FIREBASE_MESSAGING_SENDER_ID`
      - `VITE_FIREBASE_APP_ID`
      - `VITE_FIREBASE_MEASUREMENT_ID`

## Deployment Steps

### 1. Build the Project
```bash
cd "D:\Dev\VR Centre\RolePlayAI_Admin"
npm run build
```

This will:
- Compile TypeScript
- Build the Vite project
- Create optimized production files in `dist/` folder

### 2. Verify Build
Check that `dist/` folder exists and contains:
- `index.html`
- `assets/` folder with JS and CSS files

### 3. Deploy to Firebase Hosting
```bash
npm run deploy
```

Or manually:
```bash
firebase deploy --only hosting
```

### 4. Verify Deployment
After deployment, Firebase will provide a URL like:
- `https://vr-centre-7bdac.web.app`
- `https://vr-centre-7bdac.firebaseapp.com`

Visit the URL to verify the site is live.

## Troubleshooting

### Build Fails
- Check for TypeScript errors: `npm run build`
- Check for missing dependencies: `npm install`
- Verify environment variables are set

### Deployment Fails
- Ensure you're logged in: `firebase login`
- Check Firebase project: `firebase use`
- Verify firebase.json configuration

### Site Loads but Shows Errors
- Check browser console (F12) for errors
- Verify Firebase environment variables are set in production
- Check Firebase Hosting build logs

### Environment Variables Not Working
- Vite embeds env vars at BUILD time, not runtime
- Must rebuild after changing .env.production
- Or use Firebase Hosting build settings

## Quick Deploy Command

```bash
cd "D:\Dev\VR Centre\RolePlayAI_Admin"
npm run build && firebase deploy --only hosting
```

## Post-Deployment Checklist

- [ ] Site loads without errors
- [ ] Login page appears
- [ ] Can log in with Firebase credentials
- [ ] Dashboard loads correctly
- [ ] DLC tab is visible
- [ ] Can create/edit DLCs
- [ ] Changes save to Firestore

