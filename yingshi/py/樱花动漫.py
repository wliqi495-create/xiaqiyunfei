# 制作人：yufeng
# 感谢：AI助手
# 原型：deepseek3.6

import re
import sys
import json as _json
sys.path.append('..')
from base.spider import Spider


class Spider(Spider):

    def getName(self):
        return "樱花动漫"

    def init(self, extend=""):
        pass

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def destroy(self):
        pass

    BASE_URL = "https://www.dmvvv.com"

    def getHeaders(self):
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.dmvvv.com/"
        }

    def _get(self, url):
        import http.client, ssl
        from urllib.parse import urlparse, quote
        parsed = urlparse(url)
        path = quote(parsed.path, safe='/:@!$&\'()*+,;=')
        if parsed.query:
            path = path + '?' + parsed.query
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(parsed.netloc, timeout=15, context=ctx)
        conn.request("GET", path, headers=self.getHeaders())
        resp = conn.getresponse()
        data = resp.read().decode('utf-8', errors='ignore')
        conn.close()
        return data

    def _parse_id(self, ids):
        if isinstance(ids, list) and len(ids) > 0:
            vid = ids[0]
            if isinstance(vid, str) and vid.startswith('['):
                try:
                    vid = _json.loads(vid + (']' if not vid.endswith(']') else ''))[0]
                except Exception:
                    vid = vid.lstrip('["\'').rstrip('"\']')
        elif isinstance(ids, str):
            try:
                vid = _json.loads(ids)[0]
            except Exception:
                vid = ids.strip('[]"\'')
        else:
            vid = str(ids)
        return vid

    def _li_em(self, html, label):
        m = re.search(r'<span>' + re.escape(label) + r'：</span><em>([^<]+)</em>', html)
        return m.group(1).strip() if m else ""

    def _li_plain(self, html, label):
        m = re.search(r'<span>' + re.escape(label) + r'：</span>([^<]+)', html)
        return m.group(1).strip() if m else ""

    def _parse_home_list(self, html):
        videos = []
        items = re.findall(
            r'<li>\s*<a href="(/detail/\d+/)"[^>]*title="([^"]+)"[^>]*>.*?'
            r'data-original="([^"]+)".*?<p>([^<]*)</p>',
            html, re.DOTALL
        )
        for href, title, cover, remarks in items:
            videos.append({
                "vod_id":      href,
                "vod_name":    title.strip(),
                "vod_pic":     cover.strip(),
                "vod_remarks": remarks.strip(),
            })
        return videos

    def homeContent(self, filter):
        classes = [
            {"type_id": "guoman", "type_name": "国产动漫"},
            {"type_id": "riman",  "type_name": "日本动漫"},
            {"type_id": "oman",   "type_name": "欧美动漫"},
            {"type_id": "dmfilm", "type_name": "动漫电影"},
        ]
        return {"class": classes, "filters": {}}

    def homeVideoContent(self):
        try:
            html = self._get(self.BASE_URL + "/")
            videos = self._parse_home_list(html)
            seen = set()
            unique = []
            for v in videos:
                if v["vod_id"] not in seen:
                    seen.add(v["vod_id"])
                    unique.append(v)
            return {"list": unique}
        except Exception as e:
            return {"list": []}

    def _parse_page_count(self, html, tid=None):
        if tid:
            m = re.findall(r'/type/' + re.escape(tid) + r'/(\d+)/', html)
            if m:
                return max(int(x) for x in m)
        m2 = re.findall(r'/type/[^/]+/(\d+)/', html)
        if m2:
            return max(int(x) for x in m2)
        m3 = re.findall(r'[?&]page(?:no)?=(\d+)', html)
        if m3:
            return max(int(x) for x in m3)
        return None

    def categoryContent(self, tid, pg, filter, extend):
        try:
            pg = int(pg) if pg else 1
            if pg <= 1:
                url = self.BASE_URL + "/type/" + tid + "/"
            else:
                url = self.BASE_URL + "/type/" + tid + "/" + str(pg) + "/"
            html = self._get(url)
            videos = self._parse_home_list(html)
            max_pg = self._parse_page_count(html, tid)
            if max_pg is None:
                max_pg = pg + 1 if len(videos) >= 36 else pg
            return {
                "list": videos,
                "page": pg,
                "pagecount": max_pg,
                "limit": 36,
                "total": max_pg * 36,
            }
        except Exception as e:
            return {"list": []}

    def detailContent(self, ids):
        vid = self._parse_id(ids)
        try:
            detail_html = self._get(self.BASE_URL + vid)
            
            title = ""
            t = re.search(r'<div class="detail">.*?<h2>([^<]+)</h2>', detail_html, re.DOTALL)
            if t:
                title = t.group(1).strip()
            if not title:
                t2 = re.search(r'<title>([^<]+)', detail_html)
                if t2:
                    title = t2.group(1).split('-')[0].strip()

            cover = ""
            c = re.search(r'<div class="cover">\s*<img[^>]+data-original="([^"]+)"', detail_html)
            if c:
                cover = c.group(1)

            remarks   = self._li_em(detail_html, "状态")
            year      = self._li_plain(detail_html, "年份")
            area      = self._li_plain(detail_html, "地区")
            type_name = self._li_plain(detail_html, "类型")
            actor     = self._li_plain(detail_html, "主演")
            desc      = ""
            d = re.search(r'class="blurb"[^>]*>.*?<span>[^<]+</span>(.*?)</li>', detail_html, re.DOTALL)
            if d:
                desc = re.sub(r'<[^>]+>', '', d.group(1)).strip()

            total_episodes = 0
            if remarks:
                ep_match = re.search(r'[共全更新至第]*(\d+)[集话章]', remarks)
                if ep_match:
                    total_episodes = int(ep_match.group(1))
            
            if total_episodes == 0:
                total_episodes = 24

            video_id = vid.strip('/').split('/')[-1].rstrip('/')
            
            sources_from = []
            sources_url = []
            
            source_names = ["高清", "ikun", "非凡", "量子"]
            
            for source_idx in range(1, 5):
                try:
                    play_url = f"{self.BASE_URL}/play/{video_id}-{source_idx}-1/"
                    play_html = self._get(play_url)
                    
                    name_pattern = re.search(rf'<li><a href="/play/{video_id}-{source_idx}-\d+/"[^>]*>([^<]+)</a>', play_html)
                    
                    if name_pattern:
                        episodes = []
                        
                        for ep_idx in range(1, total_episodes + 1):
                            if ep_idx < 10:
                                ep_name = f"第0{ep_idx}集"
                            else:
                                ep_name = f"第{ep_idx}集"
                            
                            ep_url = f"/play/{video_id}-{source_idx}-{ep_idx}/"
                            episodes.append(f"{ep_name}${ep_url}")
                        
                        if episodes:
                            sources_from.append(source_names[source_idx-1])
                            sources_url.append("#".join(episodes))
                except Exception as e:
                    continue

            vod = {
                "vod_id":        vid,
                "vod_name":      title,
                "vod_pic":       cover,
                "vod_year":      year,
                "vod_area":      area,
                "vod_type":      type_name,
                "vod_actor":     actor,
                "vod_remarks":   remarks,
                "vod_content":   desc,
                "vod_play_from": "$$$".join(sources_from) if sources_from else "",
                "vod_play_url":  "$$$".join(sources_url) if sources_url else "",
            }
            
            return {"list": [vod]}
            
        except Exception as e:
            return {"list": []}

    def searchContent(self, keyword, quick=False, pg=1):
        try:
            from urllib.parse import quote
            kw = quote(keyword)
            pg = int(pg) if pg else 1
            if pg <= 1:
                url = self.BASE_URL + "/search/?wd=" + kw
            else:
                url = self.BASE_URL + "/search/?wd=" + kw + "&pageno=" + str(pg)
            html = self._get(url)
            videos = []
            lis = re.findall(r'<li>\s*<a class="cover".*?</li>', html, re.DOTALL)
            for li in lis:
                href_m  = re.search(r'<a class="cover" href="(/detail/\d+/)"', li)
                title_m = re.search(r'title="([^"]+)"', li)
                cover_m = re.search(r'data-original="([^"]+)"', li)
                remarks_m = re.search(r'<div class="item"><span>状态：</span>([^<]*)', li)
                if not href_m or not title_m:
                    continue
                videos.append({
                    "vod_id":      href_m.group(1),
                    "vod_name":    title_m.group(1).strip(),
                    "vod_pic":     cover_m.group(1).strip() if cover_m else "",
                    "vod_remarks": remarks_m.group(1).strip() if remarks_m else "",
                })
            total_m = re.search(r'找到\s*<em>(\d+)</em>', html)
            if total_m:
                total_count = int(total_m.group(1))
                max_pg = (total_count + 11) // 12
            else:
                pnos = re.findall(r'pageno=(\d+)', html)
                max_pg = max(int(x) for x in pnos) if pnos else (pg + 1 if len(videos) >= 12 else pg)
            return {
                "list":      videos,
                "page":      pg,
                "pagecount": max_pg,
                "limit":     12,
                "total":     max_pg * 12,
            }
        except Exception as e:
            return {"list": []}

    def playerContent(self, flag, id, vipFlags):
        try:
            url = id if id.startswith("http") else self.BASE_URL + id
            html = self._get(url)
            m = re.search(r"url:\s*'(https?://[^']+)'", html)
            if m:
                return {
                    "parse": 0,
                    "url": m.group(1),
                    "header": {
                        "User-Agent": self.getHeaders()["User-Agent"],
                        "Referer": self.BASE_URL + "/"
                    }
                }
            m2 = re.search(r'(https?://[^\s\'"]+\.m3u8(?:\?[^\s\'">]*)?)', html)
            if m2:
                return {"parse": 0, "url": m2.group(1), "header": self.getHeaders()}
            return {"parse": 0, "url": id, "header": self.getHeaders()}
        except Exception as e:
            return {"parse": 0, "url": id, "header": self.getHeaders()}