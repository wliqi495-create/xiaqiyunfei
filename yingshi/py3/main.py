import re
import asyncio
import logging
import json
import os
from collections import OrderedDict
from datetime import datetime, timedelta
import difflib
import hashlib
from urllib.parse import urlparse, urlunparse, parse_qs

# 检查 aiohttp 是否安装
try:
    import aiohttp
except ImportError:
    print("错误: 缺少必要的依赖库 'aiohttp'。")
    print("请使用以下命令安装:")
    print("pip install aiohttp")
    import sys
    sys.exit(1)

# 检查 config 是否存在
try:
    import config
    required_attrs = ['source_urls', 'epg_urls', 'announcements', 'url_blacklist', 'ip_version_priority']
    for attr in required_attrs:
        if not hasattr(config, attr):
            raise AttributeError(f"配置文件缺少必要的属性: {attr}")
except ImportError:
    print("错误: 找不到配置模块 'config.py'。")
    print("请确保项目目录下有 config.py 文件，内容示例如下:")
    print("""
# config.py 示例内容
source_urls = [
    "https://example.com/source1.m3u",
    "https://example.com/source2.m3u"
]
epg_urls = ["https://example.com/epg.xml"]
announcements = [
    {
        "channel": "公告",
        "entries": [
            {
                "name": None,
                "url": "https://example.com/notice",
                "logo": "https://picsum.photos/100/100?random=1"
            }
        ]
    }
]
url_blacklist = []
ip_version_priority = "ipv4"
""")
    import sys
    sys.exit(1)
except AttributeError as e:
    print(f"配置文件错误: {e}")
    import sys
    sys.exit(1)

# 日志记录，只记录错误信息
logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[logging.FileHandler("./live/function.log", "w", encoding="utf-8"), logging.StreamHandler()])

# 确保 live 文件夹存在
output_folder = "live"
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# 缓存文件夹和文件
cache_folder = "./live/cache"
cache_file = os.path.join(cache_folder, "url_cache.json")
cache_valid_days = 7                     # 缓存有效期（天）
max_cache_entries = 500                  # 最多保留的缓存条目数（防止极端膨胀）

if not os.path.exists(cache_folder):
    os.makedirs(cache_folder)

def calculate_hash(content):
    """计算字符串的MD5哈希值"""
    return hashlib.md5(content.encode('utf-8')).hexdigest()

def load_cache():
    """加载缓存文件，并确保其结构正确"""
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                # 兼容旧格式
                if "urls" not in data:
                    data["urls"] = {}
                if "timestamp" not in data:
                    data["timestamp"] = datetime.now().isoformat()
                return data
        except Exception as e:
            logging.error(f"加载缓存失败: {e}")
    return {"urls": {}, "timestamp": datetime.now().isoformat()}

def clean_expired_cache(cache, valid_hashes=None):
    """
    清理过期或无效的缓存条目
    - 移除 timestamp 超过 cache_valid_days 的条目
    - 如果提供了 valid_hashes，则只保留哈希在该集合中的条目
    - 限制最多保留 max_cache_entries 个条目（按最近使用时间排序）
    """
    now = datetime.now()
    urls = cache.get("urls", {})
    cleaned = {}

    for url_hash, entry in list(urls.items()):
        try:
            ts = datetime.fromisoformat(entry.get("timestamp", ""))
        except Exception:
            continue
        if (now - ts).days >= cache_valid_days:
            continue                    # 过期
        if valid_hashes is not None and url_hash not in valid_hashes:
            continue                    # 不在当前源URL列表中
        cleaned[url_hash] = entry

    # 如果仍过多，按时间戳保留最近的 max_cache_entries 条
    if len(cleaned) > max_cache_entries:
        sorted_entries = sorted(cleaned.items(),
                                key=lambda x: x[1].get("timestamp", ""),
                                reverse=True)
        cleaned = dict(sorted_entries[:max_cache_entries])

    cache["urls"] = cleaned
    cache["timestamp"] = now.isoformat()

