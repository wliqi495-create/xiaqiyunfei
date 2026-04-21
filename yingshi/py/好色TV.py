#恰逢
import re
import sys
import urllib.parse
import threading
import time
import requests
import json  # 新增：用于json.dumps
from pyquery import PyQuery as pq

sys.path.append('..')
from base.spider import Spider

class Spider(Spider):
    def __init__(self):
        # 基础配置
        self.name = '好色TV（优）'
        self.host = 'https://m.ml0987.online/'
        self.candidate_hosts = [
            "https://m.ml0987.online/"
        ]
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': self.host,
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Cache-Control': 'no-cache'
        }
        self.timeout = 5000
        
        # 分类映射
        self.class_map = {
            '视频': {'type_id': 'list', 'url_suffix': ''},
            '周榜': {'type_id': 'top7', 'url_suffix': 'top7'},
            '月榜': {'type_id': 'top', 'url_suffix': 'top'},
            '5分钟+': {'type_id': '5min', 'url_suffix': '5min'},
            '10分钟+': {'type_id': 'long', 'url_suffix': 'long'}
        }

    def getName(self):
        return self.name

    def init(self, extend=""):
        # 尝试获取最快可用域名
        self.host = self.get_fastest_host()
        self.headers['Referer'] = self.host

    def isVideoFormat(self, url):
        if not url:
            return False
        return any(fmt in url.lower() for fmt in ['.mp4', '.m3u8', '.flv', '.avi'])

    def manualVideoCheck(self):
        def check(url):
            if not self.isVideoFormat(url):
                return False
            try:
                resp = self.fetch(url, headers=self.headers, method='HEAD', timeout=3)
                return resp.status_code in (200, 302) and 'video' in resp.headers.get('Content-Type', '')
            except:
                return False
        return check

    def get_fastest_host(self):
        """测试候选域名，返回最快可用的"""
        results = {}
        threads = []

        def test_host(url):
            try:
                start_time = time.time()
                resp = requests.head(url, headers=self.headers, timeout=1, allow_redirects=False)
                if resp.status_code in (200, 301, 302):
                    delay = (time.time() - start_time) * 1000
                    results[url] = delay
                else:
                    results[url] = float('inf')
            except:
                results[url] = float('inf')

        for host in self.candidate_hosts:
            t = threading.Thread(target=test_host, args=(host,))
            threads.append(t)
            t.start()
        for t in threads:
            t.join()

        valid_hosts = [(h, d) for h, d in results.items() if d != float('inf')]
        return min(valid_hosts, key=lambda x: x[1])[0] if valid_hosts else self.candidate_hosts[0]

    def _parse_video_items(self, data):
        """公共方法：解析视频项列表"""
        vlist = []
        items = data('.row .col-xs-6.col-md-3')
        for item in items.items():
            try:
                title = item('h5').text().strip()
                if not title:
                    continue
                
                style = item('.image').attr('style') or ''
                pic_match = re.search(r'url\(["\']?([^"\']+)["\']?\)', style)
                vod_pic = pic_match.group(1) if pic_match else ''
                if vod_pic and not vod_pic.startswith('http'):
                    vod_pic = f"{self.host.rstrip('/')}/{vod_pic.lstrip('/')}"

                desc = item('.duration').text().strip() or '未知'
                
                href = item('a').attr('href') or ''
                if not href:
                    continue
                vod_id = href.split('/')[-1]
                if not vod_id.endswith('.htm'):
                    vod_id += '.htm'
                
                vlist.append({
                    'vod_id': vod_id,
                    'vod_name': title,
                    'vod_pic': vod_pic,
                    'vod_remarks': desc
                })
            except Exception as e:
                continue  # 静默跳过单个项错误
        return vlist

    def _parse_pagecount(self, data):
        """公共方法：解析总页数"""
        pagecount = 1
        try:
            pagination = data('.pagination1 li a')
            page_nums = [int(a.text().strip()) for a in pagination.items() if a.text().strip().isdigit()]
            if page_nums:
                pagecount = max(page_nums)
        except:
            pass
        return pagecount

    def homeContent(self, filter):
        result = {'class': []}
        # 构造分类列表
        for name, info in self.class_map.items():
            result['class'].append({
                'type_name': name,
                'type_id': info['type_id']
            })
        
        try:
            html = self.fetch_with_retry(self.host, retry=1, timeout=5).text
            data = pq(html)
            result['list'] = self._parse_video_items(data)
        except Exception as e:
            result['list'] = []
        return result

    def homeVideoContent(self):
        return []

    def categoryContent(self, tid, pg, filter, extend):
        result = {}
        pg = int(pg) if pg else 1
        try:
            if tid.startswith('user:'):  # 新增：作者视频列表
                author = tid.split(':', 1)[1].strip()
                if not author:
                    raise ValueError("无效作者名")
                if pg == 1:
                    url = f"{self.host}user.htm"
                else:
                    url = f"{self.host}user-{pg}.htm"
                params = {'author': author}
                html = self.fetch_with_retry(url, params=params, retry=1, timeout=5).text
            else:  # 原有分类逻辑
                cate_info = self.class_map.get(next((k for k, v in self.class_map.items() if v['type_id'] == tid), None))
                if not cate_info:
                    raise ValueError("无效分类")
                if tid == 'list':
                    url = f"{self.host}list-{pg}.htm"
                else:
                    url = f"{self.host}{cate_info['url_suffix']}_list-{pg}.htm"
                html = self.fetch_with_retry(url, retry=1, timeout=5).text
            
            data = pq(html)
            vlist = self._parse_video_items(data)
            pagecount = self._parse_pagecount(data)
            
            result = {
                'list': vlist,
                'page': pg,
                'pagecount': pagecount,
                'limit': len(vlist),
                'total': 999999
            }
        except Exception as e:
            result = {
                'list': [],
                'page': pg,
                'pagecount': 1,
                'limit': 0,
                'total': 0
            }
        return result

    def _fix_scientific_notation_in_url(self, url):
        """
        修复URL中的科学计数法格式
        例: /1.761733945e+09/ -> /1761733945/
        """
        if not url:
            return url
        
        pattern = r'/(\d+\.\d+)e\+(\d+)/'
        
        def replace_func(match):
            base_str = match.group(1)
            exp_str = match.group(2)
            base = float(base_str)
            exp = int(exp_str)
            # 计算整数值
            integer_val = int(base * (10 ** exp))
            return f'/{integer_val}/'
        
        return re.sub(pattern, replace_func, url)

    def detailContent(self, ids):
        vod_list = []
        try:
            if not ids or not ids[0]:
                return {'list': []}
            
            vod_id = ids[0].strip()
            if not vod_id.endswith('.htm'):
                vod_id += '.htm'
            url = f"{self.host}{vod_id.lstrip('/')}"
            
            html = self.fetch_with_retry(url, retry=1, timeout=5).text
            data = pq(html)
            
            # 提取标题
            title = data('.panel-title, .video-title, h1').text().strip() or '未知标题'
            
            # 提取封面图
            vod_pic = ''
            poster_style = data('.vjs-poster').attr('style') or ''
            pic_match = re.search(r'url\(["\']?([^"\']+)["\']?\)', poster_style)
            if pic_match:
                vod_pic = pic_match.group(1)
            if not vod_pic:
                vod_pic = data('.video-pic img, .vjs-poster img, .thumbnail img').attr('src') or ''
            if vod_pic and not vod_pic.startswith('http'):
                vod_pic = f"{self.host}{vod_pic.lstrip('/')}"

            # 提取作者并格式化为可点击
            vod_director = '未知'
            info_items = data('.panel-body .col-md-3')
            for item in info_items.items():
                text = item.text().strip()
                if '作者' in text:
                    author_match = re.search(r'作者：(.+)', text)
                    author_name = author_match.group(1).strip() if author_match else '未知'
                    vod_director = '[a=cr:' + json.dumps({'id': 'user:' + author_name, 'name': author_name}) + '/]' + author_name + '[/a]'
                    break
            
            # 提取时长和观看量
            duration = '未知'
            views = '未知'
            for item in info_items.items():
                text = item.text().strip()
                if '时长' in text:
                    duration = text.replace('时长：', '').strip()
                elif '观看' in text:
                    views_match = re.search(r'(\d+\.?\d*[kK]?)', text)
                    views = views_match.group(1) if views_match else '未知'
            remarks = f"{duration} | {views}"
            
            # ============ 关键修复：从 iframe 提取播放链接 ============
            video_urls = []
            found_url = None
            
            # 方法1: 从 iframe 的 src 中提取 videoUrl 参数（优先）
            iframe_pattern = r'<iframe[^>]+src=["\']([^"\']+)["\']'
            iframe_match = re.search(iframe_pattern, html, re.IGNORECASE)
            if iframe_match:
                iframe_src = iframe_match.group(1)
                # 解析 videoUrl 参数
                videourl_match = re.search(r'videoUrl=([^&]+)', iframe_src)
                if videourl_match:
                    found_url = urllib.parse.unquote(videourl_match.group(1))
                    # 修复 HTML 实体编码
                    found_url = found_url.replace('&amp;', '&')
                    # 修复科学计数法格式
                    found_url = self._fix_scientific_notation_in_url(found_url)
            
            # 方法2: 直接搜索 m3u8 链接
            if not found_url:
                m3u8_matches = re.findall(r'https?://[^\s"\'<>&]+\.m3u8[^\s"\'<>&]*', html)
                if m3u8_matches:
                    found_url = m3u8_matches[0]
                    found_url = self._fix_scientific_notation_in_url(found_url)
            
            # 方法3: 从 video/source 标签提取（兜底）
            if not found_url:
                video_element = data('video#video-play_html5_api')
                if video_element:
                    found_url = video_element.attr('src')
                if not found_url:
                    source_element = data('source#video-source')
                    if source_element:
                        found_url = source_element.attr('src')
                if found_url:
                    found_url = self._fix_scientific_notation_in_url(found_url)
            
            if found_url:
                found_url = found_url.replace('\\/', '/').replace('\\u002F', '/').replace('\\"', '')
                if not found_url.startswith('http'):
                    found_url = f"https:{found_url}" if found_url.startswith('//') else f"https://{found_url}"
                
                if 'hdcdn.online' in found_url:
                    video_urls = [found_url, found_url.replace('hdcdn.online', 'hsex.tv')]
                elif 'hsex.tv' in found_url:
                    video_urls = [found_url.replace('hsex.tv', 'hdcdn.online'), found_url]
                else:
                    video_urls = [found_url, found_url]
            
            play_from = []
            play_url = []
            for i, video_url in enumerate(video_urls):
                line_name = 'HD线路' if 'hdcdn.online' in video_url else f'线路{i+1}'
                play_from.append(line_name)
                play_url.append(f'正片${video_url}')
            
            if not play_from:
                play_from = ['好色TV', '备用']
                play_url = ['正片$暂无播放地址', '正片$暂无播放地址']
            
            main_vod = {
                'vod_id': vod_id,
                'vod_name': title,
                'vod_pic': vod_pic,
                'vod_remarks': remarks,
                'vod_director': vod_director,
                'vod_play_from': '$$$'.join(play_from),
                'vod_play_url': '$$$'.join(play_url)
            }
            vod_list.append(main_vod)
            
            # 新增：提取作者其他视频作为推荐（第一页，前8个，排除当前）
            if vod_director != '未知':
                # 修复：正确提取作者名（去除可点击格式）
                try:
                    if '[/a]' in vod_director:
                        author_name = re.search(r'\[/a\](.+)', vod_director).group(1)
                    else:
                        author_name = vod_director
                    
                    author_url = f"{self.host}user.htm"
                    params = {'author': urllib.parse.quote(author_name)}
                    author_html = self.fetch_with_retry(author_url, params=params, retry=1, timeout=5).text
                    author_data = pq(author_html)
                    other_vlist = self._parse_video_items(author_data)
                    added_count = 0
                    for other in other_vlist:
                        if other['vod_id'] != vod_id and added_count < 8:
                            vod_list.append({
                                'vod_id': other['vod_id'],
                                'vod_name': other['vod_name'],
                                'vod_pic': other['vod_pic'],
                                'vod_remarks': other['vod_remarks'],
                                'vod_director': vod_director,
                                'vod_play_from': '',
                                'vod_play_url': ''
                            })
                            added_count += 1
                except Exception as e:
                    pass
            
            return {'list': vod_list}
        except Exception as e:
            return {'list': vod_list if vod_list else []}

    def searchContent(self, key, quick, pg=1):
        pg = int(pg) if pg else 1
        try:
            if not key.strip():
                return {'list': [], 'page': pg, 'pagecount': 1, 'limit': 0, 'total': 0}
            
            encoded_key = urllib.parse.quote(key.strip(), encoding='utf-8', errors='replace')
            if pg == 1:
                url = f"{self.host}search.htm"
            else:
                url = f"{self.host}search-{pg}.htm"
            params = {'search': encoded_key, 'sort': 'new'}
            
            html = self.fetch_with_retry(url, params=params, retry=1, timeout=5).text
            data = pq(html)
            
            no_result = any('没有找到' in data(f'div:contains("{text}"), p:contains("{text}")').text() for text in ['没有找到相关视频', '无搜索结果'])
            if no_result:
                return {'list': [], 'page': pg, 'pagecount': 1, 'limit': 0, 'total': 0}
            
            vlist = self._parse_video_items(data)
            pagecount = self._parse_pagecount(data)
            total = len(vlist) * pagecount
            
            return {
                'list': vlist,
                'page': pg,
                'pagecount': pagecount,
                'limit': len(vlist),
                'total': total
            }
        except Exception as e:
            return {
                'list': [],
                'page': pg,
                'pagecount': 1,
                'limit': 0,
                'total': 0
            }

    def playerContent(self, flag, id, vipFlags):
        headers = self.headers.copy()
        headers.update({
            'Origin': self.host.rstrip('/'),
            'Host': urllib.parse.urlparse(self.host).netloc,
        })
        
        return {
            'parse': 1,
            'url': id,
            'header': headers,
            'double': True
        }

    def localProxy(self, param):
        try:
            url = param.get('url', '')
            if url and not url.startswith(('http://', 'https://')):
                url = f"{self.host.rstrip('/')}/{url.lstrip('/')}"
            
            img_headers = self.headers.copy()
            img_headers.update({'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'})
            
            res = self.fetch(url, headers=img_headers, timeout=5)
            content_type = res.headers.get('Content-Type', 'image/jpeg')
            
            return [200, content_type, res.content]
        except Exception as e:
            return [200, 'image/jpeg', b'']

    def fetch_with_retry(self, url, params=None, retry=1, timeout=5):
        for i in range(retry + 1):
            try:
                resp = self.fetch(url, headers=self.headers, timeout=timeout, params=params or {})
                if resp.status_code in (200, 301, 302):
                    resp.encoding = resp.apparent_encoding or 'utf-8'
                    return resp
            except Exception as e:
                if i < retry:
                    time.sleep(0.5)
        return type('obj', (object,), {'text': '', 'status_code': 404})

    def fetch(self, url, headers=None, timeout=5, method='GET', params=None):
        headers = headers or self.headers
        params = params or {}
        try:
            if method.upper() == 'GET':
                return requests.get(url, headers=headers, timeout=timeout, allow_redirects=True, params=params)
            elif method.upper() == 'HEAD':
                return requests.head(url, headers=headers, timeout=timeout, allow_redirects=False, params=params)
            else:
                return requests.get(url, headers=headers, timeout=timeout, allow_redirects=True, params=params)
        except Exception as e:
            return type('obj', (object,), {'text': '', 'status_code': 500, 'headers': {}, 'url': url})