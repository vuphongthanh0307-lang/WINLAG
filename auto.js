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

// GIỮ MẠNG CHO REPLIT
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot AppleMeoMeoz đang Farm Nether Wart VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// TRẠNG THÁI GỐC CỦA BOT
let botState = 'DISCONNECTED'; 
let currentBot; 
let isLoggingIn = false; 
let isFarmLoopRunning = false; 
let isGUIOpen = false; 
let failCount = 0;
let isSonarKick = false; 

// BỘ NHỚ KHÔNG GIAN: Lưu trữ tọa độ bãi farm (Được giữ nguyên ngay cả khi bot reconnect)
let knownFarmPlots = []; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'winlxag5553', 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 60000,
        respawn: false 
    });

    currentBot = bot; 
    bot.isFarmingActive = false; 

    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) originalLog('[Chat] ' + jsonMsg.toAnsi());
        else originalLog('[Chat] ' + jsonMsg.toString());
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/dn Windvu@2@1@9@30849009630'); 
            console.log('[Hub] Đã gửi lệnh login! Đang nghe ngóng...');
            botState = 'FIRST_LOGIN';
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // TỰ ĐỘNG GIẢI CAPTCHA
        if (lowerMsg.includes('/captcha')) {
            const match = message.match(/\/captcha\s+([a-zA-Z0-9]+)/i);
            if (match) {
                console.log(`[Bảo Mật] Server đòi Captcha! Đang tự động nhập: /captcha ${match[1]} ...`);
                setTimeout(() => bot.chat(`/captcha ${match[1]}`), 1000); 
            }
        }

        // ĐĂNG NHẬP LẠI NẾU BỊ ĐÒI
        if (lowerMsg.includes('đăng nhập bằng lệnh: /dn') || lowerMsg.includes('vui lòng đăng nhập')) {
            setTimeout(() => bot.chat('/dn Windvu@2@1@9@30849009630'), 1500); 
        }

        // NHẬN DIỆN SONAR ĐANG QUÉT
        if (lowerMsg.includes('sonar') && lowerMsg.includes('xác minh')) {
            console.log('>>> [Anti-Bot] Bị Sonar soi! Kích hoạt tà thuật đứng im...');
            bot.clearControlStates();
            botState = 'WAIT_AUTO';
            isSonarKick = true; 
        }

        // BỘ LỌC TỰ ĐỘNG JOIN PARTY
        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                console.log(`[Party] Phát hiện lời mời từ anh em: ${match[1]}! Đang quất lệnh join...`);
                setTimeout(() => bot.chat(`/party join ${match[1]}`), 500);
            }
        }

        // BẢO TRÌ/KICK
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện Bảo Trì/Kick! Đang nằm chờ server tự kéo...');
            botState = 'MAINTENANCE'; 
            bot.isFarmingActive = false; 
        }

        // BỊ LỖI GHẾ NGỒI
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
                startAutoFarmNetherWart(bot); 
            }
        }
    });

    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        if (botState === 'FARMING') return; 

        const items = currentBot.inventory.items();
        const hasCompass = items.some(i => i.name === 'compass');

        if (hasCompass) {
            if (botState === 'FIRST_LOGIN') botState = 'IN_HUB'; 
            if (botState === 'IN_HUB' && !isGUIOpen) {
                console.log('[Hub] Sẵn sàng la bàn! Đang click đục lỗ vào cụm...');
                currentBot.setQuickBarSlot(4);
                currentBot.activateItem();
            }
        } 
    }, 3000); 

    bot.on('windowOpen', async (window) => {
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
        bot.isFarmingActive = false;
        if (botState !== 'FARMING') {
            console.log('[CẢNH BÁO] Bot chết ở Sảnh! Tự động Hồi Sinh...');
            setTimeout(() => bot.respawn(), 2000);
        } else {
            console.log('[CẢNH BÁO] Bot bị chết! Nằm chờ kéo hồi sinh...');
        }
    });

    bot.on('end', () => {
        console.log('[SERVER] Đã ngắt kết nối!');
        isLoggingIn = false;
        botState = 'DISCONNECTED'; 
        bot.isFarmingActive = false;

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

// ==========================================
// CÁC HÀM TRỢ THỦ QUẢN LÝ BỘ NHỚ PHÂN BẢN ĐỒ
// ==========================================

// 1. Lưu tọa độ bãi farm, lọc trùng để tránh tốn bộ nhớ
function registerPlot(pos) {
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (!knownFarmPlots.some(p => `${p.x},${p.y},${p.z}` === key)) {
        knownFarmPlots.push(pos.clone());
        if (knownFarmPlots.length > 1000) {
            knownFarmPlots.shift();
        }
    }
}

// 2. Quét thụ động xung quanh để thu thập dữ liệu bản đồ bướu
function passiveScan(bot) {
    const found = bot.findBlocks({
        matching: (block) => block.name === 'soul_sand' || block.name === 'nether_wart',
        maxDistance: 16,
        count: 30
    });
    for (const pos of found) {
        const block = bot.blockAt(pos);
        if (block) {
            const cropPos = block.name === 'soul_sand' ? pos.offset(0, 1, 0) : pos;
            registerPlot(cropPos);
        }
    }
}

// 3. Tìm mục tiêu tiếp theo (Ưu tiên ô đã load trong bộ nhớ -> Quét 3D xung quanh -> Đi tuần tra tọa độ xa chưa load)
async function getNextTargetBlock(bot) {
    passiveScan(bot); 

    let bestFarmTarget = null;
    let minFarmDist = Infinity;
    let bestPatrolTarget = null;

    for (const pos of knownFarmPlots) {
        const block = bot.blockAt(pos);
        
        if (block) {
            // A. Kiểm tra bãi bướu trong vùng đã load: Có chín hay có đất trống không
            const isMatureWart = block.name === 'nether_wart' && block.metadata === 3;
            const isSoilEmpty = block.name === 'air' && bot.blockAt(pos.offset(0, -1, 0))?.name === 'soul_sand';

            if (isMatureWart || isSoilEmpty) {
                const dist = bot.entity.position.distanceTo(pos);
                if (dist < minFarmDist) {
                    minFarmDist = dist;
                    bestFarmTarget = pos;
                }
            }
        } else {
            // B. Tọa độ lưu trong bộ nhớ chưa được load (ở khoảng cách xa): Đánh dấu làm "Điểm tuần tra dự phòng"
            bestPatrolTarget = pos;
        }
    }

    // Ưu tiên 1: Đi farm bướu chín hoặc gieo bướu trống ở khu vực đã load
    if (bestFarmTarget) {
        return { type: 'farm', pos: bestFarmTarget };
    }

    // Ưu tiên 2: Quét 3D thực tế quanh bot phòng trường hợp bộ nhớ chưa ghi lại kịp
    const foundWart = bot.findBlock({
        matching: (block) => block.name === 'nether_wart' && block.metadata === 3,
        maxDistance: 16
    });
    if (foundWart) return { type: 'farm', pos: foundWart };

    const foundEmptySoil = bot.findBlock({
        matching: (block) => {
            const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
            return block.name === 'soul_sand' && blockAbove && blockAbove.name === 'air';
        },
        maxDistance: 16
    });
    if (foundEmptySoil) return { type: 'farm', pos: foundEmptySoil.position.offset(0, 1, 0) };

    // Ưu tiên 3: Đi bộ tới bãi farm ở rất xa (chưa được load chunk) để nạp bản đồ và kiểm tra
    if (bestPatrolTarget) {
        return { type: 'patrol', pos: bestPatrolTarget };
    }

    return null;
}

// ======================================================================
// ĐỘNG CƠ CÀY BƯỚU ĐỊA NGỤC (NETHER WART AUTO-FARM SYSTEM)
// ======================================================================
async function startAutoFarmNetherWart(bot) {
    if (bot.isFarmingActive) return; 
    bot.isFarmingActive = true;
    console.log('>>> KHỞI ĐỘNG HỆ THỐNG MÁY CÀY BƯỚU ĐỊA NGỤC <<<');

    while (botState === 'FARMING' && bot.isFarmingActive && bot._client) {
        try {
            const isNether = bot.game.dimension === 'minecraft:the_nether' || bot.game.dimension === -1 || bot.game.dimension === 'nether';

            if (!isNether) {
                const warts = bot.inventory.items().filter(item => item.name === 'nether_wart');
                const totalWarts = warts.reduce((sum, item) => sum + item.count, 0);

                if (totalWarts > 640 || bot.inventory.emptySlotCount() <= 3) {
                    console.log('[!] Balo đầy bướu! Tiến hành dọn rác và cất rương xếp tầng...');
                    await clearJunk(bot);              
                    await depositWartToStackChests(bot); 
                    continue; 
                }

                console.log('[+] Đang gõ /warp nether để đi tìm cổng địa ngục...');
                bot.chat('/warp nether');
                await sleep(8000); 

                const portalPos = bot.findBlock({
                    matching: [bot.registry.blocksByName.portal?.id, bot.registry.blocksByName.nether_portal?.id].filter(Boolean),
                    maxDistance: 32
                });

                if (portalPos) {
                    await walkToPortal(bot, portalPos);
                } else {
                    console.log('[-] Lỗi: Không tìm thấy cổng địa ngục nào quanh đây!');
                    await sleep(4000);
                }

            } else {
                const warts = bot.inventory.items().filter(item => item.name === 'nether_wart');
                const totalWarts = warts.reduce((sum, item) => sum + item.count, 0);

                if (totalWarts > 640 || bot.inventory.emptySlotCount() <= 3) {
                    console.log('[!] Kho đồ đã đầy bướu! Đang gõ /home để về lãnh địa cất hàng...');
                    bot.chat('/home');
                    await sleep(6000); 
                    continue;
                }

                await farmNetherWart(bot);
                await sleep(100); 
            }

        } catch (err) {
            console.log('[-] Vấp cỏ trong quá trình cày bướu:', err.message);
            await sleep(1000); 
        }
    }
}

// --- MODULE 1: ĐI QUA CỔNG ĐỊA NGỤC ---
async function walkToPortal(bot, portalPos) {
    console.log('[Nether] Đã xác định vị trí cổng địa ngục! Đang tiến vào...');
    let steps = 0;
    while (bot.entity.position.distanceTo(portalPos) > 1.5 && botState === 'FARMING' && bot.isFarmingActive && steps < 100) {
        await bot.lookAt(portalPos.offset(0.5, 1, 0.5));
        bot.setControlState('forward', true);
        
        const blockAtFeet = bot.blockAt(bot.entity.position);
        if (blockAtFeet && (blockAtFeet.name.includes('lava') || blockAtFeet.name.includes('water'))) {
            bot.setControlState('jump', true);
        } else {
            bot.setControlState('jump', false);
        }

        await sleep(100);
        steps++;
    }
    bot.clearControlStates();
    console.log('[Nether] Đã chạm cổng địa ngục! Đợi 6 giây chuyển map...');
    await sleep(6000);
}

// --- MODULE 2: THU HOẠCH, GIEO TRỒNG & TUẦN TRA TẦM XA ---
async function farmNetherWart(bot) {
    const result = await getNextTargetBlock(bot);

    if (result) {
        const targetPos = result.pos;

        if (result.type === 'farm') {
            // A. CHẾ ĐỘ FARM (ĐI TỚI VỊ TRÍ BƯỚU CHÍN HOẶC ĐẤT TRỐNG ĐÃ LOAD)
            await bot.lookAt(targetPos.offset(0.5, 0.5, 0.5));
            let steps = 0;
            while (bot.entity.position.distanceTo(targetPos) > 3 && botState === 'FARMING' && bot.isFarmingActive && steps < 50) {
                bot.setControlState('forward', true);
                await bot.lookAt(targetPos.offset(0.5, 0.5, 0.5));
                
                const blockAtFeet = bot.blockAt(bot.entity.position);
                if (blockAtFeet && (blockAtFeet.name.includes('lava') || blockAtFeet.name.includes('water'))) {
                    bot.setControlState('jump', true);
                } else {
                    bot.setControlState('jump', false);
                }

                await sleep(100);
                steps++;
            }
            bot.clearControlStates();

            const block = bot.blockAt(targetPos);
            if (block) {
                if (block.name === 'nether_wart' && block.metadata === 3) {
                    await bot.dig(block);
                    await sleep(200);

                    const wartItem = bot.inventory.items().find(item => item.name === 'nether_wart');
                    if (wartItem) {
                        await bot.equip(wartItem, 'hand');
                        const soulSandBlock = bot.blockAt(targetPos.offset(0, -1, 0));
                        if (soulSandBlock && soulSandBlock.name === 'soul_sand') {
                            await bot.placeBlock(soulSandBlock, new Vec3(0, 1, 0));
                            await sleep(200);
                            console.log('[Farm] Thu hoạch và tái gieo trồng bướu thành công!');
                        }
                    }
                } else if (block.name === 'air') {
                    const soulSandBlock = bot.blockAt(targetPos.offset(0, -1, 0));
                    if (soulSandBlock && soulSandBlock.name === 'soul_sand') {
                        const wartItem = bot.inventory.items().find(item => item.name === 'nether_wart');
                        if (wartItem) {
                            await bot.equip(wartItem, 'hand');
                            await bot.placeBlock(soulSandBlock, new Vec3(0, 1, 0));
                            await sleep(200);
                            console.log('[Farm] Đã lấp đầy hạt giống vào ô cát linh hồn trống!');
                        }
                    }
                }
            }
        } else if (result.type === 'patrol') {
            // B. CHẾ ĐỘ TUẦN TRA ĐIỂM Ở XA (TIẾN VỀ PHÍA TỌA ĐỘ CHƯA LOAD ĐỂ MỞ BẢN ĐỒ)
            console.log(`[Patrol] Đang di chuyển tìm bãi cũ ở xa (Tọa độ chưa nạp: X:${targetPos.x} Y:${targetPos.y}) để khai phá...`);
            await bot.lookAt(targetPos.offset(0.5, 1, 0.5));
            
            let steps = 0;
            // Tiến hành di chuyển thẳng về hướng đó trong khoảng 3.5 giây để server gửi gói tin chunk
            while (bot.entity.position.distanceTo(targetPos) > 6 && steps < 35 && botState === 'FARMING' && bot.isFarmingActive) {
                bot.setControlState('forward', true);
                await bot.lookAt(targetPos.offset(0.5, 1, 0.5));

                const blockAtFeet = bot.blockAt(bot.entity.position);
                if (blockAtFeet && (blockAtFeet.name.includes('lava') || blockAtFeet.name.includes('water'))) {
                    bot.setControlState('jump', true);
                } else {
                    bot.setControlState('jump', false);
                }

                // Vừa đi vừa cập nhật thụ động thêm bãi mới
                passiveScan(bot);

                await sleep(100);
                steps++;
            }
            bot.clearControlStates();
        }
    } else {
        // C. CHẾ ĐỘ THÁM HIỂM (ĐI KHÁM PHÁ NGẪU NHIÊN KHI CHƯA CÓ BỘ NHỚ TRONG KHU VỰC)
        console.log('[Farm] Không có mục tiêu khả dụng. Đang đi thám hiểm ngẫu nhiên để ghi nhận thêm bãi bướu...');
        const randomYaw = Math.random() * Math.PI * 2;
        await bot.look(randomYaw, bot.entity.pitch, true);
        bot.setControlState('forward', true);
        
        let steps = 0;
        while (steps < 30 && botState === 'FARMING' && bot.isFarmingActive) {
            const blockAtFeet = bot.blockAt(bot.entity.position);
            if (blockAtFeet && (blockAtFeet.name.includes('lava') || blockAtFeet.name.includes('water'))) {
                bot.setControlState('jump', true);
            } else {
                bot.setControlState('jump', false);
            }
            
            passiveScan(bot);
            
            await sleep(100);
            steps++;
        }
        bot.clearControlStates();
    }
}

// --- MODULE 3: DỌN SẠCH RÁC TRONG BALO ---
async function clearJunk(bot) {
    const allowed = ['nether_wart', 'compass']; 
    const junk = bot.inventory.items().filter(i => !allowed.includes(i.name));
    
    if (junk.length === 0) return;

    console.log(`[+] Phát hiện ${junk.length} món rác trong balo. Tiến hành dọn dẹp...`);
    try {
        bot.chat('/trash');
        
        const trashWindow = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Thùng rác mở quá lâu không phản hồi')), 3000);
            bot.once('windowOpen', (win) => {
                clearTimeout(timeout);
                resolve(win);
            });
        });
        await sleep(1000); 

        for (const item of junk) {
            const itemInWindow = trashWindow.items().find(i => i.type === item.type && i.slot >= trashWindow.inventoryStart);
            if (itemInWindow) {
                await bot.clickWindow(itemInWindow.slot, 0, 1); 
                await sleep(300); 
            }
        }
        
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
        console.log('[+] Đã phi tang rác hoàn tất!');
        await sleep(500);
    } catch (e) {
        console.log('[-] Lỗi dọn rác:', e.message);
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    }
}

