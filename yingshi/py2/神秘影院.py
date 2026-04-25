# -*- coding: utf-8 -*-
#恰逢
import re
import urllib.parse
from base.spider import Spider as BaseSpile
import requests
from bs4 import BeautifulSoup


class VideoDecryptor:
    """XOR 128 解密"""
    @staticmethod
    def decrypt(text: str) -> str:
        if not text:
            return ""
        try:
            return ''.join(chr(128 ^ ord(c)) for c in text)
        except:
            return text

    @staticmethod
    def from_js(js: str) -> str:
        return VideoDecryptor.decrypt(m.group(1)) if (m := re.search(r"document\.write\(l\('([^']+)'\)\)", js)) else ""


class Spider(BaseSpile):

    def init(self, extend=""):
        self.host = "https://h4ivs.sm431.vip"
        self.video_host = "https://m3u8.nl:88"
        self.image_host = "https://3334.nl:33"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; 22127RK46C Build/TKQ1.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/104.0.5112.97 Mobile Safari/537.36",
            "Referer": self.host,
            "Accept-Language": "zh-CN,zh;q=0.9",
        }
        self.cache = {}

    def get(self, url):
        try:
            r = requests.get(url, headers=self.headers, timeout=15)
            r.raise_for_status()
            r.encoding = "utf-8"
            return r.text
        except:
            return ""

    def img_url(self, url):
        """格式化图片URL"""
        if not url:
            return ""
        if url.startswith("//"):
            url = "https:" + url
        elif url.startswith("/"):
            url = self.image_host + url
        return f"{url}@User-Agent={self.headers['User-Agent']}@Referer={self.host}/"

    def parse(self, el):
        """解析卡片"""
        a = el if el.name == 'a' else el.find('a')
        if not a or not (href := a.get("href", "")):
            return None
        
        href = self.host + href if href.startswith("/") else href
        if not (vid := re.search(r"/vid/(\d+)", href)):
            return None
        
        vid = vid.group(1)
        title = ""

        # 解密标题
        if p := el.find('p'):
            if s := p.find('script'):
                if s.string:
                    title = VideoDecryptor.from_js(s.string)
            title = title or p.get_text(strip=True)
        
        if not title:
            for attr in ['data-title', 'data-name', 'title']:
                if el.has_attr(attr) and (val := el[attr]):
                    if (de := VideoDecryptor.decrypt(val)) and len(de) > 3:
                        title = de
                        break
        
        title = title or "未知标题"
        if title != "未知标题":
            self.cache[vid] = title

        # 图片
        img = ""
        if node := el.select_one("img"):
            img = node.get("data-src") or node.get("src") or ""
        img = img or f"{self.image_host}/{vid}.jpg"

        return {
            "vod_id": vid,
            "vod_name": title,
            "vod_pic": self.img_url(img),
            "vod_remarks": "",
        }

    def get_title(self, vid):
        """从缓存或首页获取标题"""
        if vid in self.cache:
            return self.cache[vid]
        
        if html := self.get(self.host):
            soup = BeautifulSoup(html, "html.parser")
            for link in soup.select('a[href*="/vid/"]'):
                if f'/vid/{vid}' in link.get('href', ''):
                    if p := link.find('p'):
                        if s := p.find('script'):
                            if s.string and (t := VideoDecryptor.from_js(s.string)):
                                self.cache[vid] = t
                                return t
                        if t := p.get_text(strip=True):
                            self.cache[vid] = t
                            return t
        return None

    def homeContent(self, filter):
        return {
            "class": [
                {"type_name": "国产", "type_id": "1"},
                {"type_name": "日本", "type_id": "2"},
                {"type_name": "韩国", "type_id": "3"},
                {"type_name": "欧美", "type_id": "4"},
                {"type_name": "三级", "type_id": "5"},
                {"type_name": "动漫", "type_id": "6"},
            ]
        }

    def homeVideoContent(self):
        if not (html := self.get(self.host)):
            return {"list": []}
        
        soup = BeautifulSoup(html, "html.parser")
        videos = [v for v in (self.parse(el) for el in soup.select(".vodbox, .stui-vodlist__box, .vodlist__box, .video-card, .item")) if v]
        
        if not videos:
            videos = [{"vod_id": v, "vod_name": "未知标题", "vod_pic": self.img_url(f"{self.image_host}/{v}.jpg"), "vod_remarks": ""} 
                     for v in re.findall(r'\[]\(/vid/(\d+)\.html\)', html)]
        
        return {"list": videos}

    def categoryContent(self, tid, pg, filter, extend):
        if tid == "0":
            url = self.host if int(pg) == 1 else f"{self.host}/page/{pg}.html"
        else:
            url = f"{self.host}/list/{tid}.html" if int(pg) == 1 else f"{self.host}/list/{tid}/{pg}.html"
        
        if not (html := self.get(url)):
            return {"list": [], "page": pg, "pagecount": 1, "limit": 30, "total": 0}
        
        soup = BeautifulSoup(html, "html.parser")
        videos = [v for v in (self.parse(el) for el in soup.select(".vodbox, .stui-vodlist__box, .vodlist__box, .video-card, .item")) if v]
        
        if not videos:
            videos = [{"vod_id": v, "vod_name": "未知标题", "vod_pic": self.img_url(f"{self.image_host}/{v}.jpg"), "vod_remarks": ""} 
                     for v in re.findall(r'\[]\(/vid/(\d+)\.html\)', html)]
        
        last = max([int(m.group(1)) for a in soup.select("a[href*='list/']") if (m := re.search(r"/list/\d+/(\d+)\.html", a.get("href", "")))], default=int(pg))
        
        return {"list": videos, "page": pg, "pagecount": max(last, 1), "limit": 30, "total": 99999}

    def searchContent(self, key, quick, pg="1"):
        url = f"{self.host}/so.html"
        params = {"wd": key}
        if int(pg) > 1:
            params["page"] = pg
        
        html = ""
        for method in [requests.get, requests.post]:
            try:
                r = method(url, params=params if method == requests.get else None, 
                          data=params if method == requests.post else None, 
                          headers=self.headers, timeout=15)
                r.raise_for_status()
                r.encoding = "utf-8"
                html = r.text
                break
            except:
                continue
        
        if not html:
            return {"list": []}
        
        soup = BeautifulSoup(html, "html.parser")
        videos = [v for v in (self.parse(el) for el in soup.select(".vodbox, .stui-vodlist__box, .vodlist__box, .video-card, .item")) if v]
        
        if not videos:
            videos = [{"vod_id": v, "vod_name": "未知标题", "vod_pic": self.img_url(f"{self.image_host}/{v}.jpg"), "vod_remarks": ""} 
                     for v in re.findall(r'\[]\(/vid/(\d+)\.html\)', html)]
        
        last = max([int(m.group(1)) for a in soup.select("a[href*='so.html'], .pagination a, .page-link") 
                   if (m := re.search(r"[?&]page=(\d+)", a.get("href", "")))], default=int(pg))
        
        return {"list": videos, "page": pg, "pagecount": max(last, 1), "limit": 30, "total": 99999}

    def detailContent(self, ids):
        vid = ids[0]
        if not (html := self.get(f"{self.host}/vid/{vid}.html")):
            return {"list": []}
        
        soup = BeautifulSoup(html, "html.parser")
        
        # 标题
        title = self.get_title(vid)
        if not title:
            if t := soup.find('title'):
                title = re.sub(r'\s*[-_|]\s*.{0,20}$', '', t.get_text(strip=True)).strip()
            
            if not title or len(title) < 5:
                for sel in ['h1', 'h2', '.video-title', '.title']:
                    if (el := soup.select_one(sel)) and (txt := el.get_text(strip=True)) and len(txt) > 5:
                        title = txt
                        break
        
        title = title or f"视频{vid}"
        
        # 图片
        pic = ""
        for sel in ['.picbox img', '.vodimg img', '.video-pic img', '.poster img', 'img[data-id]']:
            if (node := soup.select_one(sel)) and (p := node.get("data-src") or node.get("src")) and 'favicon' not in p.lower():
                pic = p
                break
        
        if not pic or 'favicon' in pic.lower():
            if meta := soup.select_one('meta[property="og:image"]'):
                pic = meta.get('content', '')
        
        pic = pic or f"{self.image_host}/{vid}.jpg"
        
        # 简介
        desc = soup.select_one(".vodinfo, .video-info, .content, .intro, .description")
        desc = desc.get_text(strip=True) if desc else ""
        
        return {"list": [{
            "vod_id": vid,
            "vod_name": title,
            "vod_pic": self.img_url(pic),
            "vod_content": desc,
            "vod_play_from": "七哥比较瑟",
            "vod_play_url": f"狗哥特别瑟${vid}@@0@@1",
        }]}

    def playerContent(self, flag, id, vipFlags):
        vid = id.split("@@")[0]
        return {"parse": 0, "url": f"{self.video_host}/{vid}/hls/index.m3u8", "header": self.headers}

    def localProxy(self, param):
        return {"code": 404, "content": ""}

    def isVideoFormat(self, url):
        return ".m3u8" in url.lower()

    def manualVideoCheck(self):
        pass

    def destroy(self):
        pass