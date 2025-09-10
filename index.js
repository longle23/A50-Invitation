const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

// Import MongoDB models
const { connectDB } = require('./config/database');
const Guest = require('./models/Guest');
const Checkin = require('./models/Checkin');
const RSVP = require('./models/RSVP');
const EventSettings = require('./models/EventSettings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/qrs', express.static('output/qrs'));
app.use('/resources', express.static('resources'));

// Connect to MongoDB on startup
connectDB().catch(console.error);

/**
 * Get guest information from MongoDB
 */
async function getGuestInfo(guestId) {
    try {
        const guest = await Guest.findById(guestId);
        return guest;
    } catch (error) {
        console.error('Error getting guest info:', error);
        throw error;
    }
}

/**
 * Save check-in information to MongoDB
 */
async function saveCheckin(guestId, guestName) {
    try {
        // Check if already checked in
        const existingCheckin = await Checkin.findByGuestId(guestId);
        if (existingCheckin) {
            return { success: false, message: 'Khách đã check-in rồi', data: existingCheckin };
        }
        
        // Create new checkin record
        const checkinRecord = new Checkin({
            id: guestId,
            name: guestName,
            checkinTime: new Date().toISOString(),
            timestamp: Date.now()
        });
        
        await checkinRecord.save();
        return { success: true, message: 'Check-in thành công', data: checkinRecord };
    } catch (error) {
        console.error('Error saving checkin:', error);
        throw error;
    }
}

/**
 * Validate guest information completeness
 */
