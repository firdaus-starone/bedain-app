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
    if (content.includes('Link')) {
        let newContent = content.replace(/<Link\s+([^>]*?)to=/g, '<Link $1href=');
        if (newContent !== content) {
            fs.writeFileSync(file, newContent);
            console.log(`Updated to= to href= in ${file}`);
        }
    }
});
