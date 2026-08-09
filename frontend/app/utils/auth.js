// utils/auth.js
import { auth } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if the user's email domain is allowed
        const emailDomain = user.email.split("@")[1];
        const allowedDomain = "vitbhopal.ac.in"; // Replace with your allowed domain

        if (emailDomain !== allowedDomain) {
            alert(`Sign-in is restricted to users from the domain: ${allowedDomain}`);
            await auth.signOut();
            return null;
        } else {
            console.log("User signed in successfully:", user);
            return user;
        }
    } catch (error) {
        console.error("Error during sign-in:", error.message);
        return null;
    }
};
