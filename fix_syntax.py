import os
import re

files = [
    'src/views/AdminMenus.jsx',
    'src/views/AdminCategories.jsx',
    'src/views/AdminPages.jsx',
    'src/views/AdminUsers.jsx',
    'src/views/AdminComments.jsx'
]

bad_str1 = "const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };\n;"
bad_str2 = "const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };"

for path in files:
    if not os.path.exists(path):
        continue
    with open(path, 'r') as f:
        content = f.read()
    
    # Remove all instances of the bad strings
    content = content.replace(bad_str1, "")
    content = content.replace(bad_str2, "")
    # Remove any stray semicolons left behind on an empty line
    content = re.sub(r'\n;\n', '\n', content)
    
    # Now find the main component declaration and insert the Navigate component right before it
    # E.g. "const AdminCategories = () => {"
    basename = os.path.basename(path).split('.')[0]
    
    # Find the declaration
    regex = rf"const {basename} = .*?=> {{"
    match = re.search(regex, content)
    if match:
        insert_text = "const Navigate = ({to}) => { React.useEffect(() => { if (typeof window !== 'undefined') window.location.href = to; }, [to]); return null; };\n\n"
        content = content[:match.start()] + insert_text + content[match.start():]
        
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed {path}")
    else:
        print(f"Could not find component declaration in {path}")

