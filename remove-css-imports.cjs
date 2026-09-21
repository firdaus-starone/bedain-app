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
    let newContent = content.replace(/import\s+['"](?:\.\.\/|\.\/)(?:App\.css|index\.css)['"];?/g, '');
    if (newContent !== content) {
        fs.writeFileSync(file, newContent);
        console.log(`Removed old CSS imports in ${file}`);
    }
});
