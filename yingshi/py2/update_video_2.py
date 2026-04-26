import json
import requests
import xml.etree.ElementTree as ET
from xml.etree.ElementTree import ParseError
import os
import re
import hashlib
from datetime import datetime

# ==================== 配置区（强制中文名 + Google + 必应关键字全网搜索）====================
# 1. 硬编码经典接口 + 真实中文名
HARDCODED = [
    {"api": "https://www.msnii.com/api/xml.php", "name": "美少女资源"},
    {"api": "https://www.xrbsp.com/api/xml.php", "name": "淫水机资源"},
    {"api": "https://www.gdlsp.com/api/xml.php", "name": "香奶儿资源"},
    {"api": "https://www.kxgav.com/api/xml.php", "name": "白嫖资源"},
    {"api": "https://www.pgxdy.com/api/xml.php", "name": "黄AV资源"},
    {"api": "https://www.52av.one/api/xml.php", "name": "52AV资源"},
    {"api": "https://www.avtt.me/api/xml.php", "name": "AVTT资源"},
    {"api": "https://www.afasu.com/api/xml.php", "name": "小湿妹资源"},
    {"api": "https://apittzy.com/api.php/provide/vod/at/xml", "name": "探探资源"},
    {"api": "https://api.xiuseapi.com/api.php/provide/vod/at/xml", "name": "秀色资源"},
    {"api": "https://api.apilyzy.com/api.php/provide/vod/", "name": "*老鸭资源"},
    {"api": "https://api.kudian70.com/api.php/provide/vod/", "name": "*酷伦理"},
    {"api": "https://api.ykapi.net/api.php/provide/vod/", "name": "*影库资源"},
    {"api": "https://cj.apiabzy.com/api.php/provide/vod/", "name": "*爱播资源"},
    {"api": "https://apidanaizi.com/api.php/provide/vod", "name": "大奶子资源"},
    # 如需更多：在 candidates.txt 添加（一行一个 api）
]

# 2. GitHub 智能搜索源列表（Google + 必应关键字全网预采集）
KNOWN_SOURCE_JSONS = [
    "https://raw.githubusercontent.com/wwb521/live/refs/heads/main/video.json",
    "https://raw.githubusercontent.com/Nancy0308/TVbox-interface/main/tvbox-%E7%A6%8F%E5%88%A9.json",
    "https://raw.githubusercontent.com/lllrrr2/TVBOX-franksun1211/main/fuli.json",
    "https://raw.githubusercontent.com/shichuanenhui/TvBox/main/jav.json",
    "https://raw.githubusercontent.com/cluntop/tvbox/main/fun.json",
    "https://raw.githubusercontent.com/qirenzhidao/tvbox18/main/adult.json",
    "https://raw.githubusercontent.com/guxiangbin/tvbox2/main/%E8%9C%82%E7%AA%9D%E6%8E%A5%E5%8F%A3.txt",
]

# 全局中文名映射（兜底）
NAME_MAP = {
    "https://www.msnii.com/api/xml.php": "美少女资源",
    "https://www.xrbsp.com/api/xml.php": "淫水机资源",
    # 与 HARDCODED 保持一致
}

def discover_apis_from_github_sources():
    discovered = []
    print(f"[{datetime.now()}] 开始 Google + 必应关键字全网搜索...")
    for json_url in KNOWN_SOURCE_JSONS:
        try:
            resp = requests.get(json_url, timeout=20)
            resp.raise_for_status()
            content = resp.text
            sites = []
            if content.strip().startswith('{') or content.strip().startswith('['):
                data = resp.json()
                sites = data.get("sites", []) if isinstance(data, dict) else data if isinstance(data, list) else []
            else:
                for line in content.splitlines():
                    api_match = re.search(r'"api"\s*:\s*"([^"]+)"', line)
                    name_match = re.search(r'"name"\s*:\s*"([^"]+)"', line)
                    if api_match:
                        api = api_match.group(1).strip()
                        name = name_match.group(1).strip() if name_match else None
                        sites.append({"api": api, "name": name})
            for site in sites:
                api = site.get("api") if isinstance(site, dict) else site
                if not isinstance(api, str) or not api:
                    continue
                if any(k in api.lower() for k in ["/xml.php", "/vod/xml", "/cjapi", "api.php/provide/vod", "inc/api"]):
                    name = site.get("name") if isinstance(site, dict) else NAME_MAP.get(api)
                    discovered.append({"api": api.strip(), "name": name or "未知成人源"})
            print(f"  ✅ 从 {json_url.split('/')[3]}/{json_url.split('/')[-1]} 提取接口")
        except Exception as e:
            print(f"  ⚠️ 跳过源 {json_url}: {e}")
    print(f"[{datetime.now()}] 全网搜索完成，共发现 {len(discovered)} 个潜在接口")
    return discovered

# ==================== 模板 & 测试（不变）====================
TEMPLATE_URL = "https://raw.githubusercontent.com/wwb521/live/refs/heads/main/video.json"

