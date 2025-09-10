const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const QRCode = require('qrcode');

// Cấu hình
const CSV_FILE = './guest-list.csv';
const OUTPUT_DIR = './output/qrs';
const BASE_URL = 'http://localhost:3000'; // URL của web server

/**
 * Tạo thư mục output nếu chưa tồn tại
 */
function ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`✅ Đã tạo thư mục: ${OUTPUT_DIR}`);
    }
}

/**
 * Tạo QR code cho một khách mời
 * @param {Object} guest - Thông tin khách mời {id, name, role, email}
 * @returns {Promise<string>} - Đường dẫn file QR đã tạo
 */
async function generateQRForGuest(guest) {
    try {
        // Tạo URL check-in cho khách này
        const checkinUrl = `${BASE_URL}/checkin/${guest.id}`;
        
        // Tạo QR code
        const qrCodeDataURL = await QRCode.toDataURL(checkinUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Tạo tên file an toàn (loại bỏ ký tự đặc biệt)
        const safeName = guest.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const fileName = `${guest.id}_${safeName}.png`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        // Chuyển đổi data URL thành buffer và lưu file
        const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        fs.writeFileSync(filePath, buffer);
        
        console.log(`✅ Đã tạo QR cho: ${guest.name} (${guest.id})`);
        return filePath;
        
    } catch (error) {
        console.error(`❌ Lỗi khi tạo QR cho ${guest.name}:`, error.message);
        throw error;
    }
}

/**
 * Đọc file CSV và tạo QR codes cho tất cả khách mời
 */
async function generateAllQRCodes() {
    console.log('🚀 Bắt đầu tạo QR codes cho khách mời...\n');
    
    // Đảm bảo thư mục output tồn tại
    ensureOutputDir();
    
    const guests = [];
    let successCount = 0;
    let errorCount = 0;

    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_FILE)
            .pipe(csv())
            .on('data', (row) => {
                // Parse dữ liệu từ CSV
                const guest = {
                    id: row.id || Object.values(row)[0],
                    name: row.name || Object.values(row)[1], 
                    role: row.role || Object.values(row)[2],
                    email: row.email || Object.values(row)[3]
                };
                guests.push(guest);
            })
            .on('end', async () => {
                console.log(`📋 Đã đọc ${guests.length} khách mời từ file CSV\n`);
                
                // Tạo QR code cho từng khách
                for (const guest of guests) {
                    try {
                        await generateQRForGuest(guest);
                        successCount++;
                    } catch (error) {
                        errorCount++;
                        console.error(`❌ Không thể tạo QR cho ${guest.name}:`, error.message);
                    }
                }
                
                console.log('\n📊 KẾT QUẢ:');
                console.log(`✅ Thành công: ${successCount} QR codes`);
                console.log(`❌ Lỗi: ${errorCount} QR codes`);
                console.log(`📁 QR codes được lưu tại: ${path.resolve(OUTPUT_DIR)}`);
                
                resolve({ successCount, errorCount, totalGuests: guests.length });
            })
            .on('error', (error) => {
                console.error('❌ Lỗi khi đọc file CSV:', error.message);
                reject(error);
            });
    });
}

/**
 * Tạo file tổng hợp danh sách khách mời với URL check-in
 */
async function generateGuestList() {
    const guests = [];
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_FILE)
            .pipe(csv())
            .on('data', (row) => {
                const guest = {
                    id: row.id || Object.values(row)[0],
                    name: row.name || Object.values(row)[1], 
                    role: row.role || Object.values(row)[2],
                    email: row.email || Object.values(row)[3],
                    checkinUrl: `${BASE_URL}/checkin/${row.id || Object.values(row)[0]}`
                };
                guests.push(guest);
            })
            .on('end', () => {
                const guestListPath = path.join(OUTPUT_DIR, 'guest-list-with-urls.json');
                fs.writeFileSync(guestListPath, JSON.stringify(guests, null, 2));
                console.log(`📋 Đã tạo file danh sách khách: ${guestListPath}`);
                resolve(guests);
            })
            .on('error', reject);
    });
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
    (async () => {
        try {
            await generateAllQRCodes();
            await generateGuestList();
            console.log('\n🎉 Hoàn thành tạo QR codes!');
        } catch (error) {
            console.error('❌ Lỗi trong quá trình tạo QR codes:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = {
    generateQRForGuest,
    generateAllQRCodes,
    generateGuestList
};
