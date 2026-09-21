const fs = require('fs');

const fixFile = (path, isRouter) => {
    let content = fs.readFileSync(path, 'utf8');
    if (isRouter) {
        content = content.replace(
            "import { useRouter, Navigate } from 'next/navigation';",
            "import { useRouter } from 'next/navigation';\nconst Navigate = ({to}) => { if (typeof window !== 'undefined') window.location.href = to; return null; };"
        );
    } else {
        content = content.replace(
            "import { Navigate } from 'next/navigation';",
            "const Navigate = ({to}) => { if (typeof window !== 'undefined') window.location.href = to; return null; };"
        );
    }
    fs.writeFileSync(path, content);
};

fixFile('src/views/AdminMenus.jsx', false);
fixFile('src/views/AdminCategories.jsx', false);
fixFile('src/views/AdminPages.jsx', false);
fixFile('src/views/AdminUsers.jsx', true);
fixFile('src/views/AdminComments.jsx', true);

console.log('Fixed all files!');
