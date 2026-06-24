const express = require('express');

const mineflayer = require('mineflayer');

const readline = require('readline');

const { Vec3 } = require('vec3');



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



const RECONNECT_DELAY = 20000; 



// ==========================================

// GIỮ MẠNG CHO REPLIT

// ==========================================

const app = express();

const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot Wind đang Farm VIP Pro!'));

app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));



process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));

process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));



const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));



// TRẠNG THÁI GỐC CỦA BOT

let botState = 'DISCONNECTED'; 

let currentBot; 

let isLoggingIn = false; 

let isFarmLoopRunning = false; // Đổi tên cờ để hợp với AI Farm

let isGUIOpen = false; 

let failCount = 0;

let isSonarKick = false; 



function createBot() {

    const bot = mineflayer.createBot({

        host: 'aemine.vn',

        port: 25565,

        username: 'winlxag5554', 

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

            bot.chat('/dn Windvu2193'); 

            console.log('[Hub] Đã gửi lệnh login! Đang nghe ngóng...');

            botState = 'FIRST_LOGIN';

        }

    });



    bot.on('messagestr', (message) => {

        const lowerMsg = message.toLowerCase();



        // ==========================================

        // [NÂNG CẤP VIP] BÁO ĐỘNG ĐỎ: RÚT PHÍCH CẮM KHI THẤY STAFF

        // ==========================================

        // Chỉ cần cụm từ này xuất hiện, bot sẽ tự sát ngay lập tức (không reconnect)

        if (message.includes('Losts đã tham gia')) {

            console.log('\n================================================================');

            console.log('🚨 [BÁO ĐỘNG ĐỎ] CHẠY NGAY ĐI! STAFF "Losts" VỪA VÀO SERVER! 🚨');

            console.log('🚨 RÚT PHÍCH CẮM KHẨN CẤP! TẮT TOÀN BỘ HỆ THỐNG! 🚨');

            console.log('================================================================\n');

            process.exit(0); // Lệnh chốt hạ: Giết chết Terminal Node.js lập tức!

        }



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

            setTimeout(() => bot.chat('/dn Windvu@2#1#9#30849009630'), 1500); 

        }



        // BƯỚC 1: NHẬN DIỆN SONAR ĐANG QUÉT

        if (lowerMsg.includes('sonar') && lowerMsg.includes('xác minh')) {

            console.log('>>> [Anti-Bot] Bị Sonar soi! Đứng im như tượng chờ nó cấp giấy chứng nhận...');

            bot.clearControlStates();

            botState = 'WAIT_AUTO';

            isSonarKick = true; 

        }



        // --- BỘ LỌC TỰ ĐỘNG JOIN PARTY ---

        if (message.includes('/pt join')) {

            const match = message.match(/\/pt join (\S+)/);

            if (match) {

                console.log(`[Party] Phát hiện lời mời từ anh em: ${match[1]}! Đang quất lệnh join...`);

                setTimeout(() => bot.chat(`/party join ${match[1]}`), 500);

            }

        }



        // 2. BẢO TRÌ/KICK -> NẰM CHỜ

        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {

            console.log('[Hệ Thống] Phát hiện Bảo Trì/Kick! Đang nằm chờ server tự kéo...');

            botState = 'MAINTENANCE'; 

            isFarmLoopRunning = false; 

        }



        // KS HOẶC AFK

        if (message.includes('không thể ngồi trong không khí')) {

            setTimeout(() => { if (botState === 'FARMING') bot.chat('/sit'); }, 3000);

        }



        // ==========================================

        // KHÓA HUB, AUTO /HOME & KÍCH HOẠT MÁY CÀY

        // ==========================================

        if (lowerMsg.includes('vừa tham gia máy chủ') && lowerMsg.includes(bot.username.toLowerCase())) {

            if (botState !== 'FARMING') {

                console.log(`[Mắt Thần] Thấy thông báo lọt cụm: ${message}`);

                botState = 'FARMING';

                isFarmLoopRunning = false; 

                

                // [NÂNG CẤP VIP] LUÔN /HOME TRƯỚC KHI BẮT ĐẦU

                console.log('[+] Đang gõ /home để dịch chuyển về lãnh địa...');

                bot.chat('/home');

                

                // Đợi 4 giây cho server load map ở nhà xong xuôi mới bật máy cày

                setTimeout(() => {

                    console.log('[Mắt Thần] ĐÃ VÀO CỤM VÀ LOAD MAP XONG! Bật Máy Cày Vô Cực!');

                    startAutoFarmVipPro(); 

                }, 4000);

            }

        }

    });



    // ==========================================

    // MẮT THẦN ĐỌC TÚI ĐỒ (TÌM LA BÀN VÀO CỤM)

    // ==========================================

    setInterval(() => {

        if (!currentBot || !currentBot.inventory) return;

        if (botState === 'FARMING') return; // Ở trong cụm thì tắt mắt thần này đi



        const items = currentBot.inventory.items();

        const hasCompass = items.some(i => i.name === 'compass');



        if (hasCompass) {

            if (botState === 'FIRST_LOGIN') {

                botState = 'IN_HUB'; 

            }



            if (botState === 'IN_HUB' && !isGUIOpen) {

                console.log('[Hub] Sẵn sàng la bàn! Đang click đục lỗ vào cụm...');

                currentBot.setQuickBarSlot(4);

                currentBot.activateItem();

            }

        } 

    }, 3000); 



    // ==========================================

    // XỬ LÝ GUI SẢNH (Khóa lại khi đang Farm)

    // ==========================================

    bot.on('windowOpen', async (window) => {

        // NẾU ĐANG FARM THÌ KHÔNG CHO SỰ KIỆN NÀY CAN THIỆP (Để Module Mua Xương tự xử lý)

        if (isGUIOpen || botState === 'MAINTENANCE' || botState === 'FARMING') return; 

        isGUIOpen = true; 

        try {

            console.log('[Menu] Đang mở GUI Sảnh...');

            await sleep(2000);

            await bot.clickWindow(20, 0, 0); 

            await sleep(2000);

            await bot.clickWindow(14, 0, 0); 

            console.log('[Menu] Đã bấm chọn cụm Sinh Tồn! Chờ load map...');

        } catch (err) {

            console.log('Lỗi click GUI Sảnh:', err.message);

        } finally {

            isGUIOpen = false; 

        }

    });



    // BƯỚC 2: ĐỌC BẢNG KICK XÁC MINH THÀNH CÔNG

    bot.on('kicked', (reason) => {

        let reasonStr = '';

        try { reasonStr = JSON.stringify(reason); } 

        catch (e) { reasonStr = reason.toString(); }

        

        if (reasonStr.toLowerCase().includes('xác minh') || reasonStr.toLowerCase().includes('thành công') || reasonStr.toLowerCase().includes('vượt qua')) {

            console.log('>>> [Anti-Bot] Đã pass Sonar (Xác minh thành công)!');

            isSonarKick = true; 

        } else {

            console.log(`[BỊ KICK] Lý do: ${reasonStr}`);

        }

    });



    bot.on('death', () => {

        bot.clearControlStates();

        isFarmLoopRunning = false;

        if (botState !== 'FARMING') {

            console.log('[CẢNH BÁO] Bot chết ở Sảnh! Tự động Hồi Sinh...');

            setTimeout(() => bot.respawn(), 2000);

        } else {

            console.log('[CẢNH BÁO] Bot bị giết trong cụm Farm! Nằm phơi xác chờ kéo...');

        }

    });



    bot.on('end', () => {

        console.log('[SERVER] Đã ngắt kết nối!');

        isLoggingIn = false;

        botState = 'DISCONNECTED'; 



        // BƯỚC 3: ĐẾM NGƯỢC 12 GIÂY SAU KHI PASS SONAR

        if (isSonarKick) {

            isSonarKick = false; 

            failCount = 0; 

            console.log(`[Anti-Bot] Đang chờ 12 giây để server cập nhật whitelist...`);

            

            let waitTime = 12;

            const countdownInterval = setInterval(() => {

                console.log(`... ${waitTime}s nữa phi thẳng vô cụm ...`);

                waitTime--;

                

                if (waitTime <= 0) {

                    clearInterval(countdownInterval);

                    console.log(`[Anti-Bot] Hết giờ! Vô lại thôi!!!`);

                    createBot();

                }

            }, 1000); 

            return; 

        }



        failCount++;

        if (failCount >= 5) {

            console.log(`[BÁO ĐỘNG] Rớt ${failCount} lần! Ngủ đông 1 tiếng cản ban...`);

            failCount = 0; 

            setTimeout(createBot, 40000); 

            return;

        }

        console.log(`[Re-Connect] Đợi ${RECONNECT_DELAY/1000} giây để vào lại...`);

        setTimeout(createBot, RECONNECT_DELAY);

    });

}