def save_cache(cache, valid_hashes=None):
    """保存缓存到磁盘，自动清理过期/无效条目"""
    clean_expired_cache(cache, valid_hashes)
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"保存缓存失败: {e}")

def is_cache_valid(cache):
    """整体检查缓存文件的时间戳是否在有效期内（作为快速判断）"""
    if not cache:
        return False
    try:
        ts = datetime.fromisoformat(cache.get("timestamp", datetime.now().isoformat()))
        return (datetime.now() - ts).days < cache_valid_days
    except Exception:
        return False

def parse_template(template_file):
    """解析 demo.txt 模板，返回 OrderedDict {类别: [频道名1, 频道名2...]} """
    template_channels = OrderedDict()
    current_category = None

    with open(template_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                if "#genre#" in line:
                    current_category = line.split(",")[0].strip()
                    template_channels[current_category] = []
                elif current_category:
                    channel_name = line.split(",")[0].strip()
                    template_channels[current_category].append(channel_name)

    return template_channels

def clean_channel_name(channel_name):
    """清洗频道名称：去除特殊符号、空格，并将数字部分标准化"""
    cleaned_name = re.sub(r'[$「」-]', '', channel_name)
    cleaned_name = re.sub(r'\s+', '', cleaned_name)
    # 将 "CCTV1" 转换为 "CCTV1"，但将 "CCTV10" 处理为 "CCTV10" 等（去掉前导零）
    cleaned_name = re.sub(r'(\D*)(\d+)', lambda m: m.group(1) + str(int(m.group(2))), cleaned_name)
    return cleaned_name.upper()

def is_valid_url(url):
    return bool(re.match(r'^https?://', url))

def remove_unnecessary_params(url):
    """移除URL中不必要的查询参数（当前仅示例，可按需修改）"""
    parsed_url = urlparse(url)
    query_params = parse_qs(parsed_url.query)
    # 保留必要参数（请按实际需要修改）
    necessary_params = {}
    for param, values in query_params.items():
        if param in ['必要参数1', '必要参数2']:
            necessary_params[param] = values
    new_query = '&'.join([f'{param}={value[0]}' for param, value in necessary_params.items()])
    new_url = urlunparse((parsed_url.scheme, parsed_url.netloc, parsed_url.path,
                          parsed_url.params, new_query, parsed_url.fragment))
    return new_url

async def fetch_channels(session, url, cache, valid_source_hashes):
    """
    异步获取指定URL的频道列表，优先从缓存读取
    valid_source_hashes: 当前所有源URL的哈希集合，用于保存缓存时清理无效条目
    """
    channels = OrderedDict()
    unique_urls = set()
    cache_hit = False

    url_hash = calculate_hash(url)
    # 检查具体的缓存条目是否有效
    if url_hash in cache.get("urls", {}):
        cached_entry = cache["urls"][url_hash]
        try:
            entry_time = datetime.fromisoformat(cached_entry.get("timestamp", ""))
            if datetime.now() - entry_time <= timedelta(days=cache_valid_days):
                logging.info(f"从缓存加载: {url}")
                channels = OrderedDict(cached_entry.get("channels", {}))
                unique_urls = set(cached_entry.get("unique_urls", []))
                cache_hit = True
        except Exception:
            pass

    if not cache_hit:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                response.raise_for_status()
                content = await response.text()
                response.encoding = 'utf-8'
                lines = content.split("\n")
                # 判断文件类型
                is_m3u = any(line.startswith("#EXTINF") for line in lines[:15])
                if is_m3u:
                    channels.update(parse_m3u_lines(lines, unique_urls))
                else:
                    channels.update(parse_txt_lines(lines, unique_urls))

                if channels:
                    # 更新缓存
                    cache["urls"][url_hash] = {
                        "url": url,
                        "channels": dict(channels),
                        "unique_urls": list(unique_urls),
                        "timestamp": datetime.now().isoformat(),
                        "content_hash": calculate_hash(content)
                    }
                    # 每次更新后保存，并自动清理过期/无效条目
                    save_cache(cache, valid_hashes=valid_source_hashes)

        except asyncio.TimeoutError:
            logging.error(f"url: {url} 请求超时")
        except Exception as e:
            logging.error(f"url: {url} 失败❌, Error: {e}")

    # 再次去重（同一频道同一URL）
    for category, channel_list in channels.items():
        seen = set()
        unique_list = []
        for ch_name, ch_url in channel_list:
            if (ch_name, ch_url) not in seen:
                unique_list.append((ch_name, ch_url))
                seen.add((ch_name, ch_url))
        channels[category] = unique_list

    return channels

def parse_m3u_lines(lines, unique_urls):
    """解析 M3U 格式"""
    channels = OrderedDict()
    current_category = None
    channel_name = None

    for line in lines:
        line = line.strip()
        if line.startswith("#EXTINF"):
            match = re.search(r'group-title="(.*?)",(.*)', line)
            if match:
                current_category = match.group(1).strip()
                channel_name = match.group(2).strip()
                if channel_name and channel_name.startswith("CCTV"):
                    channel_name = clean_channel_name(channel_name)
                if current_category not in channels:
                    channels[current_category] = []
        elif line and not line.startswith("#"):
            channel_url = line.strip()
            if is_valid_url(channel_url) and channel_url not in unique_urls:
                unique_urls.add(channel_url)
                if current_category and channel_name:
                    channels[current_category].append((channel_name, channel_url))
    return channels

def parse_txt_lines(lines, unique_urls):
    """解析 TXT 格式（#genre#）"""
    channels = OrderedDict()
    current_category = None

    for line in lines:
        line = line.strip()
        if "#genre#" in line:
            current_category = line.split(",")[0].strip()
            channels[current_category] = []
        elif current_category:
            match = re.match(r"^(.*?),(.*?)$", line)
            if match:
                channel_name = match.group(1).strip()
                if channel_name and channel_name.startswith("CCTV"):
                    channel_name = clean_channel_name(channel_name)
                channel_urls = match.group(2).strip().split('#')

                for channel_url in channel_urls:
                    channel_url = channel_url.strip()
                    if is_valid_url(channel_url) and channel_url not in unique_urls:
                        unique_urls.add(channel_url)
                        channels[current_category].append((channel_name, channel_url))
            else:
                # 无逗号的行（纯URL），保留频道名为空
                if is_valid_url(line) and line not in unique_urls:
                    unique_urls.add(line)
                    channels[current_category].append(("", line))
    return channels

def find_similar_name(target_name, name_list):
    """在名称列表中寻找最相似的名字"""
    matches = difflib.get_close_matches(target_name, name_list, n=1, cutoff=0.6)
    return matches[0] if matches else None

async def filter_source_urls(template_file):
    """核心流程：获取所有源，匹配模板频道"""
    template_channels = parse_template(template_file)
    source_urls = config.source_urls
    cache = load_cache()

    # 计算当前源URL集合的哈希值（用于后续清理缓存）
    valid_source_hashes = {calculate_hash(url) for url in source_urls}

    all_channels = OrderedDict()
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_channels(session, url, cache, valid_source_hashes) for url in source_urls]
        fetched_channels_list = await asyncio.gather(*tasks)

    for fetched in fetched_channels_list:
        merge_channels(all_channels, fetched)

    matched_channels = match_channels(template_channels, all_channels)

    # 最终保存一次，清除所有过期或无效条目
    save_cache(cache, valid_hashes=valid_source_hashes)
    return matched_channels, template_channels, cache

