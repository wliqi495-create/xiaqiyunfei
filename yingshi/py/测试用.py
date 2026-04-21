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
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

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
                body {
                    margin: 0; padding: 20px 16px;
                    background-color: #f8f1e3; color: #3e3e3e;
                    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
                    line-height: 1.8; font-size: 22px;
                    word-wrap: break-word; user-select: none;
                }
                /* 右上角关闭按钮 */
                .close-btn {
                    position: fixed; top: 15px; right: 15px; width: 44px; height: 44px;
                    background: rgba(91, 70, 54, 0.6); color: #f8f1e3; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 30px; z-index: 10001; border: none; font-weight: bold;
                }
                /* 朗读控制按钮 */
                .tts-controls {
                    position: fixed; top: 70px; right: 15px;
                    display: flex; gap: 8px; z-index: 10000;
                }
                .tts-btn {
                    background: rgba(91, 70, 54, 0.8); color: #f8f1e3;
                    border: none; border-radius: 20px; padding: 10px 15px;
                    font-size: 14px; cursor: pointer; min-width: 60px;
                    transition: all 0.2s;
                }
                .tts-btn:hover {
                    background: rgba(91, 70, 54, 0.9);
                    transform: translateY(-2px);
                }
                .tts-btn:active {
                    transform: translateY(0);
                }
                .tts-btn.active {
                    background: rgba(139, 92, 70, 0.9);
                    box-shadow: 0 0 10px rgba(139, 92, 70, 0.5);
                }
                .tts-btn:disabled {
                    background: rgba(140, 123, 117, 0.5);
                    cursor: not-allowed;
                }
                /* 朗读段落反白样式 */
                .reading-active {
                    background-color: #5b4636 !important;
                    color: #f8f1e3 !important;
                    border-radius: 4px;
                }
                #content-wrapper { padding-bottom: 80px; }
                .chapter-section { margin-bottom: 40px; }
                h2 { 
                    color: #5b4636; border-bottom: 2px solid #8c7b75; 
                    text-align: center; margin-top: 30px; padding-bottom: 10px;
                }
                p { 
                    margin-bottom: 1.2em; text-indent: 2em; padding: 12px 8px; 
                    transition: background 0.2s; cursor: pointer;
                    border-radius: 6px;
                }
                p:hover { background-color: rgba(91, 70, 54, 0.15); }
                .status-bar {
                    position: fixed; bottom: 0; left: 0; right: 0;
                    background: rgba(248, 241, 227, 0.95); padding: 10px 15px;
                    display: flex; justify-content: space-between;
                    font-size: 14px; color: #8c7b75; border-top: 1px solid #d1c7b7; z-index: 1000;
                }
                #loading-tip { text-align: center; padding: 20px; color: #8c7b75; display: none; }
            </style>
        </head>
        <body>
            <button class="close-btn" onclick="closeWindow()">×</button>
            
            <div class="tts-controls">
                <button class="tts-btn" id="test-tts-btn" onclick="testTTS()">测试TTS</button>
                <button class="tts-btn" id="start-tts-btn" onclick="startReading()" disabled>朗读</button>
                <button class="tts-btn" id="pause-tts-btn" onclick="togglePause()" disabled>暂停</button>
                <button class="tts-btn" id="stop-tts-btn" onclick="stopReading()" disabled>停止</button>
            </div>
            
            <div id="content-wrapper"></div>
            <div id="loading-tip">正在加载下一章...</div>
            <div class="status-bar">
                <span id="p-info">初始化中...</span>
                <span id="t-info">点击段落测试朗读</span>
            </div>
            <script>
                const params = new URLSearchParams(window.location.search);
                const bid = params.get('bid');
                let currentIdx = parseInt(params.get('idx') || '0');
                let loading = false, isEnd = false;
                let currentParagraph = null;
                
                // TTS 相关变量
                let speechSynthesis = window.speechSynthesis;
                let currentUtterance = null;
                let isSpeaking = false;
                let isPaused = false;
                let ttsAvailable = false;
                
                function log(msg) {
                    console.log('[READER] ' + msg);
                    document.getElementById('t-info').innerText = msg;
                }

                function closeWindow() {
                    // 停止朗读
                    stopReading();
                    
                    // 通知服务器关闭弹窗
                    fetch('/close').then(() => { 
                        window.location.href = "about:blank"; 
                    });
                }

                // 检查TTS可用性
                function checkTTSAvailability() {
                    if (!speechSynthesis) {
                        log('浏览器不支持Web Speech API');
                        ttsAvailable = false;
                        return false;
                    }
                    
                    // 获取可用语音列表
                    let voices = speechSynthesis.getVoices();
                    
                    // 如果语音列表为空，等待voiceschanged事件
                    if (voices.length === 0) {
                        log('加载语音列表中...');
                        speechSynthesis.onvoiceschanged = function() {
                            voices = speechSynthesis.getVoices();
                            setupTTS(voices);
                        };
                    } else {
                        setupTTS(voices);
                    }
                    
                    return true;
                }
                
                function setupTTS(voices) {
                    if (voices.length === 0) {
                        log('未找到可用语音，TTS可能不可用');
                        ttsAvailable = false;
                        return;
                    }
                    
                    // 查找中文语音
                    const chineseVoices = voices.filter(voice => 
                        voice.lang.startsWith('zh') || 
                        voice.lang.includes('CN') || 
                        voice.lang.includes('CHN')
                    );
                    
                    if (chineseVoices.length > 0) {
                        log(`找到 ${chineseVoices.length} 个中文语音`);
                        ttsAvailable = true;
                        
                        // 启用TTS控制按钮
                        document.getElementById('start-tts-btn').disabled = false;
                        document.getElementById('test-tts-btn').disabled = false;
                    } else {
                        log(`找到 ${voices.length} 个语音，但无中文语音`);
                        ttsAvailable = true; // 仍然可以尝试使用默认语音
                    }
                }

                // 测试TTS功能
                function testTTS() {
                    if (!ttsAvailable) {
                        log('TTS功能不可用');
                        return;
                    }
                    
                    // 停止当前朗读
                    stopReading();
                    
                    const testText = '测试语音合成，这是朗读功能测试。当前时间：' + new Date().toLocaleTimeString();
                    
                    currentUtterance = new SpeechSynthesisUtterance(testText);
                    currentUtterance.lang = 'zh-CN';
                    currentUtterance.rate = 0.9;  // 语速
                    currentUtterance.pitch = 1.0; // 音调
                    currentUtterance.volume = 1.0; // 音量
                    
                    currentUtterance.onstart = function() {
                        isSpeaking = true;
                        isPaused = false;
                        log('开始测试朗读...');
                        updateTTSButtons();
                    };
                    
                    currentUtterance.onend = function() {
                        isSpeaking = false;
                        log('测试朗读结束');
                        updateTTSButtons();
                    };
                    
                    currentUtterance.onerror = function(event) {
                        isSpeaking = false;
                        log('朗读出错: ' + event.error);
                        updateTTSButtons();
                    };
                    
                    speechSynthesis.speak(currentUtterance);
                }

                // 开始朗读当前段落
                function startReading() {
                    if (!ttsAvailable || !currentParagraph) {
                        log('请先点击一个段落');
                        return;
                    }
                    
                    // 停止当前朗读
                    stopReading();
                    
                    const text = currentParagraph.innerText.trim();
                    if (!text) {
                        log('段落内容为空');
                        return;
                    }
                    
                    currentUtterance = new SpeechSynthesisUtterance(text);
                    currentUtterance.lang = 'zh-CN';
                    currentUtterance.rate = 0.9;
                    currentUtterance.pitch = 1.0;
                    currentUtterance.volume = 1.0;
                    
                    currentUtterance.onstart = function() {
                        isSpeaking = true;
                        isPaused = false;
                        log('开始朗读...');
                        updateTTSButtons();
                    };
                    
                    currentUtterance.onend = function() {
                        isSpeaking = false;
                        log('朗读结束');
                        updateTTSButtons();
                    };
                    
                    currentUtterance.onerror = function(event) {
                        isSpeaking = false;
                        log('朗读出错: ' + event.error);
                        updateTTSButtons();
                    };
                    
                    speechSynthesis.speak(currentUtterance);
                }
                
                // 切换暂停/继续
                function togglePause() {
                    if (!isSpeaking) return;
                    
                    if (isPaused) {
                        speechSynthesis.resume();
                        isPaused = false;
                        log('继续朗读');
                    } else {
                        speechSynthesis.pause();
                        isPaused = true;
                        log('暂停朗读');
                    }
                    
                    updateTTSButtons();
                }
                
                // 停止朗读
                function stopReading() {
                    if (speechSynthesis.speaking) {
                        speechSynthesis.cancel();
                        isSpeaking = false;
                        isPaused = false;
                        log('停止朗读');
                        updateTTSButtons();
                    }
                }
                
                // 更新TTS按钮状态
                function updateTTSButtons() {
                    const startBtn = document.getElementById('start-tts-btn');
                    const pauseBtn = document.getElementById('pause-tts-btn');
                    const stopBtn = document.getElementById('stop-tts-btn');
                    const testBtn = document.getElementById('test-tts-btn');
                    
                    // 如果没有段落被选中，禁用开始按钮
                    startBtn.disabled = !ttsAvailable || !currentParagraph;
                    
                    // 暂停按钮状态
                    pauseBtn.disabled = !isSpeaking;
                    pauseBtn.textContent = isPaused ? '继续' : '暂停';
                    
                    // 停止按钮状态
                    stopBtn.disabled = !isSpeaking;
                    
                    // 测试按钮状态
                    testBtn.disabled = !ttsAvailable;
                    
                    // 添加/移除激活状态
                    pauseBtn.classList.toggle('active', isSpeaking);
                    stopBtn.classList.toggle('active', isSpeaking);
                }

                // 清除高亮
                function clearHighlight() {
                    document.querySelectorAll('.reading-active').forEach(e => {
                        e.classList.remove('reading-active');
                    });
                }

                // 为段落添加点击事件
                function setupParagraphClickEvents() {
                    const paragraphs = document.querySelectorAll('#content-wrapper p, #content-wrapper h2');
                    paragraphs.forEach((p, index) => {
                        // 移除旧的事件监听器，避免重复绑定
                        p.removeEventListener('click', handleParagraphClick);
                        p.addEventListener('click', handleParagraphClick);
                    });
                }

                // 段落点击处理
                function handleParagraphClick(event) {
                    const paragraph = event.currentTarget;
                    const text = paragraph.innerText.trim();
                    
                    if (!text) return;
                    
                    // 停止当前朗读
                    stopReading();
                    
                    // 高亮当前段落
                    clearHighlight();
                    paragraph.classList.add('reading-active');
                    currentParagraph = paragraph;
                    
                    log('选中段落: ' + text.substring(0, 30) + '...');
                    
                    // 更新按钮状态
                    updateTTSButtons();
                }

                // 简化的页面加载
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
                        
                        currentIdx = idx;
                        document.getElementById('p-info').innerText = `章节: ${currentIdx + 1} / ${data.total}`;
                        if (currentIdx >= data.total - 1) isEnd = true;
                        
                        // 内容加载完成后设置点击事件
                        setTimeout(setupParagraphClickEvents, 100);
                    } finally {
                        loading = false;
                        document.getElementById('loading-tip').style.display = 'none';
                    }
                }

                // 瀑布流滚动监听
                window.onscroll = () => {
                    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1200) {
                        loadNext(currentIdx + 1);
                    }
                };
                
                // 页面加载完成
                window.onload = function() {
                    log('页面加载完成');
                    
                    // 检查TTS可用性
                    checkTTSAvailability();
                    
                    // 加载初始章节
                    loadNext(currentIdx);
                    
                    // 初始按钮状态
                    updateTTSButtons();
                };
                
                // 页面卸载时停止朗读
                window.onbeforeunload = function() {
                    stopReading();
                };
            </script>
        </body>
        </html>
        """
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def serve_chapter_data(self, spider, query):
        try:
            bid = query.get('bid', [''])[0]
            idx = int(query.get('idx', ['0'])[0])
            chapter_list = spider.book_cache.get(bid, [])
            if not chapter_list or idx < 0 or idx >= len(chapter_list):
                self.send_json({'code': 400, 'msg': '章节不存在'})
                return
            current = chapter_list[idx]
            content = spider.fetch_chapter_text(bid, current['cid'])
            self.send_json({'code': 200, 'title': current['title'], 'content': content, 'total': len(chapter_list)})
        except Exception as e:
            self.send_json({'code': 500, 'msg': str(e)})

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def log_message(self, format, *args): pass

# ==================== 2. 爬虫主体 ====================

class BaseSpider:
    def init(self, extend=""): pass
    def getName(self): pass
    def getDependence(self): return []
    def isVideoFormat(self, url): pass
    def manualVideoCheck(self): pass
    def homeContent(self, filter): pass
    def homeVideoContent(self): pass
    def categoryContent(self, tid, pg, filter, extend): pass
    def detailContent(self, ids): pass
    def searchContent(self, key, quick): pass
    def playerContent(self, flag, id, vipFlags): pass
    def localProxy(self, params): pass
    def destroy(self): pass

class Spider(BaseSpider):
    server = None
    server_port = 0
    book_cache = {} 
    current_dialog = None

    def getName(self): return "阅读助手(羊皮纸+TTS)"
    def init(self, extend=""): 
        try: self._start_server()
        except: pass
    def destroy(self):
        if self.server:
            self.server.shutdown()
            self.server = None
    
    def close_dialog(self):
        if self.current_dialog:
            try: self.current_dialog.dismiss()
            except: pass
            self.current_dialog = None

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

    def homeContent(self, filter):
        cats = [("玄幻奇幻", "1|202"), ("都市人生", "1|203"), ("武侠仙侠", "1|205"), ("历史军事", "1|56"), ("科幻末世", "1|64"), ("游戏竞技", "1|75"), ("现代言情", "2|1"), ("古代言情", "2|2"), ("幻想言情", "2|4"), ("婚恋情感", "2|6"), ("悬疑推理", "3|262")]
        return {'class': [{"type_name": n, "type_id": i} for n, i in cats], 'filters': {}}
    
    def homeVideoContent(self): return {'list': []}
    
    def categoryContent(self, tid, pg, filter, extend):
        try: gender, cat_id = tid.split("|")
        except: gender, cat_id = "1", "202"
        params = {'gender': gender, 'category_id': cat_id, 'need_filters': '1', 'page': pg, 'need_category': '1'}
        url, signed = self.get_api_url("/api/v4/category/get-list", params, "bc")
        try:
            j = requests.get(url, params=signed, headers=self.get_headers()).json()
            videos = []
            for b in (j.get('data', {}).get('books', []) or j.get('books', [])):
                videos.append({"vod_id": str(b.get('id')), "vod_name": b.get('title'), "vod_pic": b.get('image_link'), "vod_remarks": b.get('author')})
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
            c_params = {'id': bid}
            c_url, c_signed = self.get_api_url("/api/v1/chapter/chapter-list", c_params, "ks")
            c_j = requests.get(c_url, params=c_signed, headers=self.get_headers()).json()
            chapters = []; display = []
            for idx, item in enumerate(c_j.get('data', {}).get('chapter_lists', [])):
                chapters.append({'cid': str(item['id']), 'title': item['title']})
                display.append(f"{item['title'].replace('$','')}${bid}@@{idx}")
            self.book_cache[bid] = chapters
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
                videos.append({"vod_id": str(b.get('id')), "vod_name": b.get('original_title'), "vod_pic": b.get('image_link'), "vod_remarks": b.get('original_author')})
            return {'list': videos, 'page': pg}
        except: return {'list': [], 'page': pg}

    def playerContent(self, flag, id, vipFlags):
        threading.Thread(target=self._show_popup_dialog, args=(id.split("@@")[0], id.split("@@")[1])).start()
        return {'parse': 0, 'playUrl': '', 'url': 'http://127.0.0.1/dummy', 'header': ''}

    # ================= 弹窗逻辑 (使用简单的方法) =================
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
                        
                        print("弹窗显示成功")
                        
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

    def localProxy(self, params): pass