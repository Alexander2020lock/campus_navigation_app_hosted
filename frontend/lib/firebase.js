import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCLsKfTl78CPn3cUB4KHI4RDjOPmkd6H28",
    authDomain: "campnav-7e476.firebaseapp.com",
    projectId: "campnav-7e476",
    storageBucket: "campnav-7e476.firebasestorage.app",
    messagingSenderId: "170272319705",
    appId: "1:170272319705:web:4ecb8e2dde4b67e696f6c8",
    measurementId: "G-E0MR43V0Z3"
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

