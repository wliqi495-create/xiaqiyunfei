# 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
# 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

"""
示例
{
    "key": "key",
    "name": "name",
    "type": 3,
    "api": "./AppMuou.py",
    "ext": {
        "host": "https://muouapp.oss-cn-hangzhou.domain.com/xxx/xxx.txt",  应用域名(支持txt或域名)
        "name": "xxx", 应用名称
        "version": "4.2.0"  应用版本号
    }
}
"""

from Crypto.Cipher import AES
from base.spider import Spider
from Crypto.Util.Padding import unpad
import re,sys,time,json,base64,hashlib,urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.append('..')

class Spider(Spider):
    host,name,version,data_key,data_iv,cms_host,jx_api,playerinfo,= '', '', '', '', '', '', '',[]
    headers = {
        'User-Agent': "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 MUOUAPP/10.8.4506.400",
        'Accept-Encoding': "gzip",
        'brand-model': "xiaomi",
        'app-device': "nodata",
        'app-time': "",
        'sys-version': "12",
        'device': "831395239bddf2e6",
        'os': "Android",
        'app-version': version
    }

    def init(self, extend=""):
        try:
            config = json.loads(extend)
        except (json.JSONDecodeError, TypeError):
            config = {}
        name = config.get("name", "muou")
        self.headers['app-version'] = config.get("version", "4.2.0")
        self.host = config['host']
        if not re.match(r'^https?:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(:\d+)?(\/)?$', self.host):
            self.host = self.fetch(self.host, headers=self.headers, timeout=10, verify=False).text.rstrip('/')
        timestamp = int(time.time())
        self.headers['app-time'] = str(timestamp)
        inner_sha1 = hashlib.sha1(f"{timestamp}{name}".encode('utf-8')).hexdigest()
        outer_sha1 = hashlib.sha1(f"{timestamp}{inner_sha1}muouapp".encode('utf-8')).hexdigest()
        payload = { 't': timestamp, 'n': inner_sha1, 'm': outer_sha1 }
        try:
            response = self.post(f'{self.host}/app_info.php', data=payload)
            if response.status_code != 200:
                return '-2 数据获取失败'
            dat = response.text
        except:
            return '-2 数据获取失败'
        try:
            dat2 = json.loads(dat)
        except:
            return '-2 数据获取失败'
        data = dat2.get('data', '')
        a = dat2.get('a', '')
        e = dat2.get('e', '')
        s = dat2.get('s', '')
        if not a or not e or not s:
            return '-3 参数获取失败'
        data2 = self.t(data, s, e)
        key = hashlib.md5(a.encode('utf-8')).hexdigest()[:16]
        iv = hashlib.md5(outer_sha1.encode('utf-8')).hexdigest()[:16]
        result = self.decrypt(data2, key, iv)
        if not result:
            return '-4 解密失败'
        try:
            dat3 = json.loads(result)
        except:
            return '-5 解密失败'
        key2 = dat3['key']
        iv2 = dat3['iv']
        self.data_key = hashlib.md5(key2.encode('utf-8')).hexdigest()[:16]
        self.data_iv = hashlib.md5(iv2.encode('utf-8')).hexdigest()[:16]
        self.cms_host = dat3['HBqq']
        jx_api = dat3.get('HBrjjg','')
        if jx_api.startswith('http'):
            self.jx_api = jx_api
        return None

    def homeContent(self, filter):
        if not self.cms_host:
            return {'list': []}
        self.headers['app-time'] = str(int(time.time()))
        try:
            response = self.fetch(f'{self.cms_host}/api.php/v1.vod/types', headers=self.headers).text
        except Exception as e:
            return {"class": [], "filters": {}}

        try:
            data = json.loads(response) or {}
        except json.JSONDecodeError:
            try:
                data = json.loads(self.decrypt(response))
            except (json.JSONDecodeError, TypeError):
                return {"class": [], "filters": {}}
        filter_keys = {"class", "area", "lang", "year", "letter", "by", "sort"}
        filters = {}
        classes = []
        typelist = data.get('data', {}).get('typelist', [])
        for item in typelist:
            type_id = str(item["type_id"])
            classes.append({"type_name": item["type_name"], "type_id": type_id})
            extend = item.get("type_extend", {})
            type_filters = []
            for key, value_str in extend.items():
                if key not in filter_keys:
                    continue
                stripped = value_str.strip()
                if not stripped:
                    continue
                values = [v.strip() for v in stripped.split(",") if v.strip()]
                if not values:
                    continue
                type_filters.append({
                    "key": key,
                    "name": key,
                    "value": [{"n": v, "v": v} for v in values]
                })
            if type_filters:
                filters[type_id] = type_filters
        return {"class": classes, "filters": filters}

    def homeVideoContent(self):
        if not self.cms_host:
            return {'list': []}
        self.headers['app-time'] = str(int(time.time()))
        print(f'{self.cms_host}/api.php/v1.vod/HomeIndex?page=&limit=6')
        response = self.fetch(f'{self.cms_host}/api.php/v1.vod/HomeIndex?page=&limit=6', headers=self.headers).text
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError):
            data_ = self.decrypt(response)
            data = json.loads(data_)
        videos = []
        for i in data['data']:
            if i.get('vod_list'):
                vod_list = i['vod_list']
                for j in vod_list:
                    pic = j.get('vod_pic')
                    if pic:
                        if not pic.startswith('http'):
                            j['vod_pic'] = self.cms_host + pic
                videos.extend(vod_list)
        return {'list': videos}

    def detailContent(self, ids):
        self.headers['app-time'] = str(int(time.time()))
        response = self.fetch(f'{self.cms_host}/api.php/v1.vod/detail?vod_id={ids[0]}', headers=self.headers).text
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError):
            data_ = self.decrypt(response)
            data = json.loads(data_)
        data =  data['data']
        if data == '':
            return {'list': []}
        vod_play_url = ''
        show = ''
        for i,j in data['vod_play_list'].items():
            show += j['player_info']['show'] + '$$$'
            urls = j.get('urls',{})
            play_url = ''
            if isinstance(urls, dict):
                for i2,j2 in urls.items():
                    play_url += f"{j2['name']}${j2['from']}@{j2['url']}#"
                play_url = play_url.rstrip('#')
                vod_play_url += play_url + '$$$'
        data['vod_play_from'] = show.rstrip('$$$')
        data['vod_play_url'] = vod_play_url.rstrip('$$$')
        data['vod_play_note'] = '$$$'
        data.pop('vod_play_list')
        data.pop('type')
        return {'list': [data]}

    def searchContent(self, key, quick, pg="1"):
        if not self.cms_host:
            return {'list': []}
        self.headers['app-time'] = str(int(time.time()))
        response = self.fetch(f'{self.cms_host}/api.php/v1.vod?wd={key}&limit=18&page={pg}', headers=self.headers).text
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError):
            data_ = self.decrypt(response)
            data = json.loads(data_)
        videos = data['data']['list']
        for item in data['data']['list']:
            item.pop('type', None)
        return {'list': videos, 'page': pg}

    def categoryContent(self, tid, pg, filter, extend):
        if not self.cms_host:
            return {'list': []}
        self.headers['app-time'] = str(int(time.time()))
        response = self.fetch(
            f"{self.cms_host}/api.php/v1.vod?type={tid}&class={extend.get('class', '')}&area={extend.get('area', '')}&year={extend.get('year', '')}&by=time&page={pg}&limit=18",
            headers=self.headers).text
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError):
            data_ = self.decrypt(response)
            data = json.loads(data_)
        videos = data['data']['list']
        for item in data['data']['list']:
            pic = item.get('vod_pic', '')
            if pic:
                if not pic.startswith('http'):
                    item['vod_pic'] = self.cms_host + pic
            item.pop('type', None)
        print(videos)
        return {'list': videos, 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        play_from, raw_url = id.split('@')
        jx,url,playurl, = 1,raw_url,''
        try:
            if not self.playerinfo:
                res = self.fetch(f'{self.host}/api.php?action=playerinfo',headers=self.headers).text
                data = self.decrypt(res)
                playerinfo  =json.loads(data).get('data',{}).get('playerinfo',[])
                if len(playerinfo) > 1:
                    self.playerinfo = playerinfo
            if self.playerinfo:
                for i in self.playerinfo:
                    play_jx = i.get('playerjiekou','')
                    if i.get('playername') == play_from and play_jx.startswith('http'):
                        response = self.fetch(f'{play_jx}{raw_url}&playerkey={play_from}',headers=self.headers,verify=False).text
                        try:
                            data = json.loads(response)
                        except (json.JSONDecodeError, TypeError):
                            data_ = self.decrypt(response)
                            data = json.loads(data_)
                        if str(data.get('code','')) == '403':
                            playurl = ''
                        else:
                            playurl = data['url']
                            jx = 0
        except Exception:
            playurl = ''

        if playurl.startswith('http'):
            url = playurl
        else:
            if re.search(r'^https?[^\s]*\.(m3u8|mp4|flv)', raw_url, re.I):
                url = raw_url
                jx = 0
            else:
                try:
                    response = self.fetch(self.jx_api + raw_url,headers=self.headers,verify=False).text
                    try:
                        data = json.loads(response)
                    except (json.JSONDecodeError, TypeError):
                        data_ = self.decrypt(response)
                        data = json.loads(data_)
                    playurl = data.get('url','')
                    if playurl.startswith('http'):
                        jx,url = 0,playurl
                    else:
                        jx,url = 1,raw_url
                except Exception as e:
                    jx,url = 1,raw_url
        if url.startswith('NBY-'):
            jx,url = 0,''
        return {'jx': jx, 'parse': 0, 'url': url,'header': {'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 MUOUAPP/10.8.4506.400'}}

    def decrypt(self,data, key='', iv=''):
        if not(key or iv):
            key = self.data_key
            iv = self.data_iv
        key_bytes = key.encode('utf-8')
        iv_bytes = iv.encode('utf-8')
        encrypted_data = base64.b64decode(data)
        cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
        decrypted_padded = cipher.decrypt(encrypted_data)
        decrypted = unpad(decrypted_padded, AES.block_size)
        return decrypted.decode('utf-8')

    def t(self, s, v, v1):
        if s is not None and s != '':
            n = len(s)
            if v < 0 or v1 < 0:
                raise ValueError("参数不能为负数")
            if v + v1 <= n:
                return s[v:n - v1]
            else:
                return ''
        return s

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