// ======================================================================

// ĐỘNG CƠ MÁY CÀY VÔ CỰC (HACK CLIENT + QUY TRÌNH CHUẨN)

// ======================================================================

// ======================================================================

// ĐỘNG CƠ MÁY CÀY VÔ CỰC (VÁ LỖI TRÀN KHOAI TÂY VÀ KẸT BALO)

// ======================================================================

async function startAutoFarmVipPro() {

    if (isFarmLoopRunning) return; 

    isFarmLoopRunning = true;

    console.log('>>> KHỞI ĐỘNG HỆ THỐNG MÁY CÀY MAX TỐC ĐỘ <<<');



    while (botState === 'FARMING') {

        try {

            // Đếm đạn và đếm khoai đang có trong người

            const dyes = currentBot.inventory.items().filter(item => item.name === 'dye');

            const totalBonemeal = dyes.reduce((sum, item) => sum + item.count, 0);



            const potatoes = currentBot.inventory.items().filter(item => item.name === 'potato');

            const totalPotatoes = potatoes.reduce((sum, item) => sum + item.count, 0);



            // [!] BỘ NÃO MỚI 1: THEO DÕI SỨC CHỨA CỦA BALO (ƯU TIÊN SỐ 1)

            // Nếu nhặt được hơn 10 stack khoai (640 củ) HOẶC balo chỉ còn trống 3 ô trở xuống -> Xả hàng khẩn cấp!

            if (totalPotatoes > 640 || currentBot.inventory.emptySlotCount() <= 3) {

                console.log('[!] Báo động: Balo sắp nghẹt thở vì khoai tây! Tạm dừng để xả hàng...');

                await clearJunk();              // Quăng rác 

                await depositAllKeepOneStack(); // Gửi rương

                continue; // Xả hàng xong quay lại đầu vòng lặp để check xem còn phấn không rồi mới farm

            }



            // [!] BỘ NÃO MỚI 2: THEO DÕI ĐẠN DƯỢC

            if (totalBonemeal === 0) {

                // Kiểm tra xem trong túi còn xương chưa chế không

                const bones = currentBot.inventory.items().filter(item => item.name === 'bone');

                const totalBones = bones.reduce((sum, item) => sum + item.count, 0);



                if (totalBones > 0) {

                    console.log(`[!] Hết bột nhưng túi vẫn còn ${totalBones} xương. Vác ra bàn dập ngay!`);

                    await craftAllBonemeal();

                } else {

                    console.log('[!] Hết đạn (bột xương + xương). Kích hoạt chuỗi tiếp tế khép kín!');

                    await clearJunk();

                    await depositAllKeepOneStack(); 

                    

                    // Lời khuyên chân thành: Chỉ mua 8 stack xương (= 24 stack bột). Mua 11 stack là tràn balo 36 ô rớt đồ ra ngoài!

                    await buyBones(8); 

                    await craftAllBonemeal();

                }



                // Rào chắn bảo vệ: Check xem đã dập ra bột xương thành công chưa mới cho cày tiếp

                const checkDyes = currentBot.inventory.items().filter(item => item.name === 'dye');

                if (checkDyes.length === 0) {

                    console.log('[-] Lỗi: Server lag chưa dập được đạn. Nghỉ ngơi 3 giây...');

                    await sleep(3000);

                } else {

                    console.log('[+] Đã nạp đầy đạn. Ép ga múa quạt lút cán!');

                }

                continue; 

            }



            // Kéo ga Farm cực nhanh 

            await farmSuperFast();

            await sleep(10); 



        } catch (err) {

            console.log('[-] Vấp cỏ trong quá trình cày: ', err.message);

            await sleep(500); 

        }

    }

}



