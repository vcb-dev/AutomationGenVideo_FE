"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { getDashboardPathForRoles } from "@/lib/post-login-redirect";

import { Suspense } from "react";

function GoogleCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loadUser } = useAuthStore();

    useEffect(() => {
        const handleGoogleCallback = async () => {
            const errorParam = searchParams.get("error");
            if (errorParam) {
                router.push(`/login?error=${encodeURIComponent(errorParam)}`);
                return;
            }

            // Backend đã set HttpOnly Cookie khi redirect về. Gọi loadUser() để lấy profile.
            try {
                await loadUser();
                const { user, isAuthenticated } = useAuthStore.getState();
                if (isAuthenticated && user) {
                    router.push(getDashboardPathForRoles(user.roles));
                } else {
                    router.push("/login?error=Failed to load user profile");
                }
            } catch (error) {
                console.error("Failed to load user after Google login:", error);
                router.push("/login?error=Failed to load user profile");
            }
        };

        handleGoogleCallback();
    }, [searchParams, router, loadUser]);

    return (
        <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
    );
}

export default function GoogleCallbackPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Suspense
                fallback={
                    <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold mb-4">Loading...</h2>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                }
            >
                <GoogleCallbackContent />
            </Suspense>
        </div>
    );
}
