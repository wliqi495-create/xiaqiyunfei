# 七哥
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
        self.video_host = "https://video.externulls.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Mobile Safari/537.36',
            'Referer': self.host + '/',
            'Origin': self.host,
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
        self.timeout = 15
        self.retries = 2

    def getName(self):
        return "Beeg"

    def isVideoFormat(self, url): 
        return True

    def manualVideoCheck(self): 
        return False

    def destroy(self): 
        pass

    def homeContent(self, filter):
        result = {}
        classes = [
            {"type_id": "latest", "type_name": "Latest Updates"},
            {"type_id": "channels", "type_name": "Channels"},
            {"type_id": "pornstars", "type_name": "Pornstars"},
            {"type_id": "categories", "type_name": "Categories"}
        ]
        result['class'] = classes
        return result

    def homeVideoContent(self):
        return self.categoryContent("latest", 1, None, {})

    def categoryContent(self, tid, pg, filter, extend):
        result = {}
        videos = []
        limit = 48
        offset = (int(pg) - 1) * limit
        
        if tid == "latest":
            url = f"{self.api_host}/facts/tag?id=27173&limit={limit}&offset={offset}"
            videos = self._fetch_video_list(url)
        elif tid.startswith(self.api_host) or "/facts/tag" in tid:
            if tid.startswith("http"):
                url = tid
            else:
                url = f"{self.api_host}/facts/tag?slug={tid}&limit={limit}&offset={offset}"
            url = re.sub(r"offset=\d+", f"offset={offset}", url)
            videos = self._fetch_video_list(url)
        elif tid in ["channels", "pornstars", "categories"]:
            url = f"{self.api_host}/tag/facts/tags?get_original=true&slug=index"
            videos = self._fetch_section_list(url, tid)
            
        result['list'] = videos
        result['page'] = pg
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
        
        title = f"Beeg Video {video_id}"
        pic = f"https://thumbs.externulls.com/videos/{video_id}/0.webp?size=480x270"
        desc = ""
        
        try:
            r = self.fetch(api_url, headers=self.headers)
            data = json.loads(r.text)
            
            file_data = data.get('file', {}).get('data', [])
            if file_data:
                title = file_data[0].get('cd_value', title)
            
            tags = data.get('tags', [])
            for tag in tags:
                tag_data = tag.get('data', [])
                if tag_data and tag_data[0].get('td_column') == 'tg_caption':
                    desc = tag_data[0].get('td_value', '')
                    break
        except: pass
            
        play_url = f"播放${self.e64(video_id)}"
        
        vod = {
            "vod_id": url,
            "vod_name": title,
            "vod_pic": pic,
            "vod_remarks": "",
            "vod_content": desc,
            "vod_play_from": "Beeg",
            "vod_play_url": play_url
        }
        result['list'] = [vod]
        return result

    def playerContent(self, flag, id, vipFlags):
        result = {}
        try:
            video_id = self.d64(id)
            api_url = f"{self.api_host}/facts/file/{video_id}"
            r = self.fetch(api_url, headers=self.headers)
            data = json.loads(r.text)
            
            final_url = None
            file_obj = data.get('file', {})
            
            # 1. 优先检查 hls_resources (用户指定的真实播放源)
            hls_res = file_obj.get('hls_resources', {})
            # 寻找 fl_cdn_xxx，按清晰度排序
            max_res = 0
            path = ""
            for k, v in hls_res.items():
                if k.startswith('fl_cdn_'):
                    # 排除 multi，只找数字清晰度
                    if 'multi' in k: continue
                    try:
                        res = int(k.replace('fl_cdn_', ''))
                        if res > max_res:
                            max_res = res
                            path = v
                    except: pass
            
            if path:
                final_url = f"{self.video_host}/{path}"
            
            # 2. 备选：qualities.h264
            if not final_url:
                qualities = file_obj.get('qualities', {}).get('h264', [])
                if qualities:
                    qualities.sort(key=lambda x: int(x.get('quality', 0)), reverse=True)
                    p = qualities[0].get('url')
                    if p: final_url = f"{self.video_host}/{p}"

            # 3. 备选：resources (旧版兼容)
            if not final_url:
                resources = file_obj.get('resources', {})
                for k, v in resources.items():
                    if k.startswith('fl_cdn_'):
                        final_url = f"{self.video_host}/{v}"
                        break

            if final_url:
                # 确保地址格式正确
                if final_url.startswith('https://video.externulls.com//'):
                    final_url = final_url.replace('.com//', '.com/')
                    
                result["parse"] = 0
                result["url"] = final_url
                result["header"] = {
                    'User-Agent': self.headers['User-Agent'],
                    'Referer': 'https://beeg.com/',
                    'Origin': 'https://beeg.com'
                }
            else:
                result["parse"] = 1
                result["url"] = f"https://beeg.com/{video_id}"
                result["header"] = self.headers

        except Exception as e:
            result["parse"] = 1
            result["url"] = f"https://beeg.com/{self.d64(id)}" if id else ""
            result["header"] = self.headers
            
        return result

    def _fetch_video_list(self, url):
        videos = []
        try:
            r = self.fetch(url, headers=self.headers)
            data = json.loads(r.text)
            items = data if isinstance(data, list) else []
            
            for elem in items:
                try:
                    file_info = elem.get("file", {})
                    video_id = file_info.get("id")
                    if not video_id: continue
                    
                    title = str(video_id)
                    file_data = file_info.get("data", [])
                    if file_data and len(file_data) > 0:
                        val = file_data[0].get("cd_value")
                        if val: title = val
                    
                    thumbnail = f"https://thumbs.externulls.com/videos/{video_id}/0.webp?size=480x270"
                    duration = str(file_info.get("fl_duration", ""))
                    
                    videos.append({
                        "vod_id": f"{self.host}/{video_id}",
                        "vod_name": title,
                        "vod_pic": thumbnail,
                        "vod_remarks": duration
                    })
                except: continue
        except: pass
        return videos

    def _fetch_section_list(self, url, section_type):
        videos = []
        try:
            r = self.fetch(url, headers=self.headers)
            data = json.loads(r.text)
            
            target_key = ""
            if section_type == "categories": target_key = "other"
            elif section_type == "channels": target_key = "productions"
            elif section_type == "pornstars": target_key = "human"
            
            items = data.get(target_key, [])
            
            for elem in items:
                try:
                    title = elem.get("tg_name", "")
                    slug = elem.get("tg_slug", "")
                    
                    thumbnail = ""
                    thumbs = elem.get("thumbs", [])
                    if thumbs:
                        thumb_id = thumbs[-1].get("id", "")
                        if thumb_id:
                            thumbnail = f"https://thumbs.externulls.com/photos/{thumb_id}/to.webp"
                    
                    vod_id = f"{self.api_host}/facts/tag?slug={slug}&limit=48&offset=0"
                    
                    videos.append({
                        "vod_id": vod_id,
                        "vod_name": title,
                        "vod_pic": thumbnail,
                        "vod_tag": "folder",
                        "vod_remarks": "分类"
                    })
                except: continue
        except: pass
        return videos

    def e64(self, text):
        return b64encode(text.encode()).decode()

    def d64(self, encoded_text):
        return b64decode(encoded_text.encode()).decode()

    def fetch(self, url, params=None, headers=None, timeout=None):
        import requests, ssl
        try: ssl._create_default_https_context = ssl._create_unverified_context
        except: pass
        if headers is None: headers = self.headers
        if timeout is None: timeout = self.timeout
        for _ in range(self.retries + 1):
            try:
                resp = requests.get(url, params=params, headers=headers, timeout=timeout, verify=False)
                resp.encoding = 'utf-8'
                return resp
            except: time.sleep(1)
        raise Exception("Fetch failed")
