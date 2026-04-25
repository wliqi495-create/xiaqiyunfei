# coding=utf-8
# !/usr/bin/python

"""

作者 丢丢喵 🚓 内容均从互联网收集而来 仅供交流学习使用 版权归原创者所有 如侵犯了您的权益 请通知作者 将及时删除侵权内容
                    ====================Diudiumiao====================

"""

from Crypto.Util.Padding import unpad
from Crypto.Util.Padding import pad
from urllib.parse import unquote
from Crypto.Cipher import ARC4
from urllib.parse import quote
from base.spider import Spider
from Crypto.Cipher import AES
from datetime import datetime
from bs4 import BeautifulSoup
from base64 import b64decode
import urllib.request
import urllib.parse
import datetime
import binascii
import requests
import base64
import json
import time
import sys
import re
import os

sys.path.append('..')

xurl = "https://free4kporns.com"

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
          }

class Spider(Spider):

    def getName(self):
        return "首页"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def homeContent(self, filter):
        result = {"class": []}
        detail = self._fetch_homepage()
        doc = self._parse_html(detail.text)
        soups = self._extract_nav_links(doc)
        for soup in soups:
            vods = soup.find_all('li')
            for vod in vods:
                item = self._process_nav_item(vod)
                if item:
                    result["class"].append(item)
        return result

    def _fetch_homepage(self):
        detail = requests.get(url=f"{xurl}/cn/", headers=headerx)
        detail.encoding = "utf-8"
        return detail

    def _parse_html(self, html_text):
        return BeautifulSoup(html_text, "lxml")

    def _extract_nav_links(self, doc):
        return doc.find_all('ul', class_="nav-main__links nav-main__links--left")

    def _process_nav_item(self, vod):
        name = vod.text.strip()
        skip_names = ["首页"]
        if name in skip_names:
            return None
        id = vod.find('a')['href']
        return {"type_id": id, "type_name": name}

    def homeVideoContent(self):
        pass

    def categoryContent(self, cid, pg, filter, ext):
        page = self._get_page_number(pg)
        url = self._build_category_url(cid, page)
        detail = self._fetch_category_page(url)
        doc = self._parse_html(detail.text)
        videos = self._extract_videos(doc)
        result = self._build_category_result(videos, pg)
        return result

    def _get_page_number(self, pg):
        if pg:
            return int(pg)
        else:
            return 1

    def _build_category_url(self, cid, page):
        fenge = cid.split(".html")
        if page == 1:
            return f'{xurl}{cid}'
        else:
            return f'{xurl}{fenge[0]}/page/{str(page)}.html'

    def _fetch_category_page(self, url):
        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        return detail

    def _parse_html(self, html_text):
        return BeautifulSoup(html_text, "lxml")

    def _extract_videos(self, doc):
        videos = []
        soups = doc.find_all('div', class_="list-global list-global--small list-videos")
        for soup in soups:
            vods = soup.find_all('div', class_="list-global__item")
            for vod in vods:
                video = self._process_video_item(vod)
                if video:
                    videos.append(video)
        return videos

    def _process_video_item(self, vod):
        names = vod.find('p', class_="list-global__title")
        name = names.text.strip()
        id = names.find('a')['href']
        pic = vod.find('img')['src']
        return {
            "vod_id": id,
            "vod_name": name,
            "vod_pic": pic
               }

    def _build_category_result(self, videos, pg):
        return {
            'list': videos,
            'page': pg,
            'pagecount': 9999,
            'limit': 90,
            'total': 999999
               }

    def detailContent(self, ids):
        did = ids[0]
        detail = self._fetch_detail_page(did)
        doc = self._parse_html(detail.text)
        bofang = self._extract_video_url(doc)
        videos = self._build_video_list(did, bofang)
        result = self._build_detail_result(videos)
        return result

    def _fetch_detail_page(self, did):
        detail = requests.get(url=did, headers=headerx)
        detail.encoding = "utf-8"
        return detail

    def _parse_html(self, html_text):
        return BeautifulSoup(html_text, "lxml")

    def _extract_video_url(self, doc):
        bofangs = doc.find('meta', itemprop="contentUrl")
        return bofangs['content']

    def _build_video_list(self, did, bofang):
        return [{
            "vod_id": did,
            "vod_play_from": "在线观看",
            "vod_play_url": bofang
               }]

    def _build_detail_result(self, videos):
        return {'list': videos}

    def playerContent(self, flag, id, vipFlags):
        result = {}
        result["parse"] = 0
        result["playUrl"] = ''
        result["url"] = id
        result["header"] = headerx
        return result

    def searchContentPage(self, key, quick, pg):
        pass

    def searchContent(self, key, quick, pg="1"):
        return self.searchContentPage(key, quick, '1')

    def localProxy(self, params):
        if params['type'] == "m3u8":
            return self.proxyM3u8(params)
        elif params['type'] == "media":
            return self.proxyMedia(params)
        elif params['type'] == "ts":
            return self.proxyTs(params)
        return None






