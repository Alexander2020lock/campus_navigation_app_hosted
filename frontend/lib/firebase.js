import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBTmB3lWhBOf0MU-juEm5jY_yPONWNeu-g",
    authDomain: "projectexpo-ea0f1.firebaseapp.com",
    projectId: "projectexpo-ea0f1",
    storageBucket: "projectexpo-ea0f1.firebasestorage.app",
    messagingSenderId: "802175575055",
    appId: "1:802175575055:web:726a9e1543b1ba5e562f7a"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Auth & Google Provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        console.log('Firebase persistence set to LOCAL');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });

export { auth, googleProvider };
