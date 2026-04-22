-*- coding: utf-8 -*-import reimport sysimport jsonsys.path.append('..')from base.spider import Spiderclass Spider(Spider):text复制下载def getName(self):
    return "片吧影视"

def init(self, extend=""):
    pass

def isVideoFormat(self, url):
    return False

def manualVideoCheck(self):
    return False

def destroy(self):
    pass

BASE_URL = "https://www.pbpbt.com"

def getHeaders(self):
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": self.BASE_URL
    }

def _get(self, url):
    import http.client
    from urllib.parse import urlparse
    
    parsed = urlparse(url)
    conn = http.client.HTTPConnection(parsed.netloc, timeout=15)
    path = parsed.path + ('?' + parsed.query if parsed.query else '')
    
    conn.request("GET", path, headers=self.getHeaders())
    resp = conn.getresponse()
    data = resp.read()
    conn.close()
    
    try:
        return data.decode('utf-8')
    except:
        return data

def homeContent(self, filter):
    classes = [
        {"type_id": "/type/dianying.html", "type_name": "电影"},
        {"type_id": "/type/guochanju.html", "type_name": "国产剧"},
        {"type_id": "/type/gangtaiju.html", "type_name": "港台剧"},
        {"type_id": "/type/rihanju.html", "type_name": "日韩剧"},
        {"type_id": "/type/oumeiju.html", "type_name": "欧美剧"},
        {"type_id": "/type/dongzuopian.html", "type_name": "动作片"},
        {"type_id": "/type/xijupian.html", "type_name": "喜剧片"},
        {"type_id": "/type/aiqingpian.html", "type_name": "爱情片"},
        {"type_id": "/type/kehuanpian.html", "type_name": "科幻片"},
        {"type_id": "/type/kongbupian.html", "type_name": "恐怖片"},
        {"type_id": "/type/donghuadianying.html", "type_name": "动画电影"},
        {"type_id": "/type/donghuajuji.html", "type_name": "动画剧集"},
        {"type_id": "/type/jilupian.html", "type_name": "纪录片"}
    ]
    return {"class": classes, "list": []}

def categoryContent(self, tid, pg, filter, extend):
    result = {}
    
    if pg == 1:
        url = f"{self.BASE_URL}{tid}"
    else:
        base_path = tid.replace(".html", "")
        url = f"{self.BASE_URL}{base_path}/page/{pg}.html"
    
    html = self._get(url)
    
    videos = []
    pattern = r'<div class="pack-packpack">(.*?)</div>\s*</div>'
    items = re.findall(pattern, html, re.S)
    
    for item in items:
        video = {}
        
        title_match = re.search(r'<div class="pack-title">(.*?)</div>', item, re.S)
        if title_match:
            video["vod_name"] = title_match.group(1).strip()
        
        link_match = re.search(r'<a href="(.*?)"', item, re.S)
        if link_match:
            link = link_match.group(1).strip()
            video["vod_id"] = link
            
            id_match = re.search(r'/v/(\d+)\.html', link)
            if id_match:
                video["vod_id"] = id_match.group(1)
        
        img_match = re.search(r'<img .*?data-original="(.*?)"', item, re.S)
        if img_match:
            video["vod_pic"] = img_match.group(1).strip()
        
        remark_match = re.search(r'<div class="pack-subtitle">(.*?)</div>', item, re.S)
        if remark_match:
            video["vod_remarks"] = remark_match.group(1).strip()
        
        if video.get("vod_name") and video.get("vod_id"):
            videos.append(video)
    
    result["page"] = pg
    result["pagecount"] = 999
    result["list"] = videos
    return result

def detailContent(self, ids):
    result = {}
    vod = {}
    
    vid = ids[0]
    if vid.startswith("http"):
        detail_url = vid
    else:
        detail_url = f"{self.BASE_URL}/v/{vid}.html"
    
    html = self._get(detail_url)
    
    name_match = re.search(r'<div class="article-title"><h1>(.*?)</h1>', html, re.S)
    if name_match:
        vod["vod_name"] = name_match.group(1).strip()
    
    pic_match = re.search(r'<div class="article-cover"><img src="(.*?)"', html, re.S)
    if pic_match:
        vod["vod_pic"] = pic_match.group(1).strip()
    
    desc_match = re.search(r'<div class="article-desc">(.*?)</div>', html, re.S)
    if desc_match:
        desc = desc_match.group(1).strip()
        desc = re.sub(r'<.*?>', '', desc)
        vod["vod_content"] = desc
    
    playlist_pattern = r'<ul class="playlist">(.*?)</ul>'
    playlist_matches = re.findall(playlist_pattern, html, re.S)
    
    if playlist_matches:
        playlist_html = playlist_matches[0]
        
        episodes = []
        ep_pattern = r'<a href="(.*?)">(.*?)</a>'
        ep_matches = re.findall(ep_pattern, playlist_html, re.S)
        
        for link, name in ep_matches:
            episodes.append({
                "name": name.strip(),
                "link": link.strip()
            })
        
        if episodes:
            vod["vod_play_from"] = "片吧资源"
            
            url_parts = []
            for ep in episodes:
                url_parts.append(f"{ep['name']}${ep['link']}")
            
            vod["vod_play_url"] = "#".join(url_parts)
    
    result["list"] = [vod]
    return result

def searchContent(self, key, quick):
    result = {}
    videos = []
    
    search_url = f"{self.BASE_URL}/index.php/ajax/suggest?wd={key}"
    resp = self._get(search_url)
    
    try:
        data = json.loads(resp)
        if data.get("code") == 1 and data.get("list"):
            for item in data["list"]:
                videos.append({
                    "vod_id": item.get("vod_id", ""),
                    "vod_name": item.get("vod_name", ""),
                    "vod_pic": item.get("vod_pic", ""),
                    "vod_remarks": item.get("vod_remarks", "")
                })
    except:
        pass
    
    result["list"] = videos
    return result

def playerContent(self, flag, id, vipFlags):
    result = {}
    
    if id.startswith("http"):
        player_url = id
    else:
        player_url = f"{self.BASE_URL}{id}"
    
    html = self._get(player_url)
    
    patterns = [
        r'player_data\s*=\s*{.*?url\s*:\s*["\']([^"\']+)["\']',
        r'video_url\s*=\s*["\']([^"\']+)["\']',
        r'url\s*:\s*["\']([^"\']+\.m3u8[^"\']*)["\']'
    ]
    
    real_url = None
    for pattern in patterns:
        match = re.search(pattern, html, re.S)
        if match:
            real_url = match.group(1).strip()
            break
    
    if real_url:
        result["url"] = real_url
    else:
        result["url"] = player_url
    
    return result[/write_file:content]