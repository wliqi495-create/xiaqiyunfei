import sys
import re
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from base.spider import Spider

requests.packages.urllib3.disable_warnings()

class Spider(Spider):
    def getName(self):
        return "BD之交"
    
    def init(self, extend=""):
        super().init(extend)
        self.siteUrl = "https://xn--n2y-vaginaintheworld-com-dp02bt87kul1aw470a.b-dfriend.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
            'Referer': self.siteUrl,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
        self.sess = requests.Session()
        self.sess.mount('https://', HTTPAdapter(max_retries=Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])))

    def fetch(self, url):
        try:
            return self.sess.get(url, headers=self.headers, timeout=15, verify=False)
        except Exception as e:
            print(f"请求失败: {url}, 错误: {e}")
            return None

    def get_total_pages(self, type_id):
        """获取某个分类的总页数"""
        url = f"{self.siteUrl}/?type={type_id}&page=1"
        r = self.fetch(url)
        if r and r.ok:
            # 匹配页码显示，例如 <span class="num">7/59</span>
            match = re.search(r'<span class="num">\d+/(\d+)</span>', r.text)
            if match:
                return int(match.group(1))
        return 1

    def parse_page_items(self, html, type_id):
        """
        从单页HTML中提取所有条目信息（通用解析，不依赖 did）
        返回列表，每个元素包含：
            item_id: 唯一标识（对于有did的分类使用did，否则使用编号数字）
            number: 显示的编号（如 61）
            name: 昵称
            age: 年龄（字符串）
            location: 国家/地区
            score: 评分
            image_url: 大图URL（data-original）
            thumb_url: 缩略图URL（src）
            declaration: 交友宣言（仅当存在时）
            body: 身高体重（仅当存在时）
        """
        items = []
        # 匹配每个条目块
        pattern = r'<div class="drow forth-position">(.*?)</div>\s*(?=<div class="drow|</div><div class="page")'
        for match in re.finditer(pattern, html, re.S):
            block = match.group(1)
            
            # 1. 提取编号（去掉 # 号）
            no_match = re.search(r'<div class="no">\s*#?(\d+)\s*</div>', block)
            if not no_match:
                continue
            number = no_match.group(1)
            
            # 2. 提取 in 信息（格式：昵称, 年龄，国家）
            in_match = re.search(r'<div class="in">(.*?)</div>', block)
            if not in_match:
                continue
            in_text = in_match.group(1).strip()
            # 解析昵称、年龄、国家
            name, age, location = self._parse_in_text(in_text)
            
            # 3. 提取评分
            score_match = re.search(r'<div class="fen">(.*?)分</div>', block)
            score = score_match.group(1).strip() if score_match else "0"
            
            # 4. 提取图片URL
            img_match = re.search(r'<img[^>]+data-original="([^"]+)"', block)
            if not img_match:
                continue
            image_url = img_match.group(1)
            
            thumb_match = re.search(r'<img[^>]+src="([^"]+)"', block)
            thumb_url = thumb_match.group(1) if thumb_match else ""
            
            # 5. 可选字段（宣言、身高体重，仅当存在时）
            declaration = ""
            body = ""
            # 如果存在 word 区域（分类0/1特有）
            word_match = re.search(r'<div class="word">(.*?)</div>', block, re.S)
            if word_match:
                word_html = word_match.group(1)
                divs = re.findall(r'<div>(.*?)</div>', word_html, re.S)
                if len(divs) >= 1:
                    declaration = divs[0].strip()
                if len(divs) >= 2:
                    body = divs[1].strip()
            
            # 生成 item_id：优先使用 did（如果存在），否则使用编号
            did_match = re.search(r'mypage\.php\?did=(\d+)', block)
            if did_match:
                item_id = did_match.group(1)
            else:
                item_id = number   # 对于分类99，编号本身就是唯一标识
            
            items.append({
                'item_id': item_id,
                'number': number,
                'name': name,
                'age': age,
                'location': location,
                'score': score,
                'image_url': image_url,
                'thumb_url': thumb_url,
                'declaration': declaration,
                'body': body
            })
        
        return items

    def _parse_in_text(self, text):
        """
        解析 in 文本，例如 "Martina, 23，意大利" 或 "小妹, 17，中国"
        返回 (name, age, location)
        """
        # 尝试用逗号或中文逗号分割
        parts = re.split(r'[,，]', text)
        if len(parts) >= 3:
            name = parts[0].strip()
            age = parts[1].strip()
            location = parts[2].strip()
        elif len(parts) == 2:
            # 可能格式 "昵称, 年龄"
            name = parts[0].strip()
            # 尝试提取年龄数字
            age_match = re.search(r'\d+', parts[1])
            age = age_match.group(0) if age_match else "未知"
            location = "未知"
        else:
            name = text
            age = "未知"
            location = "未知"
        return name, age, location

    def categoryContent(self, tid, pg, filter, extend):
        """获取某个分类的指定页内容"""
        url = f"{self.siteUrl}/?type={tid}&page={pg}"
        r = self.fetch(url)
        items = []
        if r and r.ok:
            items = self.parse_page_items(r.text, tid)
        
        vod_list = []
        for item in items:
            vod_id = f"{tid}_{item['item_id']}"
            vod_name = f"{item['name']}，{item['age']}岁，{item['location']}"
            vod_pic = item['thumb_url']
            remark = item['declaration'][:20] + "..." if len(item['declaration']) > 20 else item['declaration']
            if not remark:
                remark = f"{item['score']}分"
            vod_list.append({
                'vod_id': vod_id,
                'vod_name': vod_name,
                'vod_pic': vod_pic,
                'vod_remarks': remark,
                'style': {"type": "rect", "ratio": 1.33}
            })
        
        total_pages = self.get_total_pages(tid)
        
        return {
            'list': vod_list,
            'page': pg,
            'pagecount': total_pages,
            'limit': 20,
            'total': len(vod_list)
        }

    def detailContent(self, ids):
        """
        详情页，根据 ids（格式 "tid_item_id"）重新定位并返回大图URL
        """
        tid, item_id = ids[0].split('_')
        total_pages = self.get_total_pages(tid)
        image_url = ""
        name = ""
        
        for page in range(1, total_pages + 1):
            url = f"{self.siteUrl}/?type={tid}&page={page}"
            r = self.fetch(url)
            if r and r.ok:
                # 在页面中查找匹配的条目
                if tid in ['0', '1']:
                    # 有 did 的分类，通过 mypage.php?did=xxx 匹配
                    pattern = rf'mypage\.php\?did={item_id}.*?data-original="([^"]+)"'
                    match = re.search(pattern, r.text, re.S)
                    if match:
                        image_url = match.group(1)
                        # 同时提取昵称
                        name_match = re.search(r'<div class="no">.*?>(.*?)</div>', r.text[match.start():match.end()+500], re.S)
                        name = name_match.group(1).strip() if name_match else f"用户{item_id}"
                        break
                else:
                    # 分类99，通过编号匹配（item_id 即为编号）
                    pattern = rf'<div class="no">\s*#?{item_id}\s*</div>.*?data-original="([^"]+)"'
                    match = re.search(pattern, r.text, re.S)
                    if match:
                        image_url = match.group(1)
                        # 提取昵称
                        in_match = re.search(r'<div class="in">(.*?)</div>', r.text[match.start():match.end()+500], re.S)
                        if in_match:
                            in_text = in_match.group(1).strip()
                            name = in_text.split(',')[0].strip()
                        else:
                            name = f"编号{item_id}"
                        break
        
        if not image_url:
            image_url = ""  # 未找到
        
        return {
            'list': [{
                'vod_id': ids[0],
                'vod_name': name,
                'type_name': '美图',
                'vod_play_from': 'BD之交',
                'vod_play_url': f'点击浏览${image_url}' if image_url else ''
            }]
        }

    def playerContent(self, flag, id, vipFlags):
        """播放器：返回图片URL（id 即为 $ 后面的图片地址）"""
        return {"parse": 0, "url": f"pics://{id}", "header": ""}

    def searchContent(self, key, quick, pg=1):
        """搜索功能（按名称或地点搜索）"""
        results = []
        for tid, tname in [("1", "D之友"), ("0", "B之友"), ("99", "世界B展")]:
            total_pages = self.get_total_pages(tid)
            for page in range(1, min(total_pages, 5) + 1):
                url = f"{self.siteUrl}/?type={tid}&page={page}"
                r = self.fetch(url)
                if r and r.ok:
                    items = self.parse_page_items(r.text, tid)
                    for item in items:
                        if key.lower() in item['name'].lower() or key.lower() in item['location'].lower():
                            results.append({
                                'vod_id': f"{tid}_{item['item_id']}",
                                'vod_name': f"{item['name']}，{item['age']}岁，{item['location']}",
                                'vod_pic': item['thumb_url'],
                                'vod_remarks': item['declaration'][:20] + "..." if len(item['declaration']) > 20 else item['declaration']
                            })
        return {'list': results, 'page': pg, 'pagecount': 1, 'limit': 20, 'total': len(results)}

    def homeContent(self, filter):
        """返回一个分类"""
        cats = [
          
            {"type_name": "世界B展", "type_id": "99"}
        ]
        return {'class': cats}

    def crawl_all_images(self):
        """额外功能：爬取所有分类的所有图片（返回大图列表）"""
        all_images = []
        types = [("1", "D之友"), ("0", "B之友"), ("99", "世界B展")]
        for type_id, type_name in types:
            total_pages = self.get_total_pages(type_id)
            print(f"正在获取 [{type_name}] 分类，共 {total_pages} 页")
            for page in range(1, total_pages + 1):
                url = f"{self.siteUrl}/?type={type_id}&page={page}"
                print(f"  抓取第 {page}/{total_pages} 页")
                r = self.fetch(url)
                if r and r.ok:
                    items = self.parse_page_items(r.text, type_id)
                    for item in items:
                        all_images.append({
                            'id': f"{type_id}_{item['item_id']}",
                            'name': item['name'],
                            'age': item['age'],
                            'location': item['location'],
                            'declaration': item['declaration'],
                            'body': item['body'],
                            'image_url': item['image_url']
                        })
        return all_images