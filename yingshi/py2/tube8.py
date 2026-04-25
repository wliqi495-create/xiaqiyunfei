# coding=utf-8
# !/usr/bin/python
import re
import sys
from pyquery import PyQuery as pq
from requests import Session

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):

    def init(self, extend=""):
        self.host = "https://www.tube8.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.98 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': self.host + '/',
        }
        self.session = Session()
        self.session.headers.update(self.headers)
        
        self.cat_map = {
            'amateur': '业余自拍', 'anal': '肛交', 'asian': '亚裔', 'bigdick': '大屌', 
            'blowjob': '口交', 'creampie': '内射', 'ebony': '黑人', 'fetish': '恋物', 
            'gay': '同性', 'hardcore': '硬核', 'hentai': '动漫', 'latina': '拉丁', 
            'lesbian': '女同', 'mature': '熟女', 'milf': '人妻', 'public': '公共场所', 
            'teens': '少女(18+)', 'threesome': '3P/多P', 'vr-porn': 'VR视频', 
            'big-tits': '巨乳', 'blonde': '金发', 'facial': '颜射', 'gangbang': '群交', 
            'handjob': '手淫', 'massage': '按摩', 'masturbation': '自慰', 'pov': '第一人称', 
            'roleplay': '角色扮演', 'squirt': '潮吹', 'stockings': '丝袜', 'student': '学生', 
            'babe': '美女', 'bbw': '肥满', 'brunette': '黑发', 'bukkake': '颜射派对', 
            'cartoon': '卡通', 'casting': '试镜', 'compilation': '合集', 'cosplay': 'Cosplay', 
            'couple': '情侣', 'cumshot': '射精', 'double-penetration': '双洞', 
            'euro': '欧洲', 'funny': '搞笑', 'group-sex': '群交', 'homemade': '自制', 
            'indian': '印度', 'interracial': '跨种族', 'japanese': '日本', 'outdoor': '户外', 
            'reality': '真人秀', 'redhead': '红发', 'school': '学校', 'step-fantasy': '继亲幻想', 
            'striptease': '脱衣舞', 'toys': '玩具', 'vintage': '经典', 'webcam': '网络摄像头',
            'china': '中国', 'korean': '韩国', 'thai': '泰国', 'filipina': '菲律宾',
            'vietnamese': '越南', 'taiwanese': '台湾', 'hong-kong': '香港',
            'russian': '俄罗斯', 'german': '德国', 'french': '法国', 'british': '英国',
            'american': '美国', 'italian': '意大利', 'brazilian': '巴西', 'czech': '捷克'
        }

    def homeContent(self, filter):
        classes = [
            {'type_name': '最新视频', 'type_id': '/newest'},
            {'type_name': '类别大全', 'type_id': '/categories'},
            {'type_name': '全部频道', 'type_id': '/channels'},
            {'type_name': '全部明星', 'type_id': '/pornstars'}
        ]
        
        sort_filter = {'key': 'sort', 'name': '排序', 'value': [
            {'n': '最新', 'v': ''},
            {'n': '最热', 'v': '/most-viewed'},
            {'n': '评分', 'v': '/best'},
            {'n': '最长', 'v': '/longest'}
        ]}
        
        filter_config = {}
        for item in classes:
            filter_config[item['type_id']] = [sort_filter]

        return {'class': classes, 'filters': filter_config}

    def homeVideoContent(self):
        return self.categoryContent('/newest', 1, None, None)

    def categoryContent(self, tid, pg, filter, extend):
        if extend is None: extend = {}
        vdata = []
        
        if tid == '/categories':
            data = self.getpq('/categories.html')
            for i in data('a[href*="/cat/"]').items():
                href = i.attr('href')
                if not href or 'porn-video' in href: continue
                
                cat_key = href.strip('/').split('/')[-1]
                raw_name = i.text().replace('Category', '').strip()
                name = self.cat_map.get(cat_key, raw_name)
                vdata.append(self._make_folder(href, name, '', 1.33))

        elif tid == '/channels':
            url = f"/channels/page/{pg}/" if str(pg) != "1" else "/channels"
            data = self.getpq(url)
            for i in data('a[href*="/channel/"]').items():
                href = i.attr('href')
                if not href or 'porn-video' in href: continue
                
                name = i.find('.channel-name').text() or i.find('.title').text() or i.text()
                pic = i.find('img').attr('src') or i.find('img').attr('data-src') or ''
                vdata.append(self._make_folder(href, name, pic, 1.0))

        elif tid == '/pornstars':
            url = f"/pornstars/page/{pg}/" if str(pg) != "1" else "/pornstars"
            data = self.getpq(url)
            for i in data('a[href*="/pornstar/"]').items():
                href = i.attr('href')
                if not href or 'porn-video' in href: continue
                
                name = i.find('.pornstar-name').text() or i.text()
                pic = i.find('img').attr('src') or i.find('img').attr('data-src') or ''
                vdata.append(self._make_folder(href, name, pic, 0.75))

        else:
            real_tid = tid.replace('folder_', '').rstrip('/')
            
            sort_suffix = extend.get('sort', '')
            if sort_suffix and sort_suffix not in real_tid:
                real_tid += sort_suffix

            full_url_check = self._fix_url(real_tid)
            is_entity_page = '/pornstar/' in full_url_check or '/channel/' in full_url_check

            if str(pg) == "1":
                url = real_tid
            else:
                if is_entity_page:
                    url = f"{real_tid}/?page={pg}"
                else:
                    url = f"{real_tid}/page/{pg}/"
            
            data = self.getpq(self._fix_url(url))
            vdata = self.getlist(data)

        return {'page': pg, 'pagecount': 9999, 'limit': 20, 'total': 999999, 'list': vdata}

    def detailContent(self, ids):
        page_url = ids[0]
        try:
            response = self.session.get(page_url)
            data = response.text
        except Exception:
            return {'list': []}

        if response.status_code == 404 or \
           any(x in data for x in ["has been flagged", "Disabled Video", "Removed Video", "Inactive Video"]):
            return {'list': [{'vod_name': '视频已删除', 'vod_play_url': ''}]}

        d = pq(data)
        title = d('meta[property="og:title"]').attr('content') or "Unknown"
        cover = d('meta[property="og:image"]').attr('content')
        
        video_urls = []
        try:
            match = re.search(r'"format":"mp4",.*?"videoUrl":"([^"]+)"', data)
            if match:
                json_url = match.group(1).replace("\\/", "/")
                json_res = self.session.get(json_url).json()
                
                valid_urls = []
                q_map = {'4K': 2160, '2160': 2160, '1440': 1440, '1080': 1080, '720': 720, '480': 480, '240': 240}
                
                for elem in json_res:
                    quality = str(elem.get('quality', 'SD')).upper()
                    if not quality.endswith('P'): quality += 'P'
                    
                    q_val = 0
                    for k, v in q_map.items():
                        if k in quality: 
                            q_val = v
                            break
                    
                    if elem.get('videoUrl'):
                        valid_urls.append({'q': quality, 'v': q_val, 'url': elem['videoUrl']})
                
                valid_urls.sort(key=lambda x: x['v'], reverse=True)
                video_urls = [f"{i['q']}${i['url']}" for i in valid_urls]
            else:
                 video_urls.append("解析失败$ERROR")
        except Exception as e:
            video_urls.append(f"解析异常${str(e)}")

        return {'list': [{'vod_name': title, 'vod_pic': cover, 'vod_play_from': 'Tube8', 'vod_play_url': '#'.join(video_urls)}]}

    def searchContent(self, key, quick, pg="1"):
        url = f'/searches.html?q={key}&page={pg}'
        return {'list': self.getlist(self.getpq(url)), 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        return {'parse': 0, 'url': id, 'header': self.headers}

    def getlist(self, data):
        vlist = []
        for i in data('.video-box, .videoblock').items():
            link = i('a.tmvideolink') or i('a')
            href = link.attr('href')
            if not href or 'porn-video' not in href: continue
            
            title = i('.video-title-text').text() or link.attr('title') or i('img').attr('alt')
            pic = i('img.thumb-image').attr('data-src') or i('img').attr('src')
            duration = i('.video-duration').text()

            vlist.append({
                'vod_id': self._fix_url(href),
                'vod_name': title,
                'vod_pic': pic or '',
                'vod_remarks': duration,
                'style': {'ratio': 1.77, 'type': 'rect'}
            })
        return vlist

    def getpq(self, url):
        url = self._fix_url(url)
        try:
            return pq(self.session.get(url).text)
        except Exception:
            return pq("<html></html>")

    def _fix_url(self, url):
        if not url.startswith('http'):
            return self.host + ('' if url.startswith('/') else '/') + url
        return url

    def _make_folder(self, href, name, pic, ratio):
        return {
            'vod_id': f"folder_{href}",
            'vod_name': name.strip(),
            'vod_pic': pic,
            'vod_tag': 'folder',
            'style': {'ratio': ratio, 'type': 'rect'}
        }
