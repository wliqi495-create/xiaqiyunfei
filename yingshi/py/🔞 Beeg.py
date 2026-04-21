"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: 'Beeg',
  lang: 'hipy',
})
"""

# 七哥 - 2026 性能优化版 (解决加载慢与播放问题)
import sys
import time
import json
import re
import urllib.parse
from base64 import b64decode, b64encode
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def init(self, extend=""):
        self.host = "https://beeg.com"
        self.api_host = "https://store.externulls.com"
        self.video_host = "https://video.beeg.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Referer': self.host + '/',
            'Connection': 'keep-alive'
        }
        self.timeout = 10 # 缩短超时时间以提高响应效率
        self.retries = 2

    def getName(self): return "Beeg"
    def isVideoFormat(self, url): return True
    def manualVideoCheck(self): return False
    def destroy(self): pass

    def homeContent(self, filter):
        result = {}
        result['class'] = [
            {"type_id": "latest", "type_name": "最新更新"},
            {"type_id": "channels", "type_name": "频道列表"},
            {"type_id": "pornstars", "type_name": "影星列表"},
            {"type_id": "categories", "type_name": "分类标签"}
        ]
        return result

    def homeVideoContent(self):
        return self.categoryContent("latest", 1, None, {})

    def categoryContent(self, tid, pg, filter, extend):
        result = {}
        videos = []
        limit = 48
        try: curr_pg = int(pg)
        except: curr_pg = 1
        offset = (curr_pg - 1) * limit
        
        if tid in ["channels", "pornstars", "categories"]:
            t_map = {"channels": "brand", "pornstars": "person", "categories": "other"}
            url = f"{self.api_host}/tag/recommends?type={t_map[tid]}&slug=japanese"
            videos = self._fetch_section_list(url, tid)
        else:
            if tid == "latest":
                url = f"{self.api_host}/facts/tag?id=27173&limit={limit}&offset={offset}"
            elif str(tid).isdigit():
                url = f"{self.api_host}/facts/tag?id={tid}&limit={limit}&offset={offset}"
            else:
                url = f"{self.api_host}/facts/tag?slug={tid}&limit={limit}&offset={offset}"
            
            url = re.sub(r"offset=\d+", f"offset={offset}", url)
            videos = self._fetch_video_list(url)
            
        result['list'] = videos
        result['page'] = curr_pg
        result['pagecount'] = 9999
        result['limit'] = limit
        result['total'] = 999999
        return result

    def searchContent(self, key, quick, pg="1"):
        return {'list': []}

    def detailContent(self, ids):
        result = {}
        url = ids[0]
        video_id = url.rstrip('/').split('/')[-1]
        api_url = f"{self.api_host}/facts/file/{video_id}"
        try:
            r = self.fetch(api_url)
            data = json.loads(r.text)
            file_info = data.get('file', {})
            title = f"Video {video_id}"
            file_data = file_info.get('data', [])
            if file_data: title = file_data[0].get('cd_value', title)
            
            vod = {
                "vod_id": url, "vod_name": title.replace('{','').replace('}',''),
                "vod_pic": f"https://thumbs.externulls.com/videos/{video_id}/0.webp?size=480x270",
                "vod_play_from": "Beeg",
                "vod_play_url": f"播放${self.e64(video_id)}"
            }
            result['list'] = [vod]
        except: pass
        return result

    def playerContent(self, flag, id, vipFlags):
        result = {"parse": 0}
        try:
            video_id = self.d64(id)
            r = self.fetch(f"{self.api_host}/facts/file/{video_id}")
            if not r: return {"parse": 0, "url": ""}
            
            data = json.loads(r.text).get('file', {})
            hls_res = data.get('hls_resources', {})
            final_url = ""

            # --- 优化：速度优先的路径搜索策略 ---
            # 优先顺序：720p -> 1080p -> 480p -> 其他带 Token 的路径
            priority_keys = ['720', '1080', '480', '360']
            for pk in priority_keys:
                for k, v in hls_res.items():
                    if pk in k and 'multi' not in k:
                        final_url = v
                        break
                if final_url: break

            # 如果没找到，尝试获取任何有效的 m3u8 或带 key 的路径
            if not final_url:
                for v in hls_res.values():
                    if isinstance(v, str) and ('.m3u8' in v or 'key=' in v):
                        final_url = v
                        break

            if final_url:
                # 智能域名与 Token 处理
                if not final_url.startswith('http'):
                    domain = self.video_host if 'key=' in final_url else "https://video.externulls.com"
                    final_url = f"{domain}/{final_url.lstrip('/')}"
                
                result["url"] = final_url.replace('.com//', '.com/')
                result["header"] = {
                    'User-Agent': self.headers['User-Agent'],
                    'Referer': f'https://beeg.com/{video_id}',
                    'Origin': 'https://beeg.com',
                    'Connection': 'keep-alive',
                    'Accept': '*/*'
                }
            else:
                result["parse"] = 1
                result["url"] = f"https://beeg.com/{video_id}"
        except:
            result["url"] = ""
        return result

    def localProxy(self, param): return ""

    def _fetch_video_list(self, url):
        videos = []
        try:
            r = self.fetch(url)
            data = json.loads(r.text)
            items = data.get('relations', []) if isinstance(data, dict) else data
            if not items and isinstance(data, dict): items = data.get('data', [])
            for elem in items:
                try:
                    f = elem.get("file") if elem.get("file") else elem
                    v_id = f.get("id")
                    if v_id:
                        title_info = f.get("data", [])
                        name = title_info[0].get("cd_value", str(v_id)) if title_info else str(v_id)
                        videos.append({
                            "vod_id": f"{self.host}/{v_id}",
                            "vod_name": name.replace('{','').replace('}',''),
                            "vod_pic": f"https://thumbs.externulls.com/videos/{v_id}/0.webp?size=480x270",
                            "vod_remarks": str(f.get("fl_duration", ""))
                        })
                except: continue
        except: pass
        return videos

    def _fetch_section_list(self, url, section_type):
        videos = []
        try:
            r = self.fetch(url)
            data = json.loads(r.text)
            items = data if isinstance(data, list) else data.get('data', [])
            for elem in items:
                try:
                    v_id, slug = elem.get("id"), elem.get("tg_slug")
                    final_id = str(v_id) if v_id else slug
                    if final_id:
                        name = elem.get("tg_name", final_id).replace('{','').replace('}','')
                        thumb = ""
                        if elem.get("thumbs"):
                            t_id = elem["thumbs"][-1].get("id")
                            if t_id: thumb = f"https://thumbs.externulls.com/photos/{t_id}/to.webp"
                        videos.append({"vod_id": final_id, "vod_name": name, "vod_pic": thumb, "vod_tag": "folder", "vod_remarks": "分类"})
                except: continue
        except: pass
        return videos

    def e64(self, text): return b64encode(text.encode()).decode()
    def d64(self, encoded_text): return b64decode(encoded_text.encode()).decode()

    def fetch(self, url, params=None, headers=None, timeout=None):
        import requests, ssl
        try: ssl._create_default_https_context = ssl._create_unverified_context
        except: pass
        if headers is None: headers = self.headers
        for _ in range(self.retries + 1):
            try:
                resp = requests.get(url, params=params, headers=headers, timeout=timeout or self.timeout, verify=False)
                resp.encoding = 'utf-8'
                return resp
            except: time.sleep(0.5)
        return None
