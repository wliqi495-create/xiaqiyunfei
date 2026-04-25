# -*- coding: utf-8 -*-
import re
import urllib.parse
import requests
from base64 import b64encode

# 尝试导入 Crypto 库，防止环境缺失报错
try:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad
    HAS_CRYPTO = True
except ImportError:
    HAS_CRYPTO = False

class Spider:
    def __init__(self):
        self.name = '玩物社区'
        self.host = 'https://wanwuu.com/'
        self.default_pic = 'https://via.placeholder.com/400x225?text=Video'
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S901U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Referer': self.host,
        }
        self.classes = []
        category_str = "国产SM$guochan-sm#日韩SM$rihan-sm#欧美SM$oumei-sm#直播回放$zhibo-huifang#SM小说$novels/new#玩物社区$posts/all"
        for item in category_str.split('#'):
            if '$' in item:
                name, path = item.split('$')
                self.classes.append({"type_name": name, "type_id": path})

    # --- 集成 demo.py 的 AES 解密逻辑 ---
    def _decrypt_pic(self, img_url):
        """
        下载并解密加密图片，返回 base64 格式直接显示
        """
        if not HAS_CRYPTO:
            return img_url # 如果没有加密库，直接返回原链接
            
        try:
            # demo.py 中的特定 headers
            img_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.55 Safari/537.36',
                'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="141", "Google Chrome";v="141"',
                'Origin': 'https://xgne8.dyxobic.cc',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            }
            
            # 下载图片二进制数据
            response = requests.get(img_url, headers=img_headers, timeout=5)
            if response.status_code != 200:
                return self.default_pic

            # AES 解密配置
            key = b"f5d965df75336270"
            iv = b'97b60394abc2fbe1'
            cipher = AES.new(key, AES.MODE_CBC, iv)
            
            # 解密并去除填充
            pt = unpad(cipher.decrypt(response.content), AES.block_size)
            
            # 转 base64 字符串
            b64_code = b64encode(pt).decode()
            
            # 拼接成 HTML 可识别的 data URI
            return f"data:image/jpeg;base64,{b64_code}"
        except Exception as e:
            print(f"解密图片失败: {e}")
            return self.default_pic

    # 框架接口
    def getDependence(self): return []
    def init(self, extend=""): pass
    def isVideoFormat(self, url): return False
    def manualVideoCheck(self): pass
    def getName(self): return self.name
    def homeContent(self, filter): return {"class": self.classes}
    def homeVideoContent(self): return self.categoryContent("guochan-sm", "1", False, {})

    # 列表解析
    def _parse_videos(self, html):
        """提取视频列表，优先使用 data-src 懒加载图片"""
        videos = []
        pattern = r'<div class="video-item"[^>]*>(.*?)</div>\s*</div>'
        
        for block in re.findall(pattern, html, re.S):
            # 链接
            href_match = re.search(r'href="([^"]+)"', block)
            if not href_match or '/videos/' not in href_match.group(1):
                continue
            href = href_match.group(1)
            
            # 标题
            title = ""
            for t_pattern in [r'alt="([^"]+)"', r'title="([^"]+)"', r'<a[^>]*>\s*([^<]+)\s*</a>']:
                t_match = re.search(t_pattern, block)
                if t_match:
                    title = t_match.group(1).strip()
                    break
            
            if not title:
                continue
            
            # 图片 - 优先懒加载属性
            pic = ""
            for p_pattern in [r'data-src="([^"]+)"', r'data-lazy-src="([^"]+)"', r'lazy-src="([^"]+)"', r'src="([^"]+)"']:
                p_match = re.search(p_pattern, block)
                if p_match:
                    pic_url = p_match.group(1)
                    if pic_url and 'blob:' not in pic_url and 'poster_loading' not in pic_url:
                        pic = pic_url
                        break
            
            # --- 处理解密逻辑 ---
            pic = self._abs(pic)
            if 'rulbbz.cn' in pic: # 识别到加密图床域名
                pic = self._decrypt_pic(pic)
            # ------------------

            # 时长
            remark = ""
            r_match = re.search(r'>(\d{1,2}:\d{2}(?::\d{2})?)<', block)
            if r_match:
                remark = r_match.group(1)
            
            videos.append({
                "vod_id": self._abs(href),
                "vod_name": self.clean_title(title),
                "vod_pic": pic if pic else self.default_pic,
                "vod_remarks": remark
            })
        
        return videos

    # 分类
    def categoryContent(self, tid, pg, filter, extend):
        try:
            pg = int(pg)
            if tid in ("novels/new", "posts/all"):
                url = f"{self.host}{tid}/page/{pg}/" if pg > 1 else f"{self.host}{tid}/"
            else:
                url = f"{self.host}videos/{tid}/page/{pg}/" if pg > 1 else f"{self.host}videos/{tid}/"
            
            r = requests.get(url, headers=self.headers, timeout=10)
            r.encoding = 'utf-8'
            videos = self._parse_videos(r.text)
            return self._page(videos, pg)
        except Exception as e:
            print(f"分类失败: {e}")
            return self._page([], pg)

    # 搜索
    def searchContent(self, key, quick, pg='1'):
        try:
            pg = int(pg)
            wd = urllib.parse.quote(key)
            url = f"{self.host}videos/search/{wd}/page/{pg}/" if pg > 1 else f"{self.host}videos/search/{wd}/"
            
            r = requests.get(url, headers=self.headers, timeout=10)
            r.encoding = 'utf-8'
            videos = self._parse_videos(r.text)
            return self._page(videos, pg)
        except Exception as e:
            print(f"搜索失败: {e}")
            return self._page([], pg)

    # 详情
    def detailContent(self, array):
        vid = array[0] if array[0].startswith('http') else self._abs(array[0])
        try:
            r = requests.get(vid, headers=self.headers, timeout=10)
            r.encoding = 'utf-8'
            html = r.text

            title = ""
            title_match = re.search(r'<title>(.*?)</title>', html, re.I)
            if title_match:
                title = re.split(r'[-—_]', title_match.group(1))[0].strip()
            
            pic = ""
            for pic_pattern in [
                r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"',
                r'<video[^>]*poster="([^"]+)"',
                r'data-poster="([^"]+)"'
            ]:
                pic_match = re.search(pic_pattern, html, re.I)
                if pic_match and 'blob:' not in pic_match.group(1):
                    pic = pic_match.group(1)
                    break
            
            # --- 处理解密逻辑 ---
            pic = self._abs(pic)
            if 'rulbbz.cn' in pic:
                pic = self._decrypt_pic(pic)
            # ------------------

            desc = ""
            desc_match = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', html, re.I)
            if desc_match:
                desc = desc_match.group(1)
            
            play_url = f"video://{vid}"
            
            vod = {
                "vod_id": vid,
                "vod_name": self.clean_title(title) if title else "视频",
                "vod_pic": pic if pic else self.default_pic,
                "vod_content": self.clean_title(desc) if desc else title,
                "vod_play_from": self.name,
                "vod_play_url": f"{self.clean_title(title) if title else '播放'}${play_url}"
            }
            return {"list": [vod]}
        except Exception as e:
            print(f"详情失败: {e}")
            return {"list": []}

    def playerContent(self, flag, id, vipFlags):
        return {
            "parse": 0, 
            "playUrl": "", 
            "url": id,
            "header": self.headers
        }

    def _abs(self, url):
        if not url or url.startswith('blob:'):
            return ""
        if url.startswith('//'):
            return 'https:' + url
        return url if url.startswith('http') else urllib.parse.urljoin(self.host, url)

    def _page(self, videos, pg):
        return {
            "list": videos, 
            "page": int(pg), 
            "pagecount": 9999, 
            "limit": 30, 
            "total": 999999
        }

    def clean_title(self, title):
        if not title: return ""
        title = re.sub(r'<[^>]+>', '', title)
        title = re.sub(r'\s+', ' ', title)
        return title.strip()

    config = {"player": {}, "filter": {}}
    header = property(lambda self: self.headers)
    
    def localProxy(self, param):
        return []