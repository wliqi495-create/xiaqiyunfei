# coding=utf-8
"""
目标站: 达达兔影院  首页: https://www.stonelodgeacademy.com
"""
import re
import sys
import json
import urllib.parse
from bs4 import BeautifulSoup

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):

    def init(self, extend=""):
        self.site_url = "https://www.stonelodgeacademy.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': self.site_url,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }

    def homeContent(self, filter):
        categories = [
            {"type_id": "movie", "type_name": "电影"},
            {"type_id": "series", "type_name": "剧集"},
            {"type_id": "variety", "type_name": "综艺"},
            {"type_id": "animation", "type_name": "动漫"}
        ]
        
        url = f"{self.site_url}/"
        resp = self.fetch(url, headers=self.headers)
        if not resp:
            return {"class": categories, "list": [], "filters": {}}
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        video_list = []
        cards = soup.select('.video-card')
        
        for card in cards[:20]:
            link_elem = card.select_one('a.video-thumb')
            if not link_elem:
                continue
            
            href = link_elem.get('href', '')
            match = re.search(r'/([^/]+)\.html', href)
            if match:
                vod_id = match.group(1)
            else:
                continue
            
            title_elem = card.select_one('.video-title')
            vod_name = title_elem.get_text(strip=True) if title_elem else ''
            
            img_elem = link_elem.select_one('img')
            vod_pic = ''
            if img_elem:
                vod_pic = img_elem.get('data-src', '')
                if not vod_pic or 'nopic.svg' in vod_pic:
                    vod_pic = img_elem.get('src', '')
                if vod_pic and 'nopic.svg' in vod_pic:
                    vod_pic = ''
            
            tag_elem = card.select_one('.video-tag')
            vod_remarks = tag_elem.get_text(strip=True) if tag_elem else ''
            
            ep_elem = card.select_one('.video-episode')
            if ep_elem and not vod_remarks:
                vod_remarks = ep_elem.get_text(strip=True)
            
            if vod_name:
                video_list.append({
                    "vod_id": vod_id,
                    "vod_name": vod_name,
                    "vod_pic": vod_pic,
                    "vod_remarks": vod_remarks
                })
        
        filters = {}
        filter_section = soup.select_one('.filter-section')
        if filter_section:
            rows = filter_section.select('.filter-row')
            for row in rows:
                label_elem = row.select_one('.filter-label')
                if not label_elem:
                    continue
                label = label_elem.get_text(strip=True).replace('：', '')
                options = [{"n": "全部", "v": ""}]
                for opt in row.select('.filter-option'):
                    opt_name = opt.get_text(strip=True)
                    if opt_name and opt_name != '全部':
                        href = opt.get('href', '')
                        opt_value = href.split('?')[1] if '?' in href else ''
                        options.append({"n": opt_name, "v": opt_value})
                if len(options) > 1:
                    filters[label] = [{"key": label, "name": label, "value": options}]
        
        return {"class": categories, "list": video_list, "filters": filters}

    def homeVideoContent(self):
        return self.homeContent(False)

    def categoryContent(self, tid, pg, filter, extend):
        page = int(pg) if pg else 1
        
        type_path_map = {
            'movie': 'movie',
            'series': 'series',
            'variety': 'variety',
            'animation': 'anime'
        }
        path = type_path_map.get(tid, 'movie')
        
        # 构建基础 URL
        url = f"{self.site_url}/{path}/"
        
        # 构建参数字典
        params = {}
        if page > 1:
            params['page'] = page
        
        if extend:
            for key, value in extend.items():
                if value:
                    params[key] = value
        
        # 将参数字典编码为查询字符串
        if params:
            query_string = urllib.parse.urlencode(params)
            url = url + '?' + query_string
        
        resp = self.fetch(url, headers=self.headers)
        if not resp:
            return {"list": [], "page": page, "pagecount": 1, "limit": 24, "total": 0}
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        video_list = []
        cards = soup.select('.video-card')
        
        for card in cards:
            link_elem = card.select_one('a.video-thumb')
            if not link_elem:
                continue
            
            href = link_elem.get('href', '')
            match = re.search(r'/([^/]+)\.html', href)
            if match:
                vod_id = match.group(1)
            else:
                continue
            
            title_elem = card.select_one('.video-title')
            vod_name = title_elem.get_text(strip=True) if title_elem else ''
            
            img_elem = link_elem.select_one('img')
            vod_pic = ''
            if img_elem:
                vod_pic = img_elem.get('data-src', '')
                if not vod_pic or 'nopic.svg' in vod_pic:
                    vod_pic = img_elem.get('src', '')
                if vod_pic and 'nopic.svg' in vod_pic:
                    vod_pic = ''
            
            tag_elem = card.select_one('.video-tag')
            vod_remarks = tag_elem.get_text(strip=True) if tag_elem else ''
            
            if vod_name:
                video_list.append({
                    "vod_id": vod_id,
                    "vod_name": vod_name,
                    "vod_pic": vod_pic,
                    "vod_remarks": vod_remarks
                })
        
        pagecount = 1
        pagination = soup.select('.pagination a')
        for a in pagination:
            text = a.get_text(strip=True)
            if text.isdigit():
                pagecount = max(pagecount, int(text))
        
        if pagecount == 1:
            has_next = any('下一页' in a.get_text() for a in pagination)
            if has_next:
                pagecount = page + 1
        
        return {
            "list": video_list,
            "page": page,
            "pagecount": pagecount,
            "limit": 24,
            "total": len(video_list) * pagecount
        }

    def detailContent(self, ids):
        if not ids:
            return {"list": []}
        
        vod_id = ids[0]
        
        for path in ['/movie/', '/series/', '/anime/', '/variety/']:
            url = f"{self.site_url}{path}{vod_id}.html"
            resp = self.fetch(url, headers=self.headers)
            if resp and resp.status_code == 200:
                break
        else:
            return {"list": []}
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        detail = soup.select_one('.detail-info')
        if not detail:
            detail = soup.select_one('.video-info')
        
        vod_name = ''
        if detail:
            name_elem = detail.select_one('h1') or detail.select_one('h2')
            vod_name = name_elem.get_text(strip=True) if name_elem else ''
        
        vod_pic = ''
        img_elem = soup.select_one('.detail-info img') or soup.select_one('.video-thumb img')
        if img_elem:
            vod_pic = img_elem.get('data-src', '')
            if not vod_pic or 'nopic.svg' in vod_pic:
                vod_pic = img_elem.get('src', '')
            if vod_pic and 'nopic.svg' in vod_pic:
                vod_pic = ''
        
        vod_content = ''
        desc_elem = soup.select_one('.detail-desc')
        if desc_elem:
            vod_content = desc_elem.get_text(strip=True)
        
        play_sources = soup.select('.play-source')
        play_from_list = []
        play_url_list = []
        
        for source in play_sources:
            source_name = source.select_one('.play-source-name')
            if not source_name:
                continue
            source_name = source_name.get_text(strip=True)
            
            play_items = source.select('.play-item')
            if not play_items:
                continue
            
            episodes = []
            for item in play_items:
                ep_name = item.get_text(strip=True)
                ep_link = item.get('href', '')
                if ep_link:
                    episodes.append(f"{ep_name}${ep_link}")
            
            if episodes:
                play_from_list.append(source_name)
                play_url_list.append('#'.join(episodes))
        
        vod_play_from = '$$$'.join(play_from_list) if play_from_list else '默认线路'
        vod_play_url = '$$$'.join(play_url_list) if play_url_list else ''
        
        result = [{
            "vod_id": vod_id,
            "vod_name": vod_name,
            "vod_pic": vod_pic,
            "vod_content": vod_content,
            "vod_play_from": vod_play_from,
            "vod_play_url": vod_play_url
        }]
        
        return {"list": result}

    def searchContent(self, key, quick, pg="1"):
        page = int(pg) if pg else 1
        url = f"{self.site_url}/search/?keyword={urllib.parse.quote(key)}"
        if page > 1:
            url += f"&page={page}"
        
        resp = self.fetch(url, headers=self.headers)
        if not resp:
            return {"list": [], "page": page, "pagecount": 1}
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        video_list = []
        cards = soup.select('.video-card')
        
        for card in cards:
            link_elem = card.select_one('a.video-thumb')
            if not link_elem:
                continue
            
            href = link_elem.get('href', '')
            match = re.search(r'/([^/]+)\.html', href)
            if match:
                vod_id = match.group(1)
            else:
                continue
            
            title_elem = card.select_one('.video-title')
            vod_name = title_elem.get_text(strip=True) if title_elem else ''
            
            img_elem = link_elem.select_one('img')
            vod_pic = ''
            if img_elem:
                vod_pic = img_elem.get('data-src', '')
                if not vod_pic or 'nopic.svg' in vod_pic:
                    vod_pic = img_elem.get('src', '')
                if vod_pic and 'nopic.svg' in vod_pic:
                    vod_pic = ''
            
            tag_elem = card.select_one('.video-tag')
            vod_remarks = tag_elem.get_text(strip=True) if tag_elem else ''
            
            if vod_name:
                video_list.append({
                    "vod_id": vod_id,
                    "vod_name": vod_name,
                    "vod_pic": vod_pic,
                    "vod_remarks": vod_remarks
                })
        
        return {"list": video_list, "page": page, "pagecount": 1}

    def playerContent(self, flag, id, vipFlags):
        if not id.startswith('http'):
            url = self.site_url + id
        else:
            url = id
        
        return {"parse": 1, "url": url, "header": self.headers}