def match_channels(template_channels, all_channels):
    """将模板频道与在线频道进行模糊匹配"""
    matched_channels = OrderedDict()

    # 收集所有在线频道名称（原始名）
    all_online_names = []
    for cat, chan_list in all_channels.items():
        for ch_name, _ in chan_list:
            all_online_names.append(ch_name)

    # 清洗后的名字用于匹配
    cleaned_online_names = [clean_channel_name(name) for name in all_online_names]

    for category, channel_list in template_channels.items():
        matched_channels[category] = OrderedDict()
        for template_name in channel_list:
            cleaned_template = clean_channel_name(template_name)
            similar = find_similar_name(cleaned_template, cleaned_online_names)
            if similar:
                # 反查原始名称
                original = next((name for name, cname in zip(all_online_names, cleaned_online_names) if cname == similar), None)
                if original:
                    for online_cat, online_list in all_channels.items():
                        for ch_name, ch_url in online_list:
                            if ch_name == original:
                                matched_channels[category].setdefault(template_name, []).append(ch_url)
    return matched_channels

def merge_channels(target, source):
    """合并频道字典"""
    for category, channel_list in source.items():
        if category in target:
            target[category].extend(channel_list)
        else:
            target[category] = channel_list

def is_ipv6(url):
    """判断是否为 IPv6 地址格式"""
    return re.match(r'^http:\/\/\[[0-9a-fA-F:]+\]', url) is not None

