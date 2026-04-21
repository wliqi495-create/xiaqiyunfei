# -*- coding: utf-8 -*-
# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

from base.spider import Spider
from Crypto.PublicKey import RSA
from Crypto.Util.Padding import pad
from Crypto.Cipher import AES, PKCS1_v1_5
import sys,time,json,base64,urllib3,hashlib
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    host, android_id, init_sign_salt, app_cert_sha1, private_key, token, timeout, headers = ('','','','','','','',
    {
        'User-Agent': "okhttp-okgo/jeasonlzy",
        'Connection': "Keep-Alive",
        'Accept-Encoding': "gzip",
        'Accept-Language': "zh-CN,zh;q=0.8",
        'sign': "",
        'devicename': "Xiaomi 15",
        'deviceos': "15",
        'bundleid': "",
        'versionname': "2.1.0",
        'versioncode': "2001000",
        'vendor': "Xiaomi",
        'chid': "26002",
        'subchid': "26002",
        'os': "1",
        'screenpx': "2670*1200",
        'nettype': "wifi",
        'audit': "1",
        'force': "1"
    })

    def init(self, extend=''):
        try:
            config = json.loads(extend)
        except (json.JSONDecodeError, TypeError):
            config = {}
        self.timeout = config.get('timeout', 15)
        self.host = config.get('host', 'http://api-live.vfilm.life')
        self.android_id = config.get('android_id', '6617a62678360a86')
        self.init_sign_salt = config.get('init_sign_salt', 'lsdfnrtpmslscndy')
        self.app_cert_sha1 = config.get('app_cert_sha1', '70:27:C9:DC:98:96:75:CD:35:DB:0C:CE:AC:CA:84:0A:B7:1E:B5:7F')
        self.private_key = config.get('private_key', 'MIICWwIBAAKBgQDYJzTUOgYdR/eIhsjpNMYWQGYl3pBycwKDoL6KThpPwrZQ9+xv\nLSaPj92HQknVaWR/RD6tHVRysChoeqAFyyQUe4UXAYnJDNlurpELb5HUIBFgmO97\niIOJCK6zbmnHT6WOHYaODTqrmX6NBgLjoFiDYBPYxG1T/K1uZ47xQDHFQQIDAQAB\nAoGAEpT8Q6phUC8ZppD/wJya0tribSr++/fLJYmyF62zMVwp1DgcCUq2X+0cPD6E\nnmYbD53MTZGR6vId5y1ziEv4Y+nu5EUyDk1xeGIxojpLhxuRoCbBt+LMJ1YUxv6p\n6F4SNwQ10U78m829Ud50mJBvkt2Vg8607SUrWheydvWHyAECQQDvayhgX5XEFaha\nUtPp5pPIkKBqHnLGm4et8be/jIIFhY9CIJbKLsqc0OFwNvz46GtRQwrtHP7LxTEF\nYT0C6CahAkEA5x+OqN/iykZIHc6Z2qZfAiLjPnQJu9DTXC/kt3TlsCc3XPNkXlAu\nq786LluH6dzQfDbLpmODtzNWavfgCtE6oQJAdTsJKDdlg//+0UthTFSE5F48zfle\nxfT9+KQ1Duvj9oQxY3XFn/ZNa3+0A1hJgi977Oxg+z2JXYmOuU2lrDi0QQJAMWwA\nF4B4gIRy21zYbXbyDgTjzvEFO9I1wBrFr60hiH96STgKmFhRAozLpioQcCO1uToG\nZjgVbFFgA1Op5uZCwQJAL1ziHIphaoCpHnnESidt3Nlrzqj/5uEpdHu7ZvPuZYya\nU8e1AhjeP+zKvfJUiXwDGuDZLx5Xe0BK8Bu72sdKcQ==')
        self.headers['bundleid'] = config.get('bundleid', 'com.ytwl.fhtq')
        self.token = config.get('token', '')
        imsi_id = config.get('imsi_id', '1')
        self.headers['sign'] = self.sign_encrypt(f'jing##&&&wei##&&&fuwu##{imsi_id}&&&idian##&&&she##{self.android_id}&&&mdian##{self.android_id}&&&olian##&&&an##{self.android_id}')

    def homeContent(self, filter):
        if not self.host: return None
        timestamp = self.timestamp()
        payload = {
            'applock': "0",
            'ncode': self.init_sign(timestamp),
            'force': "1",
            'retime': timestamp
        }
        response = self.post(f'{self.host}/news/tv/columns', data=payload, headers=self.headers, timeout=self.timeout, verify=False).json()
        classes = []
        for i in response['data']['list']:
            if i['is_show_recommend'] == 1:
                home_class_id = i.get('column_id')
                continue
            classes.append({'type_id': i['column_id'], 'type_name': i['name']})
        timestamp = self.timestamp()
        payload = {
            'column_id': home_class_id or '164',
            'ncode': self.init_sign(timestamp),
            'page': "1",
            'retime': timestamp
        }
        response = self.post(f'{self.host}/news/tv/sectionsPageByColumn', data=payload, headers=self.headers, timeout=self.timeout, verify=False).json()
        section_list = response['data']['section_list']
        videos = []
        for i in section_list:
            for j in i.get('tv_list', []):
                videos.append({
                    'vod_id': j.get('news_id'),
                    'vod_name': j.get('title', j.get('sub_title')),
                    'vod_pic': j.get('ver_pic')
                })
        return {'class': classes, 'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        timestamp = self.timestamp()
        payload = {
            'column_id': tid,
            'ncode': self.init_sign(timestamp),
            'page': pg,
            'retime': timestamp
        }
        response = self.post(f'{self.host}/news/tv/tvListByColumn', data=payload, headers=self.headers, timeout=self.timeout, verify=False).json()
        videos = []
        for i in response['data']['list']:
            up_count = i.get('up_count', '')
            if up_count:
                up_count = f'{up_count}集'
            videos.append({
                'vod_id': i.get('news_id'),
                'vod_name': i.get('title'),
                'vod_pic': i.get('ver_pic'),
                'vod_remarks': up_count,
                'vod_area': i.get('area'),
                'vod_class': i.get('cat'),
                'vod_score': i.get('score'),
                'vod_year': i.get('pubdate')
            })
        return {'list': videos, 'page': pg}

    def searchContent(self, key, quick, pg='1'):
        timestamp = self.timestamp()
        payload = {
            'ncode': self.init_sign(timestamp),
            'signKey': self.signKey(timestamp),
            'page': pg,
            'is_check': "0",
            'keyword': key,
            'retime': timestamp
        }
        response = self.post(f'{self.host}/search/wordinfo', data=payload, headers=self.headers, timeout=self.timeout, verify=False).json()
        videos = []
        for i in response['data']['search_list']:
            for j in i.get('list',[]):
                vod_remarks = j.get('up_count')
                if vod_remarks:
                    vod_remarks = f'{vod_remarks}集'
                else:
                    vod_remarks = j.get('news_type_name')
                videos.append({
                    'vod_id': j.get('news_id'),
                    'vod_name': j.get('origin_title',j.get('title')),
                    'vod_pic': j.get('ver_pic'),
                    'vod_content': j.get('desc'),
                    'vod_remarks': vod_remarks,
                    'vod_area': j.get('area'),
                })
        return {'list': videos, 'page': pg}

    def detailContent(self, ids):
        timestamp = self.timestamp()
        payload = {
            'ncode': self.init_sign(timestamp),
            'signKey': self.signKey(timestamp),
            'news_id': ids[0],
            'retime': timestamp
        }
        response = self.post(f'{self.host}/news/tv/detail', data=payload, headers=self.headers, timeout=self.timeout, verify=False).json()
        data = response['data']
        timestamp2 = self.timestamp()
        payload = {
            'next': "0",
            'pl_id': "",
            'playlink_num': "1",
            'ncode': self.init_sign(timestamp2),
            'format': "high",
            'mobile': "",
            'check': "0",
            'mpl_id': "",
            'news_id': ids[0],
            'retime': timestamp2,
            'resite': "",
            'signKey': self.signKey(timestamp2),
            'bid': "300",
            'retry': "0"
        }
        response = self.post(f'{self.host}/news/tv/multiDetail', data=payload, headers=self.headers, timeout=self.timeout, verify=False).json()
        data_ = response['data']['data']
        data2_ = self.decrypt(data_)
        data2 = json.loads(data2_)
        max_up_count = data2.get('max_up_count',data2.get('up_count'))
        news_id = data2['news_id']
        site_list_test = data2.get('test')
        if site_list_test:
            site_list = site_list_test.get('site_list',[])
        vod_play_froms = []
        vod_play_froms.extend(site_list)
        vod_play_froms = [str(item) for item in vod_play_froms]
        vod_play_urls = []
        for i in vod_play_froms:
            urls = []
            for j in range(1,int(max_up_count) + 1):
                urls.append(f"第{j}集${j}@{news_id}@{i}")
            vod_play_urls.append('#'.join(urls))
        videos = []
        up_count = data.get('up_count',data.get('max_up_count'))
        if up_count:
            up_count = f'{up_count}集'
        videos.append({
            'vod_id': data.get('news_id'),
            'vod_name': data.get('title'),
            'vod_content': data.get('desc'),
            'vod_director': data.get('dir'),
            'vod_actor': data.get('act'),
            'vod_class': data.get('cat'),
            'vod_remarks': up_count,
            'vod_area': data.get('area'),
            'vod_play_from': '$$$'.join(vod_play_froms),
            'vod_play_url': '$$$'.join(vod_play_urls)
        })
        return {'list': videos}

    def playerContent(self, flag, id, vipflags):
        jx, url, play_header = 0, '', {'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 15; 24129PN74C Build/AP3A.240617.008)'}
        episodes, news_id, resite = id.split('@', 2)
        timestamp = self.timestamp()
        payload = {
            'next': "0",
            'pl_id': "",
            'playlink_num': episodes,
            'ncode': self.init_sign(timestamp),
            'format': 'high',
            'mobile': "",
            'check': "0",
            'mpl_id': "",
            'news_id': news_id,
            'retime': timestamp,
            'resite': resite,
            'signKey': self.signKey(timestamp),
            'bid': '300',
            'retry': "0"
        }
        response = self.post(f'{self.host}/news/tv/multiDetail', data=payload, headers=self.headers,timeout=self.timeout, verify=False).json()
        data_ = response['data']['data']
        data_ = self.decrypt(data_)
        data = json.loads(data_)
        url_list = data.get('url_list', [])
        if url_list:
            for i in url_list:
                play_url = i.get('surl', '')
                if play_url.startswith('http'):
                    url = play_url
                    break
        if url:
            return {'jx': 0, 'parse': 0, 'url': url, 'header': play_header}
        cp_data = data['cp_data']
        wanneng = cp_data.get('wanneng', '')
        parse_url = ''
        if wanneng and isinstance(wanneng, dict):
            parse_url = wanneng.get('postUrl', '')
        type = cp_data.get('TYPE')
        if type == 'DIRECT':
            for i in cp_data['V']:
                for j in i.values():
                    if j.startswith(('http://', 'https://')):
                        play_url = j
                        break
        if 'play_url' in locals() and play_url:
            return {'jx': jx, 'parse': '0', 'url': play_url, 'header': play_header}
        try:
            if parse_url:
                parse_data = self.fetch(parse_url, headers={'User-Agent': "okhttp/3.10.0", 'Accept-Encoding': "gzip"}, timeout=self.timeout, verify=False).text
        except Exception:
            return {'jx': 0, 'parse': 0, 'url': ''}
        if not parse_data:
            return {'jx': 0, 'parse': 0, 'url': ''}
        timestamp2 = self.timestamp()
        vid_format = data.get('format', 'high')
        payload2 = {
            'pl_id': data.get('pl_id', ''),
            'is_down': data.get('is_down', '0'),
            'data': parse_data,
            'playlink_num': episodes,
            'ncode': self.init_sign(timestamp),
            'format': vid_format,
            'cp_id': data.get('cp_id', ''),
            'mpl_id': data.get('mpl_id', ''),
            'url': data['web_url'],
            'retime': timestamp2,
            'wn_info': json.dumps(data['cp_data'].get('wanneng', '')),
            'site': data['site'],
            'news_type': "null",
            'web_url': data['web_url'],
            'mc': "null",
            'bid': self.bid(vid_format)
        }
        response = self.post(f'{self.host}/parse/index/parse', data=payload2, headers=self.headers, timeout=self.timeout, verify=False).json()
        data2_ = response['data']['data']
        data2_ = self.decrypt(data2_)
        data2 = json.loads(data2_)
        play_url = data2['video'][0]['url']
        if play_url.startswith('http'):
            url = play_url
        return {'jx': jx, 'parse': '0', 'url': url, 'header': play_header}

    def timestamp(self):
        timestamp = time.time()
        return str(int(round(timestamp * 1000)))

    def md5(self,str):
        md5_hash = hashlib.md5()
        md5_hash.update(str.encode('utf-8'))
        return md5_hash.hexdigest()

    def init_sign(self, timestamp):
        first_md5 = self.md5(f"{self.init_sign_salt}{self.token}{self.android_id}{timestamp}")
        combined = first_md5[:10] + first_md5[22:]
        return self.md5(combined)

    def get_strings(self, str_param, str2_param):
        strlist = [
            "afv", "Cs", "D", "bd", "cs", "h", "i0", "j0", "K", "L", "M8", "N", "O", "P", "Q", "R",
            "k", "l", "m", "n", "o", "p", "q", "r", "s", "t7", "Z", "A", "B", "E", "F", "G", "H", "I",
            "J", "S16", "T", "d", "e", "f", "g", "U", "V", "W6", "u", "v", "w", "x", "y", "Xd", "Y",
            "Za0", "gw", "Us", "Vd", "Wv", "X", "Y", "Zx4", "afv", "Cs", "D", "bd", "cs", "h", "i",
            "j", "K0", "L", "M", "N", "O0", "P", "Q", "R", "k", "l1", "m", "n", "o", "p", "q", "r",
            "s1", "t", "Z", "A", "B", "E", "F5", "G", "H", "I0", "J", "S", "T", "d", "e", "f", "g1",
            "U1", "V", "W3", "u", "v2", "w", "x", "y", "Xd", "Y", "Za", "gw", "Us", "Vd", "Wv", "X",
            "Y", "Zx"
        ]
        bytes_data = str_param.encode('utf-8')
        as_list = strlist.copy()
        if str2_param and len(str2_param) > 0:
            for s in str2_param.split(','):
                as_list.append(s)
        sb = []
        for i in range(len(bytes_data)):
            abs_val = abs(bytes_data[i] - i) % 100
            if abs_val < len(as_list):
                sb.append(as_list[abs_val])
        return ''.join(sb) + "=="

    def send_increment_data(self, str_param, str2_param, str3_param=None):
        bytes_data = str2_param.encode('utf-8')
        sb = []
        loop_count = len(bytes_data) // 2
        for i in range(loop_count):
            index = (len(bytes_data) - (i % 8)) - 1
            b = bytes_data[index]
            sb.append(str(abs(bytes_data[i] - b) % 100))
            sb.append("$")
            sb.append(str((bytes_data[(len(bytes_data) - 1) - i] + b) % 100))
            sb.append("$")
        substring = ''.join(sb)[loop_count:]
        strings = self.get_strings(substring, str3_param)
        result = str_param + strings
        return result

    def sign_encrypt(self,text):
        key = "ZXJsaW5nZXJlcm5pYW5zaXl1ZWVyc2hp".encode('utf-8')
        cipher = AES.new(key, AES.MODE_ECB)
        text_bytes = text.encode('utf-8')
        padded_text = pad(text_bytes, AES.block_size)
        encrypted_bytes = cipher.encrypt(padded_text)
        encrypted_base64 = base64.b64encode(encrypted_bytes).decode('utf-8')
        return encrypted_base64

    def decrypt(self, encrypted_data):
        try:
            private_key = self.private_key
            if not private_key.startswith('-----'):
                private_key = f'-----BEGIN RSA PRIVATE KEY-----\n{private_key}\n-----END RSA PRIVATE KEY-----'
            private_key = RSA.importKey(private_key)
            cipher = PKCS1_v1_5.new(private_key)
            decoded_data = base64.b64decode(encrypted_data)
            key_size = private_key.size_in_bytes()
            decrypted_text_parts = []
            if len(decoded_data) > key_size:
                i = 0
                while i < len(decoded_data):
                    chunk = decoded_data[i:i + key_size]
                    decrypted_chunk = cipher.decrypt(chunk, None)
                    if decrypted_chunk is None:
                        raise ValueError("解密失败，可能是数据损坏或密钥不匹配")
                    decrypted_text_parts.append(decrypted_chunk.decode('utf-8'))
                    i += key_size
            else:
                decrypted_data = cipher.decrypt(decoded_data, None)
                if decrypted_data is None:
                    raise ValueError("解密失败，可能是数据损坏或密钥不匹配")
                decrypted_text_parts.append(decrypted_data.decode('utf-8'))
            return ''.join(decrypted_text_parts)
        except Exception:
            return None

    def signKey(self,timestamp):
        return self.send_increment_data(timestamp, f'{self.android_id}{self.md5(self.app_cert_sha1)}{timestamp}')

    def bid(self, str_param):
        str_to_c2 = {
            "fluent": 2, "normal": 4, "super2": 15, "4K": 22, "4k": 23, "原画": 13,
            "标清": 3, "极速": 1, "流畅": 0, "蓝光": 14, "超清": 9, "高清": 5,
            "360P": 17, "360p": 16, "540P": 8, "540p": 7, "720P": 12, "720p": 11,
            "high": 6, "1080P": 19, "1080p": 18, "1280P": 21, "1280p": 20, "super": 10
        }
        result_mapping = [
            (0, 2, "200", "fluent"), (3, 4, "300", "normal"), (5, 8, "300", "high"), (9, 10, "500", "super"),
            (11, 12, "400", "super2"),
            (13, 15, "600", "super2"), (16, 17, "200", "normal"), (18, 19, "500", "super2"), (20, 21, "600", "super2"),
            (22, 23, "800", "super2")
        ]
        if not str_param:
            return {}
        c2 = str_to_c2.get(str_param, 65535)
        for min_val, max_val, bid, fmt in result_mapping:
            if min_val <= c2 <= max_val:
                return bid
        return "300"

    def homeVideoContent(self):
        pass

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