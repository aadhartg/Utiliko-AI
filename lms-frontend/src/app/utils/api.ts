"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== "undefined" ? localStorage.getItem("lms_token") : null;
    
    const headers = {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("lms_token");
            localStorage.removeItem("lms_role");
            window.location.href = "/";
        }
        throw new Error("Session expired. Redirecting to login...");
    }

    return res;
}
