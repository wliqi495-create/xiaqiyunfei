import sys, re, threading, json, requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from base.spider import Spider

class Spider(Spider):
    creators_cache = []; post_image_cache = {}
    img_pattern = re.compile(r'src=["\']([^"\']+)["\']')
    img_exts = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'}
    vid_exts = {'mp4', 'mkv', 'mov', 'webm', 'm4v', 'avi', 'flv'}
    
    def getName(self): return "Kemono"
    
    def init(self, extend=""):
        super().init(extend)
        self.base_url = "https://kemono.cr"; self.api_url = "https://kemono.cr/api/v1"; self.img_base = "https://kemono.cr/data"
        self.session = requests.Session()
        retries = Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(pool_connections=20, pool_maxsize=20, max_retries=retries)
        self.session.mount('https://', adapter); self.session.mount('http://', adapter)
        self.headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Referer': f"{self.base_url}/", 'Accept': 'text/css,*/*;q=0.1', 'Accept-Language': 'en-US,en;q=0.9', 'Connection': 'keep-alive'}
        self.session.headers.update(self.headers)

    def destroy(self):
        if hasattr(self, 'session'): self.session.close()

    def fetch(self, url, headers=None, is_api=False):
        req_headers = headers or self.headers
        if is_api or '/api/' in url: req_headers['Accept'] = 'text/css'
        return self.session.get(url, headers=req_headers, timeout=30, verify=False)

    def homeContent(self, filter):
        services = [("Patreon", "patreon"), ("Pixiv Fanbox", "fanbox"), ("Fantia", "fantia"), ("Discord", "discord"), ("Gumroad", "gumroad"), ("SubscribeStar", "subscribestar"), ("Boosty", "boosty"), ("DLsite", "dlsite")]
        result = [{"type_name": "Popular Recent", "type_id": "popular"}] + [{"type_name": n, "type_id": i} for n, i in services]
        if not self.creators_cache: threading.Thread(target=self._load_creators_task).start()
        return {'class': result}

    def _load_creators_task(self):
        resp = self.fetch(f"{self.api_url}/creators", is_api=True)
        if resp and resp.status_code == 200: self.creators_cache = resp.json()

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg)
        handlers = {'popular': lambda: self._get_popular_posts(pg), 'similar###': lambda: self._get_similar_list(tid, pg), 'creator###': lambda: self._get_post_list(tid, pg), 'post###': lambda: self._handle_image_popup_safely(tid)}
        for prefix, handler in handlers.items():
            if tid.startswith(prefix): return handler()
        return self._get_creator_list(tid, pg)

    def _get_creator_list(self, service_id, pg):
        if not self.creators_cache:
            self._load_creators_task()
            if not self.creators_cache: return {'list': [{'vod_id': 'err', 'vod_name': 'Loading...', 'vod_pic': ''}]}
        filtered = [c for c in self.creators_cache if c.get('service') == service_id]
        filtered.sort(key=lambda x: x.get('favorited', 0), reverse=True)
        limit = 20; total = len(filtered); start, end = (pg - 1) * limit, pg * limit
        style = {"type": "list", "ratio": "1.1"}; icon_prefix = f"https://img.kemono.cr/icons/{service_id}/"
        vlist = [{'vod_id': f"creator###{service_id}###{item['id']}", 'vod_name': item.get('name'), 'vod_pic': icon_prefix + item['id'], 'vod_tag': 'folder', 'vod_remarks': f"♥ {item.get('favorited', 0)}", "style": style} for item in filtered[start:end]]
        return {'list': vlist, 'page': pg, 'pagecount': (total + limit - 1) // limit + 1, 'limit': limit, 'total': total}

    def _get_similar_list(self, tid, pg):
        _, service, user_id = tid.split('###')
        resp = self.fetch(f"{self.api_url}/{service}/user/{user_id}/recommended", is_api=True)
        if not resp or resp.status_code != 200: return {'list': [{'vod_id': 'err', 'vod_name': 'API Error', 'vod_pic': ''}]}
        creators = resp.json()
        if not creators: return {'list': [{'vod_id': 'err', 'vod_name': 'No Similar Artists', 'vod_pic': ''}]}
        creators.sort(key=lambda x: x.get('score', 0), reverse=True)
        limit = 20; total = len(creators); start, end = (pg - 1) * limit, pg * limit
        style = {"type": "list", "ratio": "1.1"}
        vlist = [{'vod_id': f"creator###{item['service']}###{item['id']}", 'vod_name': item.get('name'), 'vod_pic': f"https://img.kemono.cr/icons/{item['service']}/{item['id']}", 'vod_tag': 'folder', 'vod_remarks': f"R: {int(item.get('score', 0)*100)}", "style": style} for item in creators[start:end]]
        return {'list': vlist, 'page': pg, 'pagecount': (total + limit - 1) // limit + 1, 'limit': limit, 'total': total}

    def _get_post_list(self, tid, pg):
        _, service, user_id = tid.split('###')
        resp = self.fetch(f"{self.api_url}/{service}/user/{user_id}/posts?o={(pg - 1) * 50}", is_api=True)
        vlist = []
        if resp and resp.status_code == 200:
            for post in resp.json():
                files = [post.get('file', {})] + post.get('attachments', [])
                cover_path = next((f.get('path') for f in files if f.get('path') and f['path'].split('.')[-1].lower() in self.img_exts), None)
                cover = f"https://img.kemono.cr/thumbnail/data{cover_path}" if cover_path else "https://kemono.cr/static/kemono-logo.svg"
                has_video = bool(post.get('videos')) or any(f.get('path', '').split('.')[-1].lower() in self.vid_exts for f in files)
                style = {"type": "list", "ratio": "1.1"}
                vlist.append({'vod_id': f"{'video' if has_video else 'post'}###{service}###{user_id}###{post.get('id')}", 'vod_name': post.get('title', 'Untitled'), 'vod_pic': cover, 'vod_remarks': '▶ Video' if has_video else post.get('published', '')[:10], 'vod_tag': 'folder' if not has_video else '', 'style': style})
        return {'list': vlist, 'page': pg, 'pagecount': pg + 1 if len(vlist) >= 50 else pg, 'limit': 50, 'total': 99999}

    def _get_popular_posts(self, pg):
        resp = self.fetch(f"{self.api_url}/posts/popular?period=recent&o={(pg - 1) * 50}", is_api=True)
        vlist = []; total_count = 99999
        if resp and resp.status_code == 200:
            data = resp.json(); total_count = data.get('props', {}).get('count', 99999)
            for post in data.get('posts', []):
                files = [post.get('file', {})] + post.get('attachments', [])
                cover_path = next((f.get('path') for f in files if f.get('path') and f['path'].split('.')[-1].lower() in self.img_exts), None)
                cover = f"https://img.kemono.cr/thumbnail/data{cover_path}" if cover_path else "https://kemono.cr/static/kemono-logo.svg"
                has_video = bool(post.get('videos')) or any(f.get('path', '').split('.')[-1].lower() in self.vid_exts for f in files)
                style = {"type": "rect", "ratio": 1.33}
                vlist.append({'vod_id': f"{'video' if has_video else 'post'}###{post.get('service')}###{post.get('user')}###{post.get('id')}", 'vod_name': post.get('title', 'Untitled'), 'vod_pic': cover, 'vod_remarks': '▶ Video' if has_video else post.get('published', '')[:10], 'vod_tag': 'folder' if not has_video else '', 'style': style})
        return {'list': vlist, 'page': pg, 'pagecount': (total_count + 49) // 50, 'limit': 50, 'total': total_count}

    def detailContent(self, ids):
        tid = ids[0]
        if not tid.startswith('video###'): return {'list': []}
        _, service, user_id, post_id = tid.split('###')
        resp = self.fetch(f"{self.api_url}/{service}/user/{user_id}/post/{post_id}", is_api=True)
        if not resp or resp.status_code != 200: return {'list': []}
        data = resp.json(); post = data.get('post', data); play_list = []
        for v in post.get('videos', []):
            if v.get('path'):
                base = v.get('server', '') or ''; path = v.get('path', '')
                if not path.startswith('/data'): path = '/data' + path
                play_list.append(f"{v.get('name', 'Video')}${base}{path}")
        if not play_list:
            for idx, f in enumerate([post.get('file')] + post.get('attachments', [])):
                if f and f.get('path') and f['path'].split('.')[-1].lower() in self.vid_exts:
                    full_url = self.img_base + f['path'] if not f['path'].startswith('http') else f['path']
                    play_list.append(f"{f.get('name', f'Part {idx+1}')}${full_url}")
        files = [post.get('file', {})]
        first_img = next((f.get('path') for f in files if f.get('path') and f['path'].split('.')[-1].lower() in self.img_exts), None)
        pic = f"https://img.kemono.cr/thumbnail/data{first_img}" if first_img else ""
        link_data = {'id': f"similar###{service}###{user_id}", 'name': '★ Similar Artists'}
        director_link = f"[a=cr:{json.dumps(link_data)}/]★ 查找相似画师 (Find Similar)[/a]"
        vod = {"vod_id": tid, "vod_name": post.get('title', 'Untitled'), "vod_pic": pic, "type_name": service, "vod_year": post.get('published', '')[:4], "vod_pubdate": post.get('published', '')[:10], "vod_area": "Kemono", "vod_remarks": f"♥ {post.get('favorited', 0)}", "vod_director": director_link, "vod_content": re.sub(r'<[^>]+>', '', post.get('content', '')).strip()[:500], "vod_play_from": "KemonoPlayer", "vod_play_url": "#".join(play_list) if play_list else ""}
        return {"list": [vod]}

    def playerContent(self, flag, id, vipFlags): return {'parse': 0, 'url': id, 'header': {'User-Agent': self.headers['User-Agent']}}

    def searchContent(self, key, quick, pg=1):
        if not self.creators_cache: self._load_creators_task()
        pg, limit = int(pg), 20; key_lower = key.lower()
        results = [c for c in self.creators_cache if key_lower in c.get('name', '').lower()]
        results.sort(key=lambda x: x.get('favorited', 0), reverse=True)
        start, end = (pg - 1) * limit, pg * limit
        style = {"type": "list", "ratio": "1.1"}
        vlist = [{'vod_id': f"creator###{item['service']}###{item['id']}", 'vod_name': item['name'], 'vod_pic': f"https://img.kemono.cr/icons/{item['service']}/{item['id']}", 'vod_tag': 'folder', 'vod_remarks': item['service'], "style": style} for item in results[start:end]]
        if pg == 1 and results:
            top_match = results[0]
            resp = self.fetch(f"{self.api_url}/{top_match['service']}/user/{top_match['id']}/recommended", is_api=True)
            if resp and resp.status_code == 200:
                rec_data = resp.json(); rec_data.sort(key=lambda x: x.get('score', 0), reverse=True)
                if rec_data:
                    vlist.append({'vod_id': 'ignore', 'vod_name': '=== 相似画师 (Similar) ===', 'vod_pic': 'https://kemono.cr/static/kemono-logo.svg', 'vod_tag': '', 'vod_remarks': '', 'style': style})
                    vlist.extend({'vod_id': f"creator###{item['service']}###{item['id']}", 'vod_name': item.get('name'), 'vod_pic': f"https://img.kemono.cr/icons/{item['service']}/{item['id']}", 'vod_tag': 'folder', 'vod_remarks': f"R: {int(item.get('score', 0)*100)}", "style": style} for item in rec_data)
        return {'list': vlist, 'page': pg, 'pagecount': (len(results) + limit - 1) // limit + 1, 'limit': limit, 'total': len(results)}

    def _handle_image_popup_safely(self, tid):
        def load_images_and_show():
            _, service, user_id, post_id = tid.split('###')
            resp = self.fetch(f"{self.api_url}/{service}/user/{user_id}/post/{post_id}", is_api=True)
            if not resp or resp.status_code != 200: return
            data = resp.json(); post = data.get('post', data); image_urls = []
            for f in [post.get('file')] + post.get('attachments', []):
                if f and f.get('path') and f['path'].split('.')[-1].lower() in self.img_exts: image_urls.append(self.img_base + f['path'] if not f['path'].startswith('http') else f['path'])
            if post.get('content'):
                for img_url in self.img_pattern.findall(post['content']):
                    if img_url.split('.')[-1].lower() in self.img_exts:
                        if img_url.startswith('//'): img_url = 'https:' + img_url
                        elif img_url.startswith('/'): img_url = self.base_url + img_url
                        image_urls.append(img_url)
            if not image_urls: return
            cache_key = f"{service}_{user_id}_{post_id}"; self.post_image_cache[cache_key] = image_urls; self._show_popup_dialog(cache_key)
        threading.Thread(target=load_images_and_show).start()
        return {'list': [{'vod_id': 'ignore', 'vod_name': 'Gallery Loading...', 'vod_pic': '', 'vod_remarks': 'View'}], 'page': 1, 'pagecount': 1, 'limit': 1, 'total': 1}

    def _show_popup_dialog(self, cache_key):
        def launch_popup():
            try:
                from java import jclass, dynamic_proxy
                from java.lang import Runnable
                JClass = jclass("java.lang.Class"); AT = JClass.forName("android.app.ActivityThread"); currentAT = AT.getMethod("currentActivityThread").invoke(None)
                mActivities = AT.getDeclaredField("mActivities"); mActivities.setAccessible(True); values = mActivities.get(currentAT).values()
                try: records = values.toArray()
                except: records = values.getClass().getMethod("toArray").invoke(values)
                act = None
                for record in records:
                    try:
                        recordClass = record.getClass(); pausedField = recordClass.getDeclaredField("paused"); pausedField.setAccessible(True)
                        if not pausedField.getBoolean(record): activityField = recordClass.getDeclaredField("activity"); activityField.setAccessible(True); act = activityField.get(record); break
                    except: continue
                if not act: return
                class UiRunner(dynamic_proxy(Runnable)):
                    def __init__(self, func): super().__init__(); self.func = func
                    def run(self):
                        try: self.func()
                        except: pass
                def show_dialog():
                    try:
                        Dialog = jclass("android.app.Dialog"); WebView = jclass("android.webkit.WebView"); ColorDrawable = jclass("android.graphics.drawable.ColorDrawable"); Color = jclass("android.graphics.Color")
                        d = Dialog(act); d.requestWindowFeature(1); win = d.getWindow(); win.getDecorView().setPadding(0, 0, 0, 0); win.setBackgroundDrawable(ColorDrawable(Color.BLACK)); win.setLayout(-1, -1)
                        w = WebView(act); ws = w.getSettings(); ws.setJavaScriptEnabled(True); ws.setDomStorageEnabled(True); w.setBackgroundColor(Color.BLACK)
                        images = self.post_image_cache.get(cache_key, [])
                        img_tags = [f'<div class="image-item"><img src="{url}" loading="lazy" referrerpolicy="no-referrer"></div>' for url in images]
                        html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="referrer" content="no-referrer"><style>body{{margin:0;padding:5px;background:#121212}}.image-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(100%,1fr));gap:5px}}.image-item{{background:#222;border-radius:4px;overflow:hidden}}.image-item img{{width:100%;height:auto;display:block}}</style></head><body><div class="image-grid">{"".join(img_tags)}</div></body></html>"""
                        w.loadDataWithBaseURL(None, html, "text/html", "utf-8", None); d.setContentView(w); d.show()
                    except: pass
                act.getWindow().getDecorView().post(UiRunner(show_dialog))
            except: pass
        threading.Thread(target=launch_popup).start()