// --- MODULE 1: DỌN RÁC BẰNG LỆNH /TRASH ---

async function clearJunk() {

    // Danh sách "Hàng hiệu" được phép giữ lại

    const allowed = ['potato', 'bone', 'dye', 'compass'];

    const junk = currentBot.inventory.items().filter(i => !allowed.includes(i.name));

    

    if (junk.length === 0) return;



    console.log(`[+] Phát hiện ${junk.length} món rác (Khoai độc, đồ vớ vẩn...). Đang phi tang!`);

    try {

        currentBot.chat('/trash');

        

        // Đợi GUI thùng rác mở ra

        const trashWindow = await new Promise((resolve, reject) => {

            const timeout = setTimeout(() => reject(new Error('Mở thùng rác thất bại')), 3000);

            currentBot.once('windowOpen', (win) => {

                clearTimeout(timeout);

                resolve(win);

            });

        });

        await sleep(1000); // Chờ load GUI



        // Lôi từng món rác ra Shift-click vứt

        for (const item of junk) {

            // Tìm món rác đó trong khu vực túi đồ của mình (inventoryStart)

            const itemInWindow = trashWindow.items().find(i => i.type === item.type && i.slot >= trashWindow.inventoryStart);

            if (itemInWindow) {

                await currentBot.clickWindow(itemInWindow.slot, 0, 1); // 0: Chuột trái, 1: Giữ Shift

                await sleep(300); // Tránh kick spam

            }

        }

        

        if (currentBot.currentWindow) currentBot.closeWindow(currentBot.currentWindow);

        console.log('[+] Đã phi tang rác thành công!');

        await sleep(500);

    } catch (e) {

        console.log('[-] Lỗi dọn rác:', e.message);

        if (currentBot.currentWindow) currentBot.closeWindow(currentBot.currentWindow);

    }

}



