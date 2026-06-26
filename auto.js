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

const RECONNECT_DELAY = 40000; 

// GIỮ MẠNG CHO REPLIT
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot đang Farm Nether Wart VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// TRẠNG THÁI GỐC CỦA BOT
let botState = 'DISCONNECTED'; 
let currentBot; 
let isLoggingIn = false; 
let isGUIOpen = false; 
let failCount = 0;
let isSonarKick = false; 
let isKilledByAdmin = false; 

// BỘ NHỚ KHÔNG GIAN
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

        // [NÂNG CẤP VIP] ĐÓNG BĂNG KHI THẤY STAFF
        if (lowerMsg.includes('losts vừa tham gia') || lowerMsg.includes('nugget_champion vừa tham gia')) {
            console.log('\n================================================================');
            console.log('🚨 [BÁO ĐỘNG ĐỎ] ADMIN/STAFF VỪA VÀO SERVER! 🚨');
            console.log('🚨 ĐÓNG BĂNG HỆ THỐNG VĨNH VIỄN ĐỂ BẢO TOÀN ACC! 🚨');
            console.log('================================================================\n');
            isKilledByAdmin = true; 
            bot.quit();             
            return;
        }

        if (lowerMsg.includes('/captcha')) {
            const match = message.match(/\/captcha\s+([a-zA-Z0-9]+)/i);
            if (match) {
                console.log(`[Bảo Mật] Server đòi Captcha! Đang tự động nhập: /captcha ${match[1]} ...`);
                setTimeout(() => bot.chat(`/captcha ${match[1]}`), 1000); 
            }
        }

        if (lowerMsg.includes('đăng nhập bằng lệnh: /dn') || lowerMsg.includes('vui lòng đăng nhập')) {
            setTimeout(() => bot.chat('/dn Windvu@2@1@9@30849009630'), 1500); 
        }

        if (lowerMsg.includes('sonar') && lowerMsg.includes('xác minh')) {
            console.log('>>> [Anti-Bot] Bị Sonar soi! Đứng im chờ xác minh...');
            bot.clearControlStates();
            botState = 'WAIT_AUTO';
            isSonarKick = true; 
        }

        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                console.log(`[Party] Phát hiện lời mời từ: ${match[1]}! Đang join...`);
                setTimeout(() => bot.chat(`/party join ${match[1]}`), 500);
            }
        }

        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện Bảo Trì/Kick! Đang nằm chờ...');
            botState = 'MAINTENANCE'; 
            bot.isFarmingActive = false; 
        }

        if (message.includes('không thể ngồi trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/sit'); }, 3000);
        }

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
                console.log('[Hub] Sẵn sàng la bàn! Đang click vào cụm...');
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
            console.log('[CẢNH BÁO] Bot chết ở Sảnh! Hồi Sinh...');
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

        if (isKilledByAdmin) {
            console.log('🛑 🛑 🛑 ĐÃ KHÓA TỰ ĐỘNG VÀO LẠI! MUỐN CHẠY TIẾP HÃY RESTART CODE! 🛑 🛑 🛑');
            return; 
        }

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
function registerPlot(pos) {
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (!knownFarmPlots.some(p => `${p.x},${p.y},${p.z}` === key)) {
        knownFarmPlots.push(pos.clone());
        if (knownFarmPlots.length > 1000) knownFarmPlots.shift();
    }
}

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
            const blockAbove = bot.blockAt(cropPos);
            // Lọc các ô soul_sand bị đè kín ở phía trên
            if (!blockAbove || blockAbove.boundingBox !== 'block') {
                 registerPlot(cropPos);
            }
        }
    }
}

