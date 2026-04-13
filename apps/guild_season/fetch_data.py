import pandas as pd
import gzip
import io
import urllib.request

def export_table_to_csv():
    # 目标网页 URL
    types = ["CASTLES","POWER_CRYSTAL_TERRITORY","POWER_CRYSTAL_HIDEOUT","SIPHONING_MAGE","CRYSTAL_SPIDER","SMUGGLERS","TREASURES","HELLDUNGEON","PVE","GATHERING","HELLGATE","CORRUPTED"]
    for t in types:
        url = f"https://east.albionbb.com/tools/season-challenges?category={t}"
    
        print(f"正在获取 {t} 数据...")
    
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Referer": "https://east.albionbb.com/",
            }

            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as res:
                raw = res.read()
                if res.headers.get("Content-Encoding") == "gzip":
                    raw = gzip.decompress(raw)
                charset = res.headers.get_content_charset() or "utf-8"
                html = raw.decode(charset, errors="replace")

            tables = pd.read_html(io.StringIO(html))
            
            if not tables:
                print("未在网页中找到表格！")
                return
                
            # 网页上因为排版原因表格被分成了三段（1-33级，34-66级，67-99级）
            # 我们用 concat 把它们纵向拼接成一个完整的 DataFrame
            df = pd.concat(tables, ignore_index=True)
            
            # 可选：清理数字中的逗号（比如 28,000 -> 28000），便于后续作为纯数字处理
            for col in df.columns:
                if df[col].dtype == 'object':
                    df[col] = df[col].str.replace(',', '', regex=False)
                    
            # 导出为 CSV 文件
            output_file = f"{t}.csv"
            df.to_csv(output_file, index=False, encoding='utf-8-sig')
            print(f"成功！已提取 {len(df)} 行数据，并保存至 {output_file}")
            
        except Exception as e:
            print(f"抓取失败: {e}")

if __name__ == "__main__":
    export_table_to_csv()
