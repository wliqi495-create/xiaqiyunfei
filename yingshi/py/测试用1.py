# coding=utf-8
#!/usr/bin/python

import sys
import hashlib
import base64
import json
import requests
import threading
import socket
import http.server
import socketserver
import urllib.parse
import time
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

# 引入安卓接口
from java import jclass, dynamic_proxy
from java.lang import Runnable

# ==================== 1. 本地 Web 服务器 ====================

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

class NovelHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        spider = getattr(self.server, 'spider', None)
        path_info = urllib.parse.urlparse(self.path)
        path = path_info.path
        query = urllib.parse.parse_qs(path_info.query)
        
        # 新增：网页端调用的关闭窗口接口
        if path == '/close':
            if spider: spider.close_dialog()
            self.send_response(200)
            self.end_headers()
            return

        if path == '/read.html':
            self.serve_reader_ui()
        elif path == '/api/chapter':
            self.serve_chapter_data(spider, query)
        else:
            self.send_error(404)

    def serve_chapter_data(self, spider, query):
        try:
            bid = query.get('bid', [''])[0]
            idx = int(query.get('idx', ['0'])[0])
            
            # 【修改点】优先读缓存，如果为空，调用同步方法现场抓取
            chapter_list = spider.book_cache.get(bid, [])
            if not chapter_list:
                spider.fetch_chapters_sync(bid)
                chapter_list = spider.book_cache.get(bid, [])

            if not chapter_list or idx >= len(chapter_list):
                self.send_json({'code': 400, 'msg': '章节数据未加载'})
                return
            
            current = chapter_list[idx]
            content = spider.fetch_chapter_text(bid, current['cid'])
            self.send_json({'code': 200, 'title': current['title'], 'content': content, 'total': len(chapter_list)})
        except Exception as e:
            self.send_json({'code': 500, 'msg': str(e)})

    def serve_reader_ui(self):
        # 保持羊皮纸风格，新增瀑布流、反白朗读和关闭按钮
        html = """
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>阅读器</title>
            <style>
                body { margin: 0; padding: 20px 16px; background-color: #f8f1e3; color: #3e3e3e; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.8; font-size: 22px; word-wrap: break-word; user-select: none; }
                .close-btn { position: fixed; top: 15px; right: 15px; width: 44px; height: 44px; background: rgba(91, 70, 54, 0.6); color: #f8f1e3; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; z-index: 10001; border: none; font-weight: bold; }
                .tts-controls { position: fixed; top: 70px; right: 15px; display: flex; gap: 8px; z-index: 10000; flex-direction: column; }
                .tts-btn { background: rgba(91, 70, 54, 0.8); color: #f8f1e3; border: none; border-radius: 20px; padding: 10px 15px; font-size: 14px; cursor: pointer; min-width: 60px; transition: all 0.2s; }
                .tts-btn:disabled { background: rgba(140, 123, 117, 0.5); cursor: not-allowed; }
                .reading-active { background-color: #5b4636 !important; color: #f8f1e3 !important; border-radius: 4px; }
                #content-wrapper { padding-bottom: 80px; }
                .chapter-section { margin-bottom: 40px; }
                h2 { color: #5b4636; border-bottom: 2px solid #8c7b75; text-align: center; margin-top: 30px; padding-bottom: 10px; }
                p { margin-bottom: 1.2em; text-indent: 2em; padding: 12px 8px; transition: background 0.2s; cursor: pointer; border-radius: 6px; }
                #loading-tip { text-align: center; padding: 20px; color: #8c7b75; display: none; }
                .status-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(248, 241, 227, 0.95); padding: 10px 15px; display: flex; justify-content: space-between; font-size: 14px; color: #8c7b75; border-top: 1px solid #d1c7b7; z-index: 1000; }
            </style>
        </head>
        <body>
            <button class="close-btn" onclick="closeWindow()">×</button>
            <div class="tts-controls">
                <button class="tts-btn" id="start-tts-btn" onclick="startReading()">朗读</button>
                <button class="tts-btn" id="stop-tts-btn" onclick="stopReading()">停止</button>
            </div>
            <div id="content-wrapper"></div>
            <div id="loading-tip">正在加载下一章...</div>
            <div class="status-bar"><span id="p-info">初始化中...</span><span id="t-info">点击段落测试朗读</span></div>
            <script>
                const params = new URLSearchParams(window.location.search);
                const bid = params.get('bid');
                let currentIdx = parseInt(params.get('idx') || '0');
                let loading = false, isEnd = false;
                let currentParagraph = null;
                let speechSynthesis = window.speechSynthesis;
                let currentUtterance = null;
                
                function log(msg) { document.getElementById('t-info').innerText = msg; }
                function closeWindow() { stopReading(); fetch('/close').then(() => { window.location.href = "about:blank"; }); }
                
                function startReading() {
                    if (!speechSynthesis) return;
                    stopReading();
                    if (!currentParagraph) { log('请先点击一个段落'); return; }
                    const text = currentParagraph.innerText.trim();
                    currentUtterance = new SpeechSynthesisUtterance(text);
                    currentUtterance.lang = 'zh-CN';
                    currentUtterance.onend = function() {
                        let next = currentParagraph.nextElementSibling;
                        if (next && next.tagName === 'P') { 
                            currentParagraph.classList.remove('reading-active');
                            next.click();
                            setTimeout(startReading, 500); 
                        }
                    };
                    speechSynthesis.speak(currentUtterance);
                }
                
                function stopReading() { if (speechSynthesis) speechSynthesis.cancel(); }
                
                function handleParagraphClick(event) {
                    stopReading();
                    if(currentParagraph) currentParagraph.classList.remove('reading-active');
                    currentParagraph = event.currentTarget;
                    currentParagraph.classList.add('reading-active');
                    log('选中段落');
                }

                async function loadNext(idx) {
                    if (loading || isEnd) return;
                    loading = true;
                    document.getElementById('loading-tip').style.display = 'block';
                    try {
                        const res = await fetch(`/api/chapter?bid=${bid}&idx=${idx}`);
                        const data = await res.json();
                        if (data.code !== 200) { isEnd = true; return; }
                        
                        let div = document.createElement('div');
                        div.className = 'chapter-section';
                        div.innerHTML = `<h2>${data.title}</h2>${data.content}`;
                        document.getElementById('content-wrapper').appendChild(div);
                        
                        div.querySelectorAll('p').forEach(p => p.addEventListener('click', handleParagraphClick));
                        
                        currentIdx = idx;
                        document.getElementById('p-info').innerText = `章节: ${currentIdx + 1} / ${data.total}`;
                        if (currentIdx >= data.total - 1) isEnd = true;
                    } finally {
                        loading = false;
                        document.getElementById('loading-tip').style.display = 'none';
                    }
                }

                window.onscroll = () => {
                    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
                        loadNext(currentIdx + 1);
                    }
                };
                
                window.onload = function() { loadNext(currentIdx); };
            </script>
        </body>
        </html>
        """
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))
    
    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

