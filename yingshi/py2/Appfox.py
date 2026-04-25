# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

import re,sys,json,urllib3
from base.spider import Spider
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    headers,host,froms,detail,custom_first,parses,custom_parses = {
        'User-Agent': "Mozilla/5.0 (Linux; Android 12; SM-S9080 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36",
        'Connection': "Keep-Alive",
        'Accept-Encoding': "gzip",
        'Accept-Language': "zh-CN,zh;q=0.8",
        'Cache-Control': "no-cache"
    },'','','','',{},{}

    def init(self, extend=''):
        ext = extend.strip()
        if ext.startswith('http'):
            host = ext
        else:
            arr = json.loads(ext)
            host = arr['host']
            self.froms = arr.get('from', '')
            self.custom_parses = arr.get('parse', {})
            self.custom_first = arr.get('custom_first',0)
        if not re.match(r'^https?:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(:\d+)?(\/)?$', host):
                host = self.fetch(host, headers=self.headers, verify=False).json()['apiDomain']
        self.host = host.rstrip('/')

    def homeContent(self, filter):
        if not self.host: return None
        response = self.fetch(f'{self.host}/api.php/Appfox/init', headers=self.headers, verify=False).json()
        classes = []
        for i in response['data']['type_list']:
            classes.append({'type_id': i['type_id'],'type_name': i['type_name']})
        return {'class': classes}

    def homeVideoContent(self):
        if not self.host: return None
        response = self.fetch(f'{self.host}/api.php/Appfox/index', headers=self.headers, verify=False).json()
        data = response['data']
        videos = []
        for i in data:
            for j in i.get('banner', []):
                videos.append(j)
            for k in i.get('categories', []):
                for l in k.get('videos',[]):
                    videos.append(l)
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        if not self.host: return None
        response = self.fetch(f"{self.host}/api.php/Appfox/vodList?type_id={tid}&class=全部&area=全部&lang=全部&year=全部&sort=最新&page={pg}", headers=self.headers, verify=False).json()
        videos = []
        for i in response['data']['recommend_list']:
            videos.append(i)
        return {'list': videos}

    def searchContent(self, key, quick, pg='1'):
        if not self.host: return None
        path = f"{self.host}/api.php/Appfox/vod?ac=detail&wd={key}"
        if self.froms: path += '&from=' + self.froms
        response = self.fetch(path, headers=self.headers, verify=False, timeout=7).json()
        self.detail = response['list']
        return response

    def detailContent(self, ids):
        video = next((i.copy() for i in self.detail if str(i['vod_id']) == str(ids[0])), None)
        if not video:
            detail_response = self.fetch(f"{self.host}/api.php/Appfox/vod?ac=detail&ids={ids[0]}",headers=self.headers,verify=False).json()
            video = detail_response.get('list')[0]
        if not video: return {'list': []}
        play_from = video['vod_play_from'].split('$$$')
        play_urls = video['vod_play_url'].split('$$$')
        try:
            config_response = self.fetch(f"{self.host}/api.php/Appfox/config",headers=self.headers,verify=False).json()
            player_list = config_response.get('data', {}).get('playerList', [])
            jiexi_data_list = config_response.get('data', {}).get('jiexiDataList', [])
        except Exception:
            return {'list': [video]}
        player_map = {player['playerCode']: player for player in player_list}
        processed_play_urls = []
        for idx, play_code in enumerate(play_from):
            if play_code in player_map:
                player_info = player_map[play_code]
                if player_info['playerCode'] != player_info['playerName']:
                    play_from[idx] = f"{player_info['playerName']}\u2005({play_code})"
            if idx < len(play_urls):
                urls = play_urls[idx].split('#')
                processed_urls = []
                for url in urls:
                    parts = url.split('$')
                    if len(parts) >= 2:
                        parts[1] = f"{play_code}@{parts[1]}"
                        processed_urls.append('$'.join(parts))
                    else:
                        processed_urls.append(url)
                processed_play_urls.append('#'.join(processed_urls))
        video['vod_play_from'] = '$$$'.join(play_from)
        video['vod_play_url'] = '$$$'.join(processed_play_urls)
        self.parses = {p['playerCode']: p['url'] for p in jiexi_data_list if p.get('url', '').startswith('http')}
        return {'list': [video]}

    def playerContent(self, flag, id, vipflags):
        play_from, raw_url = id.split('@', 1)
        jx, parse, parsed = 0, 0, 0
        url = raw_url
        parses_main = []
        if self.custom_first == 1:
            parses_main.append(self.custom_parses)
            parses_main.append(self.parses)
        else:
            parses_main.append(self.parses)
            parses_main.append(self.custom_parses)
        print(parses_main)
        for parses2 in parses_main:
            if not parsed and not re.match(r'https?://.*\.(m3u8|mp4|flv|mkv)', url):
                for key, parsers in parses2.items():
                    if play_from not in key:
                        continue
                    if isinstance(parsers, list):
                        for parser in parsers:
                            if parser.startswith('parse:'):
                                url, jx, parse = parser.split('parse:')[1] + raw_url, 0, 1
                                break
                            try:
                                response = self.fetch(f"{parser}{raw_url}", headers=self.headers, verify=False).json()
                                if response.get('url', '').startswith('http'):
                                    url, parsed = response['url'], 1
                                    break
                            except Exception:
                                continue
                    else:
                        if parsers.startswith('parse:'):
                            url, jx, parse = parsers.split('parse:')[1] + raw_url, 0, 1
                            break
                        try:
                            response = self.fetch(f"{parsers}{raw_url}", headers=self.headers, verify=False).json()
                            if response.get('url', '').startswith('http'):
                                url, parsed = response['url'], 1
                                break
                        except Exception:
                            continue
                    if parsed or parse:
                        break
            if parsed or parse:
                break
        if not (re.match(r'https?:\/\/.*\.(m3u8|mp4|flv|mkv)', url) or parsed == 1):
            jx = 1
        return {'jx': jx, 'parse': parse, 'url': url, 'header': {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'}}

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
