import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { messageToEvent } from './convert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runTest() {
  try {
    // 1. 读取 message.json
    const messagePath = path.join(__dirname, 'message.json');
    const messageRaw = fs.readFileSync(messagePath, 'utf-8');
    const message = JSON.parse(messageRaw);

    // 2. 准备上下文（参考 event.json 中的补充信息）
    const context = {
      channel_type: 'GROUP' as const,
      target_id: '2109636098846756',
      nonce: 'DQutqzpyeeurMaF8K3i7Rj6X',
      guild_id: '1248349507148974',
      channel_name: 'bot测试',
    };

    // 3. 执行转化
    const event = messageToEvent(message, context);

    // 4. 打印输出
    console.log('✅ 转化成功！转化后的 Event 对象如下：\n');
    console.log(JSON.stringify(event, null, 2));
    
    // 5. 对比 event.json（可选）
    const eventPath = path.join(__dirname, 'event.json');
    const expectedEventRaw = fs.readFileSync(eventPath, 'utf-8');
    const expectedEvent = JSON.parse(expectedEventRaw);
    
    console.log('\n----------------------------------------\n');
    console.log('📄 event.json 中的 d 对象（用于参考对比）：\n');
    console.log(JSON.stringify(expectedEvent.d, null, 2));

  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  }
}

runTest();
