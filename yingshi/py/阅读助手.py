# coding=utf-8
# !/usr/bin/python

import sys
import hashlib
import base64
import json
import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

# ================= 修复导入错误的部分 =================
sys.path.append('..')
try:
    # 尝试导入基类 Spider 并重命名为 BaseSpider 以匹配你的代码习惯
    from base.spider import Spider as BaseSpider
except ImportError:
    try:
        # 如果上面失败，尝试直接导入 BaseSpider (某些旧版本)
        from base.spider import BaseSpider
    except ImportError:
        # 如果都失败，定义一个空类防止报错
        class BaseSpider:
            pass

class Spider(BaseSpider):
    def getName(self):
        return "阅读助手"

    def init(self, extend=""):
        pass

    def isVideoFormat(self, url):
        return False

    def manualVideoCheck(self):
        pass

    # ================= 核心配置 =================
    AES_KEY = b'242ccb8230d709e1'
    SIGN_KEY = "d3dGiJc651gSQ8w1"
    APP_ID = "com.kmxs.reader"
    
    BASE_HEADERS = {
        "app-version": "51110",
        "platform": "android",
        "reg": "0",
        "AUTHORIZATION": "",
        "application-id": APP_ID, 
        "net-env": "1",
        "channel": "unknown",
        "qm-params": ""
    }

    # ================= 工具方法 =================

    def get_sign(self, params):
        sorted_keys = sorted(params.keys())
        sign_str = ""
        for k in sorted_keys:
            val = str(params[k])
            sign_str += f"{k}={val}"
        sign_str += self.SIGN_KEY
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest()

    def get_headers(self):
        headers = self.BASE_HEADERS.copy()
        headers['sign'] = self.get_sign(headers)
        # 必须伪装 UA，否则正文接口可能被拦截
        headers["User-Agent"] = "okhttp/3.12.1"
        return headers

    def decrypt_content(self, base64_content):
        try:
            encrypted_bytes = base64.b64decode(base64_content)
            if len(encrypted_bytes) < 16:
                return f"数据长度不足"
            iv = encrypted_bytes[:16]
            ciphertext = encrypted_bytes[16:]
            cipher = AES.new(self.AES_KEY, AES.MODE_CBC, iv)
            decrypted = cipher.decrypt(ciphertext)
            try:
                # 尝试标准去填充
                return unpad(decrypted, AES.block_size).decode('utf-8')
            except Exception:
                # 容错处理：直接解码并去头尾
                return decrypted.decode('utf-8', 'ignore').strip()
        except Exception as e:
            return f"解密错误: {str(e)}"

    def get_api_url(self, path, params, domain_type="bc"):
        params['sign'] = self.get_sign(params)
        base_url = "https://api-bc.wtzw.com" if domain_type == "bc" else "https://api-ks.wtzw.com"
        if "search" in path:
            base_url = "https://api-bc.wtzw.com"
        return f"{base_url}{path}", params

    # ================= 业务逻辑 =================

    def homeContent(self, filter):
        cats = [
            ("玄幻奇幻", "1|202"), ("都市人生", "1|203"), ("武侠仙侠", "1|205"),
            ("历史军事", "1|56"), ("科幻末世", "1|64"), ("游戏竞技", "1|75"),
            ("现代言情", "2|1"), ("古代言情", "2|2"), ("幻想言情", "2|4"),
            ("婚恋情感", "2|6"), ("悬疑推理", "3|262")
        ]
        classes = [{"type_name": n, "type_id": i} for n, i in cats]
        return {'class': classes, 'filters': {}}

    def homeVideoContent(self):
        return {'list': []}

    def categoryContent(self, tid, pg, filter, extend):
        try:
            gender, cat_id = tid.split("|")
        except:
            gender, cat_id = "1", "202"

        path = "/api/v4/category/get-list"
        params = {'gender': gender, 'category_id': cat_id, 'need_filters': '1', 'page': pg, 'need_category': '1'}
        headers = self.get_headers()
        url, signed_params = self.get_api_url(path, params, "bc")
        
        try:
            r = requests.get(url, params=signed_params, headers=headers)
            j = r.json()
            videos = []
            book_list = []
            if 'data' in j and 'books' in j['data']:
                book_list = j['data']['books']
            elif 'books' in j:
                book_list = j['books']

            for book in book_list:
                videos.append({
                    "vod_id": str(book.get('id')),
                    "vod_name": book.get('title'),
                    "vod_pic": book.get('image_link'),
                    "vod_remarks": book.get('author')
                })
            return {'list': videos, 'page': pg, 'pagecount': 999, 'limit': 20, 'total': 9999}
        except:
            return {'list': []}

    def detailContent(self, ids):
        bid = ids[0]
        headers = self.get_headers()
        
        detail_params = {'id': bid, 'imei_ip': '2937357107', 'teeny_mode': '0'}
        detail_url, detail_signed_params = self.get_api_url("/api/v4/book/detail", detail_params, "bc")
        
        vod = {"vod_id": bid, "vod_name": "获取中...", "vod_play_from": "阅读助手"}

        try:
            r = requests.get(detail_url, params=detail_signed_params, headers=headers)
            j = r.json()
            if 'data' in j and 'book' in j['data']:
                book_info = j['data']['book']
                vod["vod_name"] = book_info.get('title')
                vod["vod_pic"] = book_info.get('image_link')
                vod["type_name"] = book_info.get('category_name')
                vod["vod_remarks"] = f"{book_info.get('words_num', '')}字"
                vod["vod_actor"] = book_info.get('author')
                vod["vod_content"] = book_info.get('intro')
            
            # 获取目录
            chapter_params = {'id': bid}
            chapter_url, chapter_signed_params = self.get_api_url("/api/v1/chapter/chapter-list", chapter_params, "ks")
            
            r_c = requests.get(chapter_url, params=chapter_signed_params, headers=headers)
            j_c = r_c.json()
            
            chapter_list = []
            lists = []
            if 'data' in j_c and 'chapter_lists' in j_c['data']:
                lists = j_c['data']['chapter_lists']
            
            for item in lists:
                cid = str(item['id'])
                cname = str(item['title']).replace("@@", "-").replace("$", "")
                # ID格式：bid@@cid@@cname
                url_code = f"{bid}@@{cid}@@{cname}"
                chapter_list.append(f"{cname}${url_code}")
            
            vod['vod_play_url'] = "#".join(chapter_list)
            return {"list": [vod]}
        except Exception as e:
            vod["vod_content"] = f"Error: {e}"
            return {"list": [vod]}

    def searchContent(self, key, quick, pg="1"):
        path = "/api/v5/search/words"
        params = {'gender': '3', 'imei_ip': '2937357107', 'page': pg, 'wd': key}
        headers = self.get_headers()
        url, signed_params = self.get_api_url(path, params, "bc")
        try:
            r = requests.get(url, params=signed_params, headers=headers)
            j = r.json()
            videos = []
            if 'data' in j and 'books' in j['data']:
                for book in j['data']['books']:
                    videos.append({
                        "vod_id": str(book.get('id')),
                        "vod_name": book.get('original_title'),
                        "vod_pic": book.get('image_link'),
                        "vod_remarks": book.get('original_author')
                    })
            return {'list': videos, 'page': pg}
        except:
            return {'list': [], 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        """
        修正点：返回格式改回 JSON 字符串，以适配原版壳子的解析逻辑
        """
        try:
            parts = id.split("@@")
            bid = parts[0]
            cid = parts[1]
            title = parts[2] if len(parts) > 2 else ""
            
            params = {'id': bid, 'chapterId': cid}
            headers = self.get_headers()
            url, signed_params = self.get_api_url("/api/v1/chapter/content", params, "ks")
            
            r = requests.get(url, params=signed_params, headers=headers)
            j = r.json()
            
            content = ""
            if 'data' in j and 'content' in j['data']:
                if not title and 'title' in j['data']:
                    title = j['data']['title']
                content = self.decrypt_content(j['data']['content'])
            else:
                content = f"加载失败: {j.get('msg', '未知错误')}"
            
            if not title:
                title = "章节正文"

            # 封装成 JSON 对象
            result_data = {
                'title': title,
                'content': content
            }
            
            # 将 JSON 转为字符串
            ret = json.dumps(result_data, ensure_ascii=False)
            
            # 使用 JSON 格式的 payload
            final_url = f"novel://{ret}"
            
            return {
                "parse": 0,
                "playUrl": "",
                "url": final_url,
                "header": ""
            }
        except Exception as e:
            err_data = {
                'title': "错误",
                'content': f"发生异常: {str(e)}"
            }
            return {
                "parse": 0,
                "playUrl": "",
                "url": f"novel://{json.dumps(err_data, ensure_ascii=False)}",
                "header": ""
            }

    def localProxy(self, params):
        pass