def updateChannelUrlsM3U(channels, template_channels, cache):
    """生成最终的 IPv4/IPv6 M3U 和 TXT 文件"""
    written_urls_ipv4 = set()
    written_urls_ipv6 = set()
    url_changes = {"added": [], "removed": [], "modified": []}

    # 检测URL变化（基于缓存中的历史数据）
    if is_cache_valid(cache):
        previous_urls = {}
        for entry in cache.get("urls", {}).values():
            for cat, chan_list in entry.get("channels", {}).items():
                for ch_name, url in chan_list:
                    previous_urls[url] = (cat, ch_name)

        current_urls = {}
        for category, chan_dict in channels.items():
            for ch_name, urls in chan_dict.items():
                for url in urls:
                    current_urls[url] = (category, ch_name)

        for url, (cat, name) in current_urls.items():
            if url not in previous_urls:
                url_changes["added"].append((cat, name, url))

        for url, (cat, name) in previous_urls.items():
            if url not in current_urls:
                url_changes["removed"].append((cat, name, url))

    # 更新公告中的日期占位符
    current_date = datetime.now().strftime("%Y-%m-%d")
    for group in config.announcements:
        for announcement in group['entries']:
            if announcement['name'] is None:
                announcement['name'] = current_date

    # 准备输出文件路径
    ipv4_m3u = os.path.join(output_folder, "live_ipv4.m3u")
    ipv4_txt = os.path.join(output_folder, "live_ipv4.txt")
    ipv6_m3u = os.path.join(output_folder, "live_ipv6.m3u")
    ipv6_txt = os.path.join(output_folder, "live_ipv6.txt")

    with open(ipv4_m3u, "w", encoding="utf-8") as f_m3u_v4, \
         open(ipv4_txt, "w", encoding="utf-8") as f_txt_v4, \
         open(ipv6_m3u, "w", encoding="utf-8") as f_m3u_v6, \
         open(ipv6_txt, "w", encoding="utf-8") as f_txt_v6:

        # 写入 M3U 头部
        epg_urls_str = ",".join(f'"{u}"' for u in config.epg_urls)
        f_m3u_v4.write(f"#EXTM3U x-tvg-url={epg_urls_str}\n")
        f_m3u_v6.write(f"#EXTM3U x-tvg-url={epg_urls_str}\n")

        # 写入公告频道
        for group in config.announcements:
            f_txt_v4.write(f"{group['channel']},#genre#\n")
            f_txt_v6.write(f"{group['channel']},#genre#\n")
            for entry in group['entries']:
                url = remove_unnecessary_params(entry['url'])
                if is_ipv6(url):
                    if url not in written_urls_ipv6 and is_valid_url(url):
                        written_urls_ipv6.add(url)
                        write_to_files(f_m3u_v6, f_txt_v6, group['channel'], entry['name'], 1, url)
                else:
                    if url not in written_urls_ipv4 and is_valid_url(url):
                        written_urls_ipv4.add(url)
                        write_to_files(f_m3u_v4, f_txt_v4, group['channel'], entry['name'], 1, url)

        # 按模板顺序写入匹配的频道
        for category, channel_list in template_channels.items():
            f_txt_v4.write(f"{category},#genre#\n")
            f_txt_v6.write(f"{category},#genre#\n")
            if category in channels:
                for ch_name in channel_list:
                    if ch_name in channels[category]:
                        sorted_v4 = []
                        sorted_v6 = []
                        for url in channels[category][ch_name]:
                            url = remove_unnecessary_params(url)
                            if is_ipv6(url):
                                if url not in written_urls_ipv6 and is_valid_url(url):
                                    sorted_v6.append(url)
                                    written_urls_ipv6.add(url)
                            else:
                                if url not in written_urls_ipv4 and is_valid_url(url):
                                    sorted_v4.append(url)
                                    written_urls_ipv4.add(url)

                        for idx, url in enumerate(sorted_v4, start=1):
                            new_url = add_url_suffix(url, idx, len(sorted_v4), "IPV4")
                            write_to_files(f_m3u_v4, f_txt_v4, category, ch_name, idx, new_url)

                        for idx, url in enumerate(sorted_v6, start=1):
                            new_url = add_url_suffix(url, idx, len(sorted_v6), "IPV6")
                            write_to_files(f_m3u_v6, f_txt_v6, category, ch_name, idx, new_url)

        # TXT 文件末尾换行
        f_txt_v4.write("\n")
        f_txt_v6.write("\n")

    # 记录URL变化日志
    if any(url_changes.values()):
        log_path = os.path.join(output_folder, "url_changes.log")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"\n=== 更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
            if url_changes["added"]:
                f.write("\n新增URL:\n")
                for cat, name, url in url_changes["added"]:
                    f.write(f"- {cat} - {name}: {url}\n")
            if url_changes["removed"]:
                f.write("\n移除URL:\n")
                for cat, name, url in url_changes["removed"]:
                    f.write(f"- {cat} - {name}: {url}\n")
            if url_changes["modified"]:
                f.write("\n修改URL:\n")
                for cat, name, old, new in url_changes["modified"]:
                    f.write(f"- {cat} - {name}: {old} → {new}\n")

