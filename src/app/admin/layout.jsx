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
    const [isPending, setIsPending] = useState(false);
    const [logoutTrigger, setLogoutTrigger] = useState(false);
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
                    } else if (userDoc.exists() && userDoc.data().role === 'pending') {
                        setIsPending(true);
                    } else if (user.email === 'redaksi@bedainnews.com' || user.email === 'firdausdprdkkr@gmail.com' || user.email === 'firdausdev01@gmail.com') {
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

    if (isPending) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#121214', color: '#fff', padding: '20px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '40px', borderRadius: '16px', maxWidth: '400px' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', fontWeight: 700 }}>Menunggu Persetujuan</h2>
                    <p style={{ color: '#a1a1aa', lineHeight: 1.6, marginBottom: '24px' }}>
                        Akun Anda berhasil didaftarkan, namun saat ini berstatus <strong>Pending</strong>. Silakan hubungi Admin atau Pemimpin Redaksi untuk mengaktifkan hak akses jurnalis Anda.
                    </p>
                    <button 
                        onClick={() => auth.signOut().then(() => router.push('/admin/login'))}
                        style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Kembali ke Halaman Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <AdminSidebar />
            <div style={{ flex: 1, overflowX: 'clip', width: '100%', position: 'relative' }}>
                {children}
            </div>
        </div>
    );
}
