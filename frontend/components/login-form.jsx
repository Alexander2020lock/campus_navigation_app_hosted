"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { auth, googleProvider } from "@/lib/firebase"
import { signInWithPopup } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { getAdminEmails } from "@/lib/adminUtils"

export function LoginForm({
  className,
  ...props
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminEmails, setAdminEmails] = useState([]);

  useEffect(() => {
    // Load admin emails when component mounts
    const loadAdminEmails = async () => {
      const emails = await getAdminEmails();
      setAdminEmails(emails);
    };
    loadAdminEmails();
  }, []);

  const handleGoogleSignIn = async (e) => {
    e.preventDefault(); // Prevent form submission
    try {
      setIsLoading(true);
      setError("");
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user) {
        // Check if user's email is in the admin list
        if (adminEmails.includes(result.user.email)) {
          // Use replace instead of push and add a small delay to ensure state updates
          setTimeout(() => {
            router.replace('/cpanel');
          }, 100);
        } else {
          setError("Access denied. Only administrators can access this page.");
          // Sign out the user since they're not an admin
          await auth.signOut();
        }
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      if (error.code === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
        setError(
          'Unauthorized Domain Error: "127.0.0.1" is not added to Firebase Authorized Domains. ' +
          'Please access the application using http://localhost:3000 instead of http://127.0.0.1:3000.'
        );
      } else {
        setError(error.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLocalhost = () => {
    if (typeof window !== 'undefined') {
      window.location.href = window.location.href.replace('127.0.0.1', 'localhost');
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center text-black">
          <CardTitle className="text-xl">Admin Login</CardTitle>
          <CardDescription>
            Login with your administrator Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGoogleSignIn}>
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                {error && (
                  <div className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 text-xs text-center">
                    <p>{error}</p>
                    {typeof window !== 'undefined' && window.location.hostname === '127.0.0.1' && (
                      <button
                        type="button"
                        onClick={handleSwitchToLocalhost}
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-xs transition-colors cursor-pointer"
                      >
                        🔄 Switch to http://localhost:3000
                      </button>
                    )}
                  </div>
                )}
                <Button 
                  type="submit"
                  variant="outline" 
                  className="w-full bg-black" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>Loading...</span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 mr-2">
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor" />
                      </svg>
                      Login with Google
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div
        className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4 text-black">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
