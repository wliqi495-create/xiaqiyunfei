# coding=utf-8
#!/usr/bin/python

import sys
import json
import threading
import socket
import http.server
import socketserver
import urllib.parse
import time
import random
from java import jclass, dynamic_proxy
from java.lang import Runnable

# ==================== 1. 本地 Web 服务器 (结构保持不变) ====================

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

class TestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # 路由：关闭接口
        if self.path == '/close':
            self.send_response(200)
            self.end_headers()
            return

        # 路由：测试页面 (用于WebView弹窗加载)
        if self.path.startswith('/test.html'):
            self.serve_test_ui()
        else:
            self.send_error(404)

    def serve_test_ui(self):
        # 生成一个简单的测试网页，带有关闭按钮
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Python窗口测试</title>
            <style>
                body { 
                    background-color: #f8f1e3; color: #5b4636; 
                    display: flex; flex-direction: column; 
                    justify-content: center; align-items: center; 
                    height: 100vh; margin: 0; font-family: sans-serif;
                }
                .card {
                    background: white; padding: 20px; border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;
                    width: 80%;
                }
                h2 { margin-top: 0; }
                p { color: #666; }
                .btn {
                    background: #5b4636; color: white; border: none;
                    padding: 10px 20px; border-radius: 5px; font-size: 16px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>WebView 测试成功</h2>
                <p>这是由 TVBox 内置 Python 服务器提供的页面。</p>
                <p>当前时间: <span id="time"></span></p>
                <p>5秒后自动关闭...</p>
            </div>
            <script>
                document.getElementById('time').innerText = new Date().toLocaleTimeString();
            </script>
        </body>
        </html>
        """
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))
    
    def log_message(self, format, *args): pass

# ==================== 2. 爬虫主体 (结构保持不变) ====================

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
    act = None
    
    # 状态标记，用于刷新页面显示
    last_action = "无操作"

    def getName(self): return "安卓窗口高级测试"

    def init(self, extend=""): 
        try: self._start_server()
        except: pass
        # 异步获取Activity，不阻塞主线程
        threading.Thread(target=self._get_activity).start()

    def destroy(self):
        if self.server:
            self.server.shutdown()
            self.server = None
    
    def _start_server(self):
        if self.server: return
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(('127.0.0.1', 0))
            self.server_port = sock.getsockname()[1]
            sock.close()
            self.server = ThreadedHTTPServer(('127.0.0.1', self.server_port), TestHandler)
            t = threading.Thread(target=self.server.serve_forever)
            t.daemon = True
            t.start()
        except: pass

    # ================= 核心业务逻辑 =================

    def homeContent(self, filter):
        # 首页入口
        return {'class': [{"type_name": "系统功能测试区", "type_id": "root"}], 'filters': {}}
    
    def homeVideoContent(self): return {'list': []}
    
    def categoryContent(self, tid, pg, filter, extend):
        # 1. 拦截处理指令 (所有 tid 都是 cmd_ 开头或 root)
        if tid.startswith("cmd_"):
            self._handle_command(tid)
            # 关键：执行完指令后，延时模拟返回键，抵消“进入文件夹”的操作
            # 这样用户感觉自己一直停留在当前页面
            threading.Timer(0.5, self._perform_back).start()
            
            # 更新状态文字（虽然页面马上会退回去，但为了逻辑完整）
            if tid == "cmd_toast": self.last_action = "执行了 Toast"
            elif tid == "cmd_dialog": self.last_action = "执行了 Dialog"
            elif tid == "cmd_webview": self.last_action = "执行了 WebView"
        
        # 2. 生成菜单列表 (全部使用 vod_tag="folder")
        # 这样点击任何一项，都会再次触发 categoryContent，而不会进入详情页
        
        # 动态生成一些随机数或时间，证明列表是活的
        time_str = time.strftime("%H:%M:%S")
        
        videos = [
            {
                "vod_id": "cmd_toast",
                "vod_name": "【测试】原生 Toast 提示",
                "vod_pic": "https://img.icons8.com/color/96/toast.png",
                "vod_tag": "folder",
                "vod_remarks": "点击弹出气泡"
            },
            {
                "vod_id": "cmd_dialog",
                "vod_name": "【测试】原生 Dialog 对话框",
                "vod_pic": "https://img.icons8.com/color/96/nothing-found.png",
                "vod_tag": "folder",
                "vod_remarks": "2秒后自动关闭"
            },
            {
                "vod_id": "cmd_webview",
                "vod_name": "【测试】WebView 网页弹窗",
                "vod_pic": "https://img.icons8.com/color/96/code.png",
                "vod_tag": "folder",
                "vod_remarks": "加载本地Python网页"
            },
            {
                "vod_id": "cmd_refresh",
                "vod_name": "【状态】刷新页面",
                "vod_pic": "https://img.icons8.com/color/96/synchronize.png",
                "vod_tag": "folder",
                "vod_remarks": time_str
            },
            {
                "vod_id": "cmd_back",
                "vod_name": "【操作】模拟返回键",
                "vod_pic": "https://img.icons8.com/color/96/return.png",
                "vod_tag": "folder",
                "vod_remarks": "退出当前层级"
            }
        ]
        
        return {
            'list': videos, 
            'page': 1, 
            'pagecount': 1, 
            'limit': 20, 
            'total': len(videos)
        }

    def detailContent(self, ids): 
        # 理论上不会进入这里，因为全都是 folder
        return {}
        
    def searchContent(self, key, quick): return {'list': []}
    def playerContent(self, flag, id, vipFlags): return {}
    def localProxy(self, params): pass

    # ================= Android 交互逻辑 (严格复用验证过的结构) =================

    def _get_activity(self):
        if self.act: return self.act
        try:
            JClass = jclass("java.lang.Class")
            AT = JClass.forName("android.app.ActivityThread")
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

        class UiRunner(dynamic_proxy(Runnable)):
            def __init__(self, f): super().__init__(); self.f = f
            def run(self):
                try: self.f()
                except: pass
        
        act.runOnUiThread(UiRunner(func))

    def _handle_command(self, cmd):
        if cmd == "cmd_toast":
            self._show_toast("Python 调用 Android Toast 成功！")
            
        elif cmd == "cmd_dialog":
            self._show_dialog()
            
        elif cmd == "cmd_webview":
            self._show_webview()
            
        elif cmd == "cmd_back":
            # 这里不需要额外操作，因为 categoryContent 结尾通用的 timer 会触发返回
            pass
        
        elif cmd == "cmd_refresh":
            self._show_toast("页面已刷新")

    # --- 具体功能的实现 ---

    def _show_toast(self, msg):
        def job():
            try:
                Toast = jclass("android.widget.Toast")
                Toast.makeText(self.act, str(msg), 1).show()
            except: pass
        self._run_on_ui(job)

    def _perform_back(self):
        def job():
            try: self.act.onBackPressed()
            except: pass
        self._run_on_ui(job)

    def _show_dialog(self):
        def job():
            try:
                AlertDialogBuilder = jclass("android.app.AlertDialog$Builder")
                builder = AlertDialogBuilder(self.act)
                builder.setTitle("原生 Dialog 测试")
                builder.setMessage("这是一个通过 Python 调用的安卓原生对话框。\n\n它将在 2 秒后自动关闭。")
                builder.setPositiveButton("确定", None)
                dialog = builder.create()
                dialog.show()
                
                # 自动关闭逻辑
                def close():
                    try: dialog.dismiss()
                    except: pass
                
                # 2秒后关闭 Dialog (注意：这里不需要触发返回键，因为主逻辑已经触发了一次返回键来退出folder)
                threading.Timer(2.0, lambda: self._run_on_ui(close)).start()
                
            except Exception as e:
                print(str(e))
        self._run_on_ui(job)

    def _show_webview(self):
        def job():
            try:
                Dialog = jclass("android.app.Dialog")
                WebView = jclass("android.webkit.WebView")
                ColorDrawable = jclass("android.graphics.drawable.ColorDrawable")
                Color = jclass("android.graphics.Color")
                
                d = Dialog(self.act)
                d.requestWindowFeature(1)
                win = d.getWindow()
                if win:
                    win.setBackgroundDrawable(ColorDrawable(Color.parseColor("#f8f1e3")))
                    win.setLayout(-1, -1) # 全屏
                
                w = WebView(self.act)
                w.getSettings().setJavaScriptEnabled(True)
                
                # 加载本地服务器页面
                url = "http://127.0.0.1:{}/test.html".format(self.server_port)
                w.loadUrl(url)
                
                d.setContentView(w)
                d.show()

                # 5秒后自动关闭
                def close_it():
                    try: d.dismiss()
                    except: pass
                threading.Timer(5.0, lambda: self._run_on_ui(close_it)).start()

            except Exception as e:
                print(str(e))
        
        self._run_on_ui(job)
