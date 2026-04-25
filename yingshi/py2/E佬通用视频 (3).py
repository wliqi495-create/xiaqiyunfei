import json
import re
import sys
import hashlib
import time
from base64 import b64decode, b64encode
from urllib.parse import urlparse, urljoin, urlencode, quote

import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
from pyquery import PyQuery as pq

sys.path.append('..')
from base.spider import Spider as BaseSpider

# 图片缓存，避免重复解密
img_cache = {}

class Spider(BaseSpider):

    def init(self, extend=""):
        """初始化，支持 extend='{"host":"https://example.com", "proxies":{...}}'"""
        try:
            cfg = json.loads(extend) if isinstance(extend, str) else extend or {}
            self.proxies = cfg.get('proxies', {})
            self.host = (cfg.get('host', '') or '').strip()
            if not self.host:
                self.host = self.get_working_host()
        except:
            self.proxies = {}
            self.host = self.get_working_host()
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        }
        self.headers.update({'Origin': self.host, 'Referer': f"{self.host}/"})
        print(f"[Spider] 使用站点: {self.host}")

    def getName(self):
        return "🌈 通用视频解析器|Pro增强版"

    def isVideoFormat(self, url):
        return any(ext in (url or '').lower() for ext in ['.m3u8', '.mp4', '.ts', '.flv', '.mkv', '.avi', '.webm'])

    def manualVideoCheck(self):
        return False

    def destroy(self):
        global img_cache
        img_cache.clear()

    def get_working_host(self):
        """尝试多个host，找到可用的"""
        dynamic_urls = [
            'https://wanwuu.com/'
        ]
        for url in dynamic_urls:
            try:
                response = requests.get(url, headers=self.headers, proxies=self.proxies, timeout=3)
                if response.status_code == 200:
                    print(f"[Spider] 检测到可用host: {url}")
                    return url.rstrip('/')
            except Exception as e:
                continue
        return dynamic_urls[0].rstrip('/') if dynamic_urls else 'https://jszyapi.com'

    def homeContent(self, filter):
        """首页：动态分类 + 视频列表 + filters"""
        try:
            response = requests.get(self.host, headers=self.headers, proxies=self.proxies, timeout=10)
            if response.status_code != 200:
                return {'class': [], 'filters': {}, 'list': []}
            
            response.encoding = response.apparent_encoding
            data = self.getpq(response.text)
            
            classes = []
            # 多选择器：导航链接
            nav_items = data('nav a, .menu a, .nav a, #header a, .header a, ul.navbar-nav a, .category-list a, .scroll-content a, .module-menu a, .module-tab-item')
            seen_hrefs = set()
            bad_words = ['登录', '注册', '搜索', '首页', 'Home', 'Login', 'Search', '联系', '关于', '留言', 'RSS', '推特', 'TG', 'Q群', '合作', '公告', 'APP', '下载']
            
            for k in nav_items.items():
                href = (k.attr('href') or '').strip()
                name = k.text().strip()
                if not href or href in ['#', '/', ''] or 'javascript' in href:
                    continue
                if not name or len(name) < 2 or len(name) > 12:
                    continue
                if any(bw in name for bw in bad_words):
                    continue
                if href in seen_hrefs:
                    continue
                
                # 规范化href
                if not href.startswith('http'):
                    href = urljoin(self.host, href)
                
                classes.append({'type_name': name, 'type_id': href})
                seen_hrefs.add(href)
                if len(classes) >= 25:
                    break
            
            if not classes:
                classes = [
                    {'type_name': '最新', 'type_id': '/latest/'},
                    {'type_name': '热门', 'type_id': '/hot/'},
                    {'type_name': '推荐', 'type_id': '/recommend/'}
                ]
            
            # 视频列表
            videos = self.getlist(data, '#content article, #main article, .posts article, .container .row article, article, .video-list .video-item, .module-poster-item, .avdata-outer, .search-result, .card')
            
            # filters
            filters = {
                'class': [{'n': '全部', 'v': ''}, {'n': '高清', 'v': 'HD'}, {'n': '4K', 'v': '4K'}],
                'area': [{'n': '全部', 'v': ''}, {'n': '日本', 'v': 'jp'}, {'n': '欧美', 'v': 'us'}, {'n': '国产', 'v': 'cn'}],
                'year': [{'n': '全部', 'v': ''}, {'n': '2024', 'v': '2024'}, {'n': '2023', 'v': '2023'}, {'n': '2022', 'v': '2022'}],
                'lang': [{'n': '全部', 'v': ''}, {'n': '中文', 'v': 'zh'}, {'n': '日语', 'v': 'jp'}, {'n': '英文', 'v': 'en'}]
            }
            
            return {'class': classes, 'filters': filters, 'list': videos}
        except Exception as e:
            print(f"[homeContent] Error: {e}")
            return {'class': [], 'filters': {}, 'list': []}

    def homeVideoContent(self):
        """首页视频内容 (复用homeContent)"""
        res = self.homeContent(None)
        return {'list': res.get('list', [])}

    def categoryContent(self, tid, pg, filter, extend):
        """分类内容"""
        try:
            if '@folder' in tid:
                v = self.getfod(tid.replace('@folder', ''))
                return {'list': v, 'page': 1, 'pagecount': 1, 'limit': 90, 'total': len(v)}
            
            pg = int(pg) if pg else 1
            url = tid if tid.startswith('http') else f"{self.host}{tid if tid.startswith('/') else '/' + tid}"
            url = url.rstrip('/')
            
            # 构造分页URL
            real_url = f"{url}/" if pg == 1 else f"{url}/{pg}/"
            if '?page=' in url or '?pg=' in url:
                real_url = url.replace('{pg}', str(pg))
            
            # extend参数添加filter
            if isinstance(extend, dict):
                params = []
                for key in ['class', 'area', 'year', 'lang', 'letter', 'by']:
                    if extend.get(key):
                        params.append(f"{key}={quote(str(extend[key]))}")
                if params:
                    sep = '&' if '?' in real_url else '?'
                    real_url = real_url + sep + '&'.join(params)
            
            print(f"[categoryContent] 请求URL: {real_url}")
            response = requests.get(real_url, headers=self.headers, proxies=self.proxies, timeout=10)
            if response.status_code != 200:
                return {'list': [], 'page': pg, 'pagecount': 9999, 'limit': 90, 'total': 0}
            
            response.encoding = response.apparent_encoding
            data = self.getpq(response.text)
            
            # 【关键修复】分类页面用更全面的选择器
            videos = self.getlist(
                data, 
                '.module-item, .module-poster-item, .video-item, article, .card, li.vodlist_item, .stui-vodlist__box, a.module-item-pic, .myui-vodlist__box',
                tid
            )
            
            print(f"[categoryContent] 提取到 {len(videos)} 个视频")
            return {'list': videos, 'page': pg, 'pagecount': 9999, 'limit': 90, 'total': 999999}
        except Exception as e:
            print(f"[categoryContent] Error: {e}")
            import traceback
            traceback.print_exc()
            return {'list': [], 'page': pg, 'pagecount': 9999, 'limit': 90, 'total': 0}

    def detailContent(self, ids):
        """详情页：提取视频源（增强版）"""
        try:
            url = ids[0] if ids[0].startswith('http') else f"{self.host}{ids[0]}"
            response = requests.get(url, headers=self.headers, proxies=self.proxies, timeout=10)
            response.encoding = response.apparent_encoding
            html_text = response.text
            data = self.getpq(html_text)
            
            plist = []
            unique_urls = set()

            def add_play_url(name, u):
                if not u or u in unique_urls:
                    return
                if not u.startswith('http'):
                    u = urljoin(self.host, u)
                unique_urls.add(u)
                plist.append(f"{name}${u}")

            # 1. Script 中的 m3u8/mp4 (优先级最高)
            scripts = data('script')
            for s in scripts.items():
                txt = s.text()
                if 'url' in txt and ('.m3u8' in txt or '.mp4' in txt):
                    urls = re.findall(r'["\']+(http[^"\']+\.(?:m3u8|mp4)[^\'"]*)["\']', txt)
                    for u in urls:
                        add_play_url("脚本源", u)
                        break

            # 2. DPlayer 配置
            if data('.dplayer'):
                for c, k in enumerate(data('.dplayer').items(), start=1):
                    config_attr = k.attr('data-config')
                    if config_attr:
                        try:
                            config = json.loads(config_attr)
                            video_url = config.get('video', {}).get('url', '')
                            if video_url:
                                add_play_url(f"DPlayer{c}", video_url)
                        except:
                            pass

            # 3. Video 标签 (HTML5)
            for v in data('video').items():
                src = v.attr('src')
                if src:
                    add_play_url("HTML5视频", src)
                for src_tag in v('source').items():
                    add_play_url("HTML5源", src_tag.attr('src'))

            # 4. Iframe 嗅探
            for iframe in data('iframe').items():
                src = iframe.attr('src') or iframe.attr('data-src')
                if src and any(x in src for x in ['.m3u8', '.mp4', 'upload', 'cloud', 'player', 'embed']):
                    if not any(x in src for x in ['google', 'facebook', 'disqus']):
                        add_play_url("Iframe源", src)

            # 5. 通用变量/JSON 正则 (核心增强)
            common_patterns = [
                r'var\s+main\s*=\s*["\']([^"\']+)["\']',
                r'url\s*:\s*["\']([^"\']+\.(?:m3u8|mp4))["\']',
                r'vurl\s*=\s*["\']([^"\']+)["\']',
                r'vid\s*:\s*["\']([^"\']+\.(?:m3u8|mp4))["\']',
                r'"url"\s*:\s*"([^"]+)"',
                r'video_url\s*=\s*[\'"]([^\'"]+)[\'"]',
                r'var\s+videoUrl\s*=\s*["\']([^"\']+)["\']',
                r'playurl\s*=\s*["\']([^"\']+)["\']',
                r'"playUrl"\s*:\s*"([^"]+)"',
                r'src="([^"]*\.(?:m3u8|mp4)[^"]*)"',
                r'data-src="([^"]*\.(?:m3u8|mp4)[^"]*)"',
                r'mp4Url\s*=\s*["\']([^"\']+)["\']',
                r'm3u8Url\s*=\s*["\']([^"\']+)["\']',
            ]
            for pat in common_patterns:
                matches = re.finditer(pat, html_text, re.IGNORECASE)
                for match in matches:
                    u = match.group(1)
                    if any(ext in u for ext in ['.m3u8', '.mp4', '.flv', '.m4v']):
                        add_play_url("正则源", u)

            # 6. Script JSON embed (ThePorn/porn87风格)
            try:
                json_matches = re.findall(r'<script[^>]*type="text/javascript"[^>]*>(.*?)</script>', html_text, re.DOTALL)
                for json_str in json_matches:
                    try:
                        obj = json.loads(json_str)
                        if isinstance(obj, dict):
                            for k, v in obj.items():
                                if isinstance(v, str) and ('.m3u8' in v or '.mp4' in v):
                                    add_play_url(f"JSON-{k}", v)
                    except:
                        pass
            except:
                pass

            # 7. 兜底：文本链接
            if not plist:
                content_area = data('.post-content, article, .content, .video-info, .module-info-introduction')
                for i, link in enumerate(content_area('a').items(), start=1):
                    link_text = link.text().strip()
                    link_href = link.attr('href')
                    if link_href and any(kw in link_text for kw in ['点击观看', '观看', '播放', '视频', '第一弹', '线路', 'Play', '播放器']):
                        ep_name = link_text.replace('点击观看：', '').replace('点击观看', '').strip()
                        if not ep_name:
                            ep_name = f"线路{i}"
                        add_play_url(ep_name, link_href)

            play_url = '#'.join(plist) if plist else f"无视频源，请尝试网页播放${url}"
            
            # 标题
            vod_title = data('h1').text().strip()
            if not vod_title:
                vod_title = data('.post-title, .module-info-heading, .video-title').text().strip()
            if not vod_title:
                vod_title = data('title').text().split('|')[0].strip()
            
            # 描述
            vod_content = data('.post-content, article, .module-info-introduction-content, .video-desc').text().strip()
            
            return {'list': [{'vod_play_from': '通用解析', 'vod_play_url': play_url, 'vod_content': vod_content or vod_title}]}
        except Exception as e:
            print(f"[detailContent] Error: {e}")
            import traceback
            traceback.print_exc()
            return {'list': [{'vod_play_from': '通用解析', 'vod_play_url': '获取失败'}]}

    def searchContent(self, key, quick, pg="1"):
        """搜索"""
        try:
            pg = int(pg) if pg else 1
            url = f"{self.host}/?s={quote(key)}"
            response = requests.get(url, headers=self.headers, proxies=self.proxies, timeout=10)
            response.encoding = response.apparent_encoding
            data = self.getpq(response.text)
            videos = self.getlist(data, 'article, .search-result, .post, .video-item, .module-poster-item, .avdata-outer, .card, .module-item')
            return {'list': videos, 'page': pg, 'pagecount': 9999}
        except Exception as e:
            print(f"[searchContent] Error: {e}")
            return {'list': [], 'page': pg, 'pagecount': 9999}

    def playerContent(self, flag, id, vipFlags):
        """播放器"""
        if 'html' in id or 'php' in id or 'embed' in id or 'player' in id:
            parse = 1  # 需要解析
        elif self.isVideoFormat(id):
            parse = 0  # 直接播放
        else:
            parse = 1
        
        url = self.proxy(id) if '.m3u8' in id else id
        return {'parse': parse, 'url': url, 'header': self.headers}

    def localProxy(self, param):
        """本地代理：处理m3u8/ts/图片解密"""
        try:
            type_ = param.get('type')
            url = param.get('url')
            
            if type_ == 'cache':
                key = param.get('key')
                if content := img_cache.get(key):
                    return [200, 'image/jpeg', content]
                return [404, 'text/plain', b'Expired']
            
            elif type_ == 'img':
                real_url = self.d64(url) if not url.startswith('http') else url
                res = requests.get(real_url, headers=self.headers, proxies=self.proxies, timeout=10)
                content = self.aesimg(res.content)
                return [200, 'image/jpeg', content]
            
            elif type_ == 'm3u8':
                return self.m3Proxy(url)
            
            else:  # ts
                return self.tsProxy(url)
        except Exception as e:
            print(f"[localProxy] Error: {e}")
            return [404, 'text/plain', b'']

    def proxy(self, data, type='m3u8'):
        """生成代理URL"""
        if data and self.proxies:
            return f"{self.getProxyUrl()}&url={self.e64(data)}&type={type}"
        return data

    def m3Proxy(self, url):
        """m3u8代理"""
        try:
            url = self.d64(url)
            res = requests.get(url, headers=self.headers, proxies=self.proxies, timeout=10)
            res.encoding = res.apparent_encoding
            data = res.text
            base = res.url.rsplit('/', 1)[0]
            lines = []
            
            for line in data.split('\n'):
                if '#EXT' not in line and line.strip():
                    if not line.startswith('http'):
                        if line.startswith('/'):
                            host_base = '/'.join(res.url.split('/')[:3])
                            line = f"{host_base}{line}"
                        else:
                            line = f"{base}/{line}"
                    lines.append(self.proxy(line, 'ts'))
                else:
                    lines.append(line)
            
            return [200, "application/vnd.apple.mpegurl", '\n'.join(lines)]
        except Exception as e:
            print(f"[m3Proxy] Error: {e}")
            return [404, 'text/plain', b'']

    def tsProxy(self, url):
        """ts代理"""
        try:
            content = requests.get(self.d64(url), headers=self.headers, proxies=self.proxies, timeout=10).content
            return [200, 'video/mp2t', content]
        except:
            return [404, 'text/plain', b'']

    def e64(self, text):
        """base64编码"""
        return b64encode(str(text).encode()).decode()

    def d64(self, text):
        """base64解码"""
        return b64decode(str(text).encode()).decode()

    def aesimg(self, data):
        """AES解密图片"""
        if len(data) < 16:
            return data
        
        # 多密钥尝试 (从成品提取)
        keys = [
            (b'f5d965df75336270', b'97b60394abc2fbe1'),
            (b'75336270f5d965df', b'abc2fbe197b60394'),
        ]
        
        for k, v in keys:
            try:
                dec = unpad(AES.new(k, AES.MODE_CBC, v).decrypt(data), 16)
                if dec.startswith(b'\xff\xd8') or dec.startswith(b'\x89PNG') or dec.startswith(b'GIF8'):
                    return dec
            except:
                pass
            try:
                dec = unpad(AES.new(k, AES.MODE_ECB).decrypt(data), 16)
                if dec.startswith(b'\xff\xd8'):
                    return dec
            except:
                pass
        
        return data

    def getlist(self, data_pq, selector, tid=''):
        """解析视频列表"""
        videos = []
        is_folder = '/mrdg' in (tid or '')
        
        items = data_pq(selector)
        if len(items) == 0:
            items = data_pq('a:has(img)')
        
        print(f"[getlist] 找到 {len(items)} 个候选项")
        
        seen_ids = set()
        ad_keywords = ['娱乐', '棋牌', '澳门', '葡京', '太阳城', '彩票', 'AV', '直播', '充值', '下载', '回家']

        for k in items.items():
            # 【关键修复】更灵活的链接提取
            if k.is_('a'):
                a = k
                container = k.parent()
            else:
                # 优先查找带href的a标签
                a = k('a[href]').eq(0)
                if not a or not a.attr('href'):
                    a = k('a').eq(0)
                container = k

            href = a.attr('href')
            if not href:
                continue
            
            if any(x in href for x in ['/category/', '/tag/', '/feed/', '/page/', '/author/', 'gitlub']):
                continue
            if href in ['/', '#']:
                continue

            # 【优化】标题提取
            title = container.find('h2, h3, h4, .title, .video-title, .module-poster-item-title, .module-item-title').text()
            if not title:
                title = a.attr('title') or a.attr('data-title')
            if not title:
                title = a.find('img').attr('alt')
            if not title:
                title = container.find('.video-name, .vodlist_title').text()
            if not title:
                title = a.text()
            
            if not title or len(title.strip()) < 2:
                continue
            if any(ad in title for ad in ad_keywords):
                continue

            card_html = k.outer_html() if hasattr(k, 'outer_html') else str(k)
            script_text = k('script').text()
            img = self.getimg(script_text, k, card_html)
            
            if not img:
                continue
            if '.gif' in img.lower():
                continue
            
            if href in seen_ids:
                continue
            
            if not href.startswith('http'):
                href = urljoin(self.host, href)
            
            seen_ids.add(href)
            remark = container.find('time, .date, .meta, .views, .video-duration, .module-item-note, .pic-text').text() or ''

            videos.append({
                'vod_id': f"{href}{'@folder' if is_folder else ''}",
                'vod_name': title.strip(),
                'vod_pic': img,
                'vod_remarks': remark,
                'vod_tag': 'folder' if is_folder else '',
                'style': {"type": "rect", "ratio": 1.33}
            })
        
        return videos

    def getimg(self, text, elem=None, html_content=None):
        """提取图片URL"""
        # 1. var img_url (吃瓜网特色)
        if m := re.search(r'var\s+img_url\s*=\s*[\'"]([^\'"]+)[\'"]', text or ''):
            return self._proc_url(m.group(1))
        
        # 2. loadBannerDirect
        if m := re.search(r"loadBannerDirect\('([^']+)'", text or ''):
            return self._proc_url(m.group(1))
        
        if html_content is None and elem is not None:
            html_content = elem.outer_html() if hasattr(elem, 'outer_html') else str(elem)
        if not html_content:
            return ''

        html_content = html_content.replace('&quot;', '"').replace('&apos;', "'").replace('&amp;', '&')

        # 3. data-src / data-original
        if m := re.search(r'data-src\s*=\s*["\']([^"\']+)["\']', html_content, re.I):
            return self._proc_url(m.group(1))
        if m := re.search(r'data-original\s*=\s*["\']([^"\']+)["\']', html_content, re.I):
            return self._proc_url(m.group(1))

        # 4. http链接
        if m := re.search(r'(https?://[^"\'\s)]+\.(?:jpg|png|jpeg|webp|gif))', html_content, re.I):
            return self._proc_url(m.group(1))

        # 5. url()
        if 'url(' in html_content:
            m = re.search(r'url\s*\(\s*[\'"]?([^\"\'\)]+)[\'"]?\s*\)', html_content, re.I)
            if m:
                return self._proc_url(m.group(1))
        
        # 6. src属性
        if m := re.search(r'src\s*=\s*["\']([^"\']+\.(?:jpg|png|jpeg|webp|gif))["\']', html_content, re.I):
            return self._proc_url(m.group(1))
        
        return ''

    def _proc_url(self, url):
        """处理URL：转义、代理、AES"""
        if not url:
            return ''
        url = url.strip('\'" ')
        
        if url.startswith('data:'):
            try:
                _, b64_str = url.split(',', 1)
                raw = b64decode(b64_str)
                if not (raw.startswith(b'\xff\xd8') or raw.startswith(b'\x89PNG') or raw.startswith(b'GIF8')):
                    raw = self.aesimg(raw)
                key = hashlib.md5(raw).hexdigest()
                img_cache[key] = raw
                return f"{self.getProxyUrl()}&type=cache&key={key}"
            except:
                return ""
        
        if not url.startswith('http'):
            url = urljoin(self.host, url)
        
        # 所有图片走代理解密
        return f"{self.getProxyUrl()}&url={self.e64(url)}&type=img"

    def getfod(self, id):
        """文件夹处理"""
        return []

    def getpq(self, data):
        """获取pq对象"""
        try:
            return pq(data)
        except:
            return pq(data.encode('utf-8'))
