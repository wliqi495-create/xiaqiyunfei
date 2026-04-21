# coding=utf-8
#!/usr/bin/python

import sys
import hashlib
import json
import requests
import base64
from Crypto.Cipher import AES

sys.path.append('..')
try:
    from base.spider import Spider as BaseSpider
except ImportError:
    try:
        from base.spider import BaseSpider
    except ImportError:
        class BaseSpider:
            pass

class Spider(BaseSpider):
    def getName(self):
        return "七猫小说"

    def init(self, extend=""):
        pass

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        pass
    
    # ================= 核心配置 =================
    
    SIGN_KEY = "d3dGiJc651gSQ8w1"
    AES_KEY = "242ccb8230d709e1"
    APP_ID = "com.kmxs.reader"
    
    # API 域名
    BASE_URL_SEARCH = "https://api-bc.wtzw.com"
    BASE_URL_CONTENT = "https://api-ks.wtzw.com"

    # ================= 简洁分类体系 =================
    def homeContent(self, filter):
        cats = [
            # 男频热门分类
            {"type_name": "玄幻奇幻", "type_id": "玄幻奇幻"},
            {"type_name": "都市生活", "type_id": "都市"},
            {"type_name": "武侠仙侠", "type_id": "仙侠"},
            {"type_name": "历史军事", "type_id": "历史"},
            {"type_name": "科幻末世", "type_id": "科幻"},
            {"type_name": "悬疑灵异", "type_id": "悬疑"},
            {"type_name": "游戏竞技", "type_id": "游戏"},
            {"type_name": "奇幻魔法", "type_id": "奇幻"},
            
            # 女频热门分类
            {"type_name": "现代言情", "type_id": "现代言情"},
            {"type_name": "古代言情", "type_id": "古代言情"},
            {"type_name": "幻想言情", "type_id": "幻想言情"},
            {"type_name": "浪漫青春", "type_id": "青春"},
            {"type_name": "悬疑言情", "type_id": "悬疑言情"},
            {"type_name": "宫斗宅斗", "type_id": "宫斗"},
            {"type_name": "职场婚恋", "type_id": "婚恋"},
            
            # 热门题材分类
            {"type_name": "穿越重生", "type_id": "穿越"},
            {"type_name": "重生逆袭", "type_id": "重生"},
            {"type_name": "系统流", "type_id": "系统"},
            {"type_name": "无限流", "type_id": "无限流"},
            {"type_name": "末世危机", "type_id": "末世"},
            {"type_name": "校园青春", "type_id": "校园"},
            {"type_name": "职场商战", "type_id": "职场"},
            {"type_name": "灵异恐怖", "type_id": "灵异"},
            {"type_name": "权谋官场", "type_id": "权谋"},
            {"type_name": "体育竞技", "type_id": "体育"},
            {"type_name": "同人衍生", "type_id": "同人"},
            {"type_name": "轻小说", "type_id": "轻小说"},
            
            # 特色标签分类
            {"type_name": "神豪流", "type_id": "神豪"},
            {"type_name": "奶爸文", "type_id": "奶爸"},
            {"type_name": "美食文", "type_id": "美食"},
            {"type_name": "萌宠文", "type_id": "萌宠"},
            {"type_name": "种田文", "type_id": "种田"},
            {"type_name": "科技流", "type_id": "科技"},
            {"type_name": "娱乐圈", "type_id": "娱乐圈"},
            {"type_name": "战争军事", "type_id": "军事"},
            {"type_name": "诸天万界", "type_id": "诸天"},
            {"type_name": "异能超能", "type_id": "异能"},
            {"type_name": "西方奇幻", "type_id": "西方奇幻"},
            {"type_name": "影视穿", "type_id": "影视"},
            
            # 人气榜单分类
            {"type_name": "畅销榜", "type_id": "畅销"},
            {"type_name": "飙升榜", "type_id": "飙升"},
            {"type_name": "精选推荐", "type_id": "推荐"},
            {"type_name": "新书榜", "type_id": "新书"},
            {"type_name": "热门搜索", "type_id": "热门"},
            {"type_name": "编辑推荐", "type_id": "编辑推荐"},
            
            # 经典作品分类
            {"type_name": "经典完本", "type_id": "完本"},
            {"type_name": "大神作品", "type_id": "大神"},
            {"type_name": "必读神作", "type_id": "神作"},
            {"type_name": "高分佳作", "type_id": "高分"},
        ]
        
        return {'class': cats, 'filters': {}}
    
    # =============== 辅助方法 ================
    def md5_encode(self, text):
        return hashlib.md5(text.encode('utf-8')).hexdigest()

    def get_sign(self, params):
        sorted_keys = sorted(params.keys())
        sign_str = ""
        for key in sorted_keys:
            val = str(params[key])
            sign_str += f"{key}={val}"
        sign_str += self.SIGN_KEY
        return self.md5_encode(sign_str)

    def get_headers(self):
        headers = {
            'app-version': '51110',
            'platform': 'android',
            'reg': '0',
            'AUTHORIZATION': '',
            'application-id': self.APP_ID,
            'net-env': '1',
            'channel': 'unknown',
            'qm-params': ''
        }
        headers['sign'] = self.get_sign(headers)
        headers['User-Agent'] = 'okhttp/3.12.1'
        return headers

    def make_request(self, url, params=None):
        if params is None:
            params = {}
        
        if 'sign' not in params:
            sign_params = params.copy()
            params['sign'] = self.get_sign(sign_params)
        
        headers = self.get_headers()
        
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10, verify=False)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Request Error: {e}")
        return None

    def aes_decrypt(self, encrypted_content):
        try:
            buffer = base64.b64decode(encrypted_content)
            if len(buffer) < 16:
                return "解密错误: 数据长度不足"

            iv = buffer[:16]
            encrypted_data = buffer[16:]
            
            key_bytes = self.AES_KEY.encode('utf-8')
            cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
            decrypted_bytes = cipher.decrypt(encrypted_data)
            
            pad_len = decrypted_bytes[-1]
            if not isinstance(pad_len, int):
                pad_len = ord(decrypted_bytes[-1])
                
            content = decrypted_bytes[:-pad_len].decode('utf-8')
            return content
        except Exception as e:
            return f"解密失败: {str(e)}"

    # ================= 业务逻辑 =================
    def homeVideoContent(self):
        return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        return self.fetch_books(tid, pg)

    def searchContent(self, key, quick, pg="1"):
        clean_key = str(key).strip()
        return self.fetch_books(clean_key, pg)

    def fetch_books(self, keyword, pg):
        url = f"{self.BASE_URL_SEARCH}/api/v5/search/words"
        
        params = {
            'gender': '3',
            'imei_ip': '2937357107',
            'page': str(pg),
            'wd': str(keyword)
        }
        
        data = self.make_request(url, params)
        videos = []
        
        if data and 'data' in data and 'books' in data['data']:
            for book in data['data']['books']:
                book_id = str(book.get('id', ''))
                title = book.get('original_title', book.get('title', '未知'))
                author = book.get('original_author', book.get('author', '未知'))
                cover = book.get('image_link', '')
                status_code = book.get('creation_status', 0)
                status = "连载" if status_code == 0 else "完结"
                
                videos.append({
                    "vod_id": book_id,
                    "vod_name": title,
                    "vod_pic": cover,
                    "vod_remarks": f"{status}|{author}",
                })
                
        return {'list': videos, 'page': pg, 'pagecount': 999, 'limit': 20, 'total': 9999}

    def detailContent(self, ids):
        book_id = ids[0]
        
        info_url = f"{self.BASE_URL_SEARCH}/api/v4/book/detail"
        info_params = {
            'id': str(book_id),
            'imei_ip': '2937357107',
            'teeny_mode': '0'
        }
        info_resp = self.make_request(info_url, info_params)
        
        vod = {
            "vod_id": book_id,
            "vod_name": "获取失败",
            "vod_play_from": "七猫小说",
            "vod_content": "",
            "type_name": "小说"
        }
        
        if info_resp and 'data' in info_resp:
            info = info_resp['data']
            vod["vod_name"] = info.get('title', '')
            vod["vod_pic"] = info.get('image_link', '')
            vod["vod_actor"] = info.get('author', '')
            vod["vod_content"] = info.get('intro', '')
            status = "连载中" if info.get('creation_status') == 0 else "已完结"
            vod["vod_remarks"] = f"{status} | {info.get('word_count', '')}字"

        toc_url = f"{self.BASE_URL_CONTENT}/api/v1/chapter/chapter-list"
        toc_params = {'id': str(book_id)}
        toc_resp = self.make_request(toc_url, toc_params)
        
        play_list = []
        if toc_resp and 'data' in toc_resp and 'chapter_lists' in toc_resp['data']:
            chapters = toc_resp['data']['chapter_lists']
            for chapter in chapters:
                c_title = chapter.get('title', f"第{chapter.get('display_order')}章")
                c_id = chapter.get('id')
                play_url = f"{book_id}+{c_id}"
                play_list.append(f"{c_title}${play_url}")
        
        vod["vod_play_url"] = "#".join(play_list)
        return {"list": [vod]}

    def playerContent(self, flag, id, vipFlags):
        try:
            if "+" not in id:
                return {}
            
            book_id, chapter_id = id.split("+")
            
            url = f"{self.BASE_URL_CONTENT}/api/v1/chapter/content"
            params = {
                'id': str(book_id),
                'chapterId': str(chapter_id)
            }
            
            resp = self.make_request(url, params)
            content_text = "获取内容失败"
            
            if resp and 'data' in resp and 'content' in resp['data']:
                encrypted_content = resp['data']['content']
                content_text = self.aes_decrypt(encrypted_content)
                content_text = content_text.replace("\n", "\n\n　　")
                content_text = "　　" + content_text
            
            return {
                "parse": 0,
                "playUrl": "",
                "url": "novel://" + json.dumps({
                    "title": "",
                    "content": content_text
                }, ensure_ascii=False),
                "header": ""
            }
            
        except Exception as e:
            return {
                "parse": 0,
                "playUrl": "",
                "url": "novel://" + json.dumps({"content": f"解析错误: {e}"}, ensure_ascii=False)
            }

    def localProxy(self, params):
        pass