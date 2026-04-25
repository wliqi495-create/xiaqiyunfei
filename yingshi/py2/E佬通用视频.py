import re
import sys
import urllib.parse
from pyquery import PyQuery as pq

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "美人吹箫"
    
    def init(self, extend):
        pass
        
    def homeContent(self, filter):
        result = {}
        classes = []
        try:
            rsp = self.fetch("https://www.mrcx2.yachts/cn/home/web/")
            if rsp and rsp.text:
                doc = pq(rsp.text)
                
                
                items = doc('.stui-header__menu li a')
                for item in items.items():
                    name = item.text()
                    href = item.attr('href')
                    if name and href and name != "首页":
                        
                        match = re.search(r'/type/id/(\d+)\.html', href)
                        if match:
                            classes.append({
                                'type_name': name,
                                'type_id': match.group(1)
                            })
                
                
                if not classes:
                    items = doc('.dropdown.type li a')
                    for item in items.items():
                        name = item.text()
                        href = item.attr('href')
                        if name and href and name != "首页":
                            match = re.search(r'/type/id/(\d+)\.html', href)
                            if match:
                                classes.append({
                                    'type_name': name,
                                    'type_id': match.group(1)
                                })
                
                
                seen = set()
                unique_classes = []
                for cls in classes:
                    if cls['type_id'] not in seen:
                        seen.add(cls['type_id'])
                        unique_classes.append(cls)
                classes = unique_classes
                
        except Exception as e:
            print(f"homeContent error: {e}")
            
        result['class'] = classes
        return result

    def homeVideoContent(self):
        result = {}
        try:
            videos = []
            url = "https://www.mrcx2.yachts/cn/home/web/"
            rsp = self.fetch(url)
            if rsp and rsp.text:
                doc = pq(rsp.text)
                items = doc('.stui-vodlist li.index')
                for item in items.items():
                    a = item.find('.stui-vodlist__thumb')
                    href = a.attr('href')
                    title = a.attr('title') or item.find('.title a').attr('title')
                    img = a.attr('data-original') or a.attr('style')
                    
                    
                    if img and 'background-image:' in img:
                        match = re.search(r'url\(["\']?(.*?)["\']?\)', img)
                        if match:
                            img = match.group(1)
                    
                    if not title or not href:
                        continue
                    
                    
                    play_count = item.find('.text').text() or '播放0次'
                    score = item.find('.score').text() or '0.0 分'
                    
                    videos.append({
                        'vod_id': href,
                        'vod_name': title,
                        'vod_pic': img,
                        'vod_remarks': f"{score} | {play_count}"
                    })
            
            result['list'] = videos
        except Exception as e:
            print(f"homeVideoContent error: {e}")
            
        return result

    def categoryContent(self, tid, pg, filter, extend):
        result = {}
        videos = []
        try:
            url = f"https://www.mrcx2.yachts/cn/home/web/index.php/vod/type/id/{tid}/page/{pg}.html"
            rsp = self.fetch(url)
            if rsp and rsp.text:
                doc = pq(rsp.text)
                items = doc('.stui-vodlist li')
                for item in items.items():
                    a = item.find('.stui-vodlist__thumb')
                    href = a.attr('href')
                    title = a.attr('title') or item.find('.title a').attr('title')
                    img = a.attr('data-original') or a.attr('style')
                    
                    
                    if img and 'background-image:' in img:
                        match = re.search(r'url\(["\']?(.*?)["\']?\)', img)
                        if match:
                            img = match.group(1)
                    
                    if not title or not href:
                        continue
                    
                    
                    play_count = item.find('.text').text() or '播放0次'
                    score = item.find('.score').text() or '0.0 分'
                    
                    videos.append({
                        'vod_id': href,
                        'vod_name': title,
                        'vod_pic': img,
                        'vod_remarks': f"{score} | {play_count}"
                    })
        except Exception as e:
            print(f"categoryContent error: {e}")
            
        result['list'] = videos
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def detailContent(self, array):
        result = {}
        if not array or not array[0]:
            return result
            
        try:
            aid = array[0]
            
            if aid.startswith('/'):
                play_url = "https://www.mrcx2.yachts" + aid
            else:
                play_url = "https://www.mrcx2.yachts/cn/home/web/" + aid
                
            rsp = self.fetch(play_url)
            if not rsp or not rsp.text:
                return result
                
            html = rsp.text
            doc = pq(html)
            
            
            vod = {
                'vod_id': aid,
                'vod_name': doc('title').text() or '',
                'vod_pic': '',
                'vod_remarks': '',
                'vod_content': '',
                'vod_play_from': 'E佬通用视频',
                'vod_play_url': ''
            }
            
            
            img = doc('.stui-vodlist__thumb').attr('data-original') or doc('.stui-vodlist__thumb').attr('style')
            if img and 'background-image:' in img:
                match = re.search(r'url\(["\']?(.*?)["\']?\)', img)
                if match:
                    vod['vod_pic'] = match.group(1)
            
            
            if not vod['vod_pic']:
                img = doc('img').filter(lambda i, this: pq(this).attr('src') and 'cover' in pq(this).attr('src').lower()).attr('src')
                if img:
                    vod['vod_pic'] = img
            
            
            description = doc('.stui-vodlist__detail .text').text()
            if description:
                vod['vod_remarks'] = description
                
            
            content = doc('.content').text() or doc('.detail').text() or doc('.stui-content__detail').text()
            if content:
                vod['vod_content'] = content
            
            
            
            
            vod['vod_play_url'] = f'正片${play_url}'
            
            result['list'] = [vod]
        except Exception as e:
            print(f"detailContent error: {e}")
            
        return result

    def searchContent(self, key, quick, page='1'):
        result = {}
        videos = []
        try:
            if not key:
                return result
                
            url = f"https://www.mrcx2.yachts/cn/home/web/index.php/vod/search/wd/{urllib.parse.quote(key)}/page/{page}.html"
            rsp = self.fetch(url)
            if rsp and rsp.text:
                doc = pq(rsp.text)
                items = doc('.stui-vodlist li')
                for item in items.items():
                    a = item.find('.stui-vodlist__thumb')
                    href = a.attr('href')
                    title = a.attr('title') or item.find('.title a').attr('title')
                    img = a.attr('data-original') or a.attr('style')
                    
                    
                    if img and 'background-image:' in img:
                        match = re.search(r'url\(["\']?(.*?)["\']?\)', img)
                        if match:
                            img = match.group(1)
                    
                    if not title or not href:
                        continue
                    
                    
                    play_count = item.find('.text').text() or '播放0次'
                    score = item.find('.score').text() or '0.0 分'
                    
                    videos.append({
                        'vod_id': href,
                        'vod_name': title,
                        'vod_pic': img,
                        'vod_remarks': f"{score} | {play_count}"
                    })
        except Exception as e:
            print(f"searchContent error: {e}")
            
        result['list'] = videos
        return result

    def playerContent(self, flag, id, vipFlags):
        
        result = {}
        try:
            if not id:
                return result
            
            
            if id.startswith('http'):
                play_url = id
            else:
                
                if id.startswith('/'):
                    play_url = "https://www.mrcx2.yachts" + id
                else:
                    play_url = "https://www.mrcx2.yachts/cn/home/web/" + id
            
            
            result["parse"] = 1
            result["playUrl"] = ''
            result["url"] = play_url
            result["header"] = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://www.mrcx2.yachts/'
            }
            
        except Exception as e:
            print(f"playerContent error: {e}")
            
        return result

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        return False

    def localProxy(self, param):
        return {}