import sys
import re
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from base.spider import Spider

# 禁用安全警告
requests.packages.urllib3.disable_warnings()

class Spider(Spider):
    def getName(self):
        return "❄️雪月映画❄️"

    def init(self, extend=""):
        self.siteUrl = "https://taoo.xyz"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': f'{self.siteUrl}/',
        }
        self.sess = requests.Session()
        # 增加重试机制，应对网络波动
        retries = Retry(total=3, backoff_factor=0.1, status_forcelist=[500, 502, 503, 504])
        self.sess.mount('https://', HTTPAdapter(max_retries=retries))

    def fetch(self, url):
        try:
            # 必须 verify=False 因为这类站点证书经常过期
            return self.sess.get(url, headers=self.headers, timeout=10, verify=False)
        except Exception:
            return None

    def homeContent(self, filter):
        # 修正分类 ID，确保与主页 URL 对应
        cats = [
            {"type_name": "最新", "type_id": "latest"},
            {"type_name": "R15写真", "type_id": "r15"},
            {"type_name": "R18写真", "type_id": "r18"},
        ]
        return {'class': cats}

    def categoryContent(self, tid, pg, filter, extend):
        if tid == "latest":
            url = f"{self.siteUrl}/page/{pg}/"
        else:
            url = f"{self.siteUrl}/category/{tid}/" if int(pg) == 1 else f"{self.siteUrl}/category/{tid}/page/{pg}/"
        return self.postList(url, pg)

    def searchContent(self, key, quick, pg=1):
        # 搜索建议配合 URL 编码，防止中文乱码
        url = f"{self.siteUrl}/index.php?s={key}"
        return self.postList(url, pg)

    def postList(self, url, pg):
        r = self.fetch(url)
        l = []
        if not r or not r.ok:
            return {'list': l, 'page': pg, 'pagecount': pg, 'limit': 24, 'total': 99}

        html = r.text
        # 核心优化：利用正向预查精准切分卡片，不依赖 </div> 数量
        items = re.findall(r'<div class="item col-xs-6.*?">.*?(?=<div class="item col-xs-6|$)', html, re.S)
        
        for item in items:
            try:
                # 提取详情页链接
                href_m = re.search(r'href=["\']([^"\']+)["\']', item)
                if not href_m: continue
                link = href_m.group(1)

                # 提取封面（必须找 data-original，src 是转圈占位图）
                pic_m = re.search(r'data-original=["\']([^"\']+)["\']', item)
                pic = pic_m.group(1) if pic_m else ""

                # 提取标题并剥离 HTML 标签
                title_m = re.search(r'item-link-text["\']>\s*(.*?)\s*</div>', item, re.S)
                title = title_m.group(1).strip() if title_m else "未知标题"
                title = re.sub(r'<[^>]+>', '', title)

                # URL 补全
                if link.startswith('/'): link = self.siteUrl + link
                if pic.startswith('//'): pic = "https:" + pic
                elif pic and not pic.startswith('http'): pic = self.siteUrl + pic

                # 提取页数备注
                num_match = re.search(r'\[(\d+P)\]', title)
                remarks = num_match.group(1) if num_match else "图集"

                l.append({
                    'vod_id': f"{link}@@@{title}@@@{pic}",
                    'vod_name': title,
                    'vod_pic': pic,
                    'vod_remarks': remarks
                })
            except:
                continue

        return {'list': l, 'page': pg, 'pagecount': int(pg)+1, 'limit': 24, 'total': 999}

    def detailContent(self, ids):
        vid = ids[0]
        if "@@@" in vid:
            parts = vid.split("@@@")
            url, name, pic = parts[0], parts[1], parts[2]
        else:
            url, name, pic = vid, "未知", ""

        r = self.fetch(url)
        if not r or not r.ok:
            return {'list': []}

        html = r.text

        # 锁定详情页里的所有真实图片
        imgs = []
        # 寻找所有懒加载属性
        matches = re.findall(r'data-original=["\']([^"\']+\.(?:webp|jpg|jpeg|png|gif))["\']', html, re.I)
        
        for img_url in matches:
            # 过滤占位图 BrowserPreview_tmp.gif
            if "tmp.gif" in img_url or "loading" in img_url:
                continue
            
            # 协议补全
            if img_url.startswith("//"):
                img_url = "https:" + img_url
            elif not img_url.startswith("http"):
                img_url = self.siteUrl + img_url
            
            if img_url not in imgs:
                imgs.append(img_url)

        # 构造图集协议
        play_url = "pics://" + "&&".join(imgs) if imgs else ""

        vod = {
            'vod_id': vid,
            'vod_name': name,
            'vod_pic': pic,
            'type_name': '写真/COS',
            'vod_content': f"📸 共收录 {len(imgs)} 张高清大图",
            'vod_play_from': '雪月映画',
            'vod_play_url': f'高清原图${play_url}'
        }
        return {'list': [vod]}

    def playerContent(self, flag, id, vipFlags):
        # 直接返回图片列表 ID
        return {
            "parse": 0,
            "url": id,
            "header": self.headers
        }
