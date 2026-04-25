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
from typing import Optional
import urllib.request
import urllib.parse
import requests
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

xurl = "https://wanwuu.com"

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
          }

class Spider(Spider):

    def getName(self):
        return "丢丢喵"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def extract_middle_text(self, text, start_str, end_str, pl, start_index1: str = '', end_index2: str = ''):
        if pl == 3:
            plx = []
            while True:
                start_index = text.find(start_str)
                if start_index == -1:
                    break
                end_index = text.find(end_str, start_index + len(start_str))
                if end_index == -1:
                    break
                middle_text = text[start_index + len(start_str):end_index]
                plx.append(middle_text)
                text = text.replace(start_str + middle_text + end_str, '')
            if len(plx) > 0:
                purl = ''
                for i in range(len(plx)):
                    matches = re.findall(start_index1, plx[i])
                    output = ""
                    for match in matches:
                        match3 = re.search(r'(?:^|[^0-9])(\d+)(?:[^0-9]|$)', match[1])
                        if match3:
                            number = match3.group(1)
                        else:
                            number = 0
                        if 'http' not in match[0]:
                            output += f"#{match[1]}${number}{xurl}{match[0]}"
                        else:
                            output += f"#{match[1]}${number}{match[0]}"
                    output = output[1:]
                    purl = purl + output + "$$$"
                purl = purl[:-3]
                return purl
            else:
                return ""
        else:
            start_index = text.find(start_str)
            if start_index == -1:
                return ""
            end_index = text.find(end_str, start_index + len(start_str))
            if end_index == -1:
                return ""

        if pl == 0:
            middle_text = text[start_index + len(start_str):end_index]
            return middle_text.replace("\\", "")

        if pl == 1:
            middle_text = text[start_index + len(start_str):end_index]
            matches = re.findall(start_index1, middle_text)
            if matches:
                jg = ' '.join(matches)
                return jg

        if pl == 2:
            middle_text = text[start_index + len(start_str):end_index]
            matches = re.findall(start_index1, middle_text)
            if matches:
                new_list = [f'{item}' for item in matches]
                jg = '$$$'.join(new_list)
                return jg

    def get_category_list(self, doc):
        soups = doc.find('ul', class_="text-nowrap")
        vods = soups.find_all('li')
        return vods

    def extract_category_info(self, vod):
        name = vod.text.strip()
        id = vod.find('a')['href']
        return {"type_id": id, "type_name":"乐哥🌠" + name}

    def fetch_document(self):
        detail = requests.get(url=xurl, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        doc = BeautifulSoup(res, "lxml")
        return doc

    def homeContent(self, filter):
        result = {"class": []}
        doc = self.fetch_document()
        vods = self.get_category_list(doc)
        for vod in vods:
            category_info = self.extract_category_info(vod)
            result["class"].append(category_info)
        return result

    def homeVideoContent(self):
        pass

    def decrypt_image(self, encrypted_bytes: bytes, image_extension: str) -> bytes:
        CONFIG = {
            "key": "f5d965df75336270",
            "iv": "97b60394abc2fbe1",
            "mode": "CBC",
            "padding": "PKCS7"
                 }
        from Crypto.Cipher import AES
        from Crypto.Util.Padding import unpad
        cipher = AES.new(
            key=CONFIG["key"].encode("utf-8"),
            mode=AES.MODE_CBC,
            iv=CONFIG["iv"].encode("utf-8")
                        )
        try:
            decrypted_padded_bytes = cipher.decrypt(encrypted_bytes)
        except ValueError as e:
            return None
        try:
            final_image_bytes = unpad(decrypted_padded_bytes, AES.block_size)
            return final_image_bytes
        except ValueError as e:
            return None
        except Exception as e:
            return None

    def download_and_decrypt_image(self, url: str) -> tuple:
        import requests
        try:
            response = requests.get(url, headers=headerx, timeout=30)
            response.raise_for_status()
            if response.content.startswith(b'data:'):
                mime_end = response.content.find(b';')
                mime_type = response.content[5:mime_end].decode('utf-8')
                image_extension = mime_type.split('/')[-1]
                comma_pos = response.content.find(b',')
                if comma_pos == -1:
                    return None, None
                encrypted_raw_bytes = response.content[comma_pos + 1:]
            else:
                encrypted_raw_bytes = response.content
                image_extension = url.split('.')[-1].lower()
            decrypted_image_bytes = self.decrypt_image(encrypted_raw_bytes, image_extension)
            if decrypted_image_bytes:
                return decrypted_image_bytes, image_extension
            else:
                return None, None
        except requests.exceptions.RequestException as e:
            return None, None

    def convert_to_base64_image(self, image_bytes: bytes, image_extension: str) -> str:
        import base64
        if not image_bytes:
            return None
        base64_encoded = base64.b64encode(image_bytes).decode('utf-8')
        mime_type = f"image/{image_extension}" if image_extension != 'jpg' else 'image/jpeg'
        if image_extension == 'jpg':
            mime_type = 'image/jpeg'
        elif image_extension == 'svg':
            mime_type = 'image/svg+xml'
        else:
            mime_type = f"image/{image_extension}"
        base64_image_url = f"data:{mime_type};base64,{base64_encoded}"
        return base64_image_url

    def process_encrypted_image(self, encrypted_image_url: str) -> str:
        final_image_data, extension = self.download_and_decrypt_image(encrypted_image_url)
        base64_image = self.convert_to_base64_image(final_image_data, extension)
        return base64_image

    def categoryContent(self, cid, pg, filter, ext):
        result = {}
        videos = []
        page = int(pg) if pg else 1
        url = f'{xurl}{cid}/page/{str(page)}/'
        doc = self.fetch_category_document(url)
        soups = doc.find_all('ul', class_="video-items")
        for soup in soups:
            vods = soup.find_all('li')
            for vod in vods:
                video = self.extract_video_info(vod)
                videos.append(video)
        result = {'list': videos}
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def fetch_category_document(self, url):
        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        doc = BeautifulSoup(res, "lxml")
        return doc

    def extract_video_info(self, vod):
        name = vod.find('img')['alt']
        ids = vod.find('a', class_="my-1")
        id = ids['href']
        pic = vod.find('img')['data-src']
        pic = self.process_encrypted_image(pic)
        remarks = vod.find('div', class_="truncate")
        remark = remarks.text.strip() if remarks else ""
        remark = remark.replace('\n', '')
        video = {
            "vod_id": id,
            "vod_name": name,
            "vod_pic": pic,
            "vod_remarks": remark
                }
        return video

    def detailContent(self, ids):
        did = ids[0]
        result = {}
        videos = []
        did = self.process_video_id(did)
        res = self.fetch_video_detail(did)
        content = self.extract_video_content(res)
        bofang = self.extract_embed_url(res)
        videos.append({
            "vod_id": did,
            "vod_content": content,
            "vod_play_from": "乐哥专线",
            "vod_play_url": bofang
                      })
        result['list'] = videos
        return result

    def process_video_id(self, did):
        if 'http' not in did:
            did = xurl + did
        return did

    def fetch_video_detail(self, did):
        detail = requests.get(url=did, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        return res

    def extract_video_content(self, res):
        content = '😸乐哥为您介绍剧情📢' + self.extract_middle_text(res, '"description": "', '"', 0)
        return content

    def extract_embed_url(self, res):
        bofang = self.extract_middle_text(res, '"embedUrl": "', '"', 0)
        return bofang

    def playerContent(self, flag, id, vipFlags):
        res = self.fetch_player_page(id)
        url = self.extract_video_url(res)
        result = {}
        result["parse"] = 0
        result["playUrl"] = ''
        result["url"] = url
        result["header"] = headerx
        return result

    def fetch_player_page(self, id):
        detail = requests.get(url=id, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        return res

    def extract_video_url(self, res):
        url = self.extract_middle_text(res, '<source src="', '"', 0).replace('\\', '')
        return url

    def searchContentPage(self, key, quick, pg):
        result = {}
        videos = []
        page = int(pg) if pg else 1
        url = f'{xurl}/videos/search/{key}/page/{str(page)}/'
        doc = self.fetch_search_document(url)
        soups = doc.find_all('ul', class_="video-items")
        for soup in soups:
            vods = soup.find_all('li')
            for vod in vods:
                video = self.extract_search_video_info(vod)
                videos.append(video)
        result['list'] = videos
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def fetch_search_document(self, url):
        detail = requests.get(url=url, headers=headerx)
        detail.encoding = "utf-8"
        res = detail.text
        doc = BeautifulSoup(res, "lxml")
        return doc

    def extract_search_video_info(self, vod):
        name = vod.find('img')['alt']
        ids = vod.find('a', class_="my-1")
        id = ids['href']
        pic = vod.find('img')['data-src']
        pic = self.process_encrypted_image(pic)
        remarks = vod.find('div', class_="truncate")
        remark = remarks.text.strip() if remarks else ""
        remark = remark.replace('\n', '')
        video = {
            "vod_id": id,
            "vod_name": name,
            "vod_pic": pic,
            "vod_remarks": remark
                }
        return video

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










