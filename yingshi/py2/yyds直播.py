# coding=utf-8
import re
import sys
import urllib.parse
import json
from pyquery import PyQuery as pq
import requests

sys.path.append('..')
from base.spider import Spider as BaseSpider


class Spider(BaseSpider):
    def __init__(self):
        super().__init__()
        self.base_url = "http://oxax.tv"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
            'Referer': self.base_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })
        
        # Updated channel list with actual image URLs where available (fetched from alternative sources since oxax.tv is currently down)
        # Images are logos from public sources like Wikimedia, channel sites, or stock images
        self.all_channels = [
            {"title": "ОХ-АХ HD", "href": "/oh-ah.html", "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSQ3gk-W-dl9-V-RPH-TFaJv1Eg6IbtRb3ENCiHdUXihMU0Qg-9IUMyUJV8_RtlT9LSY8&usqp=CAU"},
            {"title": "CineMan XXX HD", "href": "/sl-hot1.html", "image": "https://yt3.ggpht.com/ytc/AKedOLR8CSuliVmhPyo9nxofgZWCI9fZKrqL-PFki3b8=s900-c-k-c0x00ffffff-no-rj"},
            {"title": "CineMan XXX2 HD", "href": "/sl-hot2.html", "image": "https://yt3.ggpht.com/ytc/AKedOLR8CSuliVmhPyo9nxofgZWCI9fZKrqL-PFki3b8=s900-c-k-c0x00ffffff-no-rj"},
            {"title": "Brazzers TV Europe", "href": "/brazzers-tv-europe.html", "image": "https://vpnpick.com/wp-content/uploads/2019/05/Unblock-Brazzers-TV.jpg"},
            {"title": "Brazzers TV", "href": "/brazzers-tv.html", "image": "https://vpnpick.com/wp-content/uploads/2019/05/Unblock-Brazzers-TV.jpg"},
            {"title": "Red Lips", "href": "/red-lips.html", "image": "https://s.tmimgcdn.com/scr/1200x750/172200/red-lips-logo-template_172226-original.jpg"},
            {"title": "KinoXXX", "href": "/kino-xxx.html", "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRc7KHiV3wAZTd3fxOPdRhiwsaIV_Rseyhetw&usqp=CAU"},
            {"title": "XY Max HD", "href": "/xy-max-hd.html", "image": "https://tvonline.bg/wp-content/uploads/XY-Max-tv.png"},
            {"title": "XY Plus HD", "href": "/xy-plus-hd.html", "image": "https://1.bp.blogspot.com/-a_cEapx6Kn8/XCmysO6lFsI/AAAAAAAAGUA/tYPpA4natrUSP9TzOcYEq9hntj6F6I1uQCLcBGAs/s1600/XYPlus.png"},
            {"title": "XY Mix HD", "href": "/xy-mix-hd.html", "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqBz7zcnA_-3Uzc5tyziaXHYHXRKQzCbiUsBVHlMoelOkDoWubhvc58JIwTwquwhhKBhw&usqp=CAU"},
            {"title": "Barely legal", "href": "/barely-legal.html", "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQtEzEFznJo6dHBs6xljoBEYDUOFvFS29f3nthDqB0qbNVUCBMxE2CaUgdtgaBQbut7Bc&usqp=CAU"},
            {"title": "Playboy TV", "href": "/playboy-tv.html", "image": "https://seeklogo.com/images/P/playboy-tv-logo-8447C82DEB-seeklogo.com.png"},
            {"title": "Vivid Red HD", "href": "/vivid-red.html", "image": "https://www.videosatservice.eu/wp-content/uploads/2017/01/VIVID-EUROPE-TOUCH-FINAL-1.png"},
            {"title": "Exxxotica HD", "href": "/hot-pleasure.html", "image": "https://www.lyngsat.com/logo/tv/ee/exxxotica-ru.png"},
            {"title": "Babes TV", "href": "/babes-tv.html", "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzNRbMyt8e8auGhD8bWHBrsGbQxLdaWbQe7H6cM5GNmmHtksLqxZyapdmncJt_f3moNdA&usqp=CAU"},
            {"title": "Русская ночь", "href": "/russkaya-noch.html", "image": "https://new.strah.tv/uploads/posts/2019-02/medium/1549285137_extasy_big.png"},  # Using a fallback similar image
            {"title": "Pink O TV", "href": "/pink-o.html", "image": "https://adult-tv-channels.com/wp-content/uploads/2021/09/redlight-hd-logo.png"},  # Fallback
            {"title": "Erox HD", "href": "/erox-hd.html", "image": "http://okporntv.com/wp-content/uploads/e8e83fc0ec61b284c54d5ac01a282145-321x211.jpeg"},
            {"title": "Eroxxx HD", "href": "/eroxxx-hd.html", "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVg050bKmSjWZ5SARnx7qseE2UibjbnI3QAZC0BIKAI2Oiu6BewbQKFBRyjUIv54dvRVA&usqp=CAU"},
            {"title": "Hustler HD", "href": "/hustler-hd.html", "image": "https://upload.wikimedia.org/wikipedia/en/c/c0/HUSTLER_TV_HD.png"},
            {"title": "Private TV", "href": "/private-tv.html", "image": "https://adult-tv-channels.com/wp-content/uploads/2021/09/redlight-hd-logo.png"},  # Fallback, replace with actual if found
            {"title": "Redlight HD", "href": "/redlight-hd.html", "image": "https://adult-tv-channels.com/wp-content/uploads/2021/09/redlight-hd-logo.png"},
            {"title": "Penthouse Gold HD", "href": "/penthouse-gold.html", "image": "https://penthousegold.com/images/logo_phGold.png"},
            {"title": "Penthouse Quickies", "href": "/penthouse-2.html", "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQdOI0kcO2OwMdiy_TaWnwO7b4VuYh7H4HNxObeZz7fQ5NOXNLfWmj6F9PpYdb5KkS8Fo&usqp=CAU"},
            {"title": "O-la-la", "href": "/o-la-la.html", "image": "https://s.tmimgcdn.com/scr/1200x750/172200/red-lips-logo-template_172226-original.jpg"},  # Fallback
            {"title": "Blue Hustler", "href": "/blue-hustler.html", "image": "https://static.wikia.nocookie.net/tvfanon6528/images/8/80/Blue_Hustler_%282001-.n.v.%29.png/revision/latest?cb=20180312091828"},
            {"title": "Шалун", "href": "/shalun.html", "image": "https://vpnpick.com/wp-content/uploads/2019/05/Unblock-Brazzers-TV.jpg"},  # Fallback
            {"title": "Dorcel TV", "href": "/dorcel-tv.html", "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Dorcel_TV.svg/2560px-Dorcel_TV.svg.png"},
            {"title": "Extasy HD", "href": "/extasyhd.html", "image": "https://new.strah.tv/uploads/posts/2019-02/medium/1549285137_extasy_big.png"},
            {"title": "XXL", "href": "/xxl.html", "image": "https://tvonline.bg/wp-content/uploads/XY-Max-tv.png"},  # Fallback
            {"title": "FAP TV 2", "href": "/fap-tv-2.html", "image": "https://i.pinimg.com/474x/60/99/76/609976515a6060808317d4652ac63a3e.jpg"},
            {"title": "FAP TV 3", "href": "/fap-tv-3.html", "image": "http://okteve.com/wp-content/uploads/media/1cfd26a1b4f7dfb8023ff3d4c7f36ec5-520x293.jpeg"},
            {"title": "FAP TV 4", "href": "/fap-tv-4.html", "image": "http://okteve.com/wp-content/uploads/media/cd1153aece771a6d5c6be0dcfe188245-520x293.jpeg"},
            {"title": "FAP TV Parody", "href": "/fap-tv-parody.html", "image": "https://i.pinimg.com/236x/95/36/54/953654df639272bbce26ccaad434644a.jpg"},
            {"title": "FAP TV Compilation", "href": "/fap-tv-compilation.html", "image": "http://okteve.com/wp-content/uploads/media/59eb09001a388f2d691a9b1c83c0f088-520x293.jpeg"},
            {"title": "FAP TV Anal", "href": "/fap-tv-anal.html", "image": "http://okteve.com/wp-content/uploads/media/df180a1f2f441b6282ce427ecfc7ff3a-520x293.jpeg"},
            {"title": "FAP TV Teens", "href": "/fap-tv-teens.html", "image": "https://i.pinimg.com/236x/20/87/bb/2087bb0876b99a08fe7a122ab9c0ba6f.jpg"},
            {"title": "FAP TV Lesbian", "href": "/fap-tv-lesbian.html", "image": "http://okteve.com/wp-content/uploads/media/c449b41987c74cf9cc0dea2ab692b893-520x293.jpeg"},
            {"title": "FAP TV BBW", "href": "/fap-tv-bbw.html", "image": "https://adult-tv-channels.com/wp-content/uploads/2021/09/Fap-TV-logo.png"},
            {"title": "FAP TV Trans", "href": "/fap-tv-trans.html", "image": "https://adult-tv-channels.com/wp-content/uploads/2021/09/Fap-TV-logo.png"},
        ]

    def _abs_url(self, base, url):
        if not url:
            return ''
        if url.startswith('http'):
            return url
        if url.startswith('//'):
            return 'http:' + url
        if url.startswith('/'):
            return self.base_url + url
        return base.rsplit('/', 1)[0] + '/' + url

    def _get_channel_image(self, channel_name):
        # Fallback to placeholder if no image in dict
        color_map = {
            'brazzers': 'FFD700', 'playboy': 'FF69B4', 'hustler': 'DC143C',
            'penthouse': '9370DB', 'vivid': 'FF1493', 'private': '8B008B',
            'dorcel': 'FF6347', 'cineman': '4169E1', 'fap': 'FF4500',
            'xy': 'DA70D6', 'erox': 'FF00FF', 'kino': '8A2BE2',
        }
        
        color = '1E90FF'
        name_lower = channel_name.lower()
        for key, col in color_map.items():
            if key in name_lower:
                color = col
                break
        
        text = urllib.parse.quote(channel_name[:20])
        return f"https://via.placeholder.com/400x225/{color}/FFFFFF?text={text}"

    def getName(self):
        return "OXAX直播"

    def init(self, extend):
        pass

    def homeContent(self, filter):
        return {
            'class': [
                {'type_name': '全部频道', 'type_id': 'all'},
                {'type_name': 'HD频道', 'type_id': 'hd'},
                {'type_name': 'FAP系列', 'type_id': 'fap'},
            ]
        }

    def homeVideoContent(self):
        videos = []
        for ch in self.all_channels:
            videos.append({
                'vod_id': ch['href'],
                'vod_name': ch['title'],
                'vod_pic': ch.get('image', self._get_channel_image(ch['title'])),
                'vod_remarks': '直播',
            })
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg)
        items_per_page = 30
        
        if tid == 'hd':
            channels = [ch for ch in self.all_channels if 'HD' in ch['title'].upper()]
        elif tid == 'fap':
            channels = [ch for ch in self.all_channels if 'FAP' in ch['title'].upper()]
        else:
            channels = self.all_channels
        
        start = (pg - 1) * items_per_page
        end = start + items_per_page
        page_channels = channels[start:end]
        
        videos = []
        for ch in page_channels:
            videos.append({
                'vod_id': ch['href'],
                'vod_name': ch['title'],
                'vod_pic': ch.get('image', self._get_channel_image(ch['title'])),
                'vod_remarks': '直播',
            })
        
        return {
            'list': videos,
            'page': pg,
            'pagecount': max(1, (len(channels) + items_per_page - 1) // items_per_page),
            'limit': items_per_page,
            'total': len(channels),
        }

    def detailContent(self, array):
        if not array or not array[0]:
            return {'list': []}
        
        relative_path = array[0]
        detail_url = self._abs_url(self.base_url, relative_path)
        
        title = relative_path.replace('.html', '').replace('/', '').replace('-', ' ').title()
        image = self._get_channel_image(title)
        
        for ch in self.all_channels:
            if ch['href'] == relative_path:
                title = ch['title']
                image = ch.get('image', image)
                break
        
        vod = {
            'vod_id': relative_path,
            'vod_name': title,
            'vod_pic': image,
            'vod_remarks': '直播',
            'vod_content': '成人电视直播频道',
            'vod_play_from': 'OXAX',
            'vod_play_url': f'{title}${detail_url}',
        }
        
        return {'list': [vod]}

    def searchContent(self, key, quick, page='1'):
        if not key:
            return {'list': []}
        
        key_lower = key.lower()
        results = []
        
        for ch in self.all_channels:
            if key_lower in ch['title'].lower():
                results.append({
                    'vod_id': ch['href'],
                    'vod_name': ch['title'],
                    'vod_pic': ch.get('image', self._get_channel_image(ch['title'])),
                    'vod_remarks': '直播',
                })
        
        return {'list': results}

    def playerContent(self, flag, id, vipFlags):
        result = {
            "parse": 0,
            "playUrl": "",
            "url": "",
            "header": {
                "User-Agent": self.session.headers.get('User-Agent'),
                "Referer": self.base_url
            }
        }
        
        if not id:
            return result
        
        try:
            url = id
            if '$' in url:
                url = url.split('$')[1]
            
            result["url"] = f"video://{url}"
            
        except Exception as e:
            print(f"[ERROR] 播放器解析失败: {e}")
        
        return result

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return {}