# coding=utf-8
import re
import subprocess
import urllib.parse
from typing import List, Dict

try:
    from base.spider import Spider
except ImportError:
    class Spider: pass

class Spider(Spider):
    host = "https://91shenshi.com"
    name = "91绅士"

    def getName(self): return self.name
    def init(self, extend=""): pass

    def get_html(self, url: str, referer: str = None) -> str:
        ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
        cmd = ['curl', '-s', '-L', '-k', '--connect-timeout', '10', '-A', ua]
        if referer: cmd.extend(['-e', referer])
        safe_url = "".join([urllib.parse.quote(c) if ord(c) > 127 else c for c in url])
        cmd.append(safe_url.replace('https%3A//', 'https://'))
        try:
            return subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8', errors='ignore')
        except:
            return ""

    def homeContent(self, filter: bool):
        # 一级目录只保留两个核心入口
        return {
            "class": [
                {"type_id": "/category/photo/", "type_name": "全部写真"},
                {"type_id": "/tags/", "type_name": "📁 全部标签(二级目录)"}
            ]
        }

    def categoryContent(self, tid: str, pg: int, filter: bool, extend: dict):
        pg = int(pg)
        
        # ======= 二级目录实现：展示所有标签文件夹 =======
        if tid == "/tags/":
            html = self.get_html(f"{self.host}/tags/")
            items = []
            # 匹配 HTML 中的标签链接和名称
            # 结构: <a href="/tags/名称/1/" ...> 名称 <span>(数量)</span>
            pattern = r'href="(/tags/[^"]+?)/1/".*?>\s*([^<]+)\s*<span>\((.*?)\)</span>'
            tags = re.findall(pattern, html, re.S)
            
            for link, name, count in tags:
                items.append({
                    "vod_id": link.rstrip('/') + "/", # 传递给下一级
                    "vod_name": name.strip(),
                    "vod_pic": "https://91shenshi.com/favicon.svg", # 文件夹图标
                    "vod_remarks": f"文件夹 | {count}个合集",
                    "vod_tag": "folder" # 部分壳子支持此标记展示为文件夹
                })
            return {
                "list": items,
                "page": 1,
                "pagecount": 1,
                "limit": len(items),
                "total": len(items)
            }

        # ======= 三级页面：展示具体标签下的文章列表 =======
        base_tid = tid.strip('/')
        # 这里的拼接适配了 /tags/xxx/1/ 的格式
        url = f"{self.host}/{base_tid}/{pg}/"
        html = self.get_html(url)
        
        v_list = []
        # 匹配文章：缩略图、标题、链接
        pattern = r'<a\s+href="(/posts/[^"]+)"[^>]*>.*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]+)"'
        for m in re.finditer(pattern, html, re.S):
            u, p, t = m.groups()
            v_list.append({
                "vod_id": u,
                "vod_name": re.sub(r'\s*\[\d+P.*?\]', '', t.strip()),
                "vod_pic": p if p.startswith('http') else self.host + p,
                "vod_remarks": "写真合集"
            })

        has_next = f'/{pg+1}/' in html or 'Next page' in html
        return {
            "list": v_list,
            "page": pg,
            "pagecount": pg + 1 if has_next else pg,
            "limit": 24,
            "total": 999
        }

    def detailContent(self, ids: List[str]):
        html = self.get_html(f"{self.host}{ids[0]}")
        if not html: return {"list": []}

        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.S)
        title = h1.group(1).strip() if h1 else "写真详情"

        # 仅匹配文章正文内的图片
        article = re.search(r'<article[^>]*>(.*?)</article>', html, re.S)
        content = article.group(1) if article else html
        imgs = re.findall(r'src="([^"]+\.(?:jpg|jpeg|png|webp|avif)[^"]*)"', content, re.I)

        play_urls = []
        seen = set()
        for img in imgs:
            if any(x in img.lower() for x in ["logo", "avatar", "icon", "ads", "badge"]) or img in seen:
                continue
            seen.add(img)
            img_url = img if img.startswith('http') else self.host + img
            play_urls.append(f"图{len(play_urls)+1}${img_url}")

        return {"list": [{
            "vod_id": ids[0],
            "vod_name": title,
            "vod_play_from": "91绅士",
            "vod_play_url": "#".join(play_urls)
        }]}

    def playerContent(self, flag: str, id: str, vipFlags: list):
        return {"parse": 0, "playUrl": "", "url": id, "header": {"Referer": self.host}}

    def searchContent(self, key: str, quick: bool, pg: int = 1):
        # 搜索结果直接跳转到对应标签
        return self.categoryContent(f"/tags/{urllib.parse.quote(key.strip())}/", pg, False, {})
