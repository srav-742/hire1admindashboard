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

export const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : 'https://api.hire1percent.com/api');


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
            const userId = storedUser?.uid || storedUser?._id || (storedUser?.role === 'admin' ? 'SQKunisKWhb49NUPKuk9R38iwQN2' : null);
            if (userId) {
                return {
                    'x-user-id': userId,
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

    // Default Fallback for Admin Dashboard operations
    return {
        'x-user-id': 'SQKunisKWhb49NUPKuk9R38iwQN2',
        ...clientHeaders
    };

};
