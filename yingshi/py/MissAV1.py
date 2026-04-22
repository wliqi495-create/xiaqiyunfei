"""
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 1,
  title: 'MissAV',
  lang: 'hipy'
})
"""
# -*- coding: utf-8 -*-
import re
import sys
import json
from pyquery import PyQuery as pq
sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def init(self, extend=""):
        pass

    def getName(self):
        return "MissAV"

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return [200, "video/MP2T", "", ""]

    host = 'https://missav.ai'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://missav.ai/cn/', 'Cookie': 'cf_clearance=dummy'
    }

    def homeContent(self, filter):
        result = {}
        classes = [
            {"type_name": "最近更新", "type_id": "new"},
            {"type_name": "新作上市", "type_id": "release"},
            {"type_name": "中文字幕", "type_id": "chinese-subtitle"},
            {"type_name": "无码流出", "type_id": "uncensored-leak"},
            {"type_name": "VR", "type_id": "genres/VR"},
            {"type_name": "今日热门", "type_id": "today-hot"},
            {"type_name": "本周热门", "type_id": "weekly-hot"},
            {"type_name": "本月热门", "type_id": "monthly-hot"}
        ]
        result['class'] = classes
        return result

    def homeVideoContent(self):
        return self.categoryContent("new", 1, False, {})

    def categoryContent(self, tid, pg, filter, extend):
        result = {}
        url = f"{self.host}/cn/{tid}?page={pg}"
        res = self.fetch(url, headers=self.headers)
        doc = pq(res.text)
        
        videos = []
        items = doc('div.grid div.relative.group')
        for item in items.items():
            name = item('a.text-secondary').text().strip()
            pic = item('img').attr('data-src') or item('img').attr('src')
            if pic and pic.startswith('//'):
                pic = 'https:' + pic
            
            href = item('a.text-secondary').attr('href')
            if not href:
                continue
            
            vid = href.split('/')[-1]
            remarks = item('span.absolute.bottom-1.right-1').text().strip()
            
            videos.append({
                "vod_id": vid,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remarks
            })
            
        result['list'] = videos
        result['page'] = pg
        result['pagecount'] = 999
        result['limit'] = len(videos)
        result['total'] = 999
        return result

    def detailContent(self, ids):
        vid = ids[0]
        url = f"{self.host}/cn/{vid}"
        res = self.fetch(url, headers=self.headers)
        doc = pq(res.text)
        
        name = doc('h1.text-base').text().strip()
        pic = doc('video').attr('poster')
        info_div = doc('div.mt-4')
        content = info_div.text().strip()
        
        vod = {
            "vod_id": vid,
            "vod_name": name,
            "vod_pic": pic,
            "type_name": "",
            "vod_year": "",
            "vod_area": "",
            "vod_remarks": "",
            "vod_actor": "",
            "vod_director": "",
            "vod_content": content,
            "vod_play_from": "MissAV",
            "vod_play_url": f"播放${vid}"
        }
        
        result = {"list": [vod]}
        return result

    def searchContent(self, key, quick):
        url = f"{self.host}/cn/search/{key}"
        res = self.fetch(url, headers=self.headers)
        doc = pq(res.text)
        
        videos = []
        items = doc('div.grid div.relative.group')
        for item in items.items():
            name = item('a.text-secondary').text().strip()
            pic = item('img').attr('data-src') or item('img').attr('src')
            href = item('a.text-secondary').attr('href')
            if not href: continue
            vid = href.split('/')[-1]
            remarks = item('span.absolute.bottom-1.right-1').text().strip()
            
            videos.append({
                "vod_id": vid,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remarks
            })
        return {"list": videos}

    def playerContent(self, flag, id, vipFlags):
        url = f"{self.host}/cn/{id}"
        res = self.fetch(url, headers=self.headers)
        m3u8_match = re.search(r'https?://[^\s\'"]+\.m3u8[^\s\'"]*', res.text)
        if m3u8_match:
            play_url = m3u8_match.group(0)
            return {
                "parse": 0,
                "playUrl": "",
                "url": play_url,
                "header": self.headers
            }
        return {"parse": 1, "url": url, "header": self.headers}