def sort_and_filter_urls(urls, written_urls):
    """按 IP 优先级排序并过滤黑名单，此函数在原流程中未直接使用，但保留以备扩展"""
    filtered = [
        url for url in sorted(urls, key=lambda u: not is_ipv6(u) if config.ip_version_priority == "ipv6" else is_ipv6(u))
        if url and url not in written_urls and not any(bl in url for bl in config.url_blacklist) and is_valid_url(url)
    ]
    written_urls.update(filtered)
    return filtered

def add_url_suffix(url, index, total, ip_version):
    """为URL添加线路标识后缀"""
    suffix = f"${ip_version}" if total == 1 else f"${ip_version}•线路{index}"
    base = url.split('$', 1)[0] if '$' in url else url
    return f"{base}{suffix}"

def write_to_files(f_m3u, f_txt, category, channel_name, index, new_url):
    """写入M3U和TXT条目"""
    f_m3u.write(f'#EXTINF:-1 group-title="{category}",{channel_name}\n')
    f_m3u.write(new_url + "\n")
    f_txt.write(f"{channel_name},{new_url}\n")

if __name__ == "__main__":
    template_file = "demo.txt"
    try:
        if not os.path.exists(template_file):
            print(f"错误: 找不到模板文件 '{template_file}'。")
            print("请确保项目目录下有 demo.txt 文件。")
            print("示例内容如下:")
            print("""
# demo.txt 示例内容
央视,#genre#
CCTV-1
CCTV-2
卫视,#genre#
北京卫视
上海卫视
广东卫视
""")
            import sys
            sys.exit(1)

        loop = asyncio.get_event_loop()
        channels, template_channels, cache = loop.run_until_complete(filter_source_urls(template_file))
        updateChannelUrlsM3U(channels, template_channels, cache)
        loop.close()
        print("操作完成！结果已保存到live文件夹。")
    except Exception as e:
        print(f"执行过程中发生错误: {e}")
        logging.error(f"程序运行失败: {e}")
