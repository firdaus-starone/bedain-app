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
    let originalContent = content;

    content = content.replace(/pionirhouse\.com/g, 'bedainnews.com');
    content = content.replace(/PIONIRHOUSE/g, 'BEDAIN NEWS');
    content = content.replace(/PionirHouse/g, 'Bedain News');
    content = content.replace(/Pionirhouse/g, 'Bedain News');
    content = content.replace(/Pionir House/g, 'Bedain News');
    content = content.replace(/pionirhouse/g, 'bedainapp');
    content = content.replace(/Pionir/g, 'Bedain');
    content = content.replace(/pionir_/g, 'bedain_');
    
    // Some specific keys that shouldn't break:
    // pionir_bookmarks -> bedain_bookmarks (already handled by pionir_)
    // pionir_logo -> bedain_logo
    
    if (content !== originalContent) {
        fs.writeFileSync(file, content);
        console.log(`Updated names in ${file}`);
    }
});
