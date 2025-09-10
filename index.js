const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/qrs', express.static('output/qrs'));
app.use('/resources', express.static('resources'));

// Lưu trữ dữ liệu check-in trong memory (trong thực tế nên dùng database)
let checkinData = [];

/**
 * Đọc thông tin khách mời từ CSV
 */
function getGuestInfo(guestId) {
    return new Promise((resolve, reject) => {
        const guests = [];
        fs.createReadStream('./resources/Guest_List_Cleaned.csv')
            .pipe(csv())
            .on('data', (row) => {
                const code = (row['Code'] || '').toString().trim();
                if (!code) return;
                const guest = {
                    id: code,
                    name: (row['Full Name'] || '').toString().trim(),
                    position: (row['Title / Position'] || '').toString().trim(),
                    company: (row['Organization / Company'] || '').toString().trim(),
                    salutation: (row['Salutation'] || '').toString().trim()
                };
                guests.push(guest);
            })
            .on('end', () => {
                const normalizedId = (guestId || '').toString().trim();
                const guest = guests.find(g => g.id === normalizedId);
                resolve(guest || null);
            })
            .on('error', reject);
    });
}

/**
 * Lưu thông tin check-in
 */
function saveCheckin(guestId, guestName) {
    const checkinRecord = {
        id: guestId,
        name: guestName,
        checkinTime: new Date().toISOString(),
        timestamp: Date.now()
    };
    
    // Kiểm tra xem khách đã check-in chưa
    const existingCheckin = checkinData.find(record => record.id === guestId);
    if (existingCheckin) {
        return { success: false, message: 'Khách đã check-in rồi', data: existingCheckin };
    }
    
    checkinData.push(checkinRecord);
    return { success: true, message: 'Check-in thành công', data: checkinRecord };
}

// Routes

/**
 * Trang chủ - hiển thị thống kê
 */
