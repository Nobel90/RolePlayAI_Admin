import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase configuration from environment variables
// For local development, use .env.local file
// For production, set these in Firebase Hosting build settings or .env.production
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that all required environment variables are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    const errorMsg = "Missing required Firebase configuration. Please check your environment variables.";
    console.error(errorMsg);
    console.error("Config received:", {
        apiKey: firebaseConfig.apiKey ? "✓" : "✗",
        projectId: firebaseConfig.projectId ? "✓" : "✗",
        authDomain: firebaseConfig.authDomain ? "✓" : "✗",
    });
    console.error("Make sure you have a .env.local file with VITE_FIREBASE_* variables");
    // Still try to initialize - Firebase will throw a more descriptive error
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (error: any) {
    console.error("Firebase initialization error:", error);
    throw new Error(`Firebase initialization failed: ${error.message}`);
}

export { auth, db };