async function getNextTargetBlock(bot) {
    passiveScan(bot); 
    let bestFarmTarget = null;
    let minFarmDist = Infinity;
    let bestPatrolTarget = null;

    for (const pos of knownFarmPlots) {
        const block = bot.blockAt(pos);
        if (block) {
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
            bestPatrolTarget = pos;
        }
    }

    if (bestFarmTarget) return { type: 'farm', pos: bestFarmTarget };

    const foundWart = bot.findBlock({ matching: (block) => block.name === 'nether_wart' && block.metadata === 3, maxDistance: 16 });
    if (foundWart) return { type: 'farm', pos: foundWart };

    const foundEmptySoil = bot.findBlock({
        matching: (block) => {
            const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
            return block.name === 'soul_sand' && blockAbove && blockAbove.name === 'air';
        },
        maxDistance: 16
    });
    if (foundEmptySoil) return { type: 'farm', pos: foundEmptySoil.position.offset(0, 1, 0) };
    if (bestPatrolTarget) return { type: 'patrol', pos: bestPatrolTarget };
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
                    console.log('[!] Balo đầy bướu! Tiến hành dọn rác và cất rương...');
                    await clearJunk(bot);              
                    await depositWartToStackChests(bot); 
                    continue; 
                }

                console.log('[+] Đang gõ /warp nether để đi tìm cổng địa ngục...');
                bot.chat('/warp nether');
                await sleep(8000); 

                // [CẬP NHẬT VIP] ĐI THẲNG TỚI TỌA ĐỘ CỔNG YÊU CẦU
                const exactPortalPos = new Vec3(-386.5, 60, -91.5);
                console.log(`[Nether] Tiến thẳng tới tọa độ cổng cố định: X:${exactPortalPos.x} Y:${exactPortalPos.y} Z:${exactPortalPos.z}...`);
                
                await runToTargetCoordinates(bot, exactPortalPos, true); // true = Là cổng, chạy thẳng vào
                
                console.log('[Nether] Đang đợi server load map Địa ngục...');
                await sleep(6000);

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

// --- HÀM DI CHUYỂN BỐC ĐẦU + AUTO CHAT /FEED ---
async function runToTargetCoordinates(bot, targetPos, isPortal = false) {
    let steps = 0;
    const stopDistance = isPortal ? 0.8 : 2.0; // Nếu là cổng thì lủi sát vào mặt nó luôn
    
    while (bot.entity.position.distanceTo(targetPos) > stopDistance && botState === 'FARMING' && bot.isFarmingActive && steps < 500) {
        
        // KIỂM TRA ĐÙI GÀ, TỤT DƯỚI 14 LÀ CHAT /FEED LIỀN
        if (bot.food <= 14) {
            console.log('[Thức Ăn] Hụt đùi gà! Gõ /feed khẩn cấp để chạy nước rút...');
            bot.chat('/feed');
            await sleep(500); // Ngưng 0.5s để server hồi đùi gà
        }

        await bot.lookAt(targetPos.offset(0.5, 1, 0.5)); 
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true); // Kích hoạt vắt chân lên cổ
        
        const blockAtFeet = bot.blockAt(bot.entity.position);
        if (blockAtFeet && (blockAtFeet.name.includes('lava') || blockAtFeet.name.includes('water'))) {
            bot.setControlState('jump', true);
        } else {
            bot.setControlState('jump', false);
        }

        await sleep(100);
        steps++;

        // Bổ sung thoát vòng lặp nếu bot nhận diện đã chuyển map thành công khi chui vào cổng
        if (isPortal) {
            const isNether = bot.game.dimension === 'minecraft:the_nether' || bot.game.dimension === -1 || bot.game.dimension === 'nether';
            if (isNether) {
                console.log('[Nether] Đã xuyên qua cổng thành công!');
                break;
            }
        }
    }
    bot.clearControlStates();
}

async function fastEquip(itemId) {
    if (currentBot.heldItem && currentBot.heldItem.type === itemId) return true;
    const hasItem = currentBot.inventory.items().find(i => i.type === itemId);
    if (!hasItem) return false; 
    try { 
        await currentBot.equip(itemId, 'hand'); 
        if (currentBot.heldItem && currentBot.heldItem.type === itemId) return true; 
        return false; 
    } catch (e) { return false; }
}