# ==================== 2. 爬虫主体 ====================

class BaseSpider:
    def init(self, extend=""): pass
    def getName(self): pass
    def homeContent(self, filter): pass
    def categoryContent(self, tid, pg, filter, extend): pass
    def detailContent(self, ids): pass
    def destroy(self): pass

class Spider(BaseSpider):
    server = None
    server_port = 0
    book_cache = {} 
    current_dialog = None
    act = None 

    def getName(self): return "阅读助手(修正版)"
    
    def init(self, extend=""): 
        try: self._start_server()
        except: pass
        # 启动 Activity 获取线程
        threading.Thread(target=self._get_activity).start()

    def destroy(self):
        if self.server:
            try: self.server.shutdown()
            except: pass
            self.server = None
    
    def close_dialog(self):
        if self.current_dialog:
            try: self.current_dialog.dismiss()
            except: pass
            self.current_dialog = None
        self._simulate_back()

    def _start_server(self):
        if self.server: return
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('127.0.0.1', 0))
            self.server_port = sock.getsockname()[1]
            sock.close()
            self.server = ThreadedHTTPServer(('127.0.0.1', self.server_port), NovelHandler)
            self.server.spider = self
            t = threading.Thread(target=self.server.serve_forever)
            t.daemon = True
            t.start()
        except: pass

    # API 参数与解密逻辑
    AES_KEY = b'242ccb8230d709e1'
    SIGN_KEY = "d3dGiJc651gSQ8w1"
    APP_ID = "com.kmxs.reader"
    BASE_HEADERS = {"app-version": "51110","platform": "android","reg": "0","AUTHORIZATION": "","application-id": APP_ID, "net-env": "1","channel": "unknown","qm-params": ""}

    def get_sign(self, params):
        sorted_keys = sorted(params.keys())
        sign_str = "".join([f"{k}={params[k]}" for k in sorted_keys]) + self.SIGN_KEY
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest()

    def get_headers(self):
        headers = self.BASE_HEADERS.copy()
        headers['sign'] = self.get_sign(headers)
        headers["User-Agent"] = "okhttp/3.12.1"
        return headers

    def decrypt_content(self, base64_content):
        try:
            encrypted_bytes = base64.b64decode(base64_content)
            cipher = AES.new(self.AES_KEY, AES.MODE_CBC, encrypted_bytes[:16])
            decrypted = cipher.decrypt(encrypted_bytes[16:])
            try: return unpad(decrypted, AES.block_size).decode('utf-8')
            except: return decrypted.decode('utf-8', 'ignore').strip()
        except: return "解密失败"

    def get_api_url(self, path, params, domain_type="bc"):
        params['sign'] = self.get_sign(params)
        base_url = "https://api-bc.wtzw.com" if domain_type == "bc" else "https://api-ks.wtzw.com"
        return f"{base_url}{path}", params

    def fetch_chapter_text(self, bid, cid):
        try:
            params = {'id': bid, 'chapterId': cid}
            url, signed = self.get_api_url("/api/v1/chapter/content", params, "ks")
            r = requests.get(url, params=signed, headers=self.get_headers(), timeout=5)
            j = r.json()
            if 'data' in j and 'content' in j['data']:
                raw = self.decrypt_content(j['data']['content'])
                return "".join([f"<p>{line}</p>" for line in raw.split('\n') if line.strip()])
            return f"<p style='color:red'>{j.get('msg', '无法读取')}</p>"
        except Exception as e: return f"<p style='color:red'>{str(e)}</p>"

    # 【新增方法】复制自 detailContent 的数据抓取逻辑
    # 保证点击列表时能获得和详情页一样的数据
    def fetch_chapters_sync(self, bid):
        try:
            c_params = {'id': bid}
            c_url, c_signed = self.get_api_url("/api/v1/chapter/chapter-list", c_params, "ks")
            c_j = requests.get(c_url, params=c_signed, headers=self.get_headers()).json()
            chapters = []
            for item in c_j.get('data', {}).get('chapter_lists', []):
                chapters.append({'cid': str(item['id']), 'title': item['title']})
            self.book_cache[bid] = chapters
            return True
        except: return False

    def homeContent(self, filter):
        cats = [("玄幻奇幻", "1|202"), ("都市人生", "1|203"), ("武侠仙侠", "1|205"), ("历史军事", "1|56"), ("科幻末世", "1|64"), ("游戏竞技", "1|75"), ("现代言情", "2|1"), ("古代言情", "2|2"), ("幻想言情", "2|4"), ("婚恋情感", "2|6"), ("悬疑推理", "3|262")]
        return {'class': [{"type_name": n, "type_id": i} for n, i in cats], 'filters': {}}
    
    def homeVideoContent(self): return {'list': []}
    
    def categoryContent(self, tid, pg, filter, extend):
        # 1. 拦截 open_ 开头的点击
        if tid.startswith("open_"):
            def handle_click():
                try:
                    bid = tid.replace("open_", "")
                    
                    # 关键：先调用复制过来的详情页逻辑，抓数据
                    self.fetch_chapters_sync(bid)
                    
                    # 再弹窗（此时缓存已有数据）
                    self._show_popup_dialog(bid, 0)
                    
                    # 模拟返回，留在列表
                    self._simulate_back()
                except: pass
            
            threading.Thread(target=handle_click).start()
            return {'list': [], 'page': 1, 'pagecount': 1}

        # 2. 正常获取列表
        try: gender, cat_id = tid.split("|")
        except: gender, cat_id = "1", "202"
        params = {'gender': gender, 'category_id': cat_id, 'need_filters': '1', 'page': pg, 'need_category': '1'}
        url, signed = self.get_api_url("/api/v4/category/get-list", params, "bc")
        try:
            j = requests.get(url, params=signed, headers=self.get_headers()).json()
            videos = []
            for b in (j.get('data', {}).get('books', []) or j.get('books', [])):
                videos.append({
                    "vod_id": "open_" + str(b.get('id')), # ID前缀
                    "vod_name": b.get('title'), 
                    "vod_pic": b.get('image_link'), 
                    "vod_tag": "folder",                  # 设为文件夹
                    "vod_remarks": b.get('author')
                })
            return {'list': videos, 'page': pg, 'pagecount': 999, 'limit': 20, 'total': 9999}
        except: return {'list': []}

    def detailContent(self, ids):
        bid = ids[0]
        params = {'id': bid, 'imei_ip': '2937357107', 'teeny_mode': '0'}
        url, signed = self.get_api_url("/api/v4/book/detail", params, "bc")
        vod = {"vod_id": bid, "vod_name": "加载中", "vod_play_from": "阅读助手"}
        try:
            j = requests.get(url, params=signed, headers=self.get_headers()).json()
            if 'data' in j and 'book' in j['data']:
                info = j['data']['book']
                vod.update({"vod_name": info.get('title'), "vod_pic": info.get('image_link'), "type_name": info.get('category_name'), "vod_remarks": f"{info.get('words_num', '')}字", "vod_content": info.get('intro')})
            
            # 这里也调用同步函数，保持一致
            self.fetch_chapters_sync(bid)
            
            chapters = self.book_cache.get(bid, [])
            display = []
            for idx, item in enumerate(chapters):
                display.append(f"{item['title'].replace('$','')}${bid}@@{idx}")
            vod['vod_play_url'] = "#".join(display)
            return {"list": [vod]}
        except Exception as e: return {"list": [vod]}

    def searchContent(self, key, quick, pg="1"):
        params = {'gender': '3', 'imei_ip': '2937357107', 'page': pg, 'wd': key}
        url, signed = self.get_api_url("/api/v5/search/words", params, "bc")
        try:
            j = requests.get(url, params=signed, headers=self.get_headers()).json()
            videos = []
            for b in j.get('data', {}).get('books', []):
                videos.append({
                    "vod_id": "open_" + str(b.get('id')), # 搜索也加前缀
                    "vod_name": b.get('original_title'), 
                    "vod_pic": b.get('image_link'), 
                    "vod_tag": "folder",
                    "vod_remarks": b.get('original_author')
                })
            return {'list': videos, 'page': pg}
        except: return {'list': [], 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        threading.Thread(target=self._show_popup_dialog, args=(id.split("@@")[0], id.split("@@")[1])).start()
        return {'parse': 0, 'playUrl': '', 'url': 'http://127.0.0.1/dummy', 'header': ''}

    def localProxy(self, params): pass

    # ================= 安卓交互 =================

    def _get_activity(self):
        if self.act: return self.act
        try:
            from java import jclass
            AT = jclass("android.app.ActivityThread")
            currentAT = AT.getMethod("currentActivityThread").invoke(None)
            mActivities = AT.getDeclaredField("mActivities")
            mActivities.setAccessible(True)
            values = mActivities.get(currentAT).values()
            try: records = values.toArray()
            except: records = values.getClass().getMethod("toArray").invoke(values)
            for r in records:
                try:
                    rClass = r.getClass()
                    activityField = rClass.getDeclaredField("activity")
                    activityField.setAccessible(True)
                    temp_act = activityField.get(r)
                    if temp_act and not temp_act.isFinishing() and not temp_act.isDestroyed():
                        self.act = temp_act
                        return temp_act
                except: continue
        except: pass
        return None

    def _run_on_ui(self, func):
        act = self._get_activity()
        if not act: return
        try:
            from java import dynamic_proxy
            from java.lang import Runnable
            class UiRunner(dynamic_proxy(Runnable)):
                def __init__(self, f): super().__init__(); self.f = f
                def run(self):
                    try: self.f()
                    except: pass
            act.runOnUiThread(UiRunner(func))
        except: pass

    def _simulate_back(self):
        def job():
            time.sleep(0.5)
            try: self.act.onBackPressed()
            except: pass
        threading.Thread(target=job).start()

    def _show_popup_dialog(self, bid, index):
        def launch():
            try:
                from java import jclass, dynamic_proxy
                from java.lang import Runnable
                JClass = jclass("java.lang.Class")
                AT = JClass.forName("android.app.ActivityThread")
                currentAT = AT.getMethod("currentActivityThread").invoke(None)
                mActivities = AT.getDeclaredField("mActivities")
                mActivities.setAccessible(True)
                values = mActivities.get(currentAT).values()
                try: 
                    records = values.toArray()
                except: 
                    records = values.getClass().getMethod("toArray").invoke(values)
                act = None
                for r in records:
                    try:
                        rClass = r.getClass()
                        activityField = rClass.getDeclaredField("activity")
                        activityField.setAccessible(True)
                        temp_act = activityField.get(r)
                        if temp_act and not temp_act.isFinishing() and not temp_act.isDestroyed():
                            act = temp_act
                            break
                    except: 
                        continue
                if not act: 
                    return

                class UiRunner(dynamic_proxy(Runnable)):
                    def __init__(self, func): 
                        super().__init__()
                        self.func = func
                    
                    def run(self):
                        try: 
                            self.func()
                        except: 
                            pass

                def show():
                    try:
                        Dialog = jclass("android.app.Dialog")
                        WebView = jclass("android.webkit.WebView")
                        ColorDrawable = jclass("android.graphics.drawable.ColorDrawable")
                        Color = jclass("android.graphics.Color")
                        
                        d = Dialog(act)
                        self.current_dialog = d
                        d.requestWindowFeature(1)
                        win = d.getWindow()
                        if win:
                            win.getDecorView().setPadding(0,0,0,0)
                            win.setBackgroundDrawable(ColorDrawable(Color.parseColor("#f8f1e3")))
                            win.setLayout(-1, -1)
                        
                        w = WebView(act)
                        ws = w.getSettings()
                        ws.setJavaScriptEnabled(True)
                        ws.setDomStorageEnabled(True)
                        ws.setMediaPlaybackRequiresUserGesture(False)
                        
                        w.setBackgroundColor(Color.parseColor("#f8f1e3"))
                        
                        # 加载阅读页面
                        url = f"http://127.0.0.1:{self.server_port}/read.html?bid={bid}&idx={index}"
                        print(f"加载阅读器页面: {url}")
                        w.loadUrl(url)
                        
                        d.setContentView(w)
                        d.show()
                        
                    except Exception as e:
                        print(f"弹窗显示异常: {e}")
                        import traceback
                        traceback.print_exc()
                
                act.runOnUiThread(UiRunner(show))
                
            except Exception as e:
                print(f"弹窗启动失败: {e}")
                import traceback
                traceback.print_exc()
        
        threading.Thread(target=launch).start()
