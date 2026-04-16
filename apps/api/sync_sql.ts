import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

/**
 * 运行方式: 
 * npx tsx sync-d1.ts <数据库名> <表名> <记录ID>
 */

// 获取命令行参数
const args = process.argv.slice(2);
const [dbName, tableName, recordId] = args;

if (!dbName || !tableName || !recordId) {
  console.error('❌ 参数缺失！用法: npx tsx sync-d1.ts <数据库名> <表名> <ID>');
  process.exit(1);
}

const tempSqlFile = `.temp_${tableName}_${Date.now()}.sql`;

function syncRecord() {
  try {
    console.log(`🔍 正在从远程 [${dbName}] 获取表 [${tableName}] 中 ID 为 [${recordId}] 的数据...`);

    // 1. 从远程获取数据 (使用 --json 确保输出格式)
    const fetchCmd = `npx wrangler d1 execute ${dbName} --remote --command="SELECT * FROM ${tableName} WHERE id = '${recordId}';" --json`;
    const fetchOutput = execSync(fetchCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });

    // 2. 解析 JSON (过滤掉可能的非 JSON 字符)
    const jsonStart = fetchOutput.indexOf('[');
    if (jsonStart === -1) {
      throw new Error('无法解析远程返回的数据，请确认数据库名和表名是否正确。');
    }

    const data = JSON.parse(fetchOutput.substring(jsonStart));
    const results: Record<string, any>[] = data[0]?.results;

    if (!results || results.length === 0) {
      console.warn('⚠️ 远程数据库中未找到匹配的记录。');
      return;
    }

    const row = results[0];

    // 3. 构建 SQL 语句
    const columns = Object.keys(row).join(', ');
    const values = Object.values(row).map(val => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      // 处理字符串转义（针对 JSON 字符串和普通文本）
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');

    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${values});`;

    // 4. 写入临时 SQL 文件执行（避免 Bash 对特殊字符/长度的限制）
    writeFileSync(tempSqlFile, sql);

    console.log(`🚀 正在导入数据到本地环境...`);

    // 5. 执行本地导入
    execSync(`npx wrangler d1 execute ${dbName} --local --file=${tempSqlFile}`, { stdio: 'inherit' });

    console.log(`✨ 同步成功！`);

  } catch (error: any) {
    console.error(`❌ 错误: ${error.message}`);
  } finally {
    // 6. 清理
    if (existsSync(tempSqlFile)) {
      unlinkSync(tempSqlFile);
    }
  }
}

syncRecord();