async function farmNetherWart(bot) {
    const result = await getNextTargetBlock(bot);

    if (result) {
        const targetPos = result.pos;

        if (result.type === 'farm') {
            await runToTargetCoordinates(bot, targetPos, false);

            const block = bot.blockAt(targetPos);
            if (block) {
                if (block.name === 'nether_wart' && block.metadata === 3) {
                    await bot.dig(block);
                    await sleep(200);

                    const wartId = bot.registry.itemsByName.nether_wart.id;
                    const isReady = await fastEquip(wartId);
                    if (isReady) {
                        const soulSandBlock = bot.blockAt(targetPos.offset(0, -1, 0));
                        if (soulSandBlock && soulSandBlock.name === 'soul_sand') {
                            await bot.placeBlock(soulSandBlock, new Vec3(0, 1, 0));
                            await sleep(200);
                        }
                    }
                } else if (block.name === 'air') {
                    const soulSandBlock = bot.blockAt(targetPos.offset(0, -1, 0));
                    if (soulSandBlock && soulSandBlock.name === 'soul_sand') {
                        const wartId = bot.registry.itemsByName.nether_wart.id;
                        const isReady = await fastEquip(wartId);
                        if (isReady) {
                            await bot.placeBlock(soulSandBlock, new Vec3(0, 1, 0));
                            await sleep(200);
                        }
                    }
                }
            }
        } else if (result.type === 'patrol') {
            console.log(`[Patrol] Mở map tìm bãi xa (X:${targetPos.x} Y:${targetPos.y})...`);
            await runToTargetCoordinates(bot, targetPos, false);
            passiveScan(bot);
        }
    } else {
        console.log('[Farm] Đang đi thám hiểm tìm bãi bướu...');
        const randomYaw = Math.random() * Math.PI * 2;
        await bot.look(randomYaw, bot.entity.pitch, true);
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        
        let steps = 0;
        while (steps < 30 && botState === 'FARMING' && bot.isFarmingActive) {
            if (bot.food <= 14) { bot.chat('/feed'); await sleep(500); }
            const blockAtFeet = bot.blockAt(bot.entity.position);
            if (blockAtFeet && (blockAtFeet.name.includes('lava') || blockAtFeet.name.includes('water'))) bot.setControlState('jump', true);
            else bot.setControlState('jump', false);
            
            passiveScan(bot);
            await sleep(100);
            steps++;
        }
        bot.clearControlStates();
    }
}

async function clearJunk(bot) {
    const allowed = ['nether_wart', 'compass']; 
    const junk = bot.inventory.items().filter(i => !allowed.includes(i.name));
    if (junk.length === 0) return;

    try {
        bot.chat('/trash');
        const trashWindow = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Thùng rác mở quá lâu')), 3000);
            bot.once('windowOpen', (win) => { clearTimeout(timeout); resolve(win); });
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
        await sleep(500);
    } catch (e) {
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow);
    }
}

async function depositWartToStackChests(bot) {
    const warts = bot.inventory.items().filter(item => item.name === 'nether_wart');
    let totalWarts = warts.reduce((sum, item) => sum + item.count, 0);

    if (totalWarts <= 64) return;

    console.log(`[+] Đang mở rương cất Bướu... (Hiện có: ${totalWarts} củ)`);
    const chestPos = bot.findBlock({ matching: bot.registry.blocksByName.chest.id, maxDistance: 5 });
    if (!chestPos) { console.log('[-] Lỗi: Không thấy rương!'); return; }

    try {
        const chestBlock = bot.blockAt(chestPos.position);
        const chest = await bot.openChest(chestBlock);
        await sleep(500); 

        let toDeposit = totalWarts - 64;
        const wartId = bot.registry.itemsByName.nether_wart.id;
        
        try {
            await chest.deposit(wartId, null, toDeposit);
            await sleep(500);
        } catch (e) {}

        chest.close();
        await sleep(500); 
        console.log(`[+] Cất hàng xong! (Giữ lại 1 stack giống)`);
    } catch (err) {
        if (bot.currentWindow) bot.closeWindow(bot.currentWindow); 
    }
}

let lastChatTime = 0;
const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', async (input) => {
    if (!currentBot) return;
    const rawInput = input.trim();
    try {
        if (rawInput.startsWith('/')) { currentBot.chat(rawInput); return; }
        const now = Date.now();
        if (now - lastChatTime < 1500) return;
        lastChatTime = now;
        currentBot.chat(rawInput); 
    } catch (error) {}
});

createBot();
