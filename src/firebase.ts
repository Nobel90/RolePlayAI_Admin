import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration from existing launcher
const firebaseConfig = {
    apiKey: "AIzaSyDigbqsTEMSRXz_JgqBAIJ1BKmr6Zb7DzQ",
    authDomain: "vr-centre-7bdac.firebaseapp.com",
    projectId: "vr-centre-7bdac",
    storageBucket: "vr-centre-7bdac.firebasestorage.app",
    messagingSenderId: "236273910700",
    appId: "1:236273910700:web:10d6825337bfd26fb43009",
    measurementId: "G-7P6X25QK1R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

