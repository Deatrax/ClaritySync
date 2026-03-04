// Using built-in fetch (Node 18+)

const API_URL = 'http://localhost:5000/api';
let token = '';

async function login() {
    console.log('Logging in as admin...');
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@claritysync.com', password: 'adminpassword' })
    });
    if (res.ok) {
        const data = await res.json();
        token = data.token;
        console.log('Login successful.');
    } else {
        console.error('Login failed.');
        process.exit(1);
    }
}

async function testToggle(moduleName, enable) {
    console.log(`Testing toggle for ${moduleName} to ${enable}...`);
    const res = await fetch(`${API_URL}/settings/modules/${moduleName}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_enabled: enable })
    });
    const data = await res.json();
    console.log(`Response: ${res.status}`, data);
    return res.status;
}

async function testAccess(modulePath) {
    console.log(`Testing access to ${modulePath}...`);
    const res = await fetch(`${API_URL}${modulePath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Access Response: ${res.status}`);
    return res.status;
}

async function runTests() {
    await login();

    // 1. Toggle SALES off
    console.log('\n--- Test 1: Disable Sales ---');
    await testToggle('SALES', false);

    // 2. Check access to SALES API
    console.log('\n--- Test 2: Verify Sales API is blocked (503) ---');
    await testAccess('/sales');

    // 3. Try to disable SETTINGS (Core)
    console.log('\n--- Test 3: Disable Core Module (Should fail) ---');
    await testToggle('SETTINGS', false);

    // 4. Toggle SALES back on
    console.log('\n--- Test 4: Re-enable Sales ---');
    await testToggle('SALES', true);

    // 5. Check access to SALES API again
    console.log('\n--- Test 5: Verify Sales API is accessible (200) ---');
    await testAccess('/sales');

    console.log('\nTests completed.');
}

runTests();
