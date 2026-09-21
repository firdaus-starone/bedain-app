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

const files = walk('src').filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;
    
    // Fix localStorage issue (Client Component SSR hydration mismatch)
    newContent = newContent.replace(/useState\(localStorage\.getItem\('([^']+)'\)\s*\|\|\s*'([^']+)'\)/g, "useState(typeof window !== 'undefined' ? localStorage.getItem('$1') || '$2' : '$2')");
    newContent = newContent.replace(/useState\(localStorage\.getItem\('([^']+)'\)\)/g, "useState(typeof window !== 'undefined' ? localStorage.getItem('$1') : null)");
    
    // Fix Link to= issue completely (including <Link to="..." directly)
    newContent = newContent.replace(/<Link\s+to=/g, '<Link href=');
    newContent = newContent.replace(/<Link([^>]*?)\s+to=/g, '<Link$1 href=');
    
    if (newContent !== content) {
        fs.writeFileSync(file, newContent);
        console.log(`Fixed SSR/Links in ${file}`);
    }
});