function validateGuestInfo(guest) {
    const errors = [];
    
    if (!guest.salutation || guest.salutation.trim() === '') {
        errors.push('Danh xưng không được để trống');
    }
    
    if (!guest.name || guest.name.trim() === '') {
        errors.push('Họ và tên không được để trống');
    }
    
    if (!guest.position || guest.position.trim() === '') {
        errors.push('Chức danh không được để trống');
    }
    
    if (!guest.company || guest.company.trim() === '') {
        errors.push('Tên công ty không được để trống');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Routes

/**
 * Trang chủ - hiển thị thống kê và admin controls
 */
app.get('/', async (req, res) => {
    try {
        const totalCheckedIn = await Checkin.getCount();
        const recentCheckins = await Checkin.getRecent(10);
        const rsvpStats = await RSVP.getStats();
        const eventSettings = await EventSettings.getSettings();
        
        res.send(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hệ thống Check-in Sự kiện</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #333; text-align: center; }
                    .admin-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
                    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
                    .stat-box { background: #4CAF50; color: white; padding: 20px; border-radius: 8px; text-align: center; }
                    .stat-box.warning { background: #ff9800; }
                    .stat-box.danger { background: #f44336; }
                    .stat-box.info { background: #2196F3; }
                    .stat-number { font-size: 2em; font-weight: bold; }
                    .controls { display: flex; gap: 10px; margin: 20px 0; }
                    .btn { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
                    .btn-primary { background: #007bff; color: white; }
                    .btn-success { background: #28a745; color: white; }
                    .btn-danger { background: #dc3545; color: white; }
                    .btn-warning { background: #ffc107; color: black; }
                    .recent-checkins { margin-top: 30px; }
                    .checkin-item { background: #f9f9f9; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }
                    .timestamp { color: #666; font-size: 0.9em; }
                    .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
                    .status-enabled { background: #28a745; }
                    .status-disabled { background: #dc3545; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎉 Hệ thống Check-in Sự kiện</h1>
                    
                    <div class="admin-section">
                        <h2>🔧 Quản lý sự kiện</h2>
                        <div class="controls">
                            <button class="btn ${eventSettings.checkinEnabled ? 'btn-danger' : 'btn-success'}" onclick="toggleCheckin()">
                                ${eventSettings.checkinEnabled ? 'Tắt Check-in' : 'Bật Check-in'}
                            </button>
                            <button class="btn btn-primary" onclick="updateEventSettings()">
                                Cập nhật thông tin sự kiện
                            </button>
                        </div>
                        <p><span class="status-indicator ${eventSettings.checkinEnabled ? 'status-enabled' : 'status-disabled'}"></span>
                        Check-in: ${eventSettings.checkinEnabled ? 'Đã bật' : 'Đã tắt'}</p>
                    </div>
                    
                    <div class="stats">
                        <div class="stat-box">
                            <div class="stat-number">${totalCheckedIn}</div>
                            <div>Đã Check-in</div>
                        </div>
                        <div class="stat-box info">
                            <div class="stat-number">${rsvpStats.confirmed}</div>
                            <div>Xác nhận tham dự</div>
                        </div>
                        <div class="stat-box warning">
                            <div class="stat-number">${rsvpStats.pending}</div>
                            <div>Chưa xác nhận</div>
                        </div>
                        <div class="stat-box danger">
                            <div class="stat-number">${rsvpStats.declined}</div>
                            <div>Từ chối tham dự</div>
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
                
                <script>
                    async function toggleCheckin() {
                        try {
                            const response = await fetch('/api/admin/toggle-checkin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            const result = await response.json();
                            if (result.success) {
                                location.reload();
                            } else {
                                alert('Lỗi: ' + result.message);
                            }
                        } catch (error) {
                            alert('Có lỗi xảy ra: ' + error.message);
                        }
                    }
                    
                    async function updateEventSettings() {
                        const eventDate = prompt('Ngày sự kiện (YYYY-MM-DD):', '${eventSettings.eventDate || ''}');
                        const eventTime = prompt('Giờ sự kiện (HH:MM):', '${eventSettings.eventTime || ''}');
                        const eventLocation = prompt('Địa điểm:', '${eventSettings.eventLocation || ''}');
                        
                        if (eventDate && eventTime && eventLocation) {
                            try {
                                const response = await fetch('/api/admin/event-settings', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ eventDate, eventTime, eventLocation })
                                });
                                const result = await response.json();
                                if (result.success) {
                                    alert('Cập nhật thành công!');
                                    location.reload();
                                } else {
                                    alert('Lỗi: ' + result.message);
                                }
                            } catch (error) {
                                alert('Có lỗi xảy ra: ' + error.message);
                            }
                        }
                    }
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Có lỗi xảy ra khi tải trang chủ');
    }
});

/**
 * Trang check-in cá nhân hóa cho khách mời (với nút xác nhận đơn giản)
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
        
        // Check event settings
        const eventSettings = await EventSettings.getSettings();
        const rsvp = await RSVP.findByGuestId(guestId);
        const alreadyCheckedIn = await Checkin.findByGuestId(guestId);
        
        // Validate guest information
        const validation = validateGuestInfo(guest);
        
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
                    .actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
                    .btn { flex: 1; padding: 12px 16px; border-radius: 10px; border: none; cursor: pointer; font-weight: 700; min-width: 120px; }
                    .btn-primary { background: #3e4d6b; color: #fff; }
                    .btn-secondary { background: #d7dbe7; color: #1f2a44; }
                    .btn-success { background: #28a745; color: #fff; }
                    .btn-warning { background: #ffc107; color: #000; }
                    .btn-info { background: #17a2b8; color: #fff; }
                    .preview-frame { width: 100%; max-width: 520px; border-radius: 18px; background: #fff; padding: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); }
                    canvas { width: 100%; height: auto; display: block; border-radius: 12px; background: #000; }
                    .note { font-size: 12px; color: #666; margin-top: 6px; }
                    .alert { padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
                    .alert-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                    .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .validation-errors { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .validation-errors ul { margin: 0; padding-left: 20px; }
                    .rsvp-status { padding: 10px; border-radius: 8px; margin: 10px 0; text-align: center; font-weight: bold; }
                    .rsvp-confirmed { background: #d4edda; color: #155724; }
                    .rsvp-pending { background: #fff3cd; color: #856404; }
                    .rsvp-declined { background: #f8d7da; color: #721c24; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="shell">
                        <div class="left">
                            <h1>SOTRANS GROUP</h1>
                            <div class="subtitle">Tạo Thiệp Mời Caravan 2025</div>
                            
                            ${!eventSettings.checkinEnabled ? `
                                <div class="alert alert-warning">
                                    <strong>⚠️ Check-in chưa được bật</strong><br>
                                    Vui lòng liên hệ ban tổ chức để được hỗ trợ.
                                </div>
                            ` : ''}
                            
                            ${alreadyCheckedIn ? `
                                <div class="alert alert-success">
                                    <strong>✅ Bạn đã check-in thành công!</strong><br>
                                    Thời gian: ${new Date(alreadyCheckedIn.checkinTime).toLocaleString('vi-VN')}
                                </div>
                            ` : ''}
                            
                            ${rsvp ? `
                                <div class="rsvp-status rsvp-${rsvp.status}">
                                    ${rsvp.status === 'confirmed' ? '✅ Đã xác nhận tham dự' : 
                                      rsvp.status === 'declined' ? '❌ Từ chối tham dự' : 
                                      '⏳ Chưa xác nhận tham dự'}
                                </div>
                            ` : `
                                <div class="rsvp-status rsvp-pending">
                                    ⏳ Chưa xác nhận tham dự
                                </div>
                            `}
                            
                            ${!validation.isValid ? `
                                <div class="validation-errors">
                                    <strong>⚠️ Thông tin chưa đầy đủ:</strong>
                                    <ul>
                                        ${validation.errors.map(error => `<li>${error}</li>`).join('')}
                                    </ul>
                                    <p>Vui lòng cập nhật thông tin trước khi check-in.</p>
                                </div>
                            ` : ''}
                            
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
                                    ${!rsvp || rsvp.status === 'pending' ? `
                                        <button id="btnConfirm" class="btn btn-info">Xác nhận tham dự</button>
                                    ` : ''}
                                    ${eventSettings.checkinEnabled && validation.isValid && !alreadyCheckedIn ? `
                                        <button id="btnCheckin" class="btn btn-success">Check In</button>
                                    ` : ''}
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
                            location.reload();
                        } catch (e) {
                            alert('Lỗi lưu thông tin: ' + e.message);
                        }
                    });

                    document.getElementById('btnConfirm')?.addEventListener('click', async () => {
                        if (confirm('Bạn có chắc chắn muốn xác nhận tham dự sự kiện không?')) {
                            try {
                                const res = await fetch('/api/rsvp/${guest.id}', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ attendance: 'yes' })
                                });
                                const result = await res.json();
                                if (result.success) {
                                    alert('Xác nhận tham dự thành công!');
                                    location.reload();
                                } else {
                                    alert('Lỗi: ' + result.message);
                                }
                            } catch (e) {
                                alert('Lỗi xác nhận: ' + e.message);
                            }
                        }
                    });

                    document.getElementById('btnCheckin')?.addEventListener('click', async () => {
                        try {
                            const res = await fetch('/api/checkin/${guest.id}', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });
                            const result = await res.json();
                            if (result.success) {
                                alert('Check-in thành công!');
                                location.reload();
                            } else {
                                alert('Lỗi: ' + result.message);
                            }
                        } catch (e) {
                            alert('Lỗi check-in: ' + e.message);
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
        // Check if check-in is enabled
        const eventSettings = await EventSettings.getSettings();
        if (!eventSettings.checkinEnabled) {
            return res.status(403).json({ 
                success: false, 
                message: 'Check-in chưa được bật' 
            });
        }
        
        const guest = await getGuestInfo(guestId);
        if (!guest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy khách mời' 
            });
        }
        
        // Validate guest information
        const validation = validateGuestInfo(guest);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Thông tin chưa đầy đủ',
                errors: validation.errors
            });
        }
        
        const result = await saveCheckin(guestId, guest.name);
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
 * API: Cập nhật thông tin khách vào MongoDB
 */
app.post('/api/guest/:guestId', async (req, res) => {
    const { guestId } = req.params;
    const { salutation, name, position, company } = req.body || {};
    
    try {
        const result = await Guest.updateById(guestId, {
            salutation,
            name,
            position,
            company
        });
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách mời' });
        }
        
        res.json({ success: true });
    } catch (e) {
        console.error('Update guest error:', e);
        res.status(500).json({ success: false, message: 'Không thể lưu thông tin khách' });
    }
});

/**
 * API: RSVP confirmation (simplified)
 */
app.post('/api/rsvp/:guestId', async (req, res) => {
    const { guestId } = req.params;
    const { attendance } = req.body || {};
    
    try {
        const guest = await getGuestInfo(guestId);
        if (!guest) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy khách mời' });
        }
        
        const status = attendance === 'yes' ? 'confirmed' : 'declined';
        
        const result = await RSVP.updateByGuestId(guestId, {
            status,
            attendance,
            confirmedAt: new Date().toISOString()
        });
        
        res.json({ success: true });
    } catch (e) {
        console.error('RSVP error:', e);
        res.status(500).json({ success: false, message: 'Không thể lưu xác nhận' });
    }
});

/**
 * API: Admin - Toggle check-in
 */
app.post('/api/admin/toggle-checkin', async (req, res) => {
    try {
        const eventSettings = await EventSettings.getSettings();
        eventSettings.checkinEnabled = !eventSettings.checkinEnabled;
        await eventSettings.save();
        
        res.json({ success: true, checkinEnabled: eventSettings.checkinEnabled });
    } catch (e) {
        console.error('Toggle check-in error:', e);
        res.status(500).json({ success: false, message: 'Không thể thay đổi trạng thái check-in' });
    }
});

/**
 * API: Admin - Update event settings
 */
app.post('/api/admin/event-settings', async (req, res) => {
    const { eventDate, eventTime, eventLocation } = req.body || {};
    
    try {
        await EventSettings.updateSettings({
            eventDate,
            eventTime,
            eventLocation
        });
        
        res.json({ success: true });
    } catch (e) {
        console.error('Update event settings error:', e);
        res.status(500).json({ success: false, message: 'Không thể cập nhật thông tin sự kiện' });
    }
});

/**
 * API endpoint để lấy danh sách check-in
 */
app.get('/api/checkins', async (req, res) => {
    try {
        const checkins = await Checkin.findAll();
        res.json({
            total: checkins.length,
            checkins: checkins
        });
    } catch (error) {
        console.error('Error getting checkins:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách check-in' });
    }
});

/**
 * API endpoint để xuất báo cáo check-in
 */
app.get('/api/export', async (req, res) => {
    try {
        const checkins = await Checkin.findAll();
        const csvData = checkins.map(checkin => ({
            id: checkin.id,
            name: checkin.name,
            checkinTime: checkin.checkinTime,
            checkinDate: new Date(checkin.checkinTime).toLocaleDateString('vi-VN'),
            checkinTimeOnly: new Date(checkin.checkinTime).toLocaleTimeString('vi-VN')
        }));
        
        res.json({
            total: checkins.length,
            data: csvData
        });
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xuất dữ liệu' });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    const { closeDB } = require('./config/database');
    await closeDB();
    process.exit(0);
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📋 Trang quản lý: http://localhost:${PORT}`);
    console.log(`📱 Check-in URL format: http://localhost:${PORT}/checkin/{guestId}`);
    console.log(`🗄️ MongoDB connected: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-checkin-system'}`);
});

module.exports = app;