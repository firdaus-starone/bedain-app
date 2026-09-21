"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '../../components/AdminSidebar';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminLayout({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === '/admin/login') {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    
                    if (userDoc.exists() && ['admin', 'superadmin', 'editor', 'reporter'].includes(userDoc.data().role)) {
                        setIsAdmin(true);
                    } else if (user.email === 'redaksi@bedainnews.com') {
                        // Fallback override for official email during migration
                        setIsAdmin(true);
                    } else {
                        router.push('/');
                    }
                } catch (error) {
                    console.error("Error checking user role:", error);
                    router.push('/');
                }
            } else {
                router.push('/admin/login');
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [router, pathname]);

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121214', color: '#fff' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="admin-layout">
            <AdminSidebar />
            <div style={{ flex: 1, overflowX: 'hidden', width: '100%', position: 'relative' }}>
                {children}
            </div>
        </div>
    );
}
