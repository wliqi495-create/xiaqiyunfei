# -*- coding: utf-8 -*-
# @Author  : AI Assistant
# @Desc    : 终极性能版 (智能并发 + 内存防爆 + 自动GC + 双TTL缓存)

import json
import os
import time
import hashlib
import threading
import requests
from requests.adapters import HTTPAdapter
from concurrent.futures import ThreadPoolExecutor, as_completed
from base.spider import Spider

class Spider(Spider):
    def getName(self):
        return "CjJson_Ultimate_Performance"

    def init(self, extend):
        self.sites = []
        self.session = requests.Session()
        
        # [性能优化1] 极速连接池
        # pool_connections 适当降低以节省内存，对于单用户 50 足矣
        adapter = HTTPAdapter(pool_connections=50, pool_maxsize=50, max_retries=1)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Connection": "keep-alive"
        })

        # [性能优化2] 缓存系统初始化
        self.cache_dir = "/storage/emulated/0/zy/cache/"
        self.memory_cache = {} 
        
        # --- 策略：24小时分类 / 1小时搜索 ---
        self.disk_ttl = 86400 
        self.search_ttl = 3600

        if not os.path.exists(self.cache_dir):
            try: os.makedirs(self.cache_dir)
            except: pass

        # [性能优化3] 异步启动垃圾回收 (不阻塞主线程)
        threading.Thread(target=self._silent_gc, daemon=True).start()

        # 加载站点配置
        default_path = "/storage/emulated/0/bdb/lib/cj.json"
        self.mode = "0" 
        json_path = default_path

        if extend:
            if "|" in extend:
                parts = extend.split("|")
                json_path = parts[0] if parts[0] else default_path
                self.mode = parts[1] if len(parts) > 1 else "0"
            elif len(extend) == 1 and extend in ["0", "1", "2"]:
                self.mode = extend
                json_path = default_path
            else:
                json_path = extend

        try:
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    all_sites = data.get("api_site", [])
                    self.sites = self._filter_sites(all_sites, self.mode)
        except Exception:
            pass

    # --- [新增] 静默垃圾回收 ---
    def _silent_gc(self):
        """后台清理超过7天的僵尸缓存文件"""
        try:
            # 延时5秒启动，避免抢占启动时的IO资源
            time.sleep(5)
            now = time.time()
            # 7天未修改的文件视为垃圾
            expire_time = 604800 
            
            if os.path.exists(self.cache_dir):
                for f in os.listdir(self.cache_dir):
                    if not f.endswith(".json"): continue
                    path = os.path.join(self.cache_dir, f)
                    try:
                        if now - os.path.getmtime(path) > expire_time:
                            os.remove(path)
                    except: pass
        except: pass

    # --- 缓存核心逻辑 ---
    
    def _get_disk_cache(self, key, custom_ttl=None):
        """读取磁盘缓存，支持自定义TTL"""
        try:
            md5_key = hashlib.md5(key.encode('utf-8')).hexdigest()
            path = os.path.join(self.cache_dir, f"{md5_key}.json")
            
            if os.path.exists(path):
                ttl_limit = custom_ttl if custom_ttl is not None else self.disk_ttl
                if time.time() - os.path.getmtime(path) < ttl_limit:
                    with open(path, "r", encoding="utf-8") as f:
                        return json.load(f)
                else:
                    os.remove(path) # 过期删除
        except:
            pass
        return None

    def _set_disk_cache(self, key, data):
        """写入磁盘缓存"""
        try:
            if not data or not data.get("list"): return 
            md5_key = hashlib.md5(key.encode('utf-8')).hexdigest()
            path = os.path.join(self.cache_dir, f"{md5_key}.json")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
        except:
            pass

    def _filter_sites(self, sites, mode):
        if mode == "0": return sites
        adult_kws = {"AV", "色", "福利", "成人", "18+", "偷拍", "自拍", "淫", "激情", "GAY", "SEX"}
        def is_adult(name):
            if not name: return False
            name_upper = name.upper()
            if name_upper.startswith("AV"): return True
            return any(k in name_upper for k in adult_kws)

        if mode == "1": return [s for s in sites if not is_adult(s.get("name", ""))]
        elif mode == "2": return [s for s in sites if is_adult(s.get("name", ""))]
        return sites

    def _fetch(self, api_url, params=None):
        try:
            sep = "&" if "?" in api_url else "?"
            qs = "&".join([f'{k}={v}' for k, v in params.items()]) if params else ""
            full_url = f"{api_url}{sep}{qs}" if qs else api_url
            # 搜索时超时缩短到1.5秒，提升整体响应速度
            timeout = 1.5 if params and "wd" in params else 3.0
            res = self.session.get(full_url, timeout=timeout, verify=False)
            if res.status_code == 200:
                try: return res.json()
                except: return json.loads(res.text.strip().lstrip('﻿'))
        except:
            pass
        return {}

    def homeContent(self, filter):
        classes = []
        filters = {}
        universal_filter = [
            {"key": "cateId", "name": "分类", "value": [
                {"n": "全部", "v": ""},
                {"n": "动作片", "v": "动作"}, {"n": "喜剧片", "v": "喜剧"},
                {"n": "爱情片", "v": "爱情"}, {"n": "科幻片", "v": "科幻"},
                {"n": "恐怖片", "v": "恐怖"}, {"n": "剧情片", "v": "剧情"},
                {"n": "战争片", "v": "战争"}, {"n": "国产剧", "v": "国产"},
                {"n": "港剧", "v": "香港"}, {"n": "韩剧", "v": "韩国"},
                {"n": "欧美剧", "v": "欧美"}, {"n": "台剧", "v": "台湾"},
                {"n": "日剧", "v": "日本"}, {"n": "纪录片", "v": "记录"},
                {"n": "动漫", "v": "动漫"}, {"n": "综艺", "v": "综艺"}
            ]}
        ]
        for i, s in enumerate(self.sites):
            type_id = str(i)
            clean_name = s.get("name", f"站点{i}").replace("TV-", "").replace("AV-", "")
            classes.append({"type_id": type_id, "type_name": clean_name})
            filters[type_id] = universal_filter
        return {"class": classes, "filters": filters}

    def homeVideoContent(self):
        return {"list": []}

    def categoryContent(self, tid, pg, filter, ext):
        try:
            idx = int(tid)
            if idx >= len(self.sites): return {"list": []}
            site = self.sites[idx]
        except:
            return {"list": []}

        api_sign = hashlib.md5(site.get("api", "").encode("utf-8")).hexdigest()
        ext_str = json.dumps(ext, sort_keys=True, ensure_ascii=False) if ext else ""
        ext_sign = hashlib.md5(ext_str.encode("utf-8")).hexdigest()

        cache_key = f"CAT_{api_sign}_{pg}_{ext_sign}"
        
        # 分类页：24小时缓存
        cached = self._get_disk_cache(cache_key)
        if cached: return cached

        try:
            cate_id_val = ext.get("cateId", "") if ext else ""
            paichu_str = str(site.get("paichu", ""))
            paichu = set(paichu_str.split(",")) if paichu_str else set()
            
            params = {"ac": "detail", "pg": pg}
            data = self._fetch(site["api"], params)
            
            video_list = []
            if data and "list" in data:
                for item in data["list"]:
                    if str(item.get("type_id")) in paichu: continue
                    if cate_id_val:
                        type_name = item.get("type_name", "")
                        if cate_id_val not in type_name: continue
                    
                    item["vod_id"] = f"{idx}@@{item['vod_id']}"
                    video_list.append(item)
            
            result = {
                "page": int(data.get("page", 1)) if data else 1,
                "pagecount": int(data.get("pagecount", 1)) if data else 1,
                "limit": 20,
                "total": int(data.get("total", 0)) if data else 0,
                "list": video_list
            }
            
            self._set_disk_cache(cache_key, result)
            return result
        except:
            return {"list": []}

    def detailContent(self, array):
        if not array: return {"list": []}
        vod_id_full = str(array[0])
        
        if vod_id_full in self.memory_cache:
            return self.memory_cache[vod_id_full]

        # [性能优化4] 内存防爆：超过50条自动清空
        if len(self.memory_cache) > 50:
            self.memory_cache.clear()

        if "@@" not in vod_id_full: return {"list": []}
        try:
            idx, vid = vod_id_full.split("@@")
            idx = int(idx)
            if idx >= len(self.sites): return {"list": []}
            
            site = self.sites[idx]
            data = self._fetch(site["api"], {"ac": "detail", "ids": vid})
            if data and "list" in data:
                item = data["list"][0]
                item["vod_id"] = vod_id_full
                result = {"list": [item]}
                
                self.memory_cache[vod_id_full] = result
                return result
        except: pass
        return {"list": []}

    def searchContent(self, key, quick, pg="1"):
        if not key: return {"list": []}
        
        cache_key = f"SEARCH_{self.mode}_{key}"
        
        # 搜索页：1小时缓存
        cached = self._get_disk_cache(cache_key, custom_ttl=self.search_ttl)
        if cached: return cached

        search_targets = []
        for i, s in enumerate(self.sites):
            bz_val = str(s.get("bz", "1")).strip()
            if bz_val != "0" and s.get("api"):
                search_targets.append((i, s))

        # [性能优化5] 智能计算线程数 (上限32)
        # 避免在低端设备上创建过多线程导致卡死
        worker_count = min(len(search_targets), 32)
        if worker_count == 0: return {"list": []}

        def search_one_site(target):
            idx, site = target
            try:
                paichu_str = str(site.get("paichu", ""))
                paichu = set(paichu_str.split(",")) if paichu_str else set()
                data = self._fetch(site["api"], {"ac": "detail", "wd": key})
                local_res = []
                if data and "list" in data:
                    for item in data["list"]:
                        if str(item.get("type_id")) in paichu: continue
                        site_name = site.get("name", "").replace("TV-", "").replace("AV-", "")
                        item["vod_name"] = f"[{site_name}] {item['vod_name']}"
                        item["vod_id"] = f"{idx}@@{item['vod_id']}"
                        local_res.append(item)
                return idx, local_res 
            except:
                return idx, []

        temp_results = {}
        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            futures = [executor.submit(search_one_site, target) for target in search_targets]
            for future in as_completed(futures):
                try:
                    idx, res = future.result()
                    if res: temp_results[idx] = res
                except: pass

        final_list = []
        sorted_indices = sorted(temp_results.keys())
        for idx in sorted_indices:
            final_list.extend(temp_results[idx])

        result_data = {"list": final_list}
        self._set_disk_cache(cache_key, result_data)
        
        return result_data

    def playerContent(self, flag, id, vipFlags):
        if ".m3u8" in id or ".mp4" in id:
            return {"url": id, "header": {"User-Agent": "Mozilla/5.0"}, "parse": 0, "jx": 0}
        return {"url": id, "header": {"User-Agent": "Mozilla/5.0"}, "parse": 1, "jx": 0}

    def localProxy(self, params):
        return [200, "video/MP2T", "", ""]