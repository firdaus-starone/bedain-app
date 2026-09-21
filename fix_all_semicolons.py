import os
import glob
import re

files = glob.glob('src/views/*.jsx')

for path in files:
    with open(path, 'r') as f:
        content = f.read()
    
    # Remove rogue empty semicolon line (a line that only contains a semicolon)
    # Be careful not to remove valid ones, but ^;$ is what we are looking for.
    new_content = re.sub(r'^\s*;\s*\n', '', content, flags=re.MULTILINE)
    
    if new_content != content:
        with open(path, 'w') as f:
            f.write(new_content)
        print(f"Fixed {path}")

