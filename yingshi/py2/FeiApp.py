# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

import re,sys,urllib3
from base.spider import Spider
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    headers,host = {
        'User-Agent': "okhttp/4.9.3",
        'Accept-Encoding': "gzip"
    },''

    def init(self, extend=''):
        host = extend.strip()
        if host.startswith('http'):
            self.host = host.rstrip('/')

    def homeContent(self, filter):
        response = self.fetch(f'{self.host}/api.php?type=getsort', headers=self.headers,verify=False).json()
        classes = []
        for i in response['list']:
            classes.append({'type_id':i['type_id'],'type_name':i['type_name']})
        return {'class': classes}

    def homeVideoContent(self):
        response = self.fetch(f'{self.host}/api.php?type=getHome', headers=self.headers,verify=False).json()
        videos = []
        for i, j in response.items():
            if not isinstance(j, dict):
                continue
            lis = j.get('list')
            if isinstance(lis, list):
                videos.extend(lis)
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        response = self.fetch(f"{self.host}/api.php?type=getvod&type_id={tid}&page={pg}&tag={extend.get('class','全部')}&year={extend.get('year','全部')}", headers=self.headers,verify=False).json()
        return {'list': response['list'], 'page': pg}

    def searchContent(self, key, quick, pg="1"):
        response = self.fetch(f'{self.host}/api.php?type=getsearch&text={key}', headers=self.headers,verify=False).json()
        for i in response['list']:
            if not i.get('vod_content'):
                i['vod_content'] = i['vod_blurb']
        return {'list': response['list'], 'page': pg}

    def detailContent(self, ids):
        response = self.fetch(f'{self.host}/api.php?type=getVodinfo&id={ids[0]}', headers=self.headers,verify=False).json()
        show = ''
        vod_play_url = ''
        for i in response['vod_player']['list']:
            show += i.get('from','') + '$$$'
            play_url = i.get('url','')
            vod_play_url += '#'.join(f"{item}@{ids[0]}" for item in play_url.split('#')) + '$$$'
        videos = [{
            'vod_name': response.get('vod_name'),
            'vod_pic': response.get('vod_pic'),
            'vod_id': response.get('vod_id'),
            'vod_class': response.get('vod_class'),
            'vod_actor': response.get('vod_actor'),
            'vod_blurb': response.get('vod_blurb'),
            'vod_content': response.get('vod_blurb'),
            'vod_remarks': response.get('vod_remarks'),
            'vod_lang': response.get('vod_lang'),
            'vod_play_from': show.rstrip('$$$'),
            'vod_play_url': vod_play_url.rstrip('$$$')
        }]
        return {'list': videos}

    def playerContent(self, flag, id, vipflags):
        jx, ua = 0, 'Dalvik/2.1.0 (Linux; U; Android 14; Xiaomi 15 Build/SQ3A.220705.004)'
        ua2 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        vodurl, vodid = id.split('@')
        if re.match(r'https?:\/\/.*\.(m3u8|mp4|flv)', vodurl):
            url = vodurl
        else:
            try:
                response = self.fetch(f'{self.host}/api.php?type=jx&vodurl={vodurl}&vodid={vodid}', headers=self.headers,verify=False).json()
                url = response['url']
                if not url.startswith('http') or url == vodurl:
                    jx, url, ua = 1, vodurl, ua2
            except Exception:
                jx, url, ua = 1, vodurl, ua2
        return {'jx': jx, 'parse': 0, 'url': url,'header': {'User-Agent': ua}}

    def getName(self):
        pass

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def destroy(self):
        pass

    def localProxy(self, param):
        pass