app.get('/', (req, res) => {
    const totalCheckedIn = checkinData.length;
    const recentCheckins = checkinData
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
    
    res.send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hệ thống Check-in Sự kiện</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; text-align: center; }
                .stats { display: flex; justify-content: space-around; margin: 30px 0; }
                .stat-box { background: #4CAF50; color: white; padding: 20px; border-radius: 8px; text-align: center; min-width: 150px; }
                .stat-number { font-size: 2em; font-weight: bold; }
                .recent-checkins { margin-top: 30px; }
                .checkin-item { background: #f9f9f9; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }
                .timestamp { color: #666; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎉 Hệ thống Check-in Sự kiện</h1>
                
                <div class="stats">
                    <div class="stat-box">
                        <div class="stat-number">${totalCheckedIn}</div>
                        <div>Đã Check-in</div>
                    </div>
                </div>
                
                <div class="recent-checkins">
                    <h2>📋 Khách mới check-in gần đây:</h2>
                    ${recentCheckins.length > 0 ? 
                        recentCheckins.map(checkin => `
                            <div class="checkin-item">
                                <strong>${checkin.name}</strong>
                                <div class="timestamp">${new Date(checkin.checkinTime).toLocaleString('vi-VN')}</div>
                            </div>
                        `).join('') : 
                        '<p>Chưa có khách nào check-in</p>'
                    }
                </div>
            </div>
        </body>
        </html>
    `);
});

/**
 * Trang check-in cá nhân hóa cho khách mời
 */
app.get('/checkin/:guestId', async (req, res) => {
    const { guestId } = req.params;
    
    try {
        const guest = await getGuestInfo(guestId);
        
        if (!guest) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Không tìm thấy khách mời</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; margin: 50px; background: #f5f5f5; }
                        .error { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
                        h1 { color: #e74c3c; }
                    </style>
                </head>
                <body>
                    <div class="error">
                        <h1>❌ Không tìm thấy khách mời</h1>
                        <p>Mã khách mời "${guestId}" không tồn tại trong hệ thống.</p>
                        <p>Vui lòng kiểm tra lại QR code hoặc liên hệ ban tổ chức.</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        // Kiểm tra xem khách đã check-in chưa
        const alreadyCheckedIn = checkinData.find(record => record.id === guestId);
        
        res.send(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Check-in - ${guest.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #ea709a 0%, #c9c6ff 100%); }
                    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 30px; }
                    .shell { background: #fff; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.15); width: 1200px; max-width: 95vw; display: grid; grid-template-columns: 1.1fr 1fr; gap: 30px; padding: 30px; }
                    .left { padding: 10px 20px; }
                    .right { display: flex; align-items: center; justify-content: center; }
                    .card { background: #f7f7fb; border-radius: 16px; padding: 20px; box-shadow: inset 0 0 0 1px #eee; }
                    h1 { text-align: center; color: #b11a1a; margin: 10px 0 20px; }
                    .subtitle { text-align: center; color: #333; font-weight: 700; margin-bottom: 20px; }
                    .form-group { margin-bottom: 14px; }
                    label { display: block; font-weight: 600; margin-bottom: 6px; color: #333; }
                    input[type="text"], select { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #d5d5e0; background: #fff; font-size: 14px; }
                    .actions { display: flex; gap: 12px; margin-top: 16px; }
                    .btn { flex: 1; padding: 12px 16px; border-radius: 10px; border: none; cursor: pointer; font-weight: 700; }
                    .btn-primary { background: #3e4d6b; color: #fff; }
                    .btn-secondary { background: #d7dbe7; color: #1f2a44; }
                    .preview-frame { width: 100%; max-width: 520px; border-radius: 18px; background: #fff; padding: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
                    canvas { width: 100%; height: auto; display: block; border-radius: 12px; background: #000; }
                    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                    .note { font-size: 12px; color: #666; margin-top: 6px; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="shell">
                        <div class="left">
                            <h1>SOTRANS GROUP</h1>
                            <div class="subtitle">Tạo Thiệp Mời Caravan 2025</div>
                            <div class="card">
                                <div class="form-group">
                                    <label>1. Danh xưng:</label>
                                    <select id="salutation">
                                        <option ${guest.salutation === 'Mr.' ? 'selected' : ''}>Mr.</option>
                                        <option ${guest.salutation === 'Ms.' ? 'selected' : ''}>Ms.</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>2. Họ và tên:</label>
                                    <input id="fullName" type="text" value="${guest.name}" placeholder="Nhập họ và tên" />
                                </div>
                                <div class="form-group">
                                    <label>3. Chức danh:</label>
                                    <input id="position" type="text" value="${guest.position || ''}" placeholder="Nhập chức danh" />
                                </div>
                                <div class="form-group">
                                    <label>4. Tên công ty:</label>
                                    <input id="company" type="text" value="${guest.company || ''}" placeholder="Nhập tên công ty" />
                                </div>
                                <div class="actions">
                                    <button id="btnDownload" class="btn btn-primary">Tải hình về máy</button>
                                    <button id="btnSave" class="btn btn-secondary">Lưu thông tin</button>
                                </div>
                                <div class="note">Mã khách: <strong>${guest.id}</strong></div>
                            </div>
                        </div>
                        <div class="right">
                            <div class="preview-frame">
                                <canvas id="inviteCanvas" width="1080" height="1920"></canvas>
                    </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    const CANVAS_W = 1080; const CANVAS_H = 1920;
                    const canvas = document.getElementById('inviteCanvas');
                    const ctx = canvas.getContext('2d');
                    const templateUrl = '/resources/Invitation_Empty.png';
                    const qrUrl = '/resources/qr_guest/${guest.id}.png';

                    function drawCenteredText(text, x, y, maxWidth) {
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        const words = text.split(' ');
                        let line = '';
                        let currentY = y;
                        for (let n = 0; n < words.length; n++) {
                            const testLine = line + words[n] + ' ';
                            const metrics = ctx.measureText(testLine);
                            if (metrics.width > maxWidth && n > 0) {
                                ctx.fillText(line.trim(), x, currentY);
                                line = words[n] + ' ';
                                currentY += 70;
                            } else {
                                line = testLine;
                            }
                        }
                        ctx.fillText(line.trim(), x, currentY);
                    }

                    async function loadImage(src) {
                        return new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => resolve(img);
                            img.onerror = reject;
                            img.src = src;
                        });
                    }

                    async function render() {
                        const name = document.getElementById('salutation').value + ' ' + document.getElementById('fullName').value.trim();
                        const position = document.getElementById('position').value.trim();
                        const company = document.getElementById('company').value.trim();
                        const [tpl, qr] = await Promise.all([loadImage(templateUrl), loadImage(qrUrl)]);

                        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
                        ctx.drawImage(tpl, 0, 0, CANVAS_W, CANVAS_H);

                        // QR position & size (approx to sample)
                        const qrSize = 260; // px
                        const qrX = 150; const qrY = 350; // adjust as needed to match template
                        ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

                        // Text styling and positions
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 54px Segoe UI, Arial';
                        drawCenteredText(name, 380, 420, 630);

                        ctx.font = '600 38px Segoe UI, Arial';
                        drawCenteredText(position.toUpperCase(), 380, 520, 630);

                        ctx.font = '600 38px Segoe UI, Arial';
                        drawCenteredText(company.toUpperCase(), 380, 570, 630);
                    }

                    document.getElementById('salutation').addEventListener('change', render);
                    document.getElementById('fullName').addEventListener('input', render);
                    document.getElementById('position').addEventListener('input', render);
                    document.getElementById('company').addEventListener('input', render);

                    document.getElementById('btnDownload').addEventListener('click', async () => {
                        await render();
                        const link = document.createElement('a');
                        link.download = '${guest.id}_invitation.png';
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    });

                    document.getElementById('btnSave').addEventListener('click', async () => {
                        const payload = {
                            salutation: document.getElementById('salutation').value,
                            name: document.getElementById('fullName').value.trim(),
                            position: document.getElementById('position').value.trim(),
                            company: document.getElementById('company').value.trim()
                        };
                        try {
                            const res = await fetch('/api/guest/${guest.id}', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                            const result = await res.json();
                            if (!result.success) throw new Error(result.message || 'Lưu thất bại');
                            alert('Đã lưu thông tin khách hàng.');
                        } catch (e) {
                            alert('Lỗi lưu thông tin: ' + e.message);
                        }
                    });

                    render();
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Lỗi khi xử lý check-in:', error);
        res.status(500).send('Có lỗi xảy ra trong hệ thống');
    }
});

/**
 * API endpoint để xử lý check-in
 */
app.post('/api/checkin/:guestId', async (req, res) => {
    const { guestId } = req.params;
    
    try {
        const guest = await getGuestInfo(guestId);
        
        if (!guest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy khách mời' 
            });
        }
        
        const result = saveCheckin(guestId, guest.name);
        res.json(result);
        
    } catch (error) {
        console.error('Lỗi khi xử lý check-in:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Có lỗi xảy ra trong hệ thống' 
        });
    }
});

/**
 * API: Lấy thông tin khách
 */
app.get('/api/guest/:guestId', async (req, res) => {
    try {
        const guest = await getGuestInfo(req.params.guestId);
        if (!guest) return res.status(404).json({ success: false, message: 'Không tìm thấy khách mời' });
        res.json({ success: true, data: guest });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
});

/**
 * API: Cập nhật thông tin khách vào CSV
 */
app.post('/api/guest/:guestId', async (req, res) => {
    const { guestId } = req.params;
    const { salutation, name, position, company } = req.body || {};
    const csvPath = path.join(__dirname, 'resources', 'Guest_List_Cleaned.csv');
    try {
        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split(/\r?\n/);
        if (lines.length === 0) throw new Error('CSV trống');
        const headerLine = lines[0];
        const headers = headerLine.split(',');

        const rows = await new Promise((resolve, reject) => {
            const result = [];
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => result.push(row))
                .on('end', () => resolve(result))
                .on('error', reject);
        });

        let updated = false;
        const updatedRows = rows.map((row) => {
            const code = (row['Code'] || '').toString().trim();
            if (code === guestId) {
                updated = true;
                return {
                    ...row,
                    'Salutation': salutation ?? row['Salutation'],
                    'Full Name': name ?? row['Full Name'],
                    'Title / Position': position ?? row['Title / Position'],
                    'Organization / Company': company ?? row['Organization / Company']
                };
            }
            return row;
        });

        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy khách mời' });

        function toCsvValue(v) {
            if (v == null) return '';
            const s = String(v);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        }

        const headerOut = headers.join(',');
        const body = updatedRows.map(row => headers.map(h => toCsvValue(row[h])).join(',')).join('\n');
        const newContent = [headerOut, body].filter(Boolean).join('\n');
        fs.writeFileSync(csvPath, newContent, 'utf8');

        res.json({ success: true });
    } catch (e) {
        console.error('Update CSV error:', e);
        res.status(500).json({ success: false, message: 'Không thể lưu CSV' });
    }
});

/**
 * API endpoint để lấy danh sách check-in
 */
app.get('/api/checkins', (req, res) => {
    res.json({
        total: checkinData.length,
        checkins: checkinData.sort((a, b) => b.timestamp - a.timestamp)
    });
});

/**
 * API endpoint để xuất báo cáo check-in
 */
app.get('/api/export', (req, res) => {
    const csvData = checkinData.map(checkin => ({
        id: checkin.id,
        name: checkin.name,
        checkinTime: checkin.checkinTime,
        checkinDate: new Date(checkin.checkinTime).toLocaleDateString('vi-VN'),
        checkinTimeOnly: new Date(checkin.checkinTime).toLocaleTimeString('vi-VN')
    }));
    
    res.json({
        total: checkinData.length,
        data: csvData
    });
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📋 Trang quản lý: http://localhost:${PORT}`);
    console.log(`📱 Check-in URL format: http://localhost:${PORT}/checkin/{guestId}`);
});

module.exports = app;
