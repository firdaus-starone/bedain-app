import os

files = [
    'src/views/AdminMenus.jsx',
    'src/views/AdminCategories.jsx',
    'src/views/AdminPages.jsx',
    'src/views/AdminUsers.jsx',
    'src/views/AdminComments.jsx'
]

bad_line = "const Navigate = ({to}) => { if (typeof window !== 'undefined') window.location.href = to; return null; };"
good_line = "const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };"

for path in files:
    if os.path.exists(path):
        with open(path, 'r') as f:
            content = f.read()
        
        content = content.replace(bad_line, good_line)
            
        with open(path, 'w') as f:
            f.write(content)

print("Fixed again!")