// --- MODULE 4: CẤT ĐỒ THÁP RƯƠNG TRỤC DỌC ---
async function depositWartToStackChests(bot) {
    const warts = bot.inventory.items().filter(item => item.name === 'nether_wart');
    const totalWarts = warts.reduce((sum, item) => sum + item.count, 0);

    if (totalWarts <= 64) {
        console.log('[+] Lượng bướu trong balo quá ít, giữ lại làm hạt giống.');
        return; 
    }

    console.log(`[+] Đang định vị tháp rương... (Tổng bướu đang có: ${totalWarts} củ)`);
    
    const signPos = bot.findBlock({
        matching: (block) => block.name === 'wall_sign' || block.name === 'standing_sign',
        maxDistance: 6
    });

    let lowestChest = null;

    if (signPos) {
        const signBlock = bot.blockAt(signPos);
        const signText = getSignText(signBlock);
        
        if (signText.includes('nether') || signText.includes('wart') || signText.includes('bướu') || signText.includes('địa ngục')) {
            console.log('[+] Tìm thấy biển báo ghi nhãn Bướu Địa Ngục!');
            
            const nearbyChests = bot.findBlocks({
                matching: bot.registry.blocksByName.chest.id,
                maxDistance: 2,
                count: 3
            });

            let lowestY = Infinity;
            for (const pos of nearbyChests) {
                if (pos.y < lowestY) {
                    lowestY = pos.y;
                    lowestChest = bot.blockAt(pos);
                }
            }
        }
    }

    if (!lowestChest) {
        const chestPos = bot.findBlock({
            matching: bot.registry.blocksByName.chest.id,
            maxDistance: 4
        });
        if (chestPos) {
            lowestChest = bot.blockAt(chestPos);
            console.log('[!] Cảnh báo: Không phát hiện biển báo, lấy rương gần nhất trước mặt làm rương gốc...');
        }
    }

    if (!lowestChest) {
        console.log('[-] Lỗi: Không tìm thấy chiếc rương nào xung quanh điểm spawn!');
        return; 
    }

    const chestStack = [];
    chestStack.push(lowestChest); 

    const middleChestPos = lowestChest.position.offset(0, 1, 0);
    const middleChest = bot.blockAt(middleChestPos);
    if (middleChest && middleChest.name === 'chest') {
        chestStack.push(middleChest); 
    }

    const topChestPos = middleChestPos.offset(0, 1, 0);
    const topChest = bot.blockAt(topChestPos);
    if (topChest && topChest.name === 'chest') {
        chestStack.push(topChest); 
    }

    console.log(`[+] Xác định tháp rương thẳng đứng gồm ${chestStack.length} rương. Bắt đầu phân loại cất đồ...`);

    let toDeposit = totalWarts - 64; 

    for (let i = 0; i < chestStack.length; i++) {
        if (toDeposit <= 0) break;
        const currentChestBlock = chestStack[i];
        console.log(`[+] Đang mở rương tầng ${i + 1} (Tọa độ Y: ${currentChestBlock.position.y})...`);

        try {
            const chest = await Promise.race([
                bot.openChest(currentChestBlock),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Mở rương quá 3.5 giây không phản hồi')), 3500))
            ]);

            await sleep(500);

            const wartsInInv = bot.inventory.items().filter(item => item.name === 'nether_wart');
            for (const item of wartsInInv) {
                if (toDeposit <= 0) break;
                const amount = Math.min(item.count, toDeposit);
                try {
                    await chest.deposit(item.type, null, amount);
                    toDeposit -= amount;
                    await sleep(300);
                } catch (depositErr) {
                    console.log(`[-] Rương tầng ${i + 1} đã đầy hoặc lỗi! Chuẩn bị chuyển lên tầng phía trên...`);
                    break; 
                }
            }

            chest.close();
            await sleep(500);

        } catch (err) {
            console.log(`[-] Lỗi tương tác rương tầng ${i + 1}: ${err.message}`);
            if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
            await sleep(1000); 
        }
    }

    if (toDeposit > 0) {
        console.log(`[-] Cảnh báo: Toàn bộ tháp rương đứng đã đầy cứng, còn dư ${toDeposit} bướu trong balo!`);
    } else {
        console.log('[+] Đã gom sạch bướu địa ngục vào tháp rương an toàn!');
    }
}

// --- TRỢ THỦ 1: ĐỌC CHỮ TRÊN BIỂN BÁO ---
function getSignText(block) {
    if (!block || !block.blockEntity) return '';
    let text = '';
    for (let i = 1; i <= 4; i++) {
        const line = block.blockEntity[`Text${i}`];
        if (line) {
            try {
                const parsed = JSON.parse(line);
                text += ' ' + (parsed.text || parsed || '');
            } catch (e) {
                text += ' ' + line;
            }
        }
    }
    return text.toLowerCase();
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
