const fs = require('fs');
const path = require('path');

// 1. Rename src/pages to src/views
if (fs.existsSync('src/pages')) {
    fs.renameSync('src/pages', 'src/views');
    console.log('Renamed src/pages to src/views');
}

// 2. Patch all files in src/ to point to src/views instead of src/pages
const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
};

const allFiles = walk('src').filter(f => f.endsWith('.jsx') || f.endsWith('.js'));
allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    // Fix imports from pages to views
    content = content.replace(/['"]\.\.\/pages\//g, '"../views/');
    content = content.replace(/['"]\.\/pages\//g, '"./views/');

    // Fix react-router-dom to next/navigation in views and components
    if (file.includes('/views/') || file.includes('/components/')) {
        content = content.replace(/from\s+['"]react-router-dom['"]/g, "from 'next/navigation'");
        content = content.replace(/useNavigate\(/g, 'useRouter(');
        content = content.replace(/navigate\(/g, 'router.push(');
        content = content.replace(/const navigate =/g, 'const router =');
    }

    if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log(`Patched paths/router in ${file}`);
    }
});

// 3. Create Next.js App Router wrappers
const routes = {
    'admin/login': 'AdminLogin',
    'admin/dashboard': 'AdminDashboard',
    'admin/articles': 'AdminArticles',
    'admin/editor': 'ArticleEditor',
    'admin/users': 'AdminUsers',
    'admin/media': 'AdminMedia',
    'admin/categories': 'AdminCategories',
    'admin/menus': 'AdminMenus',
    'admin/pages': 'AdminPages',
    'admin/settings': 'AdminSettings',
    'admin/banners': 'AdminBanners',
    'admin/comments': 'AdminComments',
    'admin/submissions': 'AdminSubmissions',
    'admin/messages': 'AdminMessages',
    
    'cari': 'SearchPage',
    'kirim-tulisan': 'SubmitArticle',
    'kontak': 'Contact',
    'page/[slug]': 'StaticPageView',
    'faq': 'StaticPageView'
};

for (const [routePath, componentName] of Object.entries(routes)) {
    const dir = path.join('src/app', routePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // We calculate relative path to src/views
    // Number of segments in routePath:
    const segments = routePath.split('/').length; // e.g. admin/dashboard -> 2
    const upPath = Array(segments + 1).fill('..').join('/'); // +1 because we are in app/XYZ/page.jsx -> app is 1 level down from src
    
    const wrapperContent = `"use client";
import ${componentName} from '${upPath}/views/${componentName}';

export default function Page(props) {
    return <${componentName} {...props} />;
}
`;
    fs.writeFileSync(path.join(dir, 'page.jsx'), wrapperContent);
    console.log(`Created wrapper for ${routePath}`);
}

// 4. Create admin layout
const adminLayoutContent = `"use client";
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
                    
                    if (userDoc.exists() && userDoc.data().role === 'admin') {
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
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#121214' }}>
            <AdminSidebar />
            <div style={{ flex: 1, padding: '20px', marginLeft: '250px', width: 'calc(100% - 250px)', overflowX: 'hidden' }}>
                {children}
            </div>
        </div>
    );
}
`;
fs.writeFileSync('src/app/admin/layout.jsx', adminLayoutContent);
console.log('Created admin layout.jsx');

console.log('Done mapping components!');