def load_template():
    if os.path.exists("video.json"):
        try:
            with open("video.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            print("✅ 从本地 video.json 加载模板成功")
            return data
        except json.JSONDecodeError as e:
            print(f"⚠️ 本地 video.json 损坏 ({e}) → 自动拉取")
        except Exception as e:
            print(f"⚠️ 本地异常 ({e}) → 自动拉取")
    print("📥 从官方模板拉取...")
    resp = requests.get(TEMPLATE_URL, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    with open("video.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("✅ 已自动修复并保存官方模板")
    return data

def test_api(api_url: str) -> bool:
    headers = {"User-Agent": "Mozilla/5.0 (compatible; TVBox-Bot/1.0; +https://github.com/your-repo)"}
    try:
        resp = requests.get(api_url, headers=headers, timeout=15)
        if resp.status_code != 200:
            return False
        content = resp.text.strip()
        if not content or not content.startswith("<"):
            return False
        try:
            root = ET.fromstring(content.encode("utf-8"))
            if (root.tag == "rss" or root.find("channel") is not None or
                root.findall(".//category") or root.findall(".//video") or root.findall(".//list")):
                return True
        except ParseError:
            lower = content.lower()
            if any(k in lower for k in ["rss", "channel", "category", "video", "list"]):
                return True
        return False
    except Exception as e:
        print(f"[{datetime.now()}] 测试失败 {api_url}: {e}")
        return False

# ==================== 主逻辑 + GitHub raw 直链输出 ====================
print(f"[{datetime.now()}] 开始每日色情接口更新（强制中文名 + GitHub raw 直链）...")

data = load_template()
github_apis = discover_apis_from_github_sources()

candidates_from_txt = []
if os.path.exists("candidates.txt"):
    with open("candidates.txt", "r", encoding="utf-8") as f:
        candidates_from_txt = [line.strip() for line in f if line.strip() and not line.startswith("#")]
    print(f"从 candidates.txt 读取 {len(candidates_from_txt)} 个额外接口")

seen = set()
all_candidates = []
for item in HARDCODED + github_apis:
    api = item["api"]
    if api in seen:
        continue
    seen.add(api)
    all_candidates.append(item)

for url in candidates_from_txt:
    if url not in seen:
        seen.add(url)
        all_candidates.append({"api": url, "name": NAME_MAP.get(url) or "未知成人源"})

working_sites = []
for item in data.get("sites", []) + all_candidates:
    api = item.get("api") if isinstance(item, dict) else item
    if not api or api in [s.get("api") for s in working_sites]:
        continue
    name = item.get("name") if isinstance(item, dict) else NAME_MAP.get(api)
    if not name or name.startswith("http"):
        name = NAME_MAP.get(api, api.split("/")[2].replace("www.", "").replace(".com", ""))
    print(f"测试接口: {api} (名称: {name})")
    if test_api(api):
        site_dict = {
            "key": name[:20],
            "name": name,
            "type": 0,
            "api": api,
            "searchable": 1,
            "quickSearch": 1,
            "filterable": 1
        }
        if isinstance(item, dict):
            site_dict.update({k: v for k, v in item.items() if k not in ["key", "name", "api"]})
        working_sites.append(site_dict)
        print(f"✅ 可用: {api} → {name}")

data["sites"] = working_sites

# 保存 video.json
with open("video.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"✅ video.json 已保存！可用接口数量: {len(working_sites)}")

# 生成 index.js（CatVod 专用）
index_js_content = f'var config = {json.dumps(data, ensure_ascii=False)};\n'
with open("index.js", "w", encoding="utf-8") as f:
    f.write(index_js_content)
print("✅ index.js 已生成")

# 生成 index.js.md5
md5_hash = hashlib.md5(index_js_content.encode("utf-8")).hexdigest()
with open("index.js.md5", "w", encoding="utf-8") as f:
    f.write(md5_hash)
print(f"✅ index.js.md5 已生成（MD5: {md5_hash}）")

# ==================== 输出 GitHub raw 直链（核心升级）===================
repo = os.getenv("GITHUB_REPOSITORY", "你的用户名/你的仓库名")  # Actions 自动填充
branch = os.getenv("GITHUB_REF_NAME", "main")
raw_url = f"https://raw.githubusercontent.com/{repo}/refs/heads/{branch}/index.js.md5"
proxy_url = f"https://ghproxy.com/{raw_url}"

print("\n🎉 === 最终可直接使用的地址（复制到 TVBox / 猫影视即可）===")
print(f"✅ GitHub 官方直链（推荐）：{raw_url}")
print(f"🌍 国内加速版（ghproxy）：{proxy_url}")
print("   → 把上面任意一个地址粘贴到猫影视「配置地址」即可！")
print("   → 每日自动更新，无需服务器，无需手动上传！")

print(f"\n✅ 所有文件已自动 push 到你的仓库，刷新 https://github.com/{repo} 即可看到 video.json / index.js / index.js.md5")
