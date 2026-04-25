# -*- coding: utf-8 -*-
import re
from base.spider import Spider


class Spider(Spider):

    def __init__(self):
        self.name = 'Bad.news'
        self.host = 'https://bad.news'
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            'Referer': self.host + '/',
            'Origin': self.host,
            'Accept-Language': 'zh-CN,zh;q=0.9'
        }

    def getName(self):
        return self.name

    def init(self, extend=""):
        pass

    # =========================
    # 首页分类
    # =========================
    def homeContent(self, filter):
        return {
            'class': [
                {'type_id': '', 'type_name': '新出品'},
                {'type_id': '/dm', 'type_name': 'H动漫'},
                {'type_id': '/av/release', 'type_name': '日本AV'},
                {'type_id': '/tag/long-porn', 'type_name': '长视频'}
            ]
        }

    def homeVideoContent(self):
        return self.categoryContent('', '1', False, {})

    # =========================
    # 列表解析
    # =========================
    def parse_list(self, html):
        videos = []
        # 定义黑名单关键词
        black_list = ['热点', '招聘', '20k', '工作制', '双休', '远程', '月薪']

        # 1. 解析瀑布流 (p1)
        p1 = re.findall(
            r'href="([^"]+)"[^>]*title="([^"]+)"[^>]*(?:data-echo-background|poster)="([^"]+)"',
            html, re.S
        )
        for path, title, pic in p1:
            # 过滤逻辑：检查标题是否包含黑名单中的任何词
            if any(word in title for word in black_list):
                continue
                
            if path.startswith('/'):
                videos.append({
                    'vod_id': path,
                    'vod_name': title.strip(),
                    'vod_pic': pic.split('?')[0],
                    'vod_remarks': ''
                })

        # 2. 解析 table 信息流 (p2)
        p2 = re.findall(r'<table.*?>(.*?)</table>', html, re.S)
        for block in p2:
            # 先提取标题进行预校验
            title_m = re.search(r'<h3.*?>(.*?)</h3>', block, re.S)
            raw_title = re.sub('<[^>]+>', '', title_m.group(1)).strip() if title_m else ''
            
            # 如果标题为空或者是黑名单广告，直接跳过
            if not raw_title or any(word in raw_title for word in black_list):
                continue

            link = re.search(r'href="([^"]+)"', block)
            if not link:
                continue
            path = link.group(1)
            
            if not path.startswith('/') or any(v['vod_id'] == path for v in videos):
                continue

            pic_m = re.search(r'poster="([^"]+)"', block)

            videos.append({
                'vod_id': path,
                'vod_name': raw_title,
                'vod_pic': pic_m.group(1).split('?')[0] if pic_m else '',
                'vod_remarks': ''
            })

        return videos
        
    # =========================
    # 分类
    # =========================
    def categoryContent(self, tid, pg, filter, extend):
        pg = int(pg)
        url = f'{self.host}{tid}/page-{pg}' if tid else (self.host if pg == 1 else f'{self.host}/page-{pg}')
        res = self.fetch(url, headers=self.headers)
        return {'list': self.parse_list(res.text), 'page': pg, 'pagecount': 999}

    # =========================
    # 详情页（HTML + DM 分流）
    # =========================
    def detailContent(self, ids):
        path = ids[0]
        url = self.host + path
        html = self.fetch(url, headers=self.headers).text

        title_m = re.search(r'<title>(.*?)</title>', html)
        title = title_m.group(1).split('-')[0].strip() if title_m else 'Bad.news'

        # ===== DM（H动漫）=========
        if path.startswith('/dm'):
            iframe = re.search(r'<iframe[^>]+src="([^"]+)"', html)
            play_url = iframe.group(1) if iframe else url
            if play_url.startswith('/'):
                play_url = self.host + play_url

            return {'list': [{
                'vod_id': play_url,
                'vod_name': title,
                'vod_play_from': 'DM-Web',
                'vod_play_url': f'播放${play_url}'
            }]}

        # ===== 普通 HTML 视频 =====
        m = re.search(r'<video[^>]+data-source="([^"]+)"', html)
        if m:
            return {'list': [{
                'vod_id': path,
                'vod_name': title,
                'vod_play_from': 'HTML',
                'vod_play_url': f'播放${m.group(1)}'
            }]}

        return {'list': []}

    # =========================
    # 播放器
    # =========================
    def playerContent(self, flag, id, vipFlags):
        headers = {
            'User-Agent': self.headers['User-Agent'],
            'Referer': self.host + '/',
            'Origin': self.host,
            'Range': 'bytes=0-'
        }

        # DM 用 WebView 嗅探
        if flag == 'DM-Web':
            return {
                'parse': 1,
                'sniff': 1,
                'url': id,
                'header': headers,
                'sniff_include': ['.mp4', '.m3u8'],
                'sniff_exclude': [
                    '.html', '.js', '.css',
                    '.jpg', '.png', '.gif',
                    'google', 'facebook',
                    'doubleclick', 'analytics',
                    'ads', 'tracker'
                ]
            }

        # HTML 直连
        return {'parse': 0, 'url': id}

    # =========================
    # 搜索
    # =========================
    def searchContent(self, key, quick, pg="1"):
        url = f'{self.host}/search/q-{key}'
        res = self.fetch(url, headers=self.headers)
        return {'list': self.parse_list(res.text)}