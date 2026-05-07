import requests
from bs4 import BeautifulSoup
import sqlite3
import time
import random
import os
import json
import re
import threading
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed

# ===================== 配置 =====================
SAVE_DIR = "/storage/emulated/0/爬取保存/酷爱爬取"
DB_PATH = os.path.join(SAVE_DIR, "coolinet.db")
JSON_PATH = os.path.join(SAVE_DIR, "coolinet.json")
M3U_PATH = os.path.join(SAVE_DIR, "coolinet.m3u")

MAX_WORKERS = 5
MAX_RETRIES = 50
CONNECT_TIMEOUT = 30   # 连接超时
READ_TIMEOUT = 60      # 读取超时
PAGE_SLEEP = (0.5, 1.5)
DETAIL_SLEEP = (0.3, 0.8)

db_lock = threading.Lock()
json_lock = threading.Lock()
m3u_lock = threading.Lock()

class CoolinetSpider:
    def __init__(self):
        self.site_url = "https://www.coolinet.net"
        self.session = requests.Session()
        # 加上这两行，让请求走本地代理
        self.session.proxies = {
        'http': 'http://127.0.0.1:7890',
        'https': 'http://127.0.0.1:7890'
    }

        self.session.headers.update({
        # ... 后面不用改
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Connection': 'keep-alive',
            'Referer': self.site_url
        })
        self.categories = {
            'chinese-subtitle': '中文字幕',
            'asia-video': '亚洲视频',
            'eu-us-movie': '欧美电影',
            '%e4%ba%9e%e6%b4%b2%e8%87%aa%e6%8b%8d%e5%81%b7%e6%8b%8d': '亚洲自拍偷拍',
            'eu-us-self': '欧美自拍'
        }
        os.makedirs(SAVE_DIR, exist_ok=True)
        self._init_db()
        self.all_videos = []
        self.total_saved = 0

    def _init_db(self):
        conn = sqlite3.connect(DB_PATH)
        conn.execute('''CREATE TABLE IF NOT EXISTS videos (
            vod_id TEXT PRIMARY KEY,
            vod_name TEXT,
            vod_pic TEXT,
            vod_actor TEXT,
            vod_director TEXT,
            vod_remarks TEXT,
            vod_pubdate TEXT,
            vod_area TEXT,
            vod_year TEXT,
            vod_tags TEXT,
            vod_content TEXT,
            vod_play_from TEXT,
            vod_play_url TEXT,
            type_name TEXT
        )''')
        conn.commit()
        conn.close()

    def fetch(self, url, retries=MAX_RETRIES, extra_headers=None):
        headers = self.session.headers.copy()
        if extra_headers:
            headers.update(extra_headers)
        for i in range(retries):
            try:
                res = self.session.get(url, headers=headers,
                                       timeout=(CONNECT_TIMEOUT, READ_TIMEOUT))
                res.encoding = 'utf-8'
                if res.status_code == 200:
                    return res.text
                elif res.status_code == 404:
                    return None
                elif res.status_code == 429:
                    # 被限流，多等一会儿
                    print("请求过于频繁，等待 60 秒...")
                    time.sleep(60)
                else:
                    print(f"请求状态码异常: {res.status_code}，重试 {i+1}/{retries}")
                    time.sleep(10)
            except requests.exceptions.ConnectTimeout:
                print(f"连接超时 (重试 {i+1}/{retries})")
                time.sleep(20)
            except requests.exceptions.ReadTimeout:
                print(f"读取超时 (重试 {i+1}/{retries})")
                time.sleep(15)
            except Exception as e:
                print(f"请求失败 (重试 {i+1}/{retries})")
                time.sleep(30)
        return None

    def _page_exists(self, cate_id, page_num):
        if page_num == 1:
            url = f"{self.site_url}/category/{cate_id}/"
        else:
            url = f"{self.site_url}/category/{cate_id}/page/{page_num}/"
        html = self.fetch(url)
        if html is None:
            return False
        return 'videoPost' in html

    def get_max_page(self, cate_id):
        if not self._page_exists(cate_id, 1):
            return 0
        high = 1
        while high < 10000:
            next_high = high * 2
            if self._page_exists(cate_id, next_high):
                high = next_high
            else:
                break
        else:
            return 10000
        low = high
        high = high * 2
        while low + 1 < high:
            mid = (low + high) // 2
            if self._page_exists(cate_id, mid):
                low = mid
            else:
                high = mid
        return low

    def extract_links_from_soup(self, soup, referer_url=''):
        links = set()
        for tag in soup.select('video source[src], video[src], source[type*="mpegurl"], source[type*="mp4"]'):
            src = tag.get('src')
            if src:
                links.add(urljoin(referer_url, src))
        for tag in soup.select('[data-url], [data-src], [data-link]'):
            for attr in ['data-url', 'data-src', 'data-link', 'src']:
                val = tag.get(attr)
                if val and ('.m3u8' in val or '.mp4' in val):
                    links.add(urljoin(referer_url, val))
        for s in soup.find_all('script'):
            if s.string:
                found = re.findall(r'(https?://[^\s"\'<>\]]+\.(?:m3u8|mp4)[^\s"\'<>\]]*)', s.string)
                for u in found:
                    u = re.sub(r'["\'\s\\,;].*$', '', u)
                    links.add(u)
                extra = re.findall(r'(https?://[^\s"\'<>\]]*yocoolnet\.in[^\s"\'<>\]]*\.(?:m3u8|mp4)[^\s"\'<>\]]*)', s.string)
                for u in extra:
                    u = re.sub(r'["\'\s\\,;].*$', '', u)
                    links.add(u)
        all_text = soup.get_text()
        for u in re.findall(r'(https?://[^\s"\'<>\]]*yocoolnet\.in[^\s"\'<>\]]*\.(?:m3u8|mp4)[^\s"\'<>\]]*)', all_text):
            u = u.strip("'\"")
            links.add(u)
        valid = set()
        for link in links:
            if link.startswith('http') and ('.m3u8' in link or '.mp4' in link):
                valid.add(link)
        return valid

    def fetch_detail(self, detail_url, cate_name=''):
        html = self.fetch(detail_url)
        if not html:
            return {}
        soup = BeautifulSoup(html, 'html.parser')
        info = {
            'vod_actor': '', 'vod_director': '', 'vod_remarks': '',
            'vod_pubdate': '', 'vod_area': '', 'vod_year': '',
            'vod_tags': [], 'vod_content': '',
            'vod_play_from': '', 'vod_play_url': '', 'type_name': '成人影片'
        }
        try:
            actor_tag = soup.select_one('.actor, .starring, [itemprop="actor"]')
            if actor_tag: info['vod_actor'] = actor_tag.get_text(strip=True)
            director_tag = soup.select_one('.director, [itemprop="director"]')
            if director_tag: info['vod_director'] = director_tag.get_text(strip=True)
            remark_tag = soup.select_one('.remarks, .score, .quality')
            if remark_tag: info['vod_remarks'] = remark_tag.get_text(strip=True)
            date_tag = soup.select_one('.date, [itemprop="datePublished"]')
            if date_tag:
                date_text = date_tag.get_text(strip=True)
                info['vod_pubdate'] = date_text
                m = re.search(r'(\d{4})', date_text)
                if m: info['vod_year'] = m.group(1)
            area_tag = soup.select_one('.area, .region')
            if area_tag: info['vod_area'] = area_tag.get_text(strip=True)
            tag_elems = soup.select('.tags a, .keywords a, .video-tags a')
            if tag_elems: info['vod_tags'] = [t.get_text(strip=True) for t in tag_elems]
            content_tag = soup.select_one('.description, .content, [itemprop="description"]')
            if content_tag: info['vod_content'] = str(content_tag)
            play_from_tag = soup.select_one('.playfrom, [data-playfrom], .source-name')
            if play_from_tag: info['vod_play_from'] = play_from_tag.get_text(strip=True)

            all_links = self.extract_links_from_soup(soup, detail_url)

            iframe_tags = soup.find_all('iframe')
            for iframe in iframe_tags:
                src = iframe.get('src')
                if not src:
                    continue
                full_url = urljoin(detail_url, src)
                print("    检测到嵌入播放器，正在解析...")
                embed_html = self.fetch(full_url, extra_headers={'Referer': detail_url})
                if embed_html:
                    embed_soup = BeautifulSoup(embed_html, 'html.parser')
                    embed_links = self.extract_links_from_soup(embed_soup, full_url)
                    all_links.update(embed_links)
                time.sleep(0.5)

            if all_links:
                unique_links = list(dict.fromkeys(all_links))
                play_from = info['vod_play_from'] if info['vod_play_from'] else '高清'
                info['vod_play_url'] = f"{play_from}${unique_links[0]}"
                for extra in unique_links[1:]:
                    info['vod_play_url'] += f"${extra}"
                print(f"    ✓ 成功提取 {len(unique_links)} 个视频链接")
            else:
                info['vod_play_url'] = ''
                print("    ⚠ 未提取到视频链接")

        except Exception as e:
            print(f"解析详情页出错: {e}")
        return info

    def save_one(self, video):
        with db_lock:
            conn = sqlite3.connect(DB_PATH)
            conn.execute('''INSERT OR IGNORE INTO videos 
                (vod_id, vod_name, vod_pic, vod_actor, vod_director, vod_remarks,
                 vod_pubdate, vod_area, vod_year, vod_tags, vod_content,
                 vod_play_from, vod_play_url, type_name)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                (video['vod_id'], video['vod_name'], video['vod_pic'],
                 video['vod_actor'], video['vod_director'], video['vod_remarks'],
                 video['vod_pubdate'], video['vod_area'], video['vod_year'],
                 json.dumps(video['vod_tags'], ensure_ascii=False),
                 video['vod_content'], video['vod_play_from'],
                 video['vod_play_url'], video['type_name']))
            conn.commit()
            conn.close()

        with json_lock:
            self.all_videos.append(video)
            self.total_saved += 1
            with open(JSON_PATH, 'w', encoding='utf-8') as f:
                json.dump({"list": self.all_videos}, f, ensure_ascii=False, indent=2)

        if video['vod_play_url']:
            first_url = video['vod_play_url'].split('$')[0]
            if '.m3u8' in first_url or '.mp4' in first_url:
                with m3u_lock:
                    m3u_exists = os.path.exists(M3U_PATH)
                    with open(M3U_PATH, 'a', encoding='utf-8') as f:
                        if not m3u_exists:
                            f.write("#EXTM3U\n")
                        f.write(f"#EXTINF:-1, {video['vod_name']}\n")
                        f.write(f"{first_url}\n")

    def process_page(self, cate_name, page_url):
        html = self.fetch(page_url)
        if not html:
            return 0
        soup = BeautifulSoup(html, 'html.parser')
        items = soup.select('.videoPost')
        if not items:
            return 0

        def process_one(node):
            a = node.select_one('a.videoLink')
            if not a: return
            vod_id = a.get('href')
            vod_name = a.get('title', '')
            img = node.select_one('img')
            vod_pic = img.get('src') if img else ""
            views_span = node.select_one('.thumbViews')
            remark_text = views_span.text.strip() if views_span else ""

            print(f"  [{cate_name}] 处理: {vod_name}")
            detail_url = urljoin(page_url, vod_id)
            detail = self.fetch_detail(detail_url, cate_name)

            video = {
                'vod_id': vod_id,
                'vod_name': vod_name,
                'vod_pic': vod_pic,
                'vod_actor': detail.get('vod_actor', ''),
                'vod_director': detail.get('vod_director', ''),
                'vod_remarks': detail.get('vod_remarks', remark_text),
                'vod_pubdate': detail.get('vod_pubdate', ''),
                'vod_area': detail.get('vod_area', ''),
                'vod_year': detail.get('vod_year', ''),
                'vod_tags': detail.get('vod_tags', []),
                'vod_content': detail.get('vod_content', ''),
                'vod_play_from': detail.get('vod_play_from', ''),
                'vod_play_url': detail.get('vod_play_url', ''),
                'type_name': detail.get('type_name', '')
            }
            self.save_one(video)
            time.sleep(random.uniform(*DETAIL_SLEEP))

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [executor.submit(process_one, node) for node in items]
            for f in as_completed(futures):
                f.result()
        return len(items)

    def scan_category(self, cate_id, cate_name):
        print(f">>> 正在扫库分类: {cate_name}")
        max_page = self.get_max_page(cate_id)
        if max_page == 0:
            print(f"  分类 {cate_name} 首页无法访问，跳过")
            return
        print(f"  检测到总页数: {max_page}")

        page_urls = []
        for pg in range(1, max_page + 1):
            url = f"{self.site_url}/category/{cate_id}/" if pg == 1 else f"{self.site_url}/category/{cate_id}/page/{pg}/"
            page_urls.append((pg, url))

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_page = {
                executor.submit(self.process_page, cate_name, url): (pg, url)
                for pg, url in page_urls
            }
            for future in as_completed(future_to_page):
                pg, url = future_to_page[future]
                try:
                    count = future.result()
                    print(f"  分类 {cate_name} 页面 {pg} 完成，获取 {count} 条" if count else f"  分类 {cate_name} 页面 {pg} 无数据")
                except Exception as e:
                    print(f"  分类 {cate_name} 页面 {pg} 异常: {e}")
                time.sleep(random.uniform(*PAGE_SLEEP))

    def scan_all(self):
        for cate_id, cate_name in self.categories.items():
            self.scan_category(cate_id, cate_name)
        print(f"\n===== 全站扫描完成，共 {self.total_saved} 条记录 =====")

if __name__ == '__main__':
    spider = CoolinetSpider()
    spider.scan_all()