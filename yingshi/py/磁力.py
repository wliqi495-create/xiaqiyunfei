import sys
import re
from pyquery import PyQuery as pq

sys.path.append('..')
from base.spider import Spider


class Spider(Spider):

    def init(self, extend=""):
        self.mag_host = "https://18mag.net"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 15; 23113RKC6C Build/AQ3A.240912.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.207 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }

    def getName(self):
        return "GGJAVMag"

    def isVideoFormat(self, url):
        return url.startswith('magnet:?')

    def manualVideoCheck(self):
        pass

    def destroy(self):
        pass

    def homeContent(self, filter):
        return {
            "class": [
                {"type_name": "磁力搜索(输入番号)", "type_id": "search"}
            ],
            "list": []
        }

    def homeVideoContent(self):
        return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        return {
            "list": [],
            "page": 1,
            "pagecount": 1,
            "limit": 1,
            "total": 1
        }

    def searchContent(self, key, quick, pg="1"):
        search_url = f"{self.mag_host}/search?q={key}"
        rsp = self.fetch(search_url, headers=self.headers)
        html = rsp.text if hasattr(rsp, 'text') else str(rsp)
        d = pq(html)
        vlist = []
        seen = set()
        for a in d('a').items():
            href = a.attr('href') or ''
            if href.startswith('/!') and href not in seen:
                seen.add(href)
                detail_url = f"{self.mag_host}{href}"
                name = a.text() or key
                vlist.append({
                    "vod_id": detail_url,
                    "vod_name": name,
                    "vod_pic": "",
                    "vod_remarks": ""
                })
        return {
            "list": vlist,
            "page": 1,
            "pagecount": 1,
            "limit": len(vlist),
            "total": len(vlist)
        }

    def detailContent(self, ids):
        detail_url = ids[0]
        return self._magnet_detail(detail_url)

    def playerContent(self, flag, id, vipFlags):
        safe_headers = self.headers.copy()
        safe_headers['Cookie'] = ''
        mag = id.split('$', 1)[1] if '$' in id else id
        return {
            'parse': 0,
            'url': mag,
            'header': safe_headers
        }

    def _magnet_detail(self, detail_url):
        try:
            rsp = self.fetch(detail_url, headers=self.headers)
            if hasattr(rsp, 'content'):
                raw = rsp.content
                if isinstance(raw, str):
                    html = raw
                else:
                    html = raw.decode('utf-8', 'ignore')
            else:
                html = rsp.text if hasattr(rsp, 'text') else str(rsp)
        except Exception:
            vod = {
                "vod_id": detail_url,
                "vod_name": "加载失败",
                "vod_pic": "",
                "vod_content": "",
                "vod_play_from": "磁力链接",
                "vod_play_url": "加载失败$#",
            }
            return {"list": [vod]}

        magnet = ""
        m = re.search(r'(magnet:\?xt=urn:btih:[^\s"\'<>]+)', html, re.I)
        if m:
            magnet = m.group(1)
        else:
            m2 = re.search(r'(magnet:\?[^\s"\'<>]+)', html, re.I)
            if m2:
                magnet = m2.group(1)

        t = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
        if t:
            title = re.sub(r'<[^>]+>', '', t.group(1)).strip()
        else:
            title = "磁力资源"

        play_from = "磁力链接"
        play_url = f"{title}${magnet}" if magnet else f"{title}$#"

        vod = {
            "vod_id": detail_url,
            "vod_name": title,
            "vod_pic": "",
            "vod_content": "",
            "vod_play_from": play_from,
            "vod_play_url": play_url,
        }
        return {"list": [vod]}
