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
        
        # 完整的频道列表（从实际页面提取的40个频道）
        self.all_channels = [
            {"title": "ОХ-АХ HD", "href": "/oh-ah.html"},
            {"title": "CineMan XXX HD", "href": "/sl-hot1.html"},
            {"title": "CineMan XXX2 HD", "href": "/sl-hot2.html"},
            {"title": "Brazzers TV Europe", "href": "/brazzers-tv-europe.html"},
            {"title": "Brazzers TV", "href": "/brazzers-tv.html"},
            {"title": "Red Lips", "href": "/red-lips.html"},
            {"title": "KinoXXX", "href": "/kino-xxx.html"},
            {"title": "XY Max HD", "href": "/xy-max-hd.html"},
            {"title": "XY Plus HD", "href": "/xy-plus-hd.html"},
            {"title": "XY Mix HD", "href": "/xy-mix-hd.html"},
            {"title": "Barely legal", "href": "/barely-legal.html"},
            {"title": "Playboy TV", "href": "/playboy-tv.html"},
            {"title": "Vivid Red HD", "href": "/vivid-red.html"},
            {"title": "Exxxotica HD", "href": "/hot-pleasure.html"},
            {"title": "Babes TV", "href": "/babes-tv.html"},
            {"title": "Русская ночь", "href": "/russkaya-noch.html"},
            {"title": "Pink O TV", "href": "/pink-o.html"},
            {"title": "Erox HD", "href": "/erox-hd.html"},
            {"title": "Eroxxx HD", "href": "/eroxxx-hd.html"},
            {"title": "Hustler HD", "href": "/hustler-hd.html"},
            {"title": "Private TV", "href": "/private-tv.html"},
            {"title": "Redlight HD", "href": "/redlight-hd.html"},
            {"title": "Penthouse Gold HD", "href": "/penthouse-gold.html"},
            {"title": "Penthouse Quickies", "href": "/penthouse-2.html"},
            {"title": "O-la-la", "href": "/o-la-la.html"},
            {"title": "Blue Hustler", "href": "/blue-hustler.html"},
            {"title": "Шалун", "href": "/shalun.html"},
            {"title": "Dorcel TV", "href": "/dorcel-tv.html"},
            {"title": "Extasy HD", "href": "/extasyhd.html"},
            {"title": "XXL", "href": "/xxl.html"},
            {"title": "FAP TV 2", "href": "/fap-tv-2.html"},
            {"title": "FAP TV 3", "href": "/fap-tv-3.html"},
            {"title": "FAP TV 4", "href": "/fap-tv-4.html"},
            {"title": "FAP TV Parody", "href": "/fap-tv-parody.html"},
            {"title": "FAP TV Compilation", "href": "/fap-tv-compilation.html"},
            {"title": "FAP TV Anal", "href": "/fap-tv-anal.html"},
            {"title": "FAP TV Teens", "href": "/fap-tv-teens.html"},
            {"title": "FAP TV Lesbian", "href": "/fap-tv-lesbian.html"},
            {"title": "FAP TV BBW", "href": "/fap-tv-bbw.html"},
            {"title": "FAP TV Trans", "href": "/fap-tv-trans.html"},
        ]

    # ========= 工具方法 =========

    def _abs_url(self, base, url):
        """转换为绝对URL"""
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
        """根据频道名称生成图片URL（使用占位图）"""
        # 为每个频道生成唯一的颜色
        color_map = {
            'brazzers': 'FFD700', 'playboy': 'FF69B4', 'hustler': 'DC143C',
            'penthouse': '9370DB', 'vivid': 'FF1493', 'private': '8B008B',
            'dorcel': 'FF6347', 'cineman': '4169E1', 'fap': 'FF4500',
            'xy': 'DA70D6', 'erox': 'FF00FF', 'kino': '8A2BE2',
        }
        
        color = '1E90FF'  # 默认蓝色
        name_lower = channel_name.lower()
        for key, col in color_map.items():
            if key in name_lower:
                color = col
                break
        
        text = urllib.parse.quote(channel_name[:20])
        return f"https://via.placeholder.com/400x225/{color}/FFFFFF?text={text}"

    # ========= Spider接口实现 =========

    def getName(self):
        return "OXAX直播"

    def init(self, extend):
        pass

    def homeContent(self, filter):
        """返回分类列表"""
        return {
            'class': [
                {'type_name': '全部频道', 'type_id': 'all'},
                {'type_name': 'HD频道', 'type_id': 'hd'},
                {'type_name': 'FAP系列', 'type_id': 'fap'},
            ]
        }

    def homeVideoContent(self):
        """首页推荐 - 显示所有频道"""
        videos = []
        for ch in self.all_channels:
            videos.append({
                'vod_id': ch['href'],
                'vod_name': ch['title'],
                'vod_pic': self._get_channel_image(ch['title']),
                'vod_remarks': '直播',
            })
        return {'list': videos}

    def categoryContent(self, tid, pg, filter, extend):
        """分类内容 - 支持分页和过滤"""
        pg = int(pg)
        items_per_page = 30
        
        # 根据分类ID过滤频道
        if tid == 'hd':
            channels = [ch for ch in self.all_channels if 'HD' in ch['title'].upper()]
        elif tid == 'fap':
            channels = [ch for ch in self.all_channels if 'FAP' in ch['title'].upper()]
        else:  # all
            channels = self.all_channels
        
        # 分页
        start = (pg - 1) * items_per_page
        end = start + items_per_page
        page_channels = channels[start:end]
        
        # 构建视频列表
        videos = []
        for ch in page_channels:
            videos.append({
                'vod_id': ch['href'],
                'vod_name': ch['title'],
                'vod_pic': self._get_channel_image(ch['title']),
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
        """详情页 - 直接返回页面URL，不做m3u8提取"""
        if not array or not array[0]:
            return {'list': []}
        
        relative_path = array[0]
        detail_url = self._abs_url(self.base_url, relative_path)
        
        # 提取标题（从相对路径推断）
        title = relative_path.replace('.html', '').replace('/', '').replace('-', ' ').title()
        
        # 从 all_channels 查找真实标题
        for ch in self.all_channels:
            if ch['href'] == relative_path:
                title = ch['title']
                break
        
        vod = {
            'vod_id': relative_path,
            'vod_name': title,
            'vod_pic': self._get_channel_image(title),
            'vod_remarks': '直播',
            'vod_content': '成人电视直播频道',
            'vod_play_from': 'OXAX',
           
            'vod_play_url': f'{title}${detail_url}',
        }
        
        return {'list': [vod]}

    def searchContent(self, key, quick, page='1'):
        """搜索功能"""
        if not key:
            return {'list': []}
        
        key_lower = key.lower()
        results = []
        
        # 在本地频道列表中搜索
        for ch in self.all_channels:
            if key_lower in ch['title'].lower():
                results.append({
                    'vod_id': ch['href'],
                    'vod_name': ch['title'],
                    'vod_pic': self._get_channel_image(ch['title']),
                    'vod_remarks': '直播',
                })
        
        return {'list': results}

    def playerContent(self, flag, id, vipFlags):
        """
        播放器内容解析 - 关键修改点
        直接返回 video:// 协议的URL，让播放器自行解析页面
        """
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
            # id格式: "标题$URL"
            url = id
            if '$' in url:
                url = url.split('$')[1]
            
            
            result["url"] = f"video://{url}"
            
        except Exception as e:
            print(f"[ERROR] 播放器解析失败: {e}")
        
        return result

    def isVideoFormat(self, url):
        """判断是否为视频格式 - video:// 协议不是直接的视频格式"""
        return False

    def manualVideoCheck(self):
        """不需要手动视频检查"""
        return False

    def localProxy(self, param):
        """不使用本地代理"""
        return {}
