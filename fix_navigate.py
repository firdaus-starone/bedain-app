import os

def fix_file(path, is_router):
    with open(path, 'r') as f:
        content = f.read()
    
    if is_router:
        content = content.replace(
            "import { useRouter, Navigate } from 'next/navigation';",
            "import { useRouter } from 'next/navigation';\nconst Navigate = ({to}) => { if (typeof window !== 'undefined') window.location.href = to; return null; };"
        )
    else:
        content = content.replace(
            "import { Navigate } from 'next/navigation';",
            "const Navigate = ({to}) => { if (typeof window !== 'undefined') window.location.href = to; return null; };"
        )
        
    with open(path, 'w') as f:
        f.write(content)

fix_file('src/views/AdminMenus.jsx', False)
fix_file('src/views/AdminCategories.jsx', False)
fix_file('src/views/AdminPages.jsx', False)
fix_file('src/views/AdminUsers.jsx', True)
fix_file('src/views/AdminComments.jsx', True)

print("Fixed!")
