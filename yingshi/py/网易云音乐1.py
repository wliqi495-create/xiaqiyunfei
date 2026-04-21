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
import html
import json
import time
import sys
import re
import os

sys.path.append('..')

xurl = "https://music.163.com"

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
          }

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
        result = {"class": []}

        detail = requests.get(url=xurl + "/discover/toplist", headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        doc = BeautifulSoup(res, "lxml")

        soups = doc.find_all('ul', class_="f-cb")

        for soup in soups:
            vods = soup.find_all('li')

            for vod in vods:

                names = vod.find('p', class_="name")
                if names is not None:
                    name = names.text.strip()
                else:
                    continue

                id = names.find('a')['href']

                result["class"].append({"type_id": id, "type_name": name})

        return result

    def homeVideoContent(self):
        pass

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []

        url = f'{xurl}{cid}'
        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        doc = BeautifulSoup(res, "lxml")

        soups = doc.find_all('textarea', id="song-list-pre-data")
        json_text = soups[0].get_text()
        json_data = json.loads(json_text)

        for vod in json_data:

            name = vod['name']

            pic = vod['album']['picUrl']

            remarkMV = vod['mvid']
            remarkMV = "MP3" if remarkMV in [0, "0"] else "MV"

            remarkname = vod['artists'][0]['name']

            remark = f"{remarkname}👉{remarkMV}"

            id = f"{vod['id']}@{name}@{remark}"

            video = {
                "vod_id": id,
                "vod_name": name,
                "vod_pic": pic,
                "vod_remarks": remark
                    }
            videos.append(video)

        result = {'list': videos}
        result['page'] = pg
        result['pagecount'] = 1
        result['limit'] = 99
        result['total'] = 999999
        return result

    def detailContent(self, ids):
        did = ids[0]
        result = {}
        videos = []

        fenge = did.split("@")

        fenge1 = fenge[2].split("👉")

        videos.append({
            "vod_id": fenge[0],
            "vod_content": f"请您欣赏 {fenge1[0]} {fenge[1]}",
            "vod_play_from": "网易云专线",
            "vod_play_url": f"{fenge1[1]}${fenge[0]}"
                     })

        result['list'] = videos
        return result

    def playerContent(self, flag, id, vipFlags):

        url = f'https://api.cenguigui.cn/api/netease/music_v1.php?id={id}&type=json&level=standard'
        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        data = detail.json()
        result_data = data.get('data', {})

        mv_info = result_data.get('mv_info', {})
        mv_url = mv_info.get('mv', '')

        if mv_info and mv_url and mv_url != '未知mv':
            url = mv_url
        else:
            url = result_data.get('url', '')

        result = {}
        result["parse"] = 0
        result["playUrl"] = ''
        result["url"] = url
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







