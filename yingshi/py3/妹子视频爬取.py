import requests, os, time, random, sys
from threading import Thread, Lock
from urllib.parse import urlparse

SAVE_DIR = "/storage/emulated/0/爬取保存/妹子视频爬取"
os.makedirs(SAVE_DIR, exist_ok=True)

VIDEO_APIS = [
    ("高质量", "http://api.tinise.cn/api/xjjsp"),
    ("小姐姐(高质量)", "http://api.yujn.cn/api/zzxjj.php?type=video"),
    ("小姐姐2(高质量)", "https://api.dwo.cc/api/ksvideo"),
    ("小姐姐3(高质量)", "http://api.qemao.com/api/douyin/"),
    ("随机小姐姐聚合", "https://sucyan.top/api/video/?msg=jk"),
    ("狱卒系列", "http://api.yujn.cn/api/jpmt.php"),
    ("美腿玉足", "https://sbtxqq.com/api/yzxl.php"),
    ("黑丝系列", "http://api.yujn.cn/api/heisis.php?type=video"),
    ("黑白丝", "http://api.tinise.cn/api/baisi"),
    ("黑白丝2", "http://api.tinise.cn/api/heisi"),
    ("抖音小姐姐", "http://api.qemao.com/api/douyin/"),
    ("高质量美女", "http://www.wudada.online/Api/NewSp"),
    ("完美身材", "http://api.yujn.cn/api/wmsc.php?type=video"),
    ("快手变装", "http://api.yujn.cn/api/ksbianzhuang.php?type=video"),
    ("抖音变装", "http://api.yujn.cn/api/bianzhuang.php?"),
    ("白丝系列", "http://api.yujn.cn/api/baisis.php?type=video"),
    ("快手女大学生", "https://api.yujn.cn/api/nvda.php?type=video"),
    ("抖音瞳瞳", "https://api.yujn.cn/api/tongtong.php?type=video"),
    ("丝滑舞蹈", "http://api.yujn.cn/api/shwd.php?type=video"),
    ("鞠婧祎系列", "http://api.yujn.cn/api/jjy.php?type=video"),
    ("美女穿搭", "http://api.yujn.cn/api/chuanda.php?type=video"),
    ("章若楠", "http://api.yujn.cn/api/zrn.php?type=video"),
    ("古风类", "http://api.yujn.cn/api/hanfu.php?type=video"),
    ("慢摇系列", "http://api.yujn.cn/api/manyao.php?type=video"),
    ("吊带系列", "http://api.yujn.cn/api/diaodai.php?type=video"),
    ("清纯系列", "http://api.yujn.cn/api/qingchun.php?type=video"),
    ("COS系列", "http://api.yujn.cn/api/COS.php?type=video"),
    ("纯情女高", "http://api.yujn.cn/api/nvgao.php?type=video"),
    ("街拍系列", "http://api.yujn.cn/api/jiepai.php?type=video"),
    ("变装系列", "http://api.yujn.cn/api/ksbianzhuang.php?type=video"),
    ("萝莉系列", "http://api.yujn.cn/api/luoli.php?type=video"),
    ("甜妹系列", "http://api.yujn.cn/api/tianmei.php?type=video"),
    ("随机美女", "https://v2.api-m.com/api/meinv?return=302"),
    ("随机小姐姐1", "http://api.yujn.cn/api/xjj.php?type=video"),
    ("随机小姐姐2", "http://api.yujn.cn/api/ksxjjsp.php?"),
    ("随机小姐姐3", "https://img.8845.top/xjj"),
    ("随机小姐姐4", "https://api.mhimg.cn/api/Sj_girls_video"),
    ("随机小姐姐5", "http://api.yujn.cn/api/juhexjj.php?type=video"),
]

count_lock = Lock()
total_ok = 0
total_fail = 0

def download_one(name, url, dest_dir, retries=3):
    global total_ok, total_fail
    safe = "".join(c for c in name if c.isalnum() or c in " _-").strip()
    d = os.path.join(dest_dir, safe)
    os.makedirs(d, exist_ok=True)
    
    for r in range(retries):
        try:
            hd = {
                "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
                "Accept": "*/*",
                "Referer": "https://gitee.com/"
            }
            resp = requests.get(url, headers=hd, timeout=30, stream=True, allow_redirects=True)
            if resp.status_code != 200:
                print(f"  [{safe}] HTTP {resp.status_code}, retry {r+1}")
                time.sleep(2)
                continue
            
            ts = int(time.time() * 1000)
            fp = os.path.join(d, f"{ts}.mp4")
            
            with open(fp, "wb") as f:
                for chunk in resp.iter_content(65536):
                    if chunk:
                        f.write(chunk)
            
            kb = os.path.getsize(fp) / 1024
            if kb < 100:
                os.remove(fp)
                print(f"  [{safe}] 文件太小({kb:.0f}KB), retry {r+1}")
                continue
            
            with count_lock:
                total_ok += 1
            
            print(f"  OK [{safe}] {fp} ({kb:.0f}KB)")
            return True
            
        except Exception as e:
            print(f"  FAIL [{safe}] {e}")
            time.sleep(2)
    
    with count_lock:
        total_fail += 1
    return False

def worker(name, url, dest, n):
    for i in range(n):
        download_one(name, url, dest)

if __name__ == "__main__":
    print("=" * 55)
    print("  妹子发电站 · 38源批量视频爬虫")
    print(f"  保存路径: {SAVE_DIR}")
    print("=" * 55)
    
    try:
        n = int(input("每个源下载几个? (默认3): ") or "1")
        c = int(input("并发数? (默认3): ") or "1")
    except:
        n, c = 1, 1
    
    print(f"\n开始爬取 {len(VIDEO_APIS)} 个源, 每个{n}个, 并发{c}个\n")
    start = time.time()
    
    for i in range(0, len(VIDEO_APIS), c):
        batch = VIDEO_APIS[i:i+c]
        ts = []
        for name, url in batch:
            t = Thread(target=worker, args=(name, url, SAVE_DIR, n))
            t.start()
            ts.append(t)
            time.sleep(0.3)
        for t in ts:
            t.join()
    
    elapsed = time.time() - start
    print(f"\n{'=' * 55}")
    print(f"  完成! 成功={total_ok}, 失败={total_fail}, 耗时={elapsed:.0f}s")
    print(f"  视频保存在: {SAVE_DIR}")
    print(f"{'=' * 55}")
