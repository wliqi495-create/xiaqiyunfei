# coding=utf-8
import re
import json
import random
import string
import requests
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from base.spider import Spider

class Spider(Spider):
    R_IFRAME = re.compile(r'src=["\'](https?://(?:[^"\'/]*(?:d000d|doood|myvidplay)\.[a-z]+)/e/[a-zA-Z0-9]+)', re.I)
    R_MD5 = re.compile(r"/pass_md5/[^'\"]+")
    R_EXT = re.compile(r"\.(mp4|flv|m3u8)(\?|$)", re.I)

    def init(self, extend=""):
        self.host = 'https://vintagepornfun.com'
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': self.host, 'Origin': self.host, 'Connection': 'keep-alive'
        }
        self.session.headers.update(self.headers)
        
        self.sort_conf = {"key": "order", "name": "排序", "value": [
            {"n": "默认", "v": ""},
            {"n": "最新", "v": "date"},
            {"n": "随机", "v": "rand"},
            {"n": "标题", "v": "title"},
            {"n": "热度", "v": "comment_count"}
        ]}

        self.tag_conf = {"key": "tag", "name": "标签", "value": [
            {"n": "全部", "v": ""},
            {"n": "70年代", "v": "70s-porn"},
            {"n": "80年代", "v": "80s-porn"},
            {"n": "90年代", "v": "90s-porn"},
            {"n": "肛交", "v": "anal-sex"},
            {"n": "亚洲", "v": "asian"},
            {"n": "大胸", "v": "big-boobs"},
            {"n": "金发", "v": "blonde"},
            {"n": "经典", "v": "classic"},
            {"n": "喜剧", "v": "comedy"},
            {"n": "绿帽", "v": "cuckold"},
            {"n": "黑人", "v": "ebony"},
            {"n": "欧洲", "v": "european"},
            {"n": "法国", "v": "french"},
            {"n": "德国", "v": "german"},
            {"n": "群交", "v": "group-sex"},
            {"n": "多毛", "v": "hairy-porn"},
            {"n": "跨种族", "v": "interracial"},
            {"n": "意大利", "v": "italian"},
            {"n": "女同", "v": "lesbian"},
            {"n": "熟女", "v": "milf"},
            {"n": "乱交", "v": "orgy"},
            {"n": "户外", "v": "public-sex"},
            {"n": "复古", "v": "retro"},
            {"n": "少女", "v": "teen-sex"},
            {"n": "3P", "v": "threesome"},
            {"n": "老片", "v": "vintage-porn"},
            {"n": "偷窥", "v": "voyeur"}
        ]}

    def getName(self): return "复古片"
    def isVideoFormat(self, url): return bool(url) and ('.m3u8' in url or self.R_EXT.search(url))

    def _fetch(self, url, headers=None):
        try:
            r = self.session.get(url, headers=headers or self.headers, timeout=15)
            r.raise_for_status()
            return BeautifulSoup(r.text, "html.parser")
        except: return None

    def _resolve_myvidplay(self, url):
        try:
            embed = url.replace("/d/", "/e/")
            for d in ['d000d.com', 'doood.com']: 
                if d in embed: embed = embed.replace(d, 'myvidplay.com')
            
            host = f"{urlparse(embed).scheme}://{urlparse(embed).netloc}"
            h_req = {"User-Agent": self.headers['User-Agent'], "Referer": self.host}
            
            if not (r := self.session.get(embed, headers=h_req, timeout=15)) or not (m := self.R_MD5.search(r.text)):
                return {'parse': 1, 'url': url, 'header': h_req}
            
            h_req["Referer"] = embed
            prefix = self.session.get(host + m.group(0), headers=h_req, timeout=15).text.strip()
            
            if not prefix.startswith("http"): return {'parse': 1, 'url': url, 'header': h_req}
            
            token = m.group(0).split("/")[-1]
            rnd = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
            return {
                'parse': 0, 'url': f"{prefix}{rnd}?token={token}",
                'header': {'User-Agent': self.headers['User-Agent'], 'Referer': f"{host}/", 'Connection': 'keep-alive'}
            }
        except: return {'parse': 1, 'url': url, 'header': self.headers}

    def homeContent(self, filter):
        classes = [
            {"type_name": "最新更新", "type_id": "latest"},
            {"type_name": "70年代", "type_id": "70s-porn"},
            {"type_name": "80年代", "type_id": "80s-porn"},
            {"type_name": "亚洲经典", "type_id": "asian-vintage-porn"},
            {"type_name": "欧洲经典", "type_id": "euro-porn-movies"},
            {"type_name": "日本经典", "type_id": "japanese-vintage-porn"},
            {"type_name": "法国经典", "type_id": "french-vintage-porn"},
            {"type_name": "德国经典", "type_id": "german-vintage-porn"},
            {"type_name": "意大利经典", "type_id": "italian-vintage-porn"},
            {"type_name": "经典影片", "type_id": "classic-porn-movies"}
        ]
        
        filters = {item['type_id']: [self.sort_conf, self.tag_conf] for item in classes}
        return {"class": classes, "filters": filters}

    def homeVideoContent(self): 
        return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        if tid == "latest":
            url = self.host if pg == "1" else f"{self.host}/page/{pg}/"
        else:
            base = f"{self.host}/category/{tid}"
            url = f"{base}/" if pg == "1" else f"{base}/page/{pg}/"
        
        query_parts = []
        if 'order' in extend and extend['order']:
            query_parts.append(f"orderby={extend['order']}")
        if 'tag' in extend and extend['tag']:
            query_parts.append(f"tag={extend['tag']}")
            
        if query_parts:
            sep = '&' if '?' in url else '?'
            url += sep + '&'.join(query_parts)

        return self._get_list(url, int(pg))

    def _get_list(self, url, page=1):
        videos = []
        if soup := self._fetch(url):
            for item in soup.select('article'):
                if not (a := item.select_one('a[href]')): continue
                
                img = item.select_one('img')
                pic = img.get('data-src') or img.get('src') or ""
                if pic and not pic.startswith('http'): pic = urljoin(self.host, pic)
                
                head = item.select_one('.entry-header')
                rem = item.select_one('.rating-bar')
                
                videos.append({
                    "vod_id": a['href'],
                    "vod_name": head.get_text(strip=True) if head else a.get('title', ''),
                    "vod_pic": pic,
                    "vod_remarks": rem.get_text(strip=True) if rem else ""
                })
        
        return {
            "list": videos, 
            "page": page, 
            "pagecount": page + 1 if videos else page, 
            "limit": 20, 
            "total": 999
        }

    def detailContent(self, ids):
        if not (soup := self._fetch(ids[0])): return {'list': []}
        
        meta_img = soup.find('meta', property='og:image')
        meta_desc = soup.find('meta', property='og:description')
        
        play_url = ""
        if m := self.R_IFRAME.search(str(soup)): play_url = m.group(1)
        elif iframe := soup.select_one('iframe[src*="/e/"]'): play_url = iframe['src']

        return {"list": [{
            "vod_id": ids[0],
            "vod_name": soup.select_one('h1').get_text(strip=True) if soup.select_one('h1') else "",
            "vod_pic": meta_img['content'] if meta_img else "",
            "vod_content": meta_desc['content'] if meta_desc else "",
            "vod_play_from": "文艺复兴",
            "vod_play_url": f"HD${play_url}" if play_url else "无资源$#"
        }]}

    def searchContent(self, key, quick, pg="1"):
        return self._get_list(f"{self.host}/page/{pg}/?s={requests.utils.quote(key)}", int(pg))

    def playerContent(self, flag, id, vipFlags):
        if flag == 'myvidplay' or any(x in id for x in ['myvidplay', 'd000d', 'doood']):
            return self._resolve_myvidplay(id)
        return {'parse': 1, 'url': id, 'header': self.headers}

    def localProxy(self, params): pass