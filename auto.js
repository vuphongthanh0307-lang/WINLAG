const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

// ==========================================
// BĂNG DÍNH 3 LỚP: DÁN MỒM LỖI CHUNK NGỨA MẮT
// ==========================================
const originalLog = console.log;
console.log = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalLog.apply(console, args);
};
const originalWarn = console.warn;
console.warn = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalWarn.apply(console, args);
};
const originalError = console.error;
console.error = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalError.apply(console, args);
};

const RECONNECT_DELAY = 300000; 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Fonggggg đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// TRẠNG THÁI GỐC CỦA BOT
let botState = 'DISCONNECTED'; 
let currentBot; 
let isLoggingIn = false; 
let isComboRunning = false; 
let isGUIOpen = false; 
let failCount = 0;
let isSonarKick = false; // BẢO BỐI VƯỢT ẢI SONAR
let sonarInterval = null; 
let rotateInterval = null; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'II_Aziz_IIxx', 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 60000,
        respawn: false
    });

    currentBot = bot; 

    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) originalLog('[Chat] ' + jsonMsg.toAnsi());
        else originalLog('[Chat] ' + jsonMsg.toString());
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/dn cocaicc#@!$%^2025200808022905'); 
            console.log('[Hub] Đã gửi lệnh login! Đang nghe ngóng...');
            botState = 'FIRST_LOGIN';
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // 1. TỰ ĐỘNG GIẢI CAPTCHA
        if (lowerMsg.includes('/captcha')) {
            const match = message.match(/\/captcha\s+([a-zA-Z0-9]+)/i);
            if (match) {
                console.log(`[Bảo Mật] Server đòi Captcha! Đang tự động nhập: /captcha ${match[1]} ...`);
                setTimeout(() => bot.chat(`/captcha ${match[1]}`), 1000); 
            }
        }

        // 1.5. LÌ LỢM ĐĂNG NHẬP
        if (lowerMsg.includes('đăng nhập bằng lệnh: /dn') || lowerMsg.includes('vui lòng đăng nhập')) {
            setTimeout(() => bot.chat('/dn cocaicc#@!$%^2025200808022905'), 1500); 
        }

        // ==========================================
        // BƯỚC 1: NHẬN DIỆN SONAR ĐANG QUÉT
        // ==========================================
        if (lowerMsg.includes('sonar') && lowerMsg.includes('xác minh')) {
            console.log('>>> [Anti-Bot] Bị Sonar soi! Đứng im như tượng chờ nó cấp giấy chứng nhận...');
            bot.clearControlStates();
            botState = 'WAIT_AUTO';
            isSonarKick = true; // Bật cờ dự phòng
        }

        // --- BỘ LỌC TỰ ĐỘNG JOIN PARTY ---
        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                console.log(`[Party] Phát hiện lời mời từ anh em: ${match[1]}! Đang quất lệnh join...`);
                setTimeout(() => bot.chat(`/party join ${match[1]}`), 500);
            }
        }

        // ==========================================
        // 2. BẢO TRÌ/KICK -> TỰ ĐỘNG CẦM LA BÀN VÀO LẠI (ĐÃ FIX)
        // ==========================================
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng') || lowerMsg.includes('server closed')) {
            console.log('[Hệ Thống] Phát hiện Server Reset/Bảo trì búng ra Sảnh! Đổi trạng thái để đục lỗ vô lại...');
            botState = 'IN_HUB'; 
            isComboRunning = false; 
        }

        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                  lowerMsg.includes('slained by') || 
                                  lowerMsg.includes('giết'));
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị KS! Nằm im giả chết chờ server kick AFK...');
        }
        
        if (message.includes('không thể ngồi trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/sit'); }, 3000);
        }

        // KHÓA HUB: CHỈ MÚA KHI THẤY THÔNG BÁO VÀO CỤM
        if (lowerMsg.includes('vừa tham gia máy chủ') && lowerMsg.includes(bot.username.toLowerCase())) {
            if (botState !== 'FARMING') {
                console.log(`[Mắt Thần] Thấy thông báo: ${message}`);
                console.log('[Mắt Thần] ĐÃ LỌT VÀO CỤM FARM AN TOÀN! Khóa Hub, Bắt đầu múa!');
                botState = 'FARMING';
                isComboRunning = false; 
                startFarmingProcess(bot);
            }
        }
    });

    // ==========================================
    // MẮT THẦN ĐỌC TÚI ĐỒ (ĐÃ KHÓA CỨNG KHI FARM)
    // ==========================================
    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        
        if (botState === 'FARMING') return; 

        const items = currentBot.inventory.items();
        const hasCompass = items.some(i => i.name === 'compass');

        if (hasCompass) {
            if (botState === 'FIRST_LOGIN') {
                botState = 'IN_HUB'; 
            }

            if (botState === 'IN_HUB' && !isGUIOpen) {
                console.log('[Hub] Từ ngoài vào Sảnh! Cầm la bàn đục lỗ...');
                currentBot.setQuickBarSlot(4);
                currentBot.activateItem();
            }
        } 
    }, 3000); 

    bot.on('windowOpen', async (window) => {
        // [ĐÃ FIX]: Không cho bot bị khóa mõm bởi MAINTENANCE nữa
        if (isGUIOpen || botState === 'WAIT_AUTO') return; 
        isGUIOpen = true; 
        try {
            console.log('[Menu] Đang mở GUI...');
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(12, 0, 0); 
            console.log('[Menu] Đã click xong! Chờ server load map...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        } finally {
            isGUIOpen = false; 
        }
    });

    // ==========================================
    // BƯỚC 2: ĐỌC BẢNG KICK XÁC MINH THÀNH CÔNG
    // ==========================================
    bot.on('kicked', (reason) => {
        let reasonStr = '';
        try { reasonStr = JSON.stringify(reason); } 
        catch (e) { reasonStr = reason.toString(); }
        
        if (reasonStr.toLowerCase().includes('xác minh') || reasonStr.toLowerCase().includes('thành công') || reasonStr.toLowerCase().includes('vượt qua')) {
            console.log('>>> [Anti-Bot] Đã đọc được bảng "XÁC MINH THÀNH CÔNG" từ server!');
            isSonarKick = true; 
        } else {
            console.log(`[BỊ KICK] Lý do khác: ${reasonStr}`);
        }
    });

    // ==================================================
    // PHẦN ĐƯỢC CHỈNH SỬA: TỰ ĐỘNG RESPAWN VÀ /HOME KHI CHẾT
    // ==================================================
    bot.on('death', () => {
        bot.clearControlStates();
        isComboRunning = false;
        console.log('[CẢNH BÁO] Bot đã ngỏm! Đang tự động ấn Hồi Sinh và quay lại Farm...');

        setTimeout(() => {
            bot.respawn(); // Ấn nút hồi sinh
            // Chờ server xử lý hồi sinh trong 2s, sau đó đưa về vòng lặp farm (trong đó sẽ tự /home)
            setTimeout(() => {
                botState = 'FARMING'; 
                startFarmingProcess(bot);
            }, 2000);
        }, 2000);
    });

    bot.on('end', () => {
        console.log('[SERVER] Đã bị văng hẳn khỏi cụm máy chủ!');
        isLoggingIn = false;
        botState = 'DISCONNECTED'; 

        // ==========================================
        // BƯỚC 3: ĐẾM NGƯỢC 12 GIÂY CHO RENDER KHỎI NGỦ + SERVER KỊP LƯU IP
        // ==========================================
        if (isSonarKick) {
            isSonarKick = false; // Trả lại cờ
            failCount = 0; // Tẩy trắng rớt mạng
            console.log(`[Anti-Bot] Đang chờ 12 giây để server cập nhật danh sách...`);
            
            let waitTime = 12;
            const countdownInterval = setInterval(() => {
                console.log(`... Đang đếm ngược: ${waitTime} giây nữa sẽ vô lại ...`);
                waitTime--;
                
                if (waitTime <= 0) {
                    clearInterval(countdownInterval);
                    console.log(`[Anti-Bot] Hết giờ! Phi thẳng vô cụm lượm lúa!!!`);
                    createBot();
                }
            }, 1000); // Lặp lại mỗi 1 giây
            return; 
        }

        failCount++;
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng tránh bị Ban...`);
            failCount = 0; 
            setTimeout(createBot, 40000); 
            return;
        }
        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi ${RECONNECT_DELAY/1000} giây để vào lại...`);
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// ==================================================
// KỊCH BẢN MÚA CỦA WINLXAG5555 (GIỮ NGUYÊN 100%)
// ==================================================
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        await sleep(3000);
        bot.setQuickBarSlot(0);
        console.log('[Farm] Đã tự động chọn ô đầu tiên trên Hotbar!');
        await sleep(3000);
        bot.chat('/home'); 
        console.log('[Farm] Đã nhích đúng vị trí, ngồi xuống nhập định!');
        failCount = 0; 

    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

// ==========================================
// TÍNH NĂNG CHAT VÀ ĐIỀU KHIỂN BẰNG BÀN PHÍM TỪ REPLIT
// ==========================================
let lastChatTime = 0;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', async (input) => {
    if (!currentBot) {
        console.log('[Lỗi] Bot chưa vào game, không nhận lệnh được!');
        return;
    }

    const rawInput = input.trim();
    const cmdParts = rawInput.toLowerCase().split(/\s+/); 
    const cmd = cmdParts[0]; // Cái chữ đầu tiên có dấu / (VD: /wdj)
    const val = cmdParts[1] ? parseFloat(cmdParts[1]) : null; // Cái số thời gian/góc độ phía sau

    try {
        // --- 1. LỆNH DỪNG LẠI HOẶC ĐỨNG DẬY ---
        if (cmd === '/stop') { 
            currentBot.clearControlStates(); 
            console.log('>> [WASD] PHANH GẤP! Đã dừng mọi di chuyển.'); 
            return; 
        }
        if (cmd === '/stand') { 
            currentBot.setControlState('sneak', true); 
            setTimeout(() => currentBot.setControlState('sneak', false), 300); 
            console.log('>> [HÀNH ĐỘNG] Nhấn Shift để ĐỨNG DẬY (Thoát khỏi ghế)!'); 
            return; 
        }

        // --- 2. LỆNH QUAY CAMERA THEO ĐỘ (ĐÃ XÓA VUNG TAY) ---
        if (cmd === '/trai' || cmd === '/trái') { 
            const angle = val !== null ? val : 90;
            await currentBot.look(currentBot.entity.yaw + (angle * Math.PI / 180), currentBot.entity.pitch, false); 
            console.log(`>> [CAMERA] Quay sang TRÁI ${angle} độ`); return; 
        }
        if (cmd === '/phai' || cmd === '/phải') { 
            const angle = val !== null ? val : 90;
            await currentBot.look(currentBot.entity.yaw - (angle * Math.PI / 180), currentBot.entity.pitch, false); 
            console.log(`>> [CAMERA] Quay sang PHẢI ${angle} độ`); return; 
        }
        if (cmd === '/sau') { 
            await currentBot.look(currentBot.entity.yaw + Math.PI, currentBot.entity.pitch, false); 
            console.log('>> [CAMERA] Quay mặt 180 độ về PHÍA SAU'); return; 
        }
        if (cmd === '/len' || cmd === '/lên') { 
            const angle = val !== null ? val : 45;
            const newPitch = Math.max(-Math.PI/2, currentBot.entity.pitch - (angle * Math.PI / 180));
            await currentBot.look(currentBot.entity.yaw, newPitch, false); 
            console.log(`>> [CAMERA] Ngước nhìn LÊN ${angle} độ`); return; 
        }
        if (cmd === '/xuong' || cmd === '/xuống') { 
            const angle = val !== null ? val : 45;
            const newPitch = Math.min(Math.PI/2, currentBot.entity.pitch + (angle * Math.PI / 180));
            await currentBot.look(currentBot.entity.yaw, newPitch, false); 
            console.log(`>> [CAMERA] Cúi nhìn XUỐNG ${angle} độ`); return; 
        }

        // --- 3. LỆNH DI CHUYỂN KẾT HỢP (COMBO WASD + JUMP + SHIFT) ---
        // Xóa dấu / ở đầu để kiểm tra các phím bên trong
        const moveKeys = cmd.replace('/', '');
        
        // Chỉ chạy khối này nếu chuỗi lệnh CHỈ CHỨA các chữ w, a, s, d, j, sh
        if (/^(w|a|s|d|j|sh)+$/.test(moveKeys)) {
            
            // Xóa sạch trạng thái cũ trước khi gán combo mới
            currentBot.clearControlStates();

            let logMsg = ">> [WASD] Thi triển Combo:";

            if (moveKeys.includes('w')) { currentBot.setControlState('forward', true); logMsg += ' Tiến'; }
            if (moveKeys.includes('s')) { currentBot.setControlState('back', true); logMsg += ' Lùi'; }
            if (moveKeys.includes('a')) { currentBot.setControlState('left', true); logMsg += ' Sang Trái'; }
            if (moveKeys.includes('d')) { currentBot.setControlState('right', true); logMsg += ' Sang Phải'; }
            if (moveKeys.includes('sh')) { currentBot.setControlState('sneak', true); logMsg += ' (Đè Shift)'; }
            if (moveKeys.includes('j')) { currentBot.setControlState('jump', true); logMsg += ' + Nhảy'; }

            // Nếu có nhập số thời gian (mili-giây)
            if (val) {
                console.log(`${logMsg} (Trong ${val}ms)`);
                setTimeout(() => {
                    currentBot.clearControlStates();
                    console.log('>> [WASD] Đã hết thời gian, tự động phanh lại!');
                }, val);
            } else {
                console.log(`${logMsg} (Vô cực. Gõ /stop để dừng)`);
            }
            return;
        }

        // --- 4. NẾU LÀ LỆNH IN-GAME (VD: /home, /spawn) ---
        if (rawInput.startsWith('/')) {
            currentBot.chat(rawInput);
            console.log(`[Bot Đã Nhập Lệnh Game]: ${rawInput}`);
            return;
        }

        // --- 5. NẾU LÀ CHAT CÔNG CỘNG ---
        const now = Date.now();
        if (now - lastChatTime < 1500) {
            console.log('>>> [CẢNH BÁO] Gõ chậm thôi! Kẻo server nó khóa mõm!');
            return;
        }
        lastChatTime = now;
        currentBot.chat(rawInput); 
        console.log(`[Bạn Đã Chat Công Cộng]: ${rawInput}`);

    } catch (error) {
        console.log('>>> [Lỗi Điều Khiển]:', error.message);
    }
});

createBot();
