import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDd3YaduiL4mjuv6kNErlqkILfiAGuUh4o",
    authDomain: "practiceproject-f0b0e.firebaseapp.com",
    databaseURL: "https://practiceproject-f0b0e-default-rtdb.firebaseio.com",
    projectId: "practiceproject-f0b0e",
    storageBucket: "practiceproject-f0b0e.firebasestorage.app",
    messagingSenderId: "409300066922",
    appId: "1:409300066922:web:0acd4a72784a1d91ede013",
    measurementId: "G-P72KSFQ9XX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithEmail = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
};

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getAuthHeaders = async () => {
    // 1. Try Firebase Auth (Priority)
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'x-user-id': user.uid
        };
    }

    // 2. Fallback to Local Storage (for local-only accounts like Admin)
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
        try {
            const storedUser = JSON.parse(storedUserStr);
            if (storedUser && storedUser.uid) {
                console.log("[AUTH-HEADERS] Using local storage user identification:", storedUser.uid);
                return {
                    'x-user-id': storedUser.uid
                };
            }
        } catch (e) {
            console.error("[AUTH-HEADERS] Failed to parse stored user:", e);
        }
    }

    return {};
};
