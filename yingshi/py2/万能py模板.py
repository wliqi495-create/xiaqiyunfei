import re
import requests
import json
import os
import time
import random
from urllib.parse import urlparse, parse_qs, urljoin
from typing import Dict, List, Optional, Tuple, Any
import logging
from concurrent.futures import ThreadPoolExecutor
import hashlib

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class UniversalVideoSpider:
    """万能通用视频爬虫"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # 预定义的正则表达式模式（针对视频网站优化）
        self.patterns = {
            # 视频标题
            'title': [
                r'<title[^>]*>([^<]+)</title>',
                r'<meta\s+property="og:title"\s+content="([^"]+)"',
                r'<meta\s+name="title"\s+content="([^"]+)"',
                r'<h1[^>]*>([^<]+)</h1>',
                r'class="video-title"[^>]*>([^<]+)',
                r'id="video-title"[^>]*>([^<]+)',
            ],
            
            # 视频描述
            'description': [
                r'<meta\s+property="og:description"\s+content="([^"]+)"',
                r'<meta\s+name="description"\s+content="([^"]+)"',
                r'class="video-description"[^>]*>([^<]+)',
                r'id="description"[^>]*>([^<]+)',
            ],
            
            # 视频URL（直接视频文件）
            'video_url': [
                r'src="([^"]+\.(mp4|flv|avi|mov|wmv|mkv|webm|m3u8)[^"]*)"',
                r'video-src="([^"]+)"',
                r'data-video="([^"]+)"',
                r'<source[^>]*src="([^"]+)"',
                r'player\.load\([^{]*\{[^}]*url:\s*[\'"]([^\'"]+)[\'"]',
                r'video_url:\s*[\'"]([^\'"]+)[\'"]',
                r'播放地址.*?[\'"](https?://[^\'"]+\.m3u8[^\'"]*)[\'"]',
            ],
            
            # 封面图片
            'cover_image': [
                r'<meta\s+property="og:image"\s+content="([^"]+)"',
                r'poster="([^"]+)"',
                r'data-poster="([^"]+)"',
                r'class="video-cover"[^>]*src="([^"]+)"',
                r'thumbnail:\s*[\'"]([^\'"]+)[\'"]',
            ],
            
            # 视频时长
            'duration': [
                r'duration["\']?\s*:\s*["\']?([0-9:]+)',
                r'时长[：:]\s*([0-9:]+)',
                r'<span[^>]*class="duration"[^>]*>([0-9:]+)</span>',
                r'data-duration="([^"]+)"',
            ],
            
            # 发布时间
            'publish_time': [
                r'发布时间[：:]\s*([^<]+)',
                r'发布于[：:]\s*([^<]+)',
                r'<time[^>]*>([^<]+)</time>',
                r'datetime="([^"]+)"',
                r'publish_time["\']?\s*:\s*["\']?([^"\']+)["\']?',
            ],
            
            # 播放次数
            'view_count': [
                r'播放[：:]\s*([0-9,]+)',
                r'观看[：:]\s*([0-9,]+)',
                r'播放量[：:]\s*([0-9,]+)',
                r'<span[^>]*class="views"[^>]*>([^<]+)</span>',
                r'view_count["\']?\s*:\s*["\']?([0-9,]+)',
            ],
            
            # M3U8相关
            'm3u8_url': [
                r'(https?://[^\s"\'<>]+\.m3u8[^\s"\']*)',
                r'var\s+url\s*=\s*["\'](https?://[^"\']+\.m3u8)["\']',
                r'm3u8["\']?\s*:\s*["\'](https?://[^"\']+)["\']',
            ],
            
            # JSON数据（包含视频信息）
            'json_data': [
                r'<script[^>]*type="application/ld\+json"[^>]*>([^<]+)</script>',
                r'window\.__INITIAL_STATE__\s*=\s*({[^;]+});',
                r'var\s+videoInfo\s*=\s*({[^;]+});',
            ],
            
            # iframe视频嵌入
            'iframe': [
                r'<iframe[^>]*src="([^"]+)"',
                r'src="([^"]+)"\s+[^>]*frameborder',
            ],
        }
        
        # 针对OK影视的特定规则
        self.ok_movie_rules = {
            'title': r'<h1[^>]*class="title"[^>]*>([^<]+)</h1>',
            'video_url': r'播放地址.*?href="([^"]+)"',
            'm3u8_url': r'"(https?://[^"]+\.m3u8)"',
            'episodes': r'<a[^>]*href="([^"]+)"[^>]*>第(\d+)集</a>',
        }
        
        # 网站特定处理器
        self.site_handlers = {
            'ok': self._handle_ok_movie,
            'bilibili': self._handle_bilibili,
            'youtube': self._handle_youtube,
            'iqiyi': self._handle_iqiyi,
            'youku': self._handle_youku,
            'tencent': self._handle_tencent,
        }
    
    def detect_site(self, url: str) -> str:
        """检测网站类型"""
        domain = urlparse(url).netloc.lower()
        
        if 'ok' in domain or 'okzyw' in domain:
            return 'ok'
        elif 'bilibili' in domain:
            return 'bilibili'
        elif 'youtube' in domain or 'youtu.be' in domain:
            return 'youtube'
        elif 'iqiyi' in domain:
            return 'iqiyi'
        elif 'youku' in domain:
            return 'youku'
        elif 'qq.com' in domain or 'tencent' in domain:
            return 'tencent'
        elif 'm3u8' in url:
            return 'm3u8'
        else:
            return 'generic'
    
    def _extract_with_patterns(self, html: str, pattern_type: str) -> Optional[str]:
        """使用正则表达式模式提取信息"""
        if pattern_type not in self.patterns:
            return None
            
        for pattern in self.patterns[pattern_type]:
            match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
            if match:
                return match.group(1).strip()
        return None
    
    def _extract_all_with_patterns(self, html: str, pattern_type: str) -> List[str]:
        """使用正则表达式模式提取所有匹配信息"""
        results = []
        if pattern_type not in self.patterns:
            return results
            
        for pattern in self.patterns[pattern_type]:
            matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
            for match in matches:
                if isinstance(match, tuple):
                    results.append(match[0].strip())
                else:
                    results.append(match.strip())
        return list(set(results))  # 去重
    
    def _handle_ok_movie(self, url: str, html: str) -> Dict[str, Any]:
        """处理OK影视网站"""
        data = {}
        
        # 使用特定规则提取
        title_match = re.search(self.ok_movie_rules['title'], html)
        if title_match:
            data['title'] = title_match.group(1).strip()
        
        # 提取M3U8链接
        m3u8_matches = re.findall(self.ok_movie_rules['m3u8_url'], html)
        if m3u8_matches:
            data['m3u8_urls'] = list(set(m3u8_matches))
        
        # 提取剧集信息
        episodes = []
        episode_matches = re.findall(self.ok_movie_rules['episodes'], html)
        for episode_url, episode_num in episode_matches:
            full_url = urljoin(url, episode_url)
            episodes.append({
                'number': episode_num,
                'url': full_url,
                'title': f'第{episode_num}集'
            })
        
        if episodes:
            data['episodes'] = episodes
        
        return data
    
    def _handle_bilibili(self, url: str, html: str) -> Dict[str, Any]:
        """处理B站视频"""
        data = {}
        
        # 提取JSON数据
        json_pattern = r'<script>window\.__playinfo__=(\{.*?\})</script>'
        match = re.search(json_pattern, html, re.DOTALL)
        if match:
            try:
                json_data = json.loads(match.group(1))
                if 'data' in json_data:
                    data['video_info'] = json_data['data']
            except:
                pass
        
        return data
    
    def _handle_m3u8(self, url: str, html: str = None) -> Dict[str, Any]:
        """处理M3U8链接"""
        data = {
            'm3u8_url': url,
            'type': 'm3u8'
        }
        
        try:
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                m3u8_content = response.text
                data['m3u8_content'] = m3u8_content
                
                # 提取TS文件列表
                ts_files = re.findall(r'^(?!#)(.*\.ts)', m3u8_content, re.MULTILINE)
                if ts_files:
                    data['ts_files'] = ts_files
        except Exception as e:
            logger.error(f"获取M3U8内容失败: {e}")
        
        return data
    
    def extract_video_info(self, html: str) -> Dict[str, Any]:
        """提取视频信息"""
        data = {}
        
        # 逐个提取各种信息
        for key in ['title', 'description', 'duration', 'publish_time', 'view_count']:
            value = self._extract_with_patterns(html, key)
            if value:
                data[key] = value
        
        # 提取视频URL（多个可能）
        video_urls = self._extract_all_with_patterns(html, 'video_url')
        if video_urls:
            data['video_urls'] = video_urls
        
        # 提取封面图片
        cover_images = self._extract_all_with_patterns(html, 'cover_image')
        if cover_images:
            data['cover_images'] = cover_images
        
        # 提取M3U8链接
        m3u8_urls = self._extract_all_with_patterns(html, 'm3u8_url')
        if m3u8_urls:
            data['m3u8_urls'] = m3u8_urls
        
        # 提取JSON数据
        json_strings = self._extract_all_with_patterns(html, 'json_data')
        if json_strings:
            for json_str in json_strings:
                try:
                    json_data = json.loads(json_str)
                    data['structured_data'] = json_data
                    break
                except:
                    continue
        
        # 提取iframe
        iframes = self._extract_all_with_patterns(html, 'iframe')
        if iframes:
            data['iframes'] = iframes
        
        return data
    
    def crawl(self, url: str, max_depth: int = 1) -> Dict[str, Any]:
        """
        主爬取函数
        
        Args:
            url: 目标URL
            max_depth: 最大爬取深度（用于剧集）
        
        Returns:
            包含视频信息的字典
        """
        logger.info(f"开始爬取: {url}")
        
        result = {
            'url': url,
            'success': False,
            'site_type': self.detect_site(url),
            'data': {},
            'timestamp': time.time()
        }
        
        try:
            # 发送请求
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            # 检测编码
            if response.encoding is None or response.encoding.lower() == 'iso-8859-1':
                response.encoding = 'utf-8'
            
            html = response.text
            
            # 根据网站类型使用不同处理器
            site_type = result['site_type']
            if site_type == 'm3u8':
                result['data'] = self._handle_m3u8(url)
            elif site_type in self.site_handlers:
                result['data'] = self.site_handlers[site_type](url, html)
            else:
                # 通用处理
                result['data'] = self.extract_video_info(html)
            
            # 补充通用信息
            generic_info = self.extract_video_info(html)
            for key, value in generic_info.items():
                if key not in result['data'] or not result['data'][key]:
                    result['data'][key] = value
            
            # 如果没有标题，使用URL的一部分
            if 'title' not in result['data'] or not result['data']['title']:
                result['data']['title'] = urlparse(url).path.split('/')[-1] or '未命名视频'
            
            result['success'] = True
            logger.info(f"爬取成功: {result['data'].get('title', '未知标题')}")
            
        except requests.RequestException as e:
            logger.error(f"请求失败: {e}")
            result['error'] = str(e)
        except Exception as e:
            logger.error(f"爬取过程出错: {e}")
            result['error'] = str(e)
        
        return result
    
    def batch_crawl(self, urls: List[str], max_workers: int = 5) -> List[Dict[str, Any]]:
        """批量爬取多个URL"""
        results = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(self.crawl, url) for url in urls]
            
            for future in futures:
                try:
                    result = future.result(timeout=60)
                    results.append(result)
                except Exception as e:
                    logger.error(f"批量爬取失败: {e}")
        
        return results
    
    def save_result(self, result: Dict[str, Any], output_dir: str = 'video_data'):
        """保存结果到文件"""
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成文件名
        title = result['data'].get('title', 'unknown').replace('/', '_').replace('\\', '_')
        filename = f"{title}_{int(time.time())}.json"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        logger.info(f"结果已保存到: {filepath}")
        return filepath
    
    def extract_m3u8_ts_links(self, m3u8_url: str) -> List[str]:
        """从M3U8文件中提取所有TS文件链接"""
        try:
            response = self.session.get(m3u8_url, timeout=10)
            if response.status_code != 200:
                return []
            
            content = response.text
            base_url = '/'.join(m3u8_url.split('/')[:-1]) + '/'
            
            ts_links = []
            lines = content.split('\n')
            
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#'):
                    if line.startswith('http'):
                        ts_links.append(line)
                    else:
                        ts_links.append(urljoin(base_url, line))
            
            return ts_links
            
        except Exception as e:
            logger.error(f"提取TS链接失败: {e}")
            return []
    
    def download_video(self, url: str, output_path: str = None) -> Optional[str]:
        """下载视频文件（支持直接视频URL）"""
        try:
            response = self.session.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            if output_path is None:
                # 自动生成文件名
                filename = url.split('/')[-1].split('?')[0]
                if not filename or '.' not in filename:
                    filename = f'video_{int(time.time())}.mp4'
                output_path = os.path.join('downloads', filename)
            
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            logger.info(f"视频下载完成: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"视频下载失败: {e}")
            return None


def main():
    """主函数示例"""
    spider = UniversalVideoSpider()
    
    # 示例URL列表（包含各种视频网站）
    test_urls = [
        # OK影视示例（请替换为实际URL）
        "http://www.okzyw.com/vod-play-id-12345-src-1-num-1.html",
        
        # 其他视频网站示例
        # "https://www.bilibili.com/video/BV1xx411c7mD",
        # "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        # "https://v.qq.com/x/cover/mzc00200mp8vo9b.html",
    ]
    
    print("=" * 60)
    print("万能视频爬虫启动")
    print("=" * 60)
    
    # 单URL爬取示例
    if test_urls:
        url = test_urls[0]
        print(f"\n正在爬取: {url}")
        
        result = spider.crawl(url)
        
        if result['success']:
            print(f"\n✓ 爬取成功!")
            print(f"网站类型: {result['site_type']}")
            print(f"视频标题: {result['data'].get('title', 'N/A')}")
            
            if 'm3u8_urls' in result['data']:
                print(f"M3U8链接: {result['data']['m3u8_urls'][:2]}")  # 显示前两个
                
            if 'video_urls' in result['data']:
                print(f"视频链接: {result['data']['video_urls'][:2]}")
                
            if 'duration' in result['data']:
                print(f"视频时长: {result['data']['duration']}")
            
            # 保存结果
            spider.save_result(result)
        else:
            print(f"\n✗ 爬取失败: {result.get('error', '未知错误')}")
    
    # 批量爬取示例
    # results = spider.batch_crawl(test_urls)
    # for result in results:
    #     if result['success']:
    #         print(f"成功: {result['data'].get('title')}")
    #     else:
    #         print(f"失败: {result.get('error')}")


# 快速使用函数
def quick_crawl(url: str):
    """快速爬取函数"""
    spider = UniversalVideoSpider()
    return spider.crawl(url)


def extract_all_video_links(html: str) -> List[str]:
    """从HTML中提取所有视频链接"""
    spider = UniversalVideoSpider()
    
    video_urls = spider._extract_all_with_patterns(html, 'video_url')
    m3u8_urls = spider._extract_all_with_patterns(html, 'm3u8_url')
    iframe_urls = spider._extract_all_with_patterns(html, 'iframe')
    
    all_links = video_urls + m3u8_urls + iframe_urls
    return list(set(all_links))  # 去重


if __name__ == "__main__":
    main()