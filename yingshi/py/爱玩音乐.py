"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '爱玩音乐',
  lang: 'hipy'
})
"""

import re
import sys
from base64 import b64encode, b64decode
from urllib.parse import quote
from pyquery import PyQuery as pq
from requests import Session, adapters
from urllib3.util.retry import Retry
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def init(self, extend=""):
        self.host = "http://www.22a5.com"
        self.session = Session()
        retries = Retry(total=2, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])
        adapter = adapters.HTTPAdapter(max_retries=retries, pool_connections=20, pool_maxsize=50)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"}
        self.session.headers.update(self.headers)

    def getName(self): return "爱玩音乐"
    def isVideoFormat(self, url): return bool(re.search(r'\.(m3u8|mp4|mp3|m4a|flv)(\?|$)', url or "", re.I))
    def manualVideoCheck(self): return False
    def destroy(self): self.session.close()

    def homeContent(self, filter):
        classes = [
            {"type_name": "电台", "type_id": "/radiolist/index.html"}, 
            {"type_name": "歌单", "type_id": "/playtype/index.html"},
            {"type_name": "专辑", "type_id": "/albumlist/index.html"}, 
            {"type_name": "歌手", "type_id": "/singerlist/index/index/index/index.html"},
            {"type_name": "高清MV", "type_id": "/mvlist/oumei.html"},
            {"type_name": "新歌榜", "type_id": "/list/new.html"},
            {"type_name": "TOP榜单", "type_id": "/list/top.html"}
        ]
        filters = {}
        
        fetch_targets = ["/list/new.html", "/list/top.html", "/mvlist/index.html", "/playtype/index.html", "/albumlist/index.html", "/radiolist/index.html"]
        for path in fetch_targets:
            if f_data := self._fetch_filters(path): 
                filters[path] = f_data

        if "/radiolist/index.html" not in filters:
            filters["/radiolist/index.html"] = [
                {"key": "id", "name": "分类", "value": [
                    {"n": "最新", "v": "index"}, {"n": "最热", "v": "hot"}, {"n": "有声小说", "v": "novel"},
                    {"n": "相声", "v": "xiangyi"}, {"n": "音乐", "v": "music"}, {"n": "情感", "v": "emotion"},
                    {"n": "国漫", "v": "game"}, {"n": "影视", "v": "yingshi"}, {"n": "脱口秀", "v": "talkshow"},
                    {"n": "历史", "v": "history"}, {"n": "儿童", "v": "children"}, {"n": "教育", "v": "education"},
                    {"n": "八卦", "v": "gossip"}, {"n": "推理", "v": "tuili"}, {"n": "头条", "v": "headline"}
                ]}
            ]

        filters["/singerlist/index/index/index/index.html"] = [
            {"key": "area", "name": "地区", "value": [{"n": "全部", "v": "index"}, {"n": "华语", "v": "huayu"}, {"n": "欧美", "v": "oumei"}, {"n": "韩国", "v": "hanguo"}, {"n": "日本", "v": "ribrn"}]},
            {"key": "sex", "name": "性别", "value": [{"n": "全部", "v": "index"}, {"n": "男", "v": "male"}, {"n": "女", "v": "girl"}, {"n": "组合", "v": "band"}]},
            {"key": "genre", "name": "流派", "value": [{"n": n, "v": v} for n, v in [("全部","index"),("流行","liuxing"),("电子","dianzi"),("摇滚","yaogun"),("嘻哈","xiha"),("R&B","rb"),("民谣","minyao"),("爵士","jueshi"),("古典","gudian")]]},
            {"key": "char", "name": "字母", "value": [{"n": "全部", "v": "index"}] + [{"n": chr(i), "v": chr(i).lower()} for i in range(65, 91)]}
        ]
        return {"class": classes, "filters": filters, "list": []}

    def homeVideoContent(self): return {"list": []}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg or 1)
        url = tid
        if "/singerlist/" in tid:
            p = tid.split('/')
            if len(p) >= 6:
                p[2], p[3], p[4] = extend.get("area", p[2]), extend.get("sex", p[3]), extend.get("genre", p[4])
                p[-1] = f"{extend.get('char', 'index')}.html"
                url = "/".join(p)
        elif "id" in extend and extend["id"] not in ["index", "top"]:
            url = tid.replace("index.html", f"{extend['id']}.html").replace("top.html", f"{extend['id']}.html")
            if url == tid: url = f"{tid.rsplit('/', 1)[0]}/{extend['id']}.html"

        if pg > 1:
            url = re.sub(r'/\d+\.html$', '.html', url)
            url = re.sub(r'_\d+\.html$', '.html', url)
            
            if "/singerlist/" in url or "/radiolist/" in url or "/mvlist/" in url or "/playtype/" in url or "/list/" in url:
                url = url.replace(".html", f"/{pg}.html")
            else:
                url = url.replace(".html", f"_{pg}.html")
        
        doc = self.getpq(url)
        items = doc(".play_list li, .video_list li, .pic_list li, .singer_list li, .ali li, .layui-row li") or doc(".base_l li")
        return {"list": self._parse_list(items, tid), "page": pg, "pagecount": 9999, "limit": 90, "total": 999999}

    def searchContent(self, key, quick, pg="1"):
        return {"list": self._parse_list(self.getpq(f"/so/{quote(key)}/{pg}.html")(".base_l li, .play_list li"), "search"), "page": int(pg)}

    def detailContent(self, ids):
        url = self._abs(ids[0])
        doc = self.getpq(url)
        title = self._clean(doc("h1").text() or doc("title").text() or "")
        pic = self._abs(doc(".djpg img, .pic img, .djpic img").attr("src"))
        vod = {"vod_id": url, "vod_name": title, "vod_pic": pic, "vod_play_from": "爱玩音乐", "vod_content": ""}

        if any(x in url for x in ["/playlist/", "/album/", "/list/", "/singer/", "/special/", "/radio/", "/radiolist/"]):
            eps = self._get_eps(doc)
            page_urls = set()
            for a in doc(".page a, .dede_pages a, .pagelist a").items():
                href = a.attr("href")
                if href and not href.startswith("javascript") and href != "#":
                    abs_url = self._abs(href)
                    if abs_url != url:
                        page_urls.add(abs_url)
            
            if page_urls:
                sorted_urls = sorted(list(page_urls), key=lambda x: int(re.search(r'[_\/](\d+)\.html', x).group(1)) if re.search(r'[_\/](\d+)\.html', x) else 0)
                with ThreadPoolExecutor(max_workers=5) as executor:
                    futures = [executor.submit(self._fetch_eps, u) for u in sorted_urls]
                    for f in futures:
                        try:
                            if more_eps := f.result():
                                eps.extend(more_eps)
                        except: pass

            if eps:
                vod["vod_play_from"], vod["vod_play_url"] = "播放列表", "#".join(eps)
                return {"list": [vod]}

        play_list = []
        if mid := re.search(r'/(song|mp3|radio|radiolist|radioplay)/([^/]+)\.html', url):
            play_list.append(f"播放${self.e64('0@@@@'+url)}")
        
        elif vid := re.search(r'/(video|mp4)/([^/]+)\.html', url):
            tasks = []
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {executor.submit(self._api, "/plug/down.php", None, {"ac": "vplay", "id": vid.group(2), "q": q}, "GET", url): n for n, q in [("蓝光", 1080), ("超清", 720), ("高清", 480)]}
                for f in as_completed(futures):
                    if u := f.result():
                        name = futures[f]
                        play_list.append(f"{name}${self.e64('0@@@@'+u)}")
            play_list.sort(key=lambda x: {"蓝":0, "超":1, "高":2}.get(x[0], 3))

        vod["vod_play_url"] = "#".join(play_list) if play_list else f"解析失败${self.e64('1@@@@'+url)}"
        return {"list": [vod]}

    def _fetch_eps(self, url):
        return self._get_eps(self.getpq(url))

    def _get_eps(self, doc):
        local_eps = []
        for li in doc(".play_list li, .song_list li, .music_list li").items():
            href = li("a").attr("href")
            if not href or not re.search(r'/(song|mp3|radio|radiolist|radioplay)/', href): continue
            song_name = self._clean(li("a").eq(0).text() or li(".name").text())
            local_eps.append(f"{song_name}${self.e64('1@@@@'+self._abs(href))}")
        return local_eps

    def playerContent(self, flag, id, vipFlags):
        url = self.d64(id).split("@@@@")[-1].replace(r"\/", "/")
        real_play_url = url
        lrc_url = ""
        is_music = False
        
        if ".html" in url and not self.isVideoFormat(url):
            if mid := re.search(r'/(song|mp3|radio|radiolist|radioplay)/([^/]+)\.html', url):
                is_music = True
                sid = mid.group(2)
                real_play_url = self._api("/js/play.php", data={"id": sid, "type": "music"}, method="POST", referer=url) or url
                lrc_url = f"{self.host}/plug/down.php?ac=music&lk=lrc&id={sid}"
            
            elif vid := re.search(r'/(video|mp4)/([^/]+)\.html', url):
                with ThreadPoolExecutor(max_workers=3) as executor:
                    futures = [executor.submit(self._api, "/plug/down.php", None, {"ac": "vplay", "id": vid.group(2), "q": q}, "GET", url) for q in [1080, 720, 480]]
                    for f in as_completed(futures):
                        if v_url := f.result():
                            real_play_url = v_url
                            executor.shutdown(wait=False) 
                            break

        final_url = "mp3://" + real_play_url if is_music else real_play_url
        
        res = {
            "parse": 0, 
            "url": final_url, 
            "header": {"User-Agent": self.headers["User-Agent"]}
        }
        
        if lrc_url:
            try:
                r_lrc = self.session.get(lrc_url, headers=self.headers, timeout=5)
                r_lrc.encoding = r_lrc.apparent_encoding or 'utf-8'
                lrc_text = r_lrc.text
                
                new_lines = []
                for line in lrc_text.splitlines():
                    if '爱玩音乐' in line or '22a5.com' in line or '2t58.com' in line:
                        if ']' in line:
                            time_tag = line[:line.rfind(']')+1]
                            new_lines.append(time_tag + "lg大佬牛逼克拉斯普拉斯")
                        else:
                            new_lines.append("lg大佬牛逼克拉斯普拉斯")
                    else:
                        new_lines.append(line)
                
                res["lrc"] = '\n'.join(new_lines)
            except:
                res["lrc"] = lrc_url
            
        return res

    def localProxy(self, param):
        if param.get("type") == "img":
            try:
                r = self.session.get(param["url"], headers={"Referer": "https://www.2t58.com/"}, timeout=5)
                if r.status_code == 200: return [200, r.headers.get("Content-Type", "image/jpeg"), r.content, {}]
            except: pass
        return None

    def _parse_list(self, items, tid=""):
        res = []
        for li in items.items():
            a = li("a").eq(0)
            href = a.attr("href")
            if not href or href == "/" or any(x in href for x in ["/user/", "/login/", "javascript"]): continue
            name = self._clean(li(".name").text() or a.attr("title") or a.text())
            if not name: continue
            
            img = li("img").attr("src") or ""
            if img: 
                img = self._abs(img.replace('120', '500'))
                pic = f"{self.getProxyUrl()}&url={img}&type=img"
            else: pic = ""
            
            url = self._abs(href)
            is_singer = "/singerlist/" in tid and "/singer/" in url
            style = {"type": "oval"} if is_singer else ({"type": "list"} if any(x in tid for x in ["/list/", "/playtype/", "/albumlist/"]) else {"type": "rect", "ratio": 1.33})
            res.append({"vod_id": url, "vod_name": name, "vod_pic": pic, "vod_tag": "", "style": style})
        return res

    def _clean(self, text):
        return re.sub(r'(爱玩音乐网|视频下载说明|视频下载地址|www\.2t58\.com|MP3免费下载|LRC歌词下载|全部歌曲|\[第\d+页\]|刷新|每日推荐|最新|热门|推荐|MV|高清|无损)', '', text, flags=re.I).strip()

    def _fetch_filters(self, url):
        doc = self.getpq(url)
        selectors = [".ilingku_fl", ".class_list", ".screen_list", ".box_list", ".nav_list"]
        if not (groups := [doc(s) for s in selectors if doc(s)]): return []
        
        filters = []
        for i, group in enumerate(groups):
            opts = [{"n": "全部", "v": "top" if "top" in url else "index"}]
            seen = {opts[0]['v']}
            for a in group("a").items():
                href = a.attr("href")
                if not href: continue
                v = href.split("?")[0].rstrip('/').split('/')[-1].replace('.html','')
                if v not in seen:
                    opts.append({"n": a.text().strip(), "v": v})
                    seen.add(v)
            if len(opts) > 1: filters.append({"key": f"id{i}" if i else "id", "name": "分类", "value": opts})
        return filters

    def _api(self, path, data=None, params=None, method="GET", referer=None):
        try:
            h = self.headers.copy()
            if referer: h["Referer"] = referer
            func = self.session.post if method == "POST" else self.session.get
            r = func(self.host + path, data=data, params=params, headers=h, timeout=3, allow_redirects=False)
            if r.status_code in [301, 302] and r.headers.get("Location"): return self._abs(r.headers.get("Location").strip())
            try:
                if u := r.json().get("url"): return self._abs(u.strip().replace(r"\/", "/"))
            except: pass
            if r.text.strip().startswith("http"): return r.text.strip()
        except: pass
        return ""

    def getpq(self, url):
        import time
        for _ in range(2): 
            try: return pq(self.session.get(self._abs(url), timeout=5).text)
            except: time.sleep(0.1)
        return pq("<html></html>")

    def _abs(self, url): return url if url.startswith("http") else (f"http:{url}" if url.startswith("//") else f"{self.host}{'/' if not url.startswith('/') else ''}{url}") if url else ""
    def e64(self, text): return b64encode(text.encode("utf-8")).decode("utf-8")
    def d64(self, text): return b64decode(text.encode("utf-8")).decode("utf-8")
