const http = require('http');

/**
 * Test API endpoints của hệ thống QR Check-in
 */
async function testAPI() {
    console.log('🧪 Bắt đầu test API...\n');
    
    const baseUrl = 'http://localhost:3000';
    const testGuestId = 'STH00002'; // Hà Văn Khôi
    
    // Test 1: Trang chủ
    console.log('1️⃣ Test trang chủ...');
    try {
        const response = await makeRequest(`${baseUrl}/`);
        console.log(`✅ Trang chủ: ${response.statusCode} - OK`);
    } catch (error) {
        console.log(`❌ Trang chủ: ${error.message}`);
    }
    
    // Test 2: Trang check-in hợp lệ
    console.log('\n2️⃣ Test trang check-in hợp lệ...');
    try {
        const response = await makeRequest(`${baseUrl}/checkin/${testGuestId}`);
        console.log(`✅ Check-in page: ${response.statusCode} - OK`);
        if (response.body.includes('Hà Văn Khôi')) {
            console.log('✅ Tên khách hiển thị đúng');
        }
    } catch (error) {
        console.log(`❌ Check-in page: ${error.message}`);
    }
    
    // Test 3: Trang check-in không hợp lệ
    console.log('\n3️⃣ Test trang check-in không hợp lệ...');
    try {
        const response = await makeRequest(`${baseUrl}/checkin/INVALID_ID`);
        console.log(`✅ Invalid ID: ${response.statusCode} - 404 (Expected)`);
    } catch (error) {
        console.log(`❌ Invalid ID: ${error.message}`);
    }
    
    // Test 4: API check-in
    console.log('\n4️⃣ Test API check-in...');
    try {
        const response = await makeRequest(`${baseUrl}/api/checkin/${testGuestId}`, 'POST');
        console.log(`✅ API check-in: ${response.statusCode} - OK`);
        const data = JSON.parse(response.body);
        if (data.success) {
            console.log('✅ Check-in thành công');
        }
    } catch (error) {
        console.log(`❌ API check-in: ${error.message}`);
    }
    
    // Test 5: API lấy danh sách check-in
    console.log('\n5️⃣ Test API danh sách check-in...');
    try {
        const response = await makeRequest(`${baseUrl}/api/checkins`);
        console.log(`✅ API checkins: ${response.statusCode} - OK`);
        const data = JSON.parse(response.body);
        console.log(`✅ Tổng số check-in: ${data.total}`);
    } catch (error) {
        console.log(`❌ API checkins: ${error.message}`);
    }
    
    // Test 6: API xuất báo cáo
    console.log('\n6️⃣ Test API xuất báo cáo...');
    try {
        const response = await makeRequest(`${baseUrl}/api/export`);
        console.log(`✅ API export: ${response.statusCode} - OK`);
        const data = JSON.parse(response.body);
        console.log(`✅ Số lượng báo cáo: ${data.total}`);
    } catch (error) {
        console.log(`❌ API export: ${error.message}`);
    }
    
    console.log('\n🎉 Hoàn thành test API!');
}

/**
 * Thực hiện HTTP request
 */
function makeRequest(url, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: body
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.end();
    });
}

// Chạy test nếu được gọi trực tiếp
if (require.main === module) {
    testAPI().catch(console.error);
}

module.exports = { testAPI };