// --- MODULE 2: CẤT RƯƠNG (BẢN FIX CHỐNG ĐỨNG YÊN) ---

async function depositAllKeepOneStack() {

    const potatoes = currentBot.inventory.items().filter(item => item.name === 'potato');

    let totalPotatoes = potatoes.reduce((sum, item) => sum + item.count, 0);



    if (totalPotatoes <= 64) {

        console.log('[+] Khoai tây chưa dư dả, không cần cất rương.');

        return; 

    }



    console.log(`[+] Đang mở rương cất khoai tây... (Hiện có: ${totalPotatoes} củ)`);

    const chestBlock = currentBot.findBlock({ matching: currentBot.registry.blocksByName.chest.id, maxDistance: 4 });

    if (!chestBlock) return console.log('[-] Lỗi: Điểm mù, không thấy cái rương nào!');



    try {

        const chest = await currentBot.openChest(chestBlock);

        await sleep(500); // BẮT BUỘC CHỜ RƯƠNG MỞ HẲN



        let toDeposit = totalPotatoes - 64;

        

        for (const item of potatoes) {

            if (toDeposit <= 0) break;

            const amount = Math.min(item.count, toDeposit);

            try {

                await chest.deposit(item.type, null, amount);

                toDeposit -= amount;

                await sleep(300); // Chống click spam server

            } catch (e) {}

        }

        chest.close();

        await sleep(500); // BẮT BUỘC CHỜ RƯƠNG ĐÓNG HẲN (Fix lỗi kẹt bot)

        console.log('[+] Đã gom sạch khoai vào kho, chừa lại 1 stack làm giống!');

    } catch (err) {

        console.log('[-] Lỗi tương tác rương: ', err.message);

        if (currentBot.currentWindow) currentBot.closeWindow(currentBot.currentWindow); // Đóng khẩn cấp nếu kẹt

    }

}



// Hàm tạo độ trễ ngẫu nhiên (Giả lập thao tác tay người thật)

const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));



// --- MODULE 3: SIÊU THỊ (BẢN UPDATE QUA MẶT ANTI-MACRO) ---

// --- MODULE 3: SIÊU THỊ (BẢN ÉP TỐC ĐỘ TEST NHÂN PHẨM) ---

