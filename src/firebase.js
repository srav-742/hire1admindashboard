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

export const API_URL = import.meta.env.VITE_API_URL || "https://api.hire1percent.com/api";

export const getAuthHeaders = async () => {
    const clientHeaders = {
        'X-Client-ID': 'hire1percent_web_client',
        'X-Client-Secret': 'h1p_secret_2026_gateway_key'
    };

    // Check if we have a local storage admin session first (Priority)
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
        try {
            const storedUser = JSON.parse(storedUserStr);
            if (storedUser && storedUser.role === 'admin' && storedUser.uid) {
                console.log("[AUTH-HEADERS] Prioritizing local storage admin identification:", storedUser.uid);
                return {
                    'x-user-id': storedUser.uid,
                    ...clientHeaders
                };
            }
        } catch (e) {
            console.error("[AUTH-HEADERS] Failed to parse stored user:", e);
        }
    }

    // 1. Try Firebase Auth (Priority for seeker/recruiter if any)
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        return {
            'Authorization': `Bearer ${token}`,
            'x-user-id': user.uid,
            ...clientHeaders
        };
    }

    // 2. Fallback to Local Storage for other accounts
    if (storedUserStr) {
        try {
            const storedUser = JSON.parse(storedUserStr);
            if (storedUser && storedUser.uid) {
                console.log("[AUTH-HEADERS] Using local storage user identification:", storedUser.uid);
                return {
                    'x-user-id': storedUser.uid,
                    ...clientHeaders
                };
            }
        } catch (e) {}
    }

    return clientHeaders;
};
