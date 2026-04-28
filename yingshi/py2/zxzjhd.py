"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '在线之家',
  lang: 'hipy',
})
"""

#!/usr/bin/python
# -*- coding: utf-8 -*-
import re, json, requests
from urllib.parse import quote
from lxml import etree
from base.spider import Spider

class Spider(Spider):
    def getName(self): return "在线之家"

    def init(self, extend=""):
        self.host = "https://www.zxzjhd.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": self.host + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
        self.categories = [
            {"type_id": "1", "type_name": "电影"},
            {"type_id": "2", "type_name": "美剧"},
            {"type_id": "3", "type_name": "韩剧"},
            {"type_id": "4", "type_name": "日剧"},
            {"type_id": "5", "type_name": "泰剧"},
            {"type_id": "6", "type_name": "动漫"}
        ]

    def _get(self, url):
        try:
            r = requests.get(url, headers=self.headers, timeout=15)
            r.encoding = r.apparent_encoding or "utf-8"
            return r.text
        except:
            return None

    def _fix(self, u):
        if not u:
            return ""
        if u.startswith("//"):
            return "https:" + u
        if u.startswith("/"):
            return self.host + u
        return u

    def _parse_list(self, html):
        if not html:
            return []
        tree = etree.HTML(html)
        results = []
        seen = set()
        items = tree.xpath('//div[contains(@class,"stui-vodlist__box")]//a[@title]') or \
               tree.xpath('//a[starts-with(@href,"/voddetail/") and .//img]')
        for item in items:
            try:
                href = item.get("href", "")
                m = re.search(r'/voddetail/(\d+)\.html', href)
                if not m or m.group(1) in seen:
                    continue
                seen.add(m.group(1))
                vod_id = m.group(1)
                title = item.get("title", "") or "".join(item.xpath('.//text()')).strip()
                img = item.xpath('.//img')
                pic = ""
                if img:
                    pic = img[0].get("data-original") or img[0].get("data-src") or img[0].get("src", "")
                    pic = self._fix(pic)
                results.append({"vod_id": vod_id, "vod_name": title, "vod_pic": pic})
            except:
                continue
        return results

    def homeContent(self, filter):
        html = self._get(self.host + "/")
        return {"class": self.categories, "list": self._parse_list(html) if html else [], "filters": {}}

    def categoryContent(self, tid, pg, filter, extend):
        url = f"{self.host}/vodshow/{tid}-----------.html" if pg == "1" else f"{self.host}/vodshow/{tid}-----------p{pg}.html"
        html = self._get(url)
        lst = self._parse_list(html) if html else []
        pagecount = 99
        if html:
            tree = etree.HTML(html)
            page_text = "".join(tree.xpath('//div[contains(@class,"stui-page")]//text()'))
            pm = re.search(r'/(\d+)', page_text)
            if pm:
                pagecount = int(pm.group(1))
        return {"page": int(pg), "pagecount": pagecount, "limit": 24, "total": 999, "list": lst}

    def detailContent(self, ids):
        result = {"list": []}
        for vid in ids:
            try:
                html = self._get(f"{self.host}/voddetail/{vid}.html")
                if not html:
                    continue
                tree = etree.HTML(html)
                name = "".join(tree.xpath('//h1/text()')).strip()
                pics = tree.xpath('//div[contains(@class,"stui-content__thumb")]//img/@data-original') or \
                      tree.xpath('//div[@class="stui-content__thumb"]//img/@src')
                pic = self._fix(pics[0]) if pics else ""
                sources = []
                episodes = []
                panels = tree.xpath('//div[contains(@class,"stui-pannel")]')
                for panel in panels:
                    header = panel.xpath('.//h3/text()') or panel.xpath('.//div[contains(@class,"title")]/text()')
                    src_name = header[0].strip().replace("播放线路", "线路") if header else f"线路{len(sources)+1}"
                    eps = panel.xpath('.//ul[contains(@class,"playlist")]//a') or \
                          panel.xpath('.//li/a[contains(@href,"/vodplay/")]')
                    ep_list = [f'{"".join(a.xpath(".//text()")).strip()}${self._fix(a.get("href", ""))}' for a in eps if self._fix(a.get("href", ""))]
                    if ep_list:
                        sources.append(src_name)
                        episodes.append("#".join(ep_list))
                result["list"].append({
                    "vod_id": vid,
                    "vod_name": name,
                    "vod_pic": pic,
                    "vod_play_from": "$$$".join(sources),
                    "vod_play_url": "$$$".join(episodes)
                })
            except:
                continue
        return result

    def searchContent(self, key, quick, pg="1"):
        url = f"{self.host}/index.php/vod/search.html?wd={quote(key)}&page={pg}"
        html = self._get(url)
        return {"list": self._parse_list(html) if html else [], "page": int(pg)}

    def playerContent(self, flag, id, vipFlags):
        url = self._fix(id)
        if any(x in url for x in [".m3u8", ".mp4"]):
            return {"parse": 0, "url": url, "header": json.dumps(self.headers)}
        html = self._get(url)
        if not html:
            return {"parse": 1, "url": url, "header": json.dumps(self.headers)}
        m3u8_url = None
        for pattern in [r'(https?://[^\s"\']+\.m3u8[^\s"\']*)', r'(https?://[^\s"\']+\.mp4[^\s"\']*)']:
            m = re.search(pattern, html)
            if m:
                m3u8_url = m.group(1)
                break
        if not m3u8_url:
            for var_name in ['player_aaaa', 'player_data']:
                var_start = html.find(f'var {var_name}=')
                if var_start == -1:
                    continue
                json_start = var_start + len(f'var {var_name}=')
                brace_count = 0
                in_string = False
                escape_next = False
                json_end = -1
                for i in range(json_start, min(len(html), json_start+5000)):
                    char = html[i]
                    if escape_next:
                        escape_next = False
                        continue
                    if char == '\\' and in_string:
                        escape_next = True
                        continue
                    if char == '"':
                        in_string = not in_string
                        continue
                    if not in_string:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = i + 1
                                break
                if json_end > json_start:
                    try:
                        raw_json = html[json_start:json_end].replace('\\/', '/')
                        data = json.loads(raw_json)
                        for key in ['url', 'data']:
                            if key in data:
                                val = data[key]
                                if isinstance(val, str) and val and val != 'null':
                                    decoded_val = val.replace('\\/', '/')
                                    if any(x in decoded_val.lower() for x in ['.m3u8', '.mp4']):
                                        m3u8_url = decoded_val
                                        break
                                    elif 'http' in decoded_val or 'zxzjys' in decoded_val:
                                        import base64
                                        try:
                                            dec = base64.b64decode(decoded_val).decode("utf-8", errors='ignore')
                                            if any(x in dec for x in ['.m3u8', '.mp4', 'http']):
                                                m3u8_url = dec
                                                break
                                        except:
                                            m3u8_url = decoded_val
                                            break
                        if m3u8_url:
                            break
                        if 'vod_data' in data and isinstance(data.get('vod_data'), dict):
                            vod_data = data['vod_data']
                            for k in ['url', 'playUrl', 'play_url']:
                                if k in vod_data:
                                    potential = str(vod_data[k])
                                    if potential and potential != 'null' and len(potential) > 10:
                                        decoded_potential = potential.replace('\\/', '/')
                                        if any(x in decoded_potential for x in ['.m3u8', '.mp4']):
                                            m3u8_url = decoded_potential
                                            break
                                        elif 'http' in decoded_potential or 'zxzjys' in decoded_potential:
                                            import base64
                                            try:
                                                dec = base64.b64decode(decoded_potential).decode("utf-8", errors='ignore')
                                                if any(x in dec for x in ['.m3u8', '.mp4', 'http']):
                                                    m3u8_url = dec
                                                    break
                                            except:
                                                m3u8_url = decoded_potential
                                                break
                            if m3u8_url:
                                break
                    except:
                        continue
        final_url = m3u8_url if m3u8_url else url
        is_direct_link = bool(m3u8_url and any(x in m3u8_url.lower() for x in ['.m3u8', '.mp4']))
        parse_mode = 0 if is_direct_link else 1
        return {"parse": parse_mode, "url": final_url, "header": json.dumps(self.headers)}