async function buyBones(stacks) {

    console.log(`[+] Đi chợ mua ${stacks} stack xương (Đã ép tốc độ bàn thờ)...`);

    try {

        currentBot.chat('/shop');

        await new Promise(resolve => currentBot.once('windowOpen', resolve));

        await randomSleep(1500, 2000); // Mở Menu chờ nhanh 1.5 - 2s

        await currentBot.clickWindow(20, 0, 0);



        await new Promise(resolve => currentBot.once('windowOpen', resolve));

        await randomSleep(1500, 2000); // Chờ load bảng giá 1.5 - 2s

        

        for (let i = 0; i < stacks; i++) {

            try {

                await currentBot.clickWindow(21, 0, 0);

                console.log(`  -> Đã bấm mua stack thứ ${i + 1}`);

                

                // [!] CHỖ CHỈNH TỐC ĐỘ MUA Ở ĐÂY: Đang để ngẫu nhiên 1.5s đến 2.5s

                // Nếu server vẫn hiện chữ đỏ "Vui lòng không nhấp nhanh", ông tự tăng 2 số này lên (VD: 2500, 3500)

                await randomSleep(1500, 2500); 

            } catch (clickErr) {

                console.log(`  [-] Máy chủ kẹt nhịp thứ ${i + 1}, đang đợi rặn lại...`);

                await randomSleep(3000, 4000); // Lỡ lag thì rặn lại 3-4s thôi cho lẹ

            }

        }

        

        if (currentBot.currentWindow) currentBot.closeWindow(currentBot.currentWindow);

        console.log('[+] Đã mua sắm xong, đóng gói mang về!');

        await randomSleep(800, 1200);

    } catch (error) {

        console.log('[-] Lỗi đi chợ sập tiệm:', error.message);

        if (currentBot.currentWindow) currentBot.closeWindow(currentBot.currentWindow);

        await sleep(2000); 

    }

}



// --- MODULE 4: CHẾ TẠO TRONG BALO ---

// --- MODULE 4: CHẾ TẠO BẰNG BÀN CHẾ TẠO (BÍ KÍP SHIFT-CLICK TÀ ĐẠO) ---

async function craftAllBonemeal() {

    const bones = currentBot.inventory.items().filter(item => item.name === 'bone');

    if (bones.length === 0) return console.log('[-] Lỗi ảo ma: Lục túi không thấy cục xương nào!');



    const totalBones = bones.reduce((sum, item) => sum + item.count, 0);

    console.log(`[+] Đang đưa ${totalBones} xương lên thớt (Dùng tuyệt kĩ Shift-Click)...`);

    

    // Tìm bàn chế tạo gần nhất

    const craftingTable = currentBot.findBlock({ matching: currentBot.registry.blocksByName.crafting_table.id, maxDistance: 4 });

    if (!craftingTable) return console.log('[-] Lỗi: Không tìm thấy bàn chế tạo!');



    try {

        // Mở GUI bàn chế tạo ra

        const window = await currentBot.openBlock(craftingTable);

        await sleep(300); // Đợi server load GUI Bàn chế tạo



        // Lọc lại các ô chứa xương trong giao diện hiện tại

        const boneStacks = window.items().filter(item => item.name === 'bone');



        for (const bone of boneStacks) {

            // Bước 1: Chuột trái vào ô chứa xương (Bốc cả stack lên tay)

            await currentBot.clickWindow(bone.slot, 0, 0);

            await sleep(100); 



            // Bước 2: Chuột trái vào ô số 1 của Bàn chế tạo (Quăng cả stack xương vào lưới chế tạo)

            await currentBot.clickWindow(1, 0, 0);

            await sleep(100); 



            // Bước 3: Shift + Chuột trái vào ô số 0 (Ô kết quả) để nén toàn bộ 64 xương thành 192 bột

            // Tham số: slot 0, button 0 (chuột trái), mode 1 (đè Shift)

            await currentBot.clickWindow(0, 0, 1);

            await sleep(100); 

        }



        // Đóng bàn chế tạo

        currentBot.closeWindow(window);

        console.log('[+] Đã nén thành công toàn bộ xương bằng Shift-Click!');

        await sleep(400); // Nghỉ nhịp để balo kịp cập nhật bột xương

        

    } catch (e) {

        console.log('[-] Kẹt máy dập xương:', e.message);

        if (currentBot.currentWindow) currentBot.closeWindow(currentBot.currentWindow);

    }

}



