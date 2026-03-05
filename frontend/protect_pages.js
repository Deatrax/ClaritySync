const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        if (file === 'auth' || file === 'receipt') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file === 'auth' || file === 'receipt') return;
            results = results.concat(walk(fullPath));
        } else {
            if (file === 'page.tsx') {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const pages = walk('app');
console.log('Found ' + pages.length + ' page files.');

pages.forEach(file => {
    // skip auth and receipt explicit
    if (file.includes('app/auth/') || file.includes('app/receipt/')) return;

    let content = fs.readFileSync(file, 'utf8');

    // Check if already protected
    if (content.includes('ProtectedRoute')) return;

    // Find the export default function
    const regex = /export\s+default\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*{/s;
    const match = content.match(regex);
    if (!match) {
        console.log('Could not find export default function in ' + file);
        return;
    }

    const funcName = match[1];
    const params = match[2]; // e.g., `{ params }` or empty
    const passesProps = params.trim().length > 0;
    const propsSpread = passesProps ? '{...props}' : '';

    console.log('Protecting ' + file + ' | Function: ' + funcName);

    // Add import statement
    const importStmt = "import { ProtectedRoute } from '@/app/components/ProtectedRoute';";

    // Insert import after "use client" if exists, or at top
    let lines = content.split('\n');
    let useClientIndex = lines.findIndex(l => l.includes('"use client"') || l.includes("'use client'"));

    if (useClientIndex !== -1) {
        lines.splice(useClientIndex + 1, 0, importStmt);
    } else {
        lines.unshift(importStmt);
    }

    content = lines.join('\n');

    // Re-match since we added lines
    const match2 = content.match(regex);
    if (!match2) return;

    const oldExport = match2[0];
    const newExport = oldExport.replace(/export\s+default\s+/, '').replace(funcName, funcName + 'Content');

    content = content.replace(oldExport, newExport);

    // Add the wrapper
    content += `\n
export default function ${funcName}(props: any) {
  return (
    <ProtectedRoute>
      <${funcName}Content ${propsSpread} />
    </ProtectedRoute>
  );
}
`;

    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
});
