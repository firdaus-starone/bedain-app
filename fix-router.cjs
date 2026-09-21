const fs = require('fs');
const path = require('path');

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

const files = walk('src/components').filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('react-router-dom')) {
        let newContent = content;
        
        // 1. Link replacement
        if (newContent.includes('Link')) {
            newContent = newContent.replace(/import\s+{\s*([^}]*?)\s*}\s+from\s+['"]react-router-dom['"];?/g, (match, p1) => {
                let imports = p1.split(',').map(s => s.trim());
                if (imports.includes('Link')) {
                    imports = imports.filter(i => i !== 'Link');
                    if (imports.length === 0) {
                        return "import Link from 'next/link';";
                    }
                    return `import Link from 'next/link';\nimport { ${imports.join(', ')} } from 'next/navigation';`;
                }
                return `import { ${imports.join(', ')} } from 'next/navigation';`;
            });
        } else {
            newContent = newContent.replace(/import\s+{\s*([^}]*?)\s*}\s+from\s+['"]react-router-dom['"];?/g, "import { $1 } from 'next/navigation';");
        }
        
        // 2. useNavigate -> useRouter
        newContent = newContent.replace(/useNavigate/g, 'useRouter');
        newContent = newContent.replace(/const\s+navigate\s*=\s*useRouter\(\)/g, 'const router = useRouter()');
        newContent = newContent.replace(/navigate\(/g, 'router.push(');
        
        // 3. useLocation -> usePathname
        newContent = newContent.replace(/useLocation/g, 'usePathname');
        newContent = newContent.replace(/const\s+location\s*=\s*usePathname\(\)/g, 'const pathname = usePathname()');
        newContent = newContent.replace(/location\.pathname/g, 'pathname');
        newContent = newContent.replace(/location ===/g, 'pathname ===');
        
        fs.writeFileSync(file, newContent);
        console.log(`Updated ${file}`);
    }
});
