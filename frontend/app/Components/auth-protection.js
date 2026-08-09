"use client"
import { useEffect, useState } from 'react';
import { auth } from "@/lib/firebase";
import { useRouter } from 'next/navigation';
import { getAdminEmails } from "@/lib/adminUtils";

export function withAdminAuth(Component) {
  return function ProtectedRoute() {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const adminEmails = await getAdminEmails();
          const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user && adminEmails.includes(user.email)) {
              setIsAuthenticated(true);
              if (window.location.pathname === '/admin') {
                router.replace('/cpanel');
              }
            } else {
              if (window.location.pathname.startsWith('/cpanel')) {
                router.replace('/admin');
              }
            }
            setIsLoading(false);
          });

          return () => unsubscribe();
        } catch (error) {
          console.error("Auth error:", error);
          setIsLoading(false);
          router.replace('/admin');
        }
      };

      checkAuth();
    }, [router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-black">Loading...</div>
        </div>
      );
    }

    if (!isAuthenticated && window.location.pathname.startsWith('/cpanel')) {
      return null; // Will redirect in useEffect
    }

    return <Component />;
  };
}