// =========================================================

// THỦ THUẬT ÉP XUNG: KHÓA CHẶT HOTBAR (UPDATE: TRỊ BỆNH TAY KHÔNG)

// =========================================================

async function fastEquip(itemId) {

    // Nếu tay đang cầm đúng món đó rồi thì duyệt luôn

    if (currentBot.heldItem && currentBot.heldItem.type === itemId) return true;



    // [!] MẮT THẦN: Rờ túi xem có đồ thật không, hay server đang lag chưa nhả đồ

    const hasItem = currentBot.inventory.items().find(i => i.type === itemId);

    if (!hasItem) {

        return false; // Báo cáo thất bại: "Đại ca ơi server lag chưa có đồ!"

    }



    if (itemId === currentBot.registry.itemsByName.potato.id) currentBot.setQuickBarSlot(0);

    else if (itemId === currentBot.registry.itemsByName.dye.id) currentBot.setQuickBarSlot(1);



    try { 

        await currentBot.equip(itemId, 'hand'); 

        return true; // Lên đồ thành công

    } catch (e) {

        return false; // Bị kẹt

    }

}



function sendInteractPacket(targetPos) {

    currentBot._client.write('block_place', {

        location: targetPos, direction: 1, hand: 0, 

        cursorX: 0.5, cursorY: 1.0, cursorZ: 0.5

    });

    currentBot.swingArm('right'); 

}



function sendDigPacket(targetPos) {

    currentBot._client.write('block_dig', {

        status: 0, location: targetPos, face: 1

    });

    currentBot.swingArm('right');

}



// --- MODULE 5: CÀY NHƯ HACK CLIENT (UPDATE: BIẾT PHANH LẠI KHI LAG) ---

async function farmSuperFast() {

    const farmlands = currentBot.findBlocks({ matching: currentBot.registry.blocksByName.farmland.id, maxDistance: 3, count: 4 });



    for (const pos of farmlands) {

        const cropPos = pos.offset(0, 1, 0);

        const cropBlock = currentBot.blockAt(cropPos);



        await currentBot.lookAt(cropPos.offset(0.5, 0.5, 0.5), true);



        if (cropBlock.name === 'air') {

            // Check xem việc cầm khoai tây có thành công không

            const isReady = await fastEquip(currentBot.registry.itemsByName.potato.id);

            if (!isReady) {

                // Nếu tay đang trống không do lag -> Đứng im đợi nửa giây rồi hủy vòng lặp hiện tại

                await sleep(500); 

                return; 

            }

            sendInteractPacket(pos); 

            await sleep(50); 

        }

        else if (cropBlock.name === 'potatoes' && cropBlock.metadata < 7) {

            // Check xem việc cầm bột xương có thành công không

            const isReady = await fastEquip(currentBot.registry.itemsByName.dye.id);

            if (!isReady) {

                await sleep(500); 

                return; 

            }

            sendInteractPacket(cropPos); 

            await sleep(50); 

        }

        else if (cropBlock.name === 'potatoes' && cropBlock.metadata === 7) {

            try {

                await currentBot.dig(cropBlock);

            } catch (e) {}

        }

    }

}



// ==========================================

// TÍNH NĂNG CHAT TỪ TERMINAL

// ==========================================

let lastChatTime = 0;

const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });



rl.on('line', async (input) => {

    if (!currentBot) return console.log('[Lỗi] Bot chưa vào game!');

    const rawInput = input.trim();

    try {

        if (rawInput.startsWith('/')) {

            currentBot.chat(rawInput);

            console.log(`[Lệnh]: ${rawInput}`);

            return;

        }

        const now = Date.now();

        if (now - lastChatTime < 1500) return console.log('>>> [CẢNH BÁO] Spam là server khóa mõm!');

        lastChatTime = now;

        currentBot.chat(rawInput); 

        console.log(`[Chat]: ${rawInput}`);

    } catch (error) {

        console.log('>>> [Lỗi Điều Khiển]:', error.message);

    }

});



createBot();
