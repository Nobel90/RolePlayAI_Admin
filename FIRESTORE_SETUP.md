# Firestore Security Rules - UPDATED

## Critical Fix for Launcher

The launcher needs **PUBLIC READ** access to `settings/launcher` because:
- The launcher may not always be authenticated
- Users need to see the UI updates even when logged out
- The settings are not sensitive (just UI text)

## Updated Rules

The `firestore.rules` file now includes:

```javascript
match /settings/{document=**} {
  // Allow PUBLIC read access (launcher needs this)
  allow read: if true;
  
  // Allow write only if user is authenticated
  allow write: if request.auth != null;
}
```

## Setup Steps

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Project**: `vr-centre-7bdac`
3. **Navigate to**: Firestore Database → **Rules** tab
4. **Copy the entire content** from `firestore.rules` file
5. **Paste** into the Firebase Console rules editor
6. **Click "Publish"** to save

## Security Note

- **Read access is PUBLIC**: Anyone can read the settings (this is safe - it's just UI text)
- **Write access is AUTHENTICATED**: Only logged-in users can modify settings
- If you want to restrict writes to specific admins, uncomment the alternative rule in `firestore.rules`

## After Publishing

1. Restart the launcher
2. Check the console - the "Missing or insufficient permissions" error should be gone
3. Save settings from the Admin website
4. The launcher should update immediately

## Testing

After updating rules:
- Launcher should be able to read settings (no auth needed)
- Admin website can write settings (auth required)
- Changes should appear in launcher in real-time
