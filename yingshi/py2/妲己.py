import requests
from bs4 import BeautifulSoup
import re
from base.spider import Spider
import sys
import json
import base64
import urllib.parse

sys.path.append('..')

murl = "https://3642.7rnr.com/web/index.html"
headerx = {
  'User-Agent': "Mozilla/5.0 (Linux; Android 13; M2102J2SC Build/TKQ1.221114.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/143.0.7499.3 Mobile Safari/537.36",
  'Accept-Encoding': "gzip, deflate, br, zstd"
}
response = requests.get(murl, allow_redirects=True)
xurl = response.url
nurl = xurl + '/web/abcdefg.ashx'
pm = ''

class Spider(Spider):
    global xurl
    global headerx

    def getName(self):
        return "首页"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def homeContent(self, filter):
        result = {}
        result = {"class": [{"type_id": "1003", "type_name": "亚洲无码"},
                            {"type_id": "3022", "type_name": "欧美无码"},
                            {"type_id": "3026", "type_name": "中文字幕"},
                            {"type_id": "3025", "type_name": "经典三级"},
                            {"type_id": "5", "type_name": "国产主播"},
                            {"type_id": "134", "type_name": "韩国主播"},
                            {"type_id": "3137", "type_name": "ＡＳＭＲ"},
                            {"type_id": "3138", "type_name": "恐怖色情"},
                            {"type_id": "131", "type_name": "网红视频"},
                            {"type_id": "132", "type_name": "国产视频"},
                            {"type_id": "3023", "type_name": "人妖伪娘"},
                            {"type_id": "130", "type_name": "动漫卡通"},
                            {"type_id": "3088", "type_name": "华人原创"},
                            {"type_id": "3135", "type_name": "ＪＶＩＤ"},
                            {"type_id": "3136", "type_name": "ＳＷＡＧ"}, 
                            {"type_id": "3134", "type_name": "明星换脸"}]}
        return result

    def homeVideoContent(self):
        videos = []
        try:
            payload = {
                'action': "getindexdata",
                't': "1762753963537691",
                's': "5ad87a586f5aae9c2ca4f913d45f8958"}
            detail = requests.post(url=nurl, data=payload, headers=headerx)
            detail.encoding = "utf-8"
            res = detail.json()
            video_list = res.get("videos", [])

            for video in video_list:
                name = video.get("title", "")
                id = video.get("id", "")
                pic = video.get("coverimg", "")
                remarks = video.get("updatedate", "")
                video = {
                    "vod_id": id,
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_remarks": remarks
                 }
                videos.append(video)

            result = {'list': videos}
            return result
        except:
            pass

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []
        if pg:
            page = int(pg)
        else:
            page = 1

        if page == '1':
            payload1 = {
                'action': "getvideos",
                'vtype': {cid},
                'pageindex': "1",
                'pagesize': "12",
                'tags': "全部",
                'sortindex': "1",
                't': "176275570014518",
                's': "ff4218e4cafd552c4d0c93eb935c14f1"}
        else:
            payload1 = {
                'action': "getvideos",
                'vtype': {cid},
                'pageindex': {str(page)},
                'pagesize': "12",
                'tags': "全部",
                'sortindex': "1",
                't': "176275570014518",
                's': "ff4218e4cafd552c4d0c93eb935c14f1"}
        try:
            detail = requests.post(url=nurl, data=payload1, headers=headerx)
            detail.encoding = "utf-8"
            res = detail.json()
            video_list = res.get("videos", [])

            for video in video_list:
                name = video.get("title", "")
                id = video.get("id", "")
                pic = video.get("coverimg", "")
                remarks = video.get("updatedate", "")
                video = {
                    "vod_id": id,
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_remarks": remarks
                 }
                videos.append(video)

        except:
            pass
        result = {'list': videos}
        result['page'] = pg
        result['pagecount'] = 99
        result['limit'] = 90
        result['total'] = 99
        return result

    def detailContent(self, ids):
        did = ids[0]
        result = {}
        videos = []
        playurl = ''
        payload2 = {
            'action': "getvideo",
            'vid': did,
            't': "1762756475175265",
            's': "656d5b40c2122f86bc35895dc58fd113"}
        res1 = requests.post(url=nurl, data=payload2, headers=headerx)
        res1.encoding = "utf-8"
        res = res1.json()
        node = res.get("data", {}).get("Table", [{}])[0]

        vod_id = node.get("id", "")
        vod_name = node.get("title", "")
        vod_pic = node.get("coverimg", "")
        vod_remarks = node.get("updatedate", "")
        vod_content = node.get("title", "")

        playFrom = []
        playList = []
        if node.get("vurl"):
            base_url1 = res.get("xldata", {}).get("value", "")
            base_url2 = res.get("xldata", {}).get("value1", "")
            if base_url1:
                full_vurl1 = base_url1 + node.get("vurl", "")
                playFrom.append("播放源1")
                playList.append(full_vurl1)
            if base_url2:
                full_vurl2 = base_url2 + node.get("vurl", "")
                playFrom.append("播放源2")
                playList.append(full_vurl2)

        videos.append({
            "vod_id": vod_id,
            "vod_name": vod_name,
            "vod_pic": vod_pic,
            "vod_remarks": vod_remarks,
            "vod_content": vod_content,
            "vod_play_from": "$$$".join(playFrom),
            "vod_play_url": "$$$".join(playList)
    })

        result['list'] = videos
        return result

    def playerContent(self, flag, id, vipFlags):
        parts = id.split("http")
        xiutan = 1
        if xiutan == 1:
            if len(parts) > 1:
                before_https, after_https = parts[0], 'http' + parts[1]
            result = {}
            result["parse"] = xiutan
            result["playUrl"] = ''
            result["url"] = after_https
            result["header"] = headerx
            return result

    def searchContentPage(self, key, quick, page):
        result = {}
        videos = []
        payload3 = {
            'action': "search",
            'p': {key},
            'pageindex': {str(page)},
            'pagesize': "12",
            'channelid': "0",
            't': "1762756927087982",
            's': "2392bd117b4e6e35b5ec1fa9bc380b6f"}
        detail = requests.post(url=nurl, data=payload3, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.json()
        video_list = res.get("data", [])
        for video in video_list:
            name = video.get("title", "")
            id = video.get("id", "")
            pic = video.get("imgurl", "")
            remarks = video.get("updatedate", "")
            video = {
                "vod_id": id,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remarks
             }
            videos.append(video)

        result['list'] = videos
        result['page'] = page
        result['pagecount'] = 60
        result['limit'] = 30
        result['total'] = 999999
        return result

    def searchContent(self, key, quick):
        return self.searchContentPage(key, quick, '1')

    def localProxy(self, params):
        if params['type'] == "m3u8":
            return self.proxyM3u8(params)
        elif params['type'] == "media":
            return self.proxyMedia(params)
        elif params['type'] == "ts":
            return self.proxyTs(params)
        return None