import os
import glob
import re

files = []
for root, _, filenames in os.walk('src'):
    for filename in filenames:
        if filename.endswith('.jsx') or filename.endswith('.js'):
            files.append(os.path.join(root, filename))

for path in files:
    with open(path, 'r') as f:
        content = f.read()
    
    new_content = re.sub(r'^\s*;\s*\n', '', content, flags=re.MULTILINE)
    
    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Fixed {path}")

