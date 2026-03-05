const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function fixUrls() {
    const dirs = ['./app', './components'];
    let filesModified = 0;

    dirs.forEach(dir => {
        walkDir(dir, function (filePath) {
            if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;

            // 1. const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'; -> const API_BASE = '/api';
            content = content.replace(/process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*['"`]http:\/\/localhost:5000\/api['"`]/g, "'/api'");

            // 2. `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/ -> `/api/
            content = content.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*['"]http:\/\/localhost:5000['"]\}\/api/g, "/api");

            // 3. `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}` -> ``
            content = content.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*['"]http:\/\/localhost:5000['"]\}/g, "");

            // 4. 'http://localhost:5000/api/ -> '/api/
            content = content.replace(/['"`]http:\/\/localhost:5000\/api\//g, "'/api/");
            content = content.replace(/['"`]http:\/\/localhost:5000\/api['"`]/g, "'/api'");

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                filesModified++;
                console.log(`Modified ${filePath}`);
            }
        });
    });

    console.log(`Total files modified: ${filesModified}`);
}

fixUrls();
