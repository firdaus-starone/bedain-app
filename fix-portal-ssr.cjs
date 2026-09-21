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
    if (content.includes('document.body') && content.includes('createPortal')) {
        let newContent = content;
        
        // Wrap the createPortal call to check for document
        // This is a naive replacement, but should work for basic uses of document.body in portals
        if (!content.includes('typeof document !== \'undefined\'')) {
             newContent = content.replace(/createPortal\([\s\S]*?document\.body\s*\)/g, (match) => {
                 return `typeof document !== 'undefined' ? ${match} : null`;
             });
             fs.writeFileSync(file, newContent);
             console.log(`Fixed SSR portal in ${file}`);
        }
    }
});
