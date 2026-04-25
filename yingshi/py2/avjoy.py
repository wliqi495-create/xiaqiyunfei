# -*- coding: utf-8 -*-
import json
import re
import requests
from pyquery import PyQuery as pq
import sys
sys.path.append('..')
from base.spider import Spider


class Spider(Spider):
    host = 'https://cn.avjoy.me'
    headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'referer': 'https://cn.avjoy.me/',
        'origin': 'https://cn.avjoy.me',
    }

    def init(self, extend=''):
        self.proxies = json.loads(extend).get('proxy', {}) if extend else {}
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def getName(self):
        return "hohoj"

    def fetch(self, url, params=None):
        try:
            resp = self.session.get(url, headers=self.session.headers, params=params,
                                    proxies=self.proxies, timeout=10, allow_redirects=True)
            return resp.text
        except:
            return ''

    def fetch_resp(self, url, params=None, extra_headers=None, stream=False):
        try:
            hdrs = self.session.headers.copy()
            if extra_headers:
                hdrs.update(extra_headers)
            return self.session.get(url, headers=hdrs, params=params,
                                    proxies=self.proxies, timeout=10,
                                    allow_redirects=True, stream=stream)
        except Exception:
            return None

    def homeContent(self, filter):
        html = self.fetch(self.host)
        return {
            'class': [
                {'type_name': '最新上传视频', 'type_id': 'videos'},
                {'type_name': '视频', 'type_id': 'videos'},
                {'type_name': '类别', 'type_id': 'categories'},
                {'type_name': '标签', 'type_id': 'tags'}
            ],
            'filters': self.get_filters(),
            'list': self.parse_videos_from_list_html(pq(html))
        }

    def get_filters(self):
        return {}

    def categoryContent(self, tid, pg, filter, extend):
        norm = tid.lstrip('/') if not tid.startswith('http') else tid
        if '?' in norm and not norm.startswith('http'):
            norm = norm.split('?', 1)[0]
        url = f"{self.host}/{norm}" if not norm.startswith('http') else norm
        params = (extend or {}).copy()
        try:
            if int(pg) > 1:
                params['page'] = pg
        except:
            pass
        params.pop('o', None)
        html = self.fetch(url, params)
        doc = pq(html)
        m_cur = re.search(r"current_url\s*=\s*\"([^\"]+)\"", html)
        if m_cur:
            base_path = m_cur.group(1)
            if base_path.startswith('/videos/') or base_path.startswith('/search/videos/'):
                url = f"{self.host}{base_path}"
                html = self.fetch(url, params)
                doc = pq(html)

        def uniq_append(items, entry):
            key = (entry.get('vod_id'), entry.get('vod_name'))
            if key and key not in {(i.get('vod_id'), i.get('vod_name')) for i in items}:
                items.append(entry)
        if tid == 'categories':
            items = []
            for card in doc('div.content-left .row.content-row > div').items():
                a = card.find('a').eq(0)
                href = (a.attr('href') or '').strip()
                name = card.find('.category-title .title-truncate').text().strip()
                pic = (card.find('.thumb-overlay img').attr('src') or '').strip()
                if href and name and href.startswith('/videos/'):
                    cat_id = href.lstrip('/')
                    if pic and pic.startswith('/'):
                        pic = f"{self.host}{pic}"
                    uniq_append(items, {
                        'vod_id': cat_id,
                        'vod_name': name,
                        'vod_pic': pic,
                        'vod_tag': 'folder',
                        'style': {"type": "rect", "ratio": 1.1}
                    })
            for a in doc('.dropdown-menu.multi-column-dropdown a').items():
                href = (a.attr('href') or '').strip()
                name = a.text().strip()
                if href.startswith('/videos/') and name:
                    uniq_append(items, {
                        'vod_id': href.lstrip('/'),
                        'vod_name': name,
                        'vod_pic': '',
                        'vod_tag': 'folder',
                        'style': {"type": "rect", "ratio": 1.1}
                    })
            return {
                'list': items,
                'page': '1',
                'pagecount': 1,
                'limit': 90,
                'total': len(items)
            }
        if tid == 'tags':
            items = []
            for a in doc('.popular-tag a').items():
                name = a.text().strip()
                href = (a.attr('href') or '').strip()
                if href.startswith('/search/videos/') and name:
                    uniq_append(items, {
                        'vod_id': href.lstrip('/'),
                        'vod_name': name,
                        'vod_tag': 'folder',
                        'style': {"type": "rect", "ratio": 1.0}
                    })
            for a in doc('.trending-searches a').items():
                name = a.text().strip()
                href = (a.attr('href') or '').strip()
                if href.startswith('/search/videos/') and name:
                    uniq_append(items, {
                        'vod_id': href.lstrip('/'),
                        'vod_name': name,
                        'vod_tag': 'folder',
                        'style': {"type": "rect", "ratio": 1.0}
                    })
            return {
                'list': items,
                'page': '1',
                'pagecount': 1,
                'limit': 90,
                'total': len(items)
            }
        videos = self.parse_videos_from_list_html(doc)
        if not videos:
            fallback = []
            for a in doc('a[href^="/video/"]').items():
                href = a.attr('href')
                title = a.text().strip()
                img = a.parents().find('img').eq(0).attr('src')
                if href and title:
                    uniq_append(fallback, {
                        'vod_id': href,
                        'vod_name': title,
                        'vod_pic': img,
                        'style': {"type": "rect", "ratio": 1.5}
                    })
            videos = fallback
        pagecount = 1
        try:
            pagecount = doc('.pagination a').length or 1
        except:
            pagecount = 1
        return {
            'list': videos,
            'page': pg,
            'pagecount': pagecount,
            'limit': 90,
            'total': 999999
        }

    def detailContent(self, ids):
        vid = ids[0]
        url = f"{self.host}{vid}" if vid.startswith('/') else f"{self.host}/{vid}"
        html = self.fetch(url)
        data = pq(html)
        title = data('h1').text() or data('title').text() or ''
        title = re.sub(r'\s*HoHoJ.*$', '', title)
        title = re.sub(r'\s*\|.*$', '', title)
        title = title.strip()
        poster = data('video#video').attr('poster') or data('meta[property="og:image"]').attr('content')
        vod_year = data('.info span').eq(-1).text()
        m_vid = re.search(r"video_id\s*=\s*\"(\d+)\"", html)
        video_id = m_vid.group(1) if m_vid else ''
        if not video_id:
            m_url_id = re.search(r"/video/(\d+)", url) or re.search(r"/video/(\d+)", html)
            video_id = m_url_id.group(1) if m_url_id else ''
        m_vkey = re.search(r"/embed/([a-zA-Z0-9]+)", html)
        vkey = m_vkey.group(1) if m_vkey else ''
        play_id = video_id or vkey

        vod = {
            'vod_id': vid,
            'vod_name': title,
            'vod_play_from': '撸出血',
            'vod_play_url': f"{title}${play_id or ''}",
            'vod_pic': poster,
            'vod_year': vod_year,
        }
        tags = []
        for tag in data('a.tag').items():
            name = tag.text().strip()
            href = tag.attr('href')
            if name and href:
                tags.append(f'[a=cr:{json.dumps({"id": href, "name": name})}/]{name}[/a]')
        if tags:
            vod['vod_content'] = ' '.join(tags)
        director_name = data('a[href^="/user/"]').text().strip()
        if director_name:
            try:
                from urllib.parse import quote
                director_href = f"/search/videos/{quote(director_name)}"
            except:
                director_href = f"/search/videos/{director_name}"
            director_link = f"[a=cr:{json.dumps({'id': director_href, 'name': director_name})}/]{director_name}[/a]"
            vod['vod_content'] = (vod.get('vod_content', '') + ('\n' if vod.get('vod_content') else '') + '导演：' + director_link)
        intro = (data('section.video-description').text() or '').strip()
        if not intro:
            intro = (data('meta[name="description"]').attr('content') or '').strip()
        if intro:
            vod['vod_content'] = (vod.get('vod_content', '') + ('\n' if vod.get('vod_content') else '') + '影片介绍：' + intro)

        return {'list': [vod]}

    def searchContent(self, key, quick, pg="1"):
        params = {}
        try:
            if int(pg) > 1:
                params['page'] = pg
        except:
            pass
        url = f"{self.host}/search/videos/{requests.utils.quote(key)}"
        html = self.fetch(url, params)
        if not html:
            html = self.fetch(f"{self.host}/search", {'text': key, **params})
        return {'list': self.parse_videos_from_list_html(pq(html)), 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        def pick_best_source(html_text):
            sources = []
            for m in re.finditer(r"<source[^>]+src=\"([^\"]+)\"[^>]*>", html_text):
                frag = html_text[m.start():m.end()]
                src = m.group(1)
                res_m = re.search(r"res=\'?(\d+)\'?", frag)
                label_m = re.search(r"label=\'([^\']+)\'", frag)
                res = int(res_m.group(1)) if res_m else 0
                label = label_m.group(1) if label_m else ''
                sources.append((res, label, src))
            if sources:
                sources.sort(reverse=True)
                return sources[0][2]
            mv = re.search(r"<video[^>]+src=\"([^\"]+)\"", html_text)
            if mv:
                return mv.group(1)
            mv2 = re.search(r"var\s+videoSrc\s*=\s*[\"']([^\"']+)[\"']", html_text)
            if mv2:
                return mv2.group(1)
            doc = pq(html_text)
            return doc('video source').attr('src') or doc('video').attr('src') or ''

        raw = str(id).strip()
        if re.match(r'^https?://', raw) and self.isVideoFormat(raw):
            return {
                'parse': 0,
                'url': raw,
                'header': {
                    'user-agent': self.headers['user-agent'],
                    'referer': self.host,
                    'origin': self.host,
                }
            }

        m = re.search(r"/video/(\d+)", raw) or re.search(r"id=(\d+)", raw)
        if m:
            raw = m.group(1)
        is_numeric = re.match(r"^\d+$", raw) is not None

        video_url = ''
        referer_used = ''
        if is_numeric:
            for path in [f"{self.host}/video/{raw}", f"{self.host}/video/{raw}/"]:
                self.session.headers['referer'] = path
                play_html = self.fetch(path)
                video_url = pick_best_source(play_html)
                if video_url:
                    referer_used = path
                    break
                m_dl = re.search(r"href=\"(/download\\.php\\?id=\\d+[^\"]*label=1080p)\"", play_html)
                if not m_dl:
                    m_dl = re.search(r"href=\"(/download\\.php\\?id=\\d+[^\"]*)\"", play_html)
                if m_dl:
                    dl_url = f"{self.host}{m_dl.group(1)}"
                    resp = self.fetch_resp(dl_url, extra_headers={'referer': path}, stream=True)
                    if resp and resp.ok:
                        resp.close()
                        video_url = resp.url
                        referer_used = path
                        break
        if not video_url:
            embed_url = f"{self.host}/embed/{raw}" if not is_numeric else f"{self.host}/embed?id={raw}"
            self.session.headers['referer'] = embed_url
            html = self.fetch(embed_url)
            v2 = pick_best_source(html)
            if v2:
                video_url = v2
                referer_used = embed_url

        return {
            'parse': 0,
            'url': video_url or '',
            'header': {
                'user-agent': self.headers['user-agent'],
                'referer': referer_used or self.host,
                'origin': self.host,
            }
        }
    def parse_videos_from_list_html(self, doc: pq):
        videos = []
        for item in doc('.row.content-row > div').items():
            link = item.find('a').eq(0).attr('href')
            img = item.find('.thumb-overlay img').eq(0).attr('src')
            info = item.find('.content-info').eq(0)
            title = info.find('.content-title').text().strip()
            duration = (item.find('.video-duration, .thumb-overlay .duration, .content-duration, .duration').eq(0).text() or '').strip()
            overlay_text = (item.find('.thumb-overlay').text() or '').strip()
            hd_flag = bool(item.find('.hd, .icon-hd, .hd-icon, .badge-hd, .label-hd').length) or ('HD' in overlay_text)
            if not link or not title:
                continue
            parts = []
            if hd_flag:
                parts.append('HD')
            if duration:
                parts.append(duration)
            remarks = ' • '.join(parts)
            videos.append({
                'vod_id': link,
                'vod_name': re.sub(r'\s*\|.*$', '', re.sub(r'\s*HoHoJ.*$', '', title)).strip(),
                'vod_pic': img,
                'vod_remarks': remarks or '',
                'vod_tag': '',
                'style': {"type": "rect", "ratio": 1.5}
            })
        if not videos:
            for info in doc('.content-info').items():
                a = info('a').eq(0)
                link = a.attr('href')
                title = info('.content-title').text().strip()
                if not link or not title:
                    continue
                img = info.prev('a').find('img').attr('src') or info.prevAll('a').eq(0).find('img').attr('src')
                duration = (info.parents().find('.video-duration, .thumb-overlay .duration, .content-duration, .duration').eq(0).text() or '').strip()
                overlay_text = (info.parents().find('.thumb-overlay').text() or '').strip()
                hd_flag = bool(info.parents().find('.hd, .icon-hd, .hd-icon, .badge-hd, .label-hd').length) or ('HD' in overlay_text)
                parts = []
                if hd_flag:
                    parts.append('HD')
                if duration:
                    parts.append(duration)
                remarks = ' • '.join(parts)
                videos.append({
                    'vod_id': link,
                    'vod_name': re.sub(r'\s*\|.*$', '', re.sub(r'\s*HoHoJ.*$', '', title)).strip(),
                    'vod_pic': img,
                    'vod_remarks': remarks or '',
                    'vod_tag': '',
                    'style': {"type": "rect", "ratio": 1.5}
                })
        return videos

    def isVideoFormat(self, url):
        return bool(url) and (url.lower().endswith('.mp4') or url.lower().endswith('.m3u8'))
    def manualVideoCheck(self):
        pass
    def destroy(self):
        pass
    def homeVideoContent(self):
        pass
    def localProxy(self, param):
        pass
    def liveContent(self, url):
        pass
