<?php
// PDF漫画阅读器 - 最终精准修复版（下滑防抖+上滑灵敏+菜单跳转不回弹）
header("Content-Type: text/html; charset=utf-8");
$baseDir = '漫画';
if (!is_dir($baseDir)) {
    mkdir($baseDir);
    echo "已自动创建 漫画 目录，请放入漫画";
    exit;
}
function scanDirectory($path, $pattern = '*') {
    $result = [];
    if (!is_dir($path)) return $result;
    $handle = opendir($path);
    if ($handle) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != '.' && $entry != '..') {
                $fullPath = $path . '/' . $entry;
                if ($pattern == '*' || fnmatch($pattern, $entry)) {
                    $result[] = $fullPath;
                }
            }
        }
        closedir($handle);
    }
    usort($result, function($a, $b) {
        return strnatcmp(basename($a), basename($b));
    });
    return $result;
}
function scanImages($path) {
    $images = [];
    $extensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!is_dir($path)) return $images;
    $handle = opendir($path);
    if ($handle) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != '.' && $entry != '..') {
                $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                if (in_array($ext, $extensions)) {
                    $images[] = $path . '/' . $entry;
                }
            }
        }
        closedir($handle);
    }
    natsort($images);
    return $images;

// EPUB图片流输出
if (isset($_GET['action']) && $_GET['action'] === 'epub_img') {
    $epubFile = __DIR__ . '/漫画/' . ($_GET['book'] ?? '') . '/' . ($_GET['chapter'] ?? '');
    $imgPath = $_GET['path'] ?? '';
    if (file_exists($epubFile) && $imgPath && class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($epubFile) === true) {
            $data = $zip->getFromName($imgPath);
            $zip->close();
            if ($data) {
                $ext = strtolower(pathinfo($imgPath, PATHINFO_EXTENSION));
                $mime = $ext === 'png' ? 'image/png' : ($ext === 'webp' ? 'image/webp' : 'image/jpeg');
                header('Content-Type: ' . $mime);
                header('Cache-Control: max-age=86400');
                echo $data;
                exit;
            }
        }
    }
    header('HTTP/1.1 404 Not Found');
    exit;
}

function parseEpub($epubPath) {
    if (!class_exists('ZipArchive')) return ['error' => 'ZipArchive不可用'];
    $zip = new ZipArchive();
    if ($zip->open($epubPath) !== true) return ['error' => '无法打开EPUB'];
    
    $container = $zip->getFromName('META-INF/container.xml');
    if (!$container) { $zip->close(); return ['error' => '无效EPUB']; }
    preg_match('/full-path="([^"]+)"/', $container, $m);
    $opfPath = $m[1] ?? '';
    if (!$opfPath) { $zip->close(); return ['error' => '找不到OPF']; }
    
    $opfDir = dirname($opfPath);
    if ($opfDir == '.') $opfDir = ''; else $opfDir .= '/';
    $opf = $zip->getFromName($opfPath);
    if (!$opf) { $zip->close(); return ['error' => '无法读取OPF']; }
    
    $manifest = [];
    preg_match_all('/<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"[^>]*>/i', $opf, $items);
    foreach ($items[1] as $i => $id) {
        $manifest[$id] = $items[2][$i];
    }
    
    $ncxPath = '';
    foreach ($manifest as $href) {
        if (stripos($href, '.ncx') !== false) {
            $ncxPath = $opfDir . $href;
            break;
        }
    }
    
    $chapters = [];
    if ($ncxPath) {
        $ncx = $zip->getFromName($ncxPath);
        if ($ncx) {
            preg_match_all('/<navPoint[^>]*>.*?<text>(.*?)<\/text>.*?<content[^>]*src="([^"]*)".*?<\/navPoint>/si', $ncx, $navs);
            foreach ($navs[1] as $i => $title) {
                $htmlFile = $opfDir . $navs[2][$i];
                $html = $zip->getFromName($htmlFile);
                $images = [];
                if ($html) {
                    preg_match_all('/<img[^>]*src=["\']([^"\']+)["\']/i', $html, $imgs);
                    foreach ($imgs[1] as $src) {
                        $imgPath = dirname($htmlFile) . '/' . $src;
                        $imgPath = preg_replace('#/\./#', '/', $imgPath);
                        $imgPath = preg_replace('#[^/]+/\.\./#', '', $imgPath);
                        $images[] = $imgPath;
                    }
                }
                $chapters[] = ['title' => trim($title), 'images' => $images];
            }
        }
    }
    
    $zip->close();
    return ['chapters' => $chapters];
}
}

// EPUB图片流输出
if (isset($_GET['action']) && $_GET['action'] === 'epub_img') {
    $epubFile = $baseDir . '/' . ($_GET['book'] ?? '') . '/' . ($_GET['chapter'] ?? '');
    $imgPath = $_GET['path'] ?? '';
    if (file_exists($epubFile) && $imgPath && class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($epubFile) === true) {
            $data = $zip->getFromName($imgPath);
            $zip->close();
            if ($data) {
                $ext = strtolower(pathinfo($imgPath, PATHINFO_EXTENSION));
                $mime = $ext === 'png' ? 'image/png' : ($ext === 'webp' ? 'image/webp' : 'image/jpeg');
                header('Content-Type: ' . $mime);
                header('Cache-Control: max-age=86400');
                echo $data;
                exit;
            }
        }
    }
    header('HTTP/1.1 404 Not Found');
    exit;
}

function parseEpub($epubPath) {
    if (!class_exists('ZipArchive')) return ['error' => 'ZipArchive不可用'];
    $zip = new ZipArchive();
    if ($zip->open($epubPath) !== true) return ['error' => '无法打开EPUB'];
    
    $container = $zip->getFromName('META-INF/container.xml');
    if (!$container) { $zip->close(); return ['error' => '无效EPUB']; }
    preg_match('/full-path="([^"]+)"/', $container, $m);
    $opfPath = $m[1] ?? '';
    if (!$opfPath) { $zip->close(); return ['error' => '找不到OPF']; }
    
    $opfDir = dirname($opfPath);
    if ($opfDir == '.') $opfDir = ''; else $opfDir .= '/';
    $opf = $zip->getFromName($opfPath);
    if (!$opf) { $zip->close(); return ['error' => '无法读取OPF']; }
    
    $manifest = [];
    preg_match_all('/<item[^>]*id="([^"]*)"[^>]*href="([^"]*)"[^>]*>/i', $opf, $items);
    foreach ($items[1] as $i => $id) {
        $manifest[$id] = $items[2][$i];
    }
    
    $ncxPath = '';
    foreach ($manifest as $href) {
        if (stripos($href, '.ncx') !== false) {
            $ncxPath = $opfDir . $href;
            break;
        }
    }
    
    $chapters = [];
    if ($ncxPath) {
        $ncx = $zip->getFromName($ncxPath);
        if ($ncx) {
            preg_match_all('/<navPoint[^>]*>.*?<text>(.*?)<\/text>.*?<content[^>]*src="([^"]*)".*?<\/navPoint>/si', $ncx, $navs);
            foreach ($navs[1] as $i => $title) {
                $htmlFile = $opfDir . $navs[2][$i];
                $html = $zip->getFromName($htmlFile);
                $images = [];
                if ($html) {
                    preg_match_all('/<img[^>]*src=["\']([^"\']+)["\']/i', $html, $imgs);
                    foreach ($imgs[1] as $src) {
                        $imgPath = dirname($htmlFile) . '/' . $src;
                        $imgPath = preg_replace('#/\./#', '/', $imgPath);
                        $imgPath = preg_replace('#[^/]+/\.\./#', '', $imgPath);
                        $images[] = $imgPath;
                    }
                }
                $chapters[] = ['title' => trim($title), 'images' => $images];
            }
        }
    }
    
    $zip->close();
    return ['chapters' => $chapters];
}
$chap = isset($_GET['chap']) ? intval($_GET['chap']) : 0;
$book = isset($_GET['book']) ? $_GET['book'] : '';
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';
$chapterTitle = preg_replace('/\.(pdf|epub)/i', '', $chapter);
$isChapterPage = ($book && $chapter);
$isPdf = $chapter && stripos($chapter, '.pdf') !== false;
$isEpub = $chapter && stripos($chapter, '.epub') !== false;
$allChapters = [];
$currentIdx = -1;
if ($book) {
    $allChapters = scanDirectory($baseDir . '/' . $book);
    foreach ($allChapters as $i => $f) {
        if (basename($f) === $chapter) {
            $currentIdx = $i;
        }
    }
}
if ($book && $chapter) {
    $encodedBook = rawurlencode($book);
    $encodedChapter = rawurlencode($chapter);
    $fileUrl = "$baseDir/$encodedBook/$encodedChapter";
}
$epubChapters = [];
$images = [];
if ($isEpub && $isChapterPage && $book && $chapter) {
    $epubPath = $baseDir . '/' . $book . '/' . $chapter;
    $epubData = parseEpub($epubPath);
    if (!isset($epubData['error'])) {
        $epubChapters = $epubData['chapters'];
        if (isset($epubChapters[$chap])) {
            $images = $epubChapters[$chap]['images'];
        }
    }
} elseif (!$isPdf && $isChapterPage && $book && $chapter) {
    $localPath = $baseDir . '/' . $book . '/' . $chapter;
    $images = scanImages($localPath);
}
if ($isEpub && !empty($epubChapters) && isset($epubChapters[$chap])) {
    $chapterTitle = $epubChapters[$chap]['title'];
}
$currentFile = '漫画阅读器.php';
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<?php if ($isChapterPage): ?>
<script src="./pdf.min.js"></script>
<script>pdfjsLib.GlobalWorkerOptions.workerSrc='./pdf.worker.min.js';</script>
<?php endif; ?>
<style>
* {margin:0;padding:0;box-sizing:border-box}
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
background: <?=$isChapterPage?'#e8ecf1':'#f0f2f5'?>;
    color: <?=$isChapterPage?'#1a1a2e':'#1a1a2e'?>;
    padding: <?=$isChapterPage?0:0?>px;
}
.top-nav {
position: absolute; top:0; left:0; right:0; z-index:999;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border:none;    margin:0;
    padding: 16px 12px;
    display: flex; align-items:center; gap:10px;
    font-size:18px; font-weight:800;
}
.top-nav a { text-decoration:none; font-weight:500; }
.top-nav .split { }
.top-nav .current { font-weight:700; }
.mask {
    position:fixed; inset:0; background:rgba(0,0,0,0.6);
    z-index:9998; display:none;
}
.mask.show {display:block}
.reader-menu {
    position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
    backdrop-filter: blur(20px) saturate(200%);
    -webkit-backdrop-filter: blur(20px) saturate(200%);
    border:1px solid rgba(255,255,255,0.5);
    border-radius:24px;
    padding:24px;
    z-index:9999;
    display:none;
    min-width:280px; max-width:90vw;
    max-height:85vh; overflow-y:auto;
}
.reader-menu.show {display:block}
.menu-title {
    text-align:center; margin-bottom:20px;
    font-size:18px; font-weight:800;
    letter-spacing:2px;
    text-shadow:0 2px 4px rgba(0,0,0,0.2);
}
.section-box {
    border: 1px solid rgba(255,255,255,0.3);
    border-radius:18px;
    padding:16px;
    backdrop-filter:blur(8px);
}
.section-title {
    font-size:13px; font-weight:800;
    margin-bottom:14px; padding-left:4px;
    letter-spacing:1px; text-transform:uppercase;
    text-shadow:0 1px 2px rgba(0,0,0,0.2);
}
.auto-scroll-btn {
    width:100%; padding:16px;
    border:none; border-radius:18px;
    backdrop-filter:blur(12px);
    font-size:15px; font-weight:700;
    border:1px solid rgba(255,255,255,0.5);
}
.speed-btn {
    padding:12px; border:none; border-radius:14px;
    backdrop-filter:blur(8px);
    font-size:13px; font-weight:600;
    border:1px solid rgba(255,255,255,0.5);
}
.speed-btn.active {
    border-color:rgba(255,255,255,0.6);
}
.bookmark-btn {
    width:100%; padding:16px;
    border:none; border-radius:18px;
    backdrop-filter:blur(12px);
    font-size:15px; font-weight:700;
    margin-top:8px;
    display:flex; align-items:center; justify-content:center; gap:7px;
    border:1px solid rgba(255,255,255,0.5);
}
.bookmark-btn.second {
}
.bookmark-panel {
    position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
    backdrop-filter:blur(20px) saturate(200%);
    -webkit-backdrop-filter:blur(20px) saturate(200%);
    border:1px solid rgba(255,255,255,0.5);
    border-radius:22px;
    padding:22px;
    z-index:10000;
    display:none;
    min-width:280px; max-width:90vw;
    max-height:70vh; overflow-y:auto;
}
.bookmark-panel.show {display:block}
.bm-header {
font-size:16px; font-weight:700;
    margin-bottom:12px;
    display:flex; justify-content:space-between;
}
.bm-close {
    color:#ff4d4d; cursor:pointer; font-size:18px;
}
.bm-item {
    border:1px solid rgba(255,255,255,0.6);
    border-radius:14px;
    padding:12px 14px;
    margin-bottom:8px;
    cursor:pointer;
    backdrop-filter:blur(8px);
}
.bm-item .book {
    font-size:12px;
    font-weight:600;
}
.bm-item .chap {
    font-size:13px;
    display:inline;
}
.bm-item .page {
    font-size:11px;
    display:inline;
    margin-left:8px;
}
.bm-del {
    color:#ff4d4d;
    font-size:15px;
    float:right;
    padding:4px;
}
.speed-row {
    display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:10px;
}
.chapter-grid {
    display:grid;
    grid-template-columns: repeat(2, 1fr);
    gap:8px;
    max-height:320px;
    overflow-y: auto;
}
.chapter-item-btn {
    padding:4px 6px;
    border:none; border-radius:12px;
    backdrop-filter:blur(8px);
    text-align:center;
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    height:44px;
    overflow:hidden;
    white-space:nowrap;
    font-size:12px; font-weight:600;
    border:1px solid rgba(255,255,255,0.4);
}
.chapter-item-btn.active {
    font-weight:700;
    border-color:rgba(255,255,255,0.6);
}
#reader {width:100%}
#reader img {display:block;width:100%;height:auto}
canvas {display:block;width:100%;height:auto;margin:0 auto}
.book-chapter-grid {
    display:grid;
    grid-template-columns: 1fr;
    gap:10px;
    padding:10px 12px;
}
.book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(168,140,255,0.35) 50%, rgba(140,180,255,0.2) 100%);
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.7);
    box-shadow:
        0 8px 24px rgba(60,160,140,0.18),
        0 2px 6px rgba(60,160,140,0.1),
        inset 0 3px 6px rgba(255,255,255,0.55),
        inset 0 -3px 6px rgba(0,0,0,0.06);
    text-align:center;
    overflow:hidden;
    height:52px;
    margin-bottom:8px;
    position:relative;
}
.book-chapter-item::after {
    content:''; position:absolute;
    top:0; left:20%; right:20%;
    height:2px;
    border-radius:50%;
background:rgba(255,255,255,0.7);
    box-shadow:0 0 10px rgba(255,255,255,0.5);
}
.book-chapter-item a {
    text-decoration:none;
    display:flex; align-items:center; justify-content:center;
    width:100%; height:100%;
    overflow:hidden; padding:4px 6px;
    white-space:nowrap; font-weight:600;
    text-overflow:ellipsis;
}
.book-chapter-item a.level2 {
    justify-content:flex-start;
    padding-left:14px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
}
.toast {
    position: fixed;
    left: 50%; bottom: 80px;
    transform: translateX(-50%);
    backdrop-filter: blur(20px);
    padding: 12px 24px;
    border-radius: 30px;
    font-size:13px; font-weight:500;
    z-index:10001;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    white-space: nowrap;
}
.toast.show {opacity:1}
.loading-overlay {
    position: fixed;
    inset: 0;
background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    z-index: 10002;
    display: flex;
    align-items: center;
justify-content: center;
}
.loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255,255,255,0.2);
    border-top-color: #a090ff;
    box-shadow: 0 0 20px rgba(160,144,255,0.3);
    animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.progress-bar-wrap {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    padding: 24px 18px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.progress-track {
    flex: 1;
    height: 5px;
    border-radius: 3px;
    overflow: hidden;
}
.progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}
.progress-text {
    white-space: nowrap;
    min-width: 52px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight:500;
}
h1,h3 {
    padding:16px 12px;
    text-align:center;
    font-weight:800;
    font-size:18px;
    letter-spacing:2px;
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    border-radius:0;
    margin:0 0 16px 0;
border:none;
    box-shadow:
        inset 0 3px 6px rgba(255,255,255,0.5),
        inset 0 -3px 6px rgba(0,0,0,0.06);
    text-shadow:0 1px 3px rgba(0,0,0,0.2);
}
h3 a { text-decoration:none; }
@keyframes shimmer {
    0% { background-position:0% 50%; }
    50% { background-position:100% 50%; }
    100% { background-position:0% 50%; }
}
.grid {
    display:grid; grid-template-columns:1fr; gap:10px; padding:8px 12px;
}
.item {
    backdrop-filter:blur(16px);
    -webkit-backdrop-filter:blur(16px);
    border-radius:20px;
    border:1px solid rgba(255,255,255,0.7);
    box-shadow:
        inset 0 3px 6px rgba(255,255,255,0.6),
        inset 0 -3px 6px rgba(0,0,0,0.08);
    overflow:hidden;
    overflow:hidden;
    height:136px;
    margin-bottom:8px;
    position:relative;
}
.item::after {
    content:''; position:absolute;
    top:0; left:20%; right:20%;
    height:2px;
    border-radius:50%;
background:rgba(255,255,255,0.8);
    box-shadow:0 0 12px rgba(255,255,255,0.5);
}
.item a {
    text-decoration:none; font-weight:600;
    display:flex; align-items:center; justify-content:center;
    width:100%; height:100%; padding:4px 6px;
    overflow:hidden; white-space:nowrap;
}
.debug {display:none}
/* 底部导航栏 */
.bottom-nav {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 64px;
    z-index: 998;
    display: flex;
    align-items: center;
    justify-content: space-around;
background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(168,140,255,0.45) 50%, rgba(140,180,255,0.25) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255,255,255,0.5);
    box-shadow: 0 -4px 20px rgba(100,80,200,0.15), inset 0 3px 6px rgba(255,255,255,0.5);
}
.bottom-nav a, .bottom-nav button {
    width: 48px; height: 48px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.4);
background: rgba(255,255,255,0.3);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    color: #2d1f5e;
    text-decoration: none;
    cursor: pointer;
    box-shadow: inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04);
    transition: all 0.15s ease;
}
.bottom-nav a:active, .bottom-nav button:active {background: rgba(255,255,255,0.5);
    transform: scale(0.94);
}
/* ===== 主题切换 CSS ===== */
/* 橘黄暖阳 */
body.theme-orange { background:#f5f0e8 !important; color:#2d1f0e !important; }
body.theme-orange .top-nav, body.theme-orange h1, body.theme-orange h3,
body.theme-orange .item, body.theme-orange .bottom-nav, body.theme-orange .reader-menu,
body.theme-orange .bookmark-panel, body.theme-orange .section-box,
body.theme-orange .auto-scroll-btn, body.theme-orange .speed-btn, body.theme-orange .speed-btn.active,
body.theme-orange .bookmark-btn, body.theme-orange .bookmark-btn.second,
body.theme-orange .chapter-item-btn, body.theme-orange .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important;}
body.theme-orange .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,180,100,0.3) 50%, rgba(255,160,60,0.15) 100%) !important;}
body.theme-orange .progress-fill { background:linear-gradient(90deg, #ff8c42, #ffaa5a) !important; box-shadow:0 0 6px rgba(255,140,66,0.4) !important; }
body.theme-orange .loading-spinner { border-color:rgba(255,140,66,0.2) !important; border-top-color:#ff8c42 !important; }
body.theme-orange .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important; border-color:rgba(255,160,60,0.3) !important; color:#3d1f0e !important; }
/* 橘黄暖阳 - 阅读页面UI */
body.theme-orange .top-nav, body.theme-orange .top-nav a { color:#3d1f0e !important; }
body.theme-orange .top-nav .current { color:#b85c00 !important; font-weight:700; }
body.theme-orange .top-nav .split { color:rgba(60,30,10,0.4) !important; }
body.theme-orange #reader, body.theme-orange #reader * { color:#3d1f0e !important; }
body.theme-orange .reader-menu { background:rgba(255,240,220,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orange .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orange .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,180,100,0.3) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-orange .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.4) 50%, rgba(255,140,30,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,100,30,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orange .bookmark-btn, body.theme-orange .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orange .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,180,100,0.3) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-orange .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.4) 50%, rgba(255,140,30,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,100,30,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orange .bookmark-panel { background:rgba(255,240,220,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orange .bm-header { color:#3d1f0e !important; }
body.theme-orange .bm-item { background:rgba(255,220,180,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#3d1f0e !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-orange .bm-item .book, body.theme-orange .bm-item .chap, body.theme-orange .bm-item .page { color:#5a3a1a !important; }
body.theme-orange .canvas-container { background:rgba(255,180,100,0.12) !important; }
body.theme-orange .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(245,230,210,0.95) 40%) !important; }
body.theme-orange .progress-track { background:rgba(200,140,80,0.15) !important; }
body.theme-orange .progress-text { color:rgba(60,30,10,0.7) !important; }
body.theme-orange .chapter-indicator { color:#3d1f0e !important; }
body.theme-orange .ebook-chapter { background:rgba(255,248,240,0.92) !important; color:#3d1f0e !important; }
body.theme-orange .ebook-chapter .chapter-title { color:#b85c00 !important; }
body.theme-orange .menu-title, body.theme-orange .section-title { color:#3d1f0e !important; }
body.theme-orange .back-btn { color:#3d1f0e !important; background:rgba(255,255,255,0.5) !important; }
body.theme-orange .page-title { color:#3d1f0e !important; }
body.theme-orange .shelf-item { color:#3d1f0e !important; }
body.theme-orange h1, body.theme-orange h3, body.theme-orange h3 a { color:#3d1f0e !important; }
body.theme-orange .item a { color:#3d1f0e !important; }
body.theme-orange .book-chapter-item a { color:#3d1f0e !important; }

/* 深海蓝 */
body.theme-blue { background:#e8f0f8 !important; color:#0d1f35 !important; }
body.theme-blue .top-nav, body.theme-blue h1, body.theme-blue h3,
body.theme-blue .item, body.theme-blue .bottom-nav, body.theme-blue .reader-menu,
body.theme-blue .bookmark-panel, body.theme-blue .section-box,
body.theme-blue .auto-scroll-btn, body.theme-blue .speed-btn, body.theme-blue .speed-btn.active,
body.theme-blue .bookmark-btn, body.theme-blue .bookmark-btn.second,
body.theme-blue .chapter-item-btn, body.theme-blue .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(74,144,217,0.35) 50%, rgba(100,180,255,0.2) 100%) !important;}
body.theme-blue .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(100,180,220,0.3) 50%, rgba(74,144,217,0.15) 100%) !important;}
body.theme-blue .progress-fill { background:linear-gradient(90deg, #4a90d9, #7ac0ff) !important; box-shadow:0 0 6px rgba(74,144,217,0.4) !important; }
body.theme-blue .loading-spinner { border-color:rgba(74,144,217,0.2) !important; border-top-color:#4a90d9 !important; }
body.theme-blue .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(74,144,217,0.35) 50%, rgba(100,180,255,0.2) 100%) !important; border-color:rgba(74,144,217,0.3) !important; color:#0d1f35 !important; }
/* 深海蓝 - 阅读页面UI */
body.theme-blue .top-nav, body.theme-blue .top-nav a { color:#3d1f0e !important; }
body.theme-blue .top-nav .current { color:#1a56b0 !important; font-weight:700; }
body.theme-blue .top-nav .split { color:rgba(15,30,50,0.4) !important; }
body.theme-blue #reader, body.theme-blue #reader * { color:#0d1f35 !important; }
body.theme-blue .reader-menu { background:rgba(235,245,255,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blue .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(74,144,217,0.35) 50%, rgba(100,180,255,0.2) 100%) !important; color:#0d1f35 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blue .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(100,160,217,0.3) 100%) !important; color:#0d1f35 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-blue .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(74,144,217,0.4) 50%, rgba(100,180,255,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blue .bookmark-btn, body.theme-blue .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(74,144,217,0.35) 50%, rgba(100,180,255,0.2) 100%) !important; color:#0d1f35 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blue .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(100,160,217,0.3) 100%) !important; color:#0d1f35 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-blue .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(74,144,217,0.4) 50%, rgba(100,180,255,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blue .bookmark-panel { background:rgba(235,245,255,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blue .bm-header { color:#0d1f35 !important; }
body.theme-blue .bm-item { background:rgba(180,210,240,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#0d1f35 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-blue .canvas-container { background:rgba(74,144,217,0.08) !important; }
body.theme-blue .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(230,240,250,0.95) 40%) !important; }
body.theme-blue .progress-track { background:rgba(74,144,217,0.12) !important; }
body.theme-blue .progress-text { color:rgba(15,30,50,0.7) !important; }
body.theme-blue .chapter-indicator { color:#0d1f35 !important; }
body.theme-blue .ebook-chapter { background:rgba(240,248,255,0.92) !important; color:#0d1f35 !important; }
body.theme-blue .ebook-chapter .chapter-title { color:#1a56b0 !important; }
body.theme-blue .menu-title, body.theme-blue .section-title { color:#0d1f35 !important; }
body.theme-blue .back-btn { color:#0d1f35 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-blue .page-title { color:#0d1f35 !important; }
body.theme-blue .shelf-item { color:#0d1f35 !important; }
body.theme-blue h1, body.theme-blue h3, body.theme-blue h3 a { color:#0d1f35 !important; }
body.theme-blue .item a { color:#0d1f35 !important; }
body.theme-blue .book-chapter-item a { color:#0d1f35 !important; }

/* 樱花粉 */
body.theme-pink { background:#fdf2f5 !important; color:#3d1520 !important; }
body.theme-pink .top-nav, body.theme-pink h1, body.theme-pink h3,
body.theme-pink .item, body.theme-pink .bottom-nav, body.theme-pink .reader-menu,
body.theme-pink .bookmark-panel, body.theme-pink .section-box,
body.theme-pink .auto-scroll-btn, body.theme-pink .speed-btn, body.theme-pink .speed-btn.active,
body.theme-pink .bookmark-btn, body.theme-pink .bookmark-btn.second,
body.theme-pink .chapter-item-btn, body.theme-pink .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,158,181,0.35) 50%, rgba(255,180,200,0.2) 100%) !important;}
body.theme-pink .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,180,200,0.3) 50%, rgba(255,158,181,0.15) 100%) !important;}
body.theme-pink .progress-fill { background:linear-gradient(90deg, #ff9eb5, #ffc8d6) !important; box-shadow:0 0 6px rgba(255,158,181,0.4) !important; }
body.theme-pink .loading-spinner { border-color:rgba(255,158,181,0.2) !important; border-top-color:#ff9eb5 !important; }
body.theme-pink .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,158,181,0.35) 50%, rgba(255,180,200,0.2) 100%) !important; border-color:rgba(255,158,181,0.3) !important; color:#3d1520 !important; }
/* 樱花粉 - 阅读页面UI */
body.theme-pink .top-nav, body.theme-pink .top-nav a { color:#3d1f0e !important; }
body.theme-pink .top-nav .current { color:#c03060 !important; font-weight:700; }
body.theme-pink .top-nav .split { color:rgba(60,20,30,0.4) !important; }
body.theme-pink #reader, body.theme-pink #reader * { color:#3d1520 !important; }
body.theme-pink .reader-menu { background:rgba(255,240,245,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-pink .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,158,181,0.35) 50%, rgba(255,180,200,0.2) 100%) !important; color:#3d1520 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-pink .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,180,200,0.3) 100%) !important; color:#3d1520 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-pink .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,158,181,0.4) 50%, rgba(255,180,200,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-pink .bookmark-btn, body.theme-pink .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,158,181,0.35) 50%, rgba(255,180,200,0.2) 100%) !important; color:#3d1520 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-pink .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,180,200,0.3) 100%) !important; color:#3d1520 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-pink .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,158,181,0.4) 50%, rgba(255,180,200,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-pink .bookmark-panel { background:rgba(255,240,245,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-pink .bm-header { color:#3d1520 !important; }
body.theme-pink .bm-item { background:rgba(255,210,225,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#3d1520 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-pink .canvas-container { background:rgba(255,158,181,0.1) !important; }
body.theme-pink .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(250,235,240,0.95) 40%) !important; }
body.theme-pink .progress-track { background:rgba(255,158,181,0.15) !important; }
body.theme-pink .progress-text { color:rgba(60,20,30,0.7) !important; }
body.theme-pink .chapter-indicator { color:#3d1520 !important; }
body.theme-pink .ebook-chapter { background:rgba(255,245,248,0.92) !important; color:#3d1520 !important; }
body.theme-pink .ebook-chapter .chapter-title { color:#c03060 !important; }
body.theme-pink .menu-title, body.theme-pink .section-title { color:#3d1520 !important; }
body.theme-pink .back-btn { color:#3d1520 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-pink .page-title { color:#3d1520 !important; }
body.theme-pink .shelf-item { color:#3d1520 !important; }
body.theme-pink h1, body.theme-pink h3, body.theme-pink h3 a { color:#3d1520 !important; }
body.theme-pink .item a { color:#3d1520 !important; }
body.theme-pink .book-chapter-item a { color:#3d1520 !important; }

/* 森林绿 */
body.theme-green { background:#eef5f0 !important; color:#0d2e1a !important; }
body.theme-green .top-nav, body.theme-green h1, body.theme-green h3,
body.theme-green .item, body.theme-green .bottom-nav, body.theme-green .reader-menu,
body.theme-green .bookmark-panel, body.theme-green .section-box,
body.theme-green .auto-scroll-btn, body.theme-green .speed-btn, body.theme-green .speed-btn.active,
body.theme-green .bookmark-btn, body.theme-green .bookmark-btn.second,
body.theme-green .chapter-item-btn, body.theme-green .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(90,171,138,0.35) 50%, rgba(120,200,160,0.2) 100%) !important;}
body.theme-green .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(120,200,160,0.3) 50%, rgba(90,171,138,0.15) 100%) !important;}
body.theme-green .progress-fill { background:linear-gradient(90deg, #5aab8a, #8cd4a8) !important; box-shadow:0 0 6px rgba(90,171,138,0.4) !important; }
body.theme-green .loading-spinner { border-color:rgba(90,171,138,0.2) !important; border-top-color:#5aab8a !important; }
body.theme-green .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(90,171,138,0.35) 50%, rgba(120,200,160,0.2) 100%) !important; border-color:rgba(90,171,138,0.3) !important; color:#0d2e1a !important; }
/* 森林绿 - 阅读页面UI */
body.theme-green .top-nav, body.theme-green .top-nav a { color:#3d1f0e !important; }
body.theme-green .top-nav .current { color:#1a6b3c !important; font-weight:700; }
body.theme-green .top-nav .split { color:rgba(15,45,25,0.4) !important; }
body.theme-green #reader, body.theme-green #reader * { color:#0d2e1a !important; }
body.theme-green .reader-menu { background:rgba(235,250,240,0.95) !important; }
body.theme-green .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(90,171,138,0.35) 50%, rgba(120,200,160,0.2) 100%) !important; color:#0d2e1a !important; }
body.theme-green .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(120,190,150,0.3) 100%) !important; color:#0d2e1a !important; }
body.theme-green .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(90,171,138,0.4) 50%, rgba(120,200,160,0.25) 100%) !important; color:#fff !important; }
body.theme-green .bookmark-btn, body.theme-green .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(90,171,138,0.35) 50%, rgba(120,200,160,0.2) 100%) !important; color:#0d2e1a !important; }
body.theme-green .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(120,190,150,0.3) 100%) !important; color:#0d2e1a !important; }
body.theme-green .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(90,171,138,0.4) 50%, rgba(120,200,160,0.25) 100%) !important; color:#fff !important; }
body.theme-green .bookmark-panel { background:rgba(235,250,240,0.95) !important; }
body.theme-green .bm-header { color:#0d2e1a !important; }
body.theme-green .bm-item { background:rgba(180,220,200,0.6) !important; color:#0d2e1a !important; }
body.theme-green .bm-item .book, body.theme-green .bm-item .chap, body.theme-green .bm-item .page { color:#1a4030 !important; }
body.theme-green .canvas-container { background:rgba(90,171,138,0.08) !important; }
body.theme-green .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(230,245,235,0.95) 40%) !important; }
body.theme-green .progress-track { background:rgba(90,171,138,0.12) !important; }
body.theme-green .progress-text { color:rgba(15,45,25,0.7) !important; }
body.theme-green .chapter-indicator { color:#0d2e1a !important; }
body.theme-green .ebook-chapter { background:rgba(240,255,245,0.92) !important; color:#0d2e1a !important; }
body.theme-green .ebook-chapter .chapter-title { color:#1a6b3c !important; }
body.theme-green .menu-title, body.theme-green .section-title { color:#0d2e1a !important; }
body.theme-green .back-btn { color:#0d2e1a !important; background:rgba(255,255,255,0.5) !important; }
body.theme-green .page-title { color:#0d2e1a !important; }
body.theme-green .shelf-item { color:#0d2e1a !important; }
body.theme-green h1, body.theme-green h3, body.theme-green h3 a { color:#0d2e1a !important; }
body.theme-green .item a { color:#0d2e1a !important; }
body.theme-green .book-chapter-item a { color:#0d2e1a !important; }

/* 暗夜黑 */
body.theme-dark { background:#1a1a2e !important; color:#ddd !important; }
body.theme-dark .top-nav, body.theme-dark h1, body.theme-dark h3,
body.theme-dark .item, body.theme-dark .bottom-nav, body.theme-dark .reader-menu,
body.theme-dark .bookmark-panel, body.theme-dark .section-box,
body.theme-dark .auto-scroll-btn, body.theme-dark .speed-btn, body.theme-dark .speed-btn.active,
body.theme-dark .bookmark-btn, body.theme-dark .bookmark-btn.second,
body.theme-dark .chapter-item-btn, body.theme-dark .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,200,210,0.35) 50%, rgba(180,180,190,0.2) 100%) !important;}
body.theme-dark .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,200,210,0.3) 50%, rgba(180,180,190,0.15) 100%) !important;}
body.theme-dark .progress-fill { background:linear-gradient(90deg, #888, #bbb) !important; box-shadow:0 0 6px rgba(180,180,190,0.4) !important; }
body.theme-dark .loading-spinner { border-color:rgba(180,180,190,0.2) !important; border-top-color:#888 !important; }
body.theme-dark .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,200,210,0.35) 50%, rgba(180,180,190,0.2) 100%) !important; border-color:rgba(180,180,190,0.3) !important; color:#ddd !important; }
/* 暗夜黑 - 阅读页面UI */
body.theme-dark .top-nav, body.theme-dark .top-nav a { color:#3d1f0e !important; }
body.theme-dark .top-nav .current { color:#1a1a1a !important; font-weight:700; }
body.theme-dark .top-nav .split { color:rgba(0,0,0,0.3) !important; }
body.theme-dark #reader, body.theme-dark #reader * { color:#1a1a1a !important; }
body.theme-dark .reader-menu { background:rgba(240,240,240,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-dark .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(80,80,80,0.35) 50%, rgba(60,60,60,0.2) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-dark .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(80,80,80,0.3) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-dark .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(80,80,80,0.4) 50%, rgba(60,60,60,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(80,80,80,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-dark .bookmark-btn, body.theme-dark .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(80,80,80,0.35) 50%, rgba(60,60,60,0.2) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-dark .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(80,80,80,0.3) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-dark .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(80,80,80,0.4) 50%, rgba(60,60,60,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(80,80,80,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-dark .bookmark-panel { background:rgba(240,240,240,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-dark .bm-header { color:#1a1a1a !important; }
body.theme-dark .bm-item { background:rgba(200,200,200,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#1a1a1a !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-dark .bm-item .book, body.theme-dark .bm-item .chap, body.theme-dark .bm-item .page { color:#1a1a1a !important; }
body.theme-dark .canvas-container { background:rgba(80,80,80,0.12) !important; }
body.theme-dark .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(230,230,230,0.95) 40%) !important; }
body.theme-dark .progress-track { background:rgba(0,0,0,0.06) !important; }
body.theme-dark .progress-text { color:rgba(0,0,0,0.5) !important; }
body.theme-dark .chapter-indicator { color:#1a1a1a !important; }
body.theme-dark .ebook-chapter { background:rgba(240,240,240,0.9) !important; color:#1a1a1a !important; }
body.theme-dark .ebook-chapter .chapter-title { color:#1a1a1a !important; }
body.theme-dark .menu-title, body.theme-dark .section-title { color:#1a1a1a !important; }
body.theme-dark .back-btn { color:#1a1a1a !important; background:rgba(255,255,255,0.5) !important; }
body.theme-dark .page-title { color:#1a1a1a !important; }
body.theme-dark .shelf-item { color:#1a1a1a !important; }
body.theme-dark h1, body.theme-dark h3, body.theme-dark h3 a { color:#1a1a1a !important; }
body.theme-dark .item a { color:#1a1a1a !important; }
body.theme-dark .book-chapter-item a { color:#1a1a1a !important; }

/* 经典紫 */
body.theme-purple { background:#f5f0e6 !important; color:#1a1a1a !important; }
body.theme-purple .top-nav, body.theme-purple h1, body.theme-purple h3,
body.theme-purple .item, body.theme-purple .bottom-nav, body.theme-purple .reader-menu,
body.theme-purple .bookmark-panel, body.theme-purple .section-box,
body.theme-purple .auto-scroll-btn, body.theme-purple .speed-btn, body.theme-purple .speed-btn.active,
body.theme-purple .bookmark-btn, body.theme-purple .bookmark-btn.second,
body.theme-purple .chapter-item-btn, body.theme-purple .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(160,140,220,0.35) 50%, rgba(180,160,240,0.2) 100%) !important;}
body.theme-purple .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(180,160,220,0.3) 50%, rgba(160,140,200,0.15) 100%) !important;}
body.theme-purple .progress-fill { background:linear-gradient(90deg, #7a5aff, #c0a0ff) !important; box-shadow:0 0 6px rgba(160,140,220,0.4) !important; }
body.theme-purple .loading-spinner { border-color:rgba(160,140,220,0.2) !important; border-top-color:#7a5aff !important; }
body.theme-purple .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(160,140,220,0.35) 50%, rgba(180,160,240,0.2) 100%) !important; border-color:rgba(160,140,220,0.3) !important; color:#1a1a1a !important; }
/* 经典紫 - 阅读页面UI */
body.theme-purple .top-nav, body.theme-purple .top-nav a { color:#3d1f0e !important; }
body.theme-purple .top-nav .current { color:#clalca !important; font-weight:700; }
body.theme-purple .top-nav .split { color:rgba(0,0,0,0.3) !important; }
body.theme-purple #reader, body.theme-purple #reader * { color:#1a1a1a !important; }
body.theme-purple .reader-menu { background:rgba(255,255,255,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purple .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(160,140,220,0.35) 50%, rgba(180,160,240,0.2) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purple .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(180,160,220,0.3) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-purple .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(160,140,220,0.4) 50%, rgba(180,160,240,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(160,140,220,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purple .bookmark-btn, body.theme-purple .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(160,140,220,0.35) 50%, rgba(180,160,240,0.2) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purple .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(180,160,220,0.3) 100%) !important; color:#1a1a1a !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-purple .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(160,140,220,0.4) 50%, rgba(180,160,240,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(160,140,220,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purple .bookmark-panel { background:rgba(255,255,255,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purple .bm-header { color:#1a1a1a !important; }
body.theme-purple .bm-item { background:rgba(200,190,240,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#1a1a1a !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-purple .bm-item .book, body.theme-purple .bm-item .chap, body.theme-purple .bm-item .page { color:#1a1a1a !important; }
body.theme-purple .canvas-container { background:rgba(180,160,240,0.12) !important; }
body.theme-purple .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(245,240,235,0.95) 40%) !important; }
body.theme-purple .progress-track { background:rgba(0,0,0,0.06) !important; }
body.theme-purple .progress-text { color:rgba(0,0,0,0.5) !important; }
body.theme-purple .chapter-indicator { color:#1a1a1a !important; }
body.theme-purple .ebook-chapter { background:rgba(255,255,255,0.9) !important; color:#1a1a1a !important; }
body.theme-purple .ebook-chapter .chapter-title { color:#1a1a1a !important; }
body.theme-purple .menu-title, body.theme-purple .section-title { color:#1a1a1a !important; }
body.theme-purple .back-btn { color:#1a1a1a !important; background:rgba(255,255,255,0.5) !important; }
body.theme-purple .page-title { color:#1a1a1a !important; }
body.theme-purple .shelf-item { color:#1a1a1a !important; }
body.theme-purple h1, body.theme-purple h3, body.theme-purple h3 a { color:#1a1a1a !important; }
body.theme-purple .item a { color:#1a1a1a !important; }
body.theme-purple .book-chapter-item a { color:#1a1a1a !important; }

/*  猩红 */
body.theme-crimson { background:#1a0005 !important; color:#ffc0c0 !important; }
body.theme-crimson .top-nav, body.theme-crimson h1, body.theme-crimson h3,
body.theme-crimson .item, body.theme-crimson .bottom-nav, body.theme-crimson .reader-menu,
body.theme-crimson .bookmark-panel, body.theme-crimson .section-box,
body.theme-crimson .auto-scroll-btn, body.theme-crimson .speed-btn, body.theme-crimson .speed-btn.active,
body.theme-crimson .bookmark-btn, body.theme-crimson .bookmark-btn.second,
body.theme-crimson .chapter-item-btn, body.theme-crimson .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,40,60,0.35) 50%, rgba(240,50,70,0.2) 100%) !important;}
body.theme-crimson .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(240,60,80,0.3) 50%, rgba(220,40,60,0.15) 100%) !important;}
body.theme-crimson .progress-fill { background:linear-gradient(90deg, #e01020, #ff4060) !important; box-shadow:0 0 6px rgba(220,40,60,0.4) !important; }
body.theme-crimson .loading-spinner { border-color:rgba(220,40,60,0.2) !important; border-top-color:#e01020 !important; }
body.theme-crimson .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,40,60,0.35) 50%, rgba(240,50,70,0.2) 100%) !important; border-color:rgba(220,40,60,0.3) !important; color:#ffc0c0 !important; }
/* 猩红 - 阅读页面UI */
body.theme-crimson .top-nav, body.theme-crimson .top-nav a { color:#3d1f0e !important; }
body.theme-crimson .top-nav .current { color:#e01020 !important; font-weight:700; }
body.theme-crimson .top-nav .split { color:rgba(200,150,155,0.4) !important; }
body.theme-crimson #reader, body.theme-crimson #reader * { color:#ffc0c0 !important; }
body.theme-crimson .reader-menu { background:rgba(30,5,10,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimson .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,40,60,0.35) 50%, rgba(240,50,70,0.2) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimson .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(240,80,90,0.3) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-crimson .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,40,60,0.4) 50%, rgba(240,50,70,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(220,40,60,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimson .bookmark-btn, body.theme-crimson .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,40,60,0.35) 50%, rgba(240,50,70,0.2) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimson .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(240,80,90,0.3) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-crimson .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,40,60,0.4) 50%, rgba(240,50,70,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(220,40,60,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimson .bookmark-panel { background:rgba(30,5,10,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimson .bm-header { color:#ffc0c0 !important; }
body.theme-crimson .bm-item { background:rgba(240,100,120,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffc0c0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-crimson .bm-item .book, body.theme-crimson .bm-item .chap, body.theme-crimson .bm-item .page { color:#ff8080 !important; }
body.theme-crimson .canvas-container { background:rgba(240,60,80,0.12) !important; }
body.theme-crimson .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(30,5,10,0.95) 40%) !important; }
body.theme-crimson .progress-track { background:rgba(220,80,100,0.15) !important; }
body.theme-crimson .progress-text { color:rgba(200,150,155,0.7) !important; }
body.theme-crimson .chapter-indicator { color:#ffc0c0 !important; }
body.theme-crimson .ebook-chapter { background:rgba(30,5,10,0.92) !important; color:#ffc0c0 !important; }
body.theme-crimson .ebook-chapter .chapter-title { color:#e01020 !important; }
body.theme-crimson .menu-title, body.theme-crimson .section-title { color:#ffc0c0 !important; }
body.theme-crimson .back-btn { color:#ffc0c0 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-crimson .page-title { color:#ffc0c0 !important; }
body.theme-crimson .shelf-item { color:#ffc0c0 !important; }
body.theme-crimson h1, body.theme-crimson h3, body.theme-crimson h3 a { color:#ffc0c0 !important; }
body.theme-crimson .item a { color:#ffc0c0 !important; }
body.theme-crimson .book-chapter-item a { color:#ffc0c0 !important; }

/* 熔岩 */
body.theme-lava { background:#1a0600 !important; color:#ffccaa !important; }
body.theme-lava .top-nav, body.theme-lava h1, body.theme-lava h3,
body.theme-lava .item, body.theme-lava .bottom-nav, body.theme-lava .reader-menu,
body.theme-lava .bookmark-panel, body.theme-lava .section-box,
body.theme-lava .auto-scroll-btn, body.theme-lava .speed-btn, body.theme-lava .speed-btn.active,
body.theme-lava .bookmark-btn, body.theme-lava .bookmark-btn.second,
body.theme-lava .chapter-item-btn, body.theme-lava .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,90,20,0.35) 50%, rgba(255,110,40,0.2) 100%) !important;}
body.theme-lava .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,120,50,0.3) 50%, rgba(255,100,30,0.15) 100%) !important;}
body.theme-lava .progress-fill { background:linear-gradient(90deg, #ff5a00, #ff8840) !important; box-shadow:0 0 6px rgba(255,90,20,0.4) !important; }
body.theme-lava .loading-spinner { border-color:rgba(255,90,20,0.2) !important; border-top-color:#ff5a00 !important; }
body.theme-lava .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,90,20,0.35) 50%, rgba(255,110,40,0.2) 100%) !important; border-color:rgba(255,90,20,0.3) !important; color:#ffccaa !important; }
/* 熔岩 - 阅读页面UI */
body.theme-lava .top-nav, body.theme-lava .top-nav a { color:#3d1f0e !important; }
body.theme-lava .top-nav .current { color:#ff5a00 !important; font-weight:700; }
body.theme-lava .top-nav .split { color:rgba(220,150,120,0.4) !important; }
body.theme-lava #reader, body.theme-lava #reader * { color:#ffccaa !important; }
body.theme-lava .reader-menu { background:rgba(30,8,0,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-lava .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,90,20,0.35) 50%, rgba(255,110,40,0.2) 100%) !important; color:#ffccaa !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-lava .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,140,80,0.3) 100%) !important; color:#ffccaa !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-lava .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,90,20,0.4) 50%, rgba(255,110,40,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,90,20,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-lava .bookmark-btn, body.theme-lava .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,90,20,0.35) 50%, rgba(255,110,40,0.2) 100%) !important; color:#ffccaa !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-lava .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,140,80,0.3) 100%) !important; color:#ffccaa !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-lava .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,90,20,0.4) 50%, rgba(255,110,40,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,90,20,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-lava .bookmark-panel { background:rgba(30,8,0,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-lava .bm-header { color:#ffccaa !important; }
body.theme-lava .bm-item { background:rgba(255,120,60,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffccaa !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-lava .bm-item .book, body.theme-lava .bm-item .chap, body.theme-lava .bm-item .page { color:#ff9966 !important; }
body.theme-lava .canvas-container { background:rgba(255,110,40,0.12) !important; }
body.theme-lava .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(30,8,0,0.95) 40%) !important; }
body.theme-lava .progress-track { background:rgba(220,120,80,0.15) !important; }
body.theme-lava .progress-text { color:rgba(220,150,120,0.7) !important; }
body.theme-lava .chapter-indicator { color:#ffccaa !important; }
body.theme-lava .ebook-chapter { background:rgba(30,8,0,0.92) !important; color:#ffccaa !important; }
body.theme-lava .ebook-chapter .chapter-title { color:#ff5a00 !important; }
body.theme-lava .menu-title, body.theme-lava .section-title { color:#ffccaa !important; }
body.theme-lava .back-btn { color:#ffccaa !important; background:rgba(255,255,255,0.5) !important; }
body.theme-lava .page-title { color:#ffccaa !important; }
body.theme-lava .shelf-item { color:#ffccaa !important; }
body.theme-lava h1, body.theme-lava h3, body.theme-lava h3 a { color:#ffccaa !important; }
body.theme-lava .item a { color:#ffccaa !important; }
body.theme-lava .book-chapter-item a { color:#ffccaa !important; }

/* bronze 古铜 */
body.theme-bronze { background:#120a02 !important; color:#ffe8c0 !important; }
body.theme-bronze .top-nav, body.theme-bronze h1, body.theme-bronze h3,
body.theme-bronze .item, body.theme-bronze .bottom-nav, body.theme-bronze .reader-menu,
body.theme-bronze .bookmark-panel, body.theme-bronze .section-box,
body.theme-bronze .auto-scroll-btn, body.theme-bronze .speed-btn, body.theme-bronze .speed-btn.active,
body.theme-bronze .bookmark-btn, body.theme-bronze .bookmark-btn.second,
body.theme-bronze .chapter-item-btn, body.theme-bronze .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,150,40,0.35) 50%, rgba(220,170,60,0.2) 100%) !important;}
body.theme-bronze .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,170,60,0.3) 50%, rgba(200,150,40,0.15) 100%) !important;}
body.theme-bronze .progress-fill { background:linear-gradient(90deg, #c89830, #e0b850) !important; box-shadow:0 0 6px rgba(200,150,40,0.4) !important; }
body.theme-bronze .loading-spinner { border-color:rgba(200,150,40,0.2) !important; border-top-color:#c89830 !important; }
body.theme-bronze .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,150,40,0.35) 50%, rgba(220,170,60,0.2) 100%) !important; border-color:rgba(200,150,40,0.3) !important; color:#ffe8c0 !important; }
/* bronze 阅读页面UI */
body.theme-bronze .top-nav, body.theme-bronze .top-nav a { color:#3d1f0e !important; }
body.theme-bronze .top-nav .current { color:#c89830 !important; font-weight:700; }
body.theme-bronze .top-nav .split { color:rgba(200,160,100,0.4) !important; }
body.theme-bronze #reader, body.theme-bronze #reader * { color:#ffe8c0 !important; }
body.theme-bronze .reader-menu { background:rgba(20,12,3,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-bronze .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,150,40,0.35) 50%, rgba(220,170,60,0.2) 100%) !important; color:#ffe8c0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-bronze .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(220,170,80,0.3) 100%) !important; color:#ffe8c0 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-bronze .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,150,40,0.4) 50%, rgba(220,170,60,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(200,150,40,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-bronze .bookmark-btn, body.theme-bronze .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,150,40,0.35) 50%, rgba(220,170,60,0.2) 100%) !important; color:#ffe8c0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-bronze .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(220,170,80,0.3) 100%) !important; color:#ffe8c0 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-bronze .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(200,150,40,0.4) 50%, rgba(220,170,60,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(200,150,40,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-bronze .bookmark-panel { background:rgba(20,12,3,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-bronze .bm-header { color:#ffe8c0 !important; }
body.theme-bronze .bm-item { background:rgba(200,150,60,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffe8c0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-bronze .bm-item .book, body.theme-bronze .bm-item .chap, body.theme-bronze .bm-item .page { color:#e0c080 !important; }
body.theme-bronze .canvas-container { background:rgba(220,170,60,0.12) !important; }
body.theme-bronze .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(20,12,3,0.95) 40%) !important; }
body.theme-bronze .progress-track { background:rgba(200,150,60,0.15) !important; }
body.theme-bronze .progress-text { color:rgba(200,160,100,0.7) !important; }
body.theme-bronze .chapter-indicator { color:#ffe8c0 !important; }
body.theme-bronze .ebook-chapter { background:rgba(20,12,3,0.92) !important; color:#ffe8c0 !important; }
body.theme-bronze .ebook-chapter .chapter-title { color:#c89830 !important; }
body.theme-bronze .menu-title, body.theme-bronze .section-title { color:#ffe8c0 !important; }
body.theme-bronze .back-btn { color:#ffe8c0 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-bronze .page-title { color:#ffe8c0 !important; }
body.theme-bronze .shelf-item { color:#ffe8c0 !important; }
body.theme-bronze h1, body.theme-bronze h3, body.theme-bronze h3 a { color:#ffe8c0 !important; }
body.theme-bronze .item a { color:#ffe8c0 !important; }
body.theme-bronze .book-chapter-item a { color:#ffe8c0 !important; }

/* emerald 翡翠 */
body.theme-emerald { background:#000a05 !important; color:#b0ffd0 !important; }
body.theme-emerald .top-nav, body.theme-emerald h1, body.theme-emerald h3,
body.theme-emerald .item, body.theme-emerald .bottom-nav, body.theme-emerald .reader-menu,
body.theme-emerald .bookmark-panel, body.theme-emerald .section-box,
body.theme-emerald .auto-scroll-btn, body.theme-emerald .speed-btn, body.theme-emerald .speed-btn.active,
body.theme-emerald .bookmark-btn, body.theme-emerald .bookmark-btn.second,
body.theme-emerald .chapter-item-btn, body.theme-emerald .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,190,90,0.35) 50%, rgba(0,210,110,0.2) 100%) !important;}
body.theme-emerald .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,210,110,0.3) 50%, rgba(0,190,90,0.15) 100%) !important;}
body.theme-emerald .progress-fill { background:linear-gradient(90deg, #00c060, #20e080) !important; box-shadow:0 0 6px rgba(0,190,90,0.4) !important; }
body.theme-emerald .loading-spinner { border-color:rgba(0,190,90,0.2) !important; border-top-color:#00c060 !important; }
body.theme-emerald .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,190,90,0.35) 50%, rgba(0,210,110,0.2) 100%) !important; border-color:rgba(0,190,90,0.3) !important; color:#b0ffd0 !important; }
/* emerald 阅读页面UI */
body.theme-emerald .top-nav, body.theme-emerald .top-nav a { color:#3d1f0e !important; }
body.theme-emerald .top-nav .current { color:#00c060 !important; font-weight:700; }
body.theme-emerald .top-nav .split { color:rgba(100,200,150,0.4) !important; }
body.theme-emerald #reader, body.theme-emerald #reader * { color:#b0ffd0 !important; }
body.theme-emerald .reader-menu { background:rgba(0,15,8,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-emerald .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,190,90,0.35) 50%, rgba(0,210,110,0.2) 100%) !important; color:#b0ffd0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-emerald .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(0,210,130,0.3) 100%) !important; color:#b0ffd0 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-emerald .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,190,90,0.4) 50%, rgba(0,210,110,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(0,190,90,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-emerald .bookmark-btn, body.theme-emerald .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,190,90,0.35) 50%, rgba(0,210,110,0.2) 100%) !important; color:#b0ffd0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-emerald .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(0,210,130,0.3) 100%) !important; color:#b0ffd0 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-emerald .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,190,90,0.4) 50%, rgba(0,210,110,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(0,190,90,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-emerald .bookmark-panel { background:rgba(0,15,8,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-emerald .bm-header { color:#b0ffd0 !important; }
body.theme-emerald .bm-item { background:rgba(0,190,110,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#b0ffd0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-emerald .bm-item .book, body.theme-emerald .bm-item .chap, body.theme-emerald .bm-item .page { color:#60e0a0 !important; }
body.theme-emerald .canvas-container { background:rgba(0,210,110,0.12) !important; }
body.theme-emerald .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(0,15,8,0.95) 40%) !important; }
body.theme-emerald .progress-track { background:rgba(0,190,110,0.15) !important; }
body.theme-emerald .progress-text { color:rgba(100,200,150,0.7) !important; }
body.theme-emerald .chapter-indicator { color:#b0ffd0 !important; }
body.theme-emerald .ebook-chapter { background:rgba(0,15,8,0.92) !important; color:#b0ffd0 !important; }
body.theme-emerald .ebook-chapter .chapter-title { color:#00c060 !important; }
body.theme-emerald .menu-title, body.theme-emerald .section-title { color:#b0ffd0 !important; }
body.theme-emerald .back-btn { color:#b0ffd0 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-emerald .page-title { color:#b0ffd0 !important; }
body.theme-emerald .shelf-item { color:#b0ffd0 !important; }
body.theme-emerald h1, body.theme-emerald h3, body.theme-emerald h3 a { color:#b0ffd0 !important; }
body.theme-emerald .item a { color:#b0ffd0 !important; }
body.theme-emerald .book-chapter-item a { color:#b0ffd0 !important; }

/* teal 青翠 */
body.theme-teal { background:#000a08 !important; color:#b0ffe8 !important; }
body.theme-teal .top-nav, body.theme-teal h1, body.theme-teal h3,
body.theme-teal .item, body.theme-teal .bottom-nav, body.theme-teal .reader-menu,
body.theme-teal .bookmark-panel, body.theme-teal .section-box,
body.theme-teal .auto-scroll-btn, body.theme-teal .speed-btn, body.theme-teal .speed-btn.active,
body.theme-teal .bookmark-btn, body.theme-teal .bookmark-btn.second,
body.theme-teal .chapter-item-btn, body.theme-teal .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,170,140,0.35) 50%, rgba(0,200,160,0.2) 100%) !important;}
body.theme-teal .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,200,160,0.3) 50%, rgba(0,180,150,0.15) 100%) !important;}
body.theme-teal .progress-fill { background:linear-gradient(90deg, #00b090, #20e0c0) !important; box-shadow:0 0 6px rgba(0,170,140,0.4) !important; }
body.theme-teal .loading-spinner { border-color:rgba(0,170,140,0.2) !important; border-top-color:#00b090 !important; }
body.theme-teal .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,170,140,0.35) 50%, rgba(0,200,160,0.2) 100%) !important; border-color:rgba(0,170,140,0.3) !important; color:#b0ffe8 !important; }
/* teal 阅读页面UI */
body.theme-teal .top-nav, body.theme-teal .top-nav a { color:#3d1f0e !important; }
body.theme-teal .top-nav .current { color:#00b090 !important; font-weight:700; }
body.theme-teal .top-nav .split { color:rgba(100,200,180,0.4) !important; }
body.theme-teal #reader, body.theme-teal #reader * { color:#b0ffe8 !important; }
body.theme-teal .reader-menu { background:rgba(0,15,12,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-teal .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,170,140,0.35) 50%, rgba(0,200,160,0.2) 100%) !important; color:#b0ffe8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-teal .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(0,200,170,0.3) 100%) !important; color:#b0ffe8 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-teal .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,170,140,0.4) 50%, rgba(0,200,160,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(0,170,140,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-teal .bookmark-btn, body.theme-teal .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,170,140,0.35) 50%, rgba(0,200,160,0.2) 100%) !important; color:#b0ffe8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-teal .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(0,200,170,0.3) 100%) !important; color:#b0ffe8 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-teal .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(0,170,140,0.4) 50%, rgba(0,200,160,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(0,170,140,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-teal .bookmark-panel { background:rgba(0,15,12,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-teal .bm-header { color:#b0ffe8 !important; }
body.theme-teal .bm-item { background:rgba(0,180,150,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#b0ffe8 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-teal .bm-item .book, body.theme-teal .bm-item .chap, body.theme-teal .bm-item .page { color:#60e0c0 !important; }
body.theme-teal .canvas-container { background:rgba(0,200,160,0.12) !important; }
body.theme-teal .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(0,15,12,0.95) 40%) !important; }
body.theme-teal .progress-track { background:rgba(0,180,150,0.15) !important; }
body.theme-teal .progress-text { color:rgba(100,200,180,0.7) !important; }
body.theme-teal .chapter-indicator { color:#b0ffe8 !important; }
body.theme-teal .ebook-chapter { background:rgba(0,15,12,0.92) !important; color:#b0ffe8 !important; }
body.theme-teal .ebook-chapter .chapter-title { color:#00b090 !important; }
body.theme-teal .menu-title, body.theme-teal .section-title { color:#b0ffe8 !important; }
body.theme-teal .back-btn { color:#b0ffe8 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-teal .page-title { color:#b0ffe8 !important; }
body.theme-teal .shelf-item { color:#b0ffe8 !important; }
body.theme-teal h1, body.theme-teal h3, body.theme-teal h3 a { color:#b0ffe8 !important; }
body.theme-teal .item a { color:#b0ffe8 !important; }
body.theme-teal .book-chapter-item a { color:#b0ffe8 !important; }

/* cobalt 钴蓝 */
body.theme-cobalt { background:#000518 !important; color:#c0d0ff !important; }
body.theme-cobalt .top-nav, body.theme-cobalt h1, body.theme-cobalt h3,
body.theme-cobalt .item, body.theme-cobalt .bottom-nav, body.theme-cobalt .reader-menu,
body.theme-cobalt .bookmark-panel, body.theme-cobalt .section-box,
body.theme-cobalt .auto-scroll-btn, body.theme-cobalt .speed-btn, body.theme-cobalt .speed-btn.active,
body.theme-cobalt .bookmark-btn, body.theme-cobalt .bookmark-btn.second,
body.theme-cobalt .chapter-item-btn, body.theme-cobalt .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,90,255,0.35) 50%, rgba(50,120,255,0.2) 100%) !important;}
body.theme-cobalt .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(50,120,255,0.3) 50%, rgba(30,100,240,0.15) 100%) !important;}
body.theme-cobalt .progress-fill { background:linear-gradient(90deg, #2060ff, #5090ff) !important; box-shadow:0 0 6px rgba(30,90,255,0.4) !important; }
body.theme-cobalt .loading-spinner { border-color:rgba(30,90,255,0.2) !important; border-top-color:#2060ff !important; }
body.theme-cobalt .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,90,255,0.35) 50%, rgba(50,120,255,0.2) 100%) !important; border-color:rgba(30,90,255,0.3) !important; color:#c0d0ff !important; }
/* cobalt 阅读页面UI */
body.theme-cobalt .top-nav, body.theme-cobalt .top-nav a { color:#3d1f0e !important; }
body.theme-cobalt .top-nav .current { color:#2060ff !important; font-weight:700; }
body.theme-cobalt .top-nav .split { color:rgba(150,170,220,0.4) !important; }
body.theme-cobalt #reader, body.theme-cobalt #reader * { color:#c0d0ff !important; }
body.theme-cobalt .reader-menu { background:rgba(3,8,30,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-cobalt .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,90,255,0.35) 50%, rgba(50,120,255,0.2) 100%) !important; color:#c0d0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-cobalt .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(60,130,255,0.3) 100%) !important; color:#c0d0ff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-cobalt .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,90,255,0.4) 50%, rgba(50,120,255,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(30,90,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-cobalt .bookmark-btn, body.theme-cobalt .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,90,255,0.35) 50%, rgba(50,120,255,0.2) 100%) !important; color:#c0d0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-cobalt .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(60,130,255,0.3) 100%) !important; color:#c0d0ff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-cobalt .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,90,255,0.4) 50%, rgba(50,120,255,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(30,90,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-cobalt .bookmark-panel { background:rgba(3,8,30,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-cobalt .bm-header { color:#c0d0ff !important; }
body.theme-cobalt .bm-item { background:rgba(40,100,240,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#c0d0ff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-cobalt .bm-item .book, body.theme-cobalt .bm-item .chap, body.theme-cobalt .bm-item .page { color:#80a0ff !important; }
body.theme-cobalt .canvas-container { background:rgba(50,120,255,0.12) !important; }
body.theme-cobalt .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(3,8,30,0.95) 40%) !important; }
body.theme-cobalt .progress-track { background:rgba(40,100,240,0.15) !important; }
body.theme-cobalt .progress-text { color:rgba(150,170,220,0.7) !important; }
body.theme-cobalt .chapter-indicator { color:#c0d0ff !important; }
body.theme-cobalt .ebook-chapter { background:rgba(3,8,30,0.92) !important; color:#c0d0ff !important; }
body.theme-cobalt .ebook-chapter .chapter-title { color:#2060ff !important; }
body.theme-cobalt .menu-title, body.theme-cobalt .section-title { color:#c0d0ff !important; }
body.theme-cobalt .back-btn { color:#c0d0ff !important; background:rgba(255,255,255,0.5) !important; }
body.theme-cobalt .page-title { color:#c0d0ff !important; }
body.theme-cobalt .shelf-item { color:#c0d0ff !important; }
body.theme-cobalt h1, body.theme-cobalt h3, body.theme-cobalt h3 a { color:#c0d0ff !important; }
body.theme-cobalt .item a { color:#c0d0ff !important; }
body.theme-cobalt .book-chapter-item a { color:#c0d0ff !important; }

/* violet 霓虹紫 */
body.theme-violet { background:#080010 !important; color:#d8c0ff !important; }
body.theme-violet .top-nav, body.theme-violet h1, body.theme-violet h3,
body.theme-violet .item, body.theme-violet .bottom-nav, body.theme-violet .reader-menu,
body.theme-violet .bookmark-panel, body.theme-violet .section-box,
body.theme-violet .auto-scroll-btn, body.theme-violet .speed-btn, body.theme-violet .speed-btn.active,
body.theme-violet .bookmark-btn, body.theme-violet .bookmark-btn.second,
body.theme-violet .chapter-item-btn, body.theme-violet .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(140,40,255,0.35) 50%, rgba(160,70,255,0.2) 100%) !important;}
body.theme-violet .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(160,70,255,0.3) 50%, rgba(140,50,240,0.15) 100%) !important;}
body.theme-violet .progress-fill { background:linear-gradient(90deg, #9030ff, #b060ff) !important; box-shadow:0 0 6px rgba(140,40,255,0.4) !important; }
body.theme-violet .loading-spinner { border-color:rgba(140,40,255,0.2) !important; border-top-color:#9030ff !important; }
body.theme-violet .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(140,40,255,0.35) 50%, rgba(160,70,255,0.2) 100%) !important; border-color:rgba(140,40,255,0.3) !important; color:#d8c0ff !important; }
/* violet 阅读页面UI */
body.theme-violet .top-nav, body.theme-violet .top-nav a { color:#3d1f0e !important; }
body.theme-violet .top-nav .current { color:#9030ff !important; font-weight:700; }
body.theme-violet .top-nav .split { color:rgba(180,150,220,0.4) !important; }
body.theme-violet #reader, body.theme-violet #reader * { color:#d8c0ff !important; }
body.theme-violet .reader-menu { background:rgba(10,3,25,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-violet .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(140,40,255,0.35) 50%, rgba(160,70,255,0.2) 100%) !important; color:#d8c0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-violet .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(170,90,250,0.3) 100%) !important; color:#d8c0ff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-violet .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(140,40,255,0.4) 50%, rgba(160,70,255,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(140,40,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-violet .bookmark-btn, body.theme-violet .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(140,40,255,0.35) 50%, rgba(160,70,255,0.2) 100%) !important; color:#d8c0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-violet .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(170,90,250,0.3) 100%) !important; color:#d8c0ff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-violet .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(140,40,255,0.4) 50%, rgba(160,70,255,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(140,40,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-violet .bookmark-panel { background:rgba(10,3,25,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-violet .bm-header { color:#d8c0ff !important; }
body.theme-violet .bm-item { background:rgba(150,60,250,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#d8c0ff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-violet .bm-item .book, body.theme-violet .bm-item .chap, body.theme-violet .bm-item .page { color:#b880ff !important; }
body.theme-violet .canvas-container { background:rgba(160,70,255,0.12) !important; }
body.theme-violet .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(10,3,25,0.95) 40%) !important; }
body.theme-violet .progress-track { background:rgba(150,60,250,0.15) !important; }
body.theme-violet .progress-text { color:rgba(180,150,220,0.7) !important; }
body.theme-violet .chapter-indicator { color:#d8c0ff !important; }
body.theme-violet .ebook-chapter { background:rgba(10,3,25,0.92) !important; color:#d8c0ff !important; }
body.theme-violet .ebook-chapter .chapter-title { color:#9030ff !important; }
body.theme-violet .menu-title, body.theme-violet .section-title { color:#d8c0ff !important; }
body.theme-violet .back-btn { color:#d8c0ff !important; background:rgba(255,255,255,0.5) !important; }
body.theme-violet .page-title { color:#d8c0ff !important; }
body.theme-violet .shelf-item { color:#d8c0ff !important; }
body.theme-violet h1, body.theme-violet h3, body.theme-violet h3 a { color:#d8c0ff !important; }
body.theme-violet .item a { color:#d8c0ff !important; }
body.theme-violet .book-chapter-item a { color:#d8c0ff !important; }

/* amber 琥珀 */
body.theme-amber { background:#100800 !important; color:#ffe8b0 !important; }
body.theme-amber .top-nav, body.theme-amber h1, body.theme-amber h3,
body.theme-amber .item, body.theme-amber .bottom-nav, body.theme-amber .reader-menu,
body.theme-amber .bookmark-panel, body.theme-amber .section-box,
body.theme-amber .auto-scroll-btn, body.theme-amber .speed-btn, body.theme-amber .speed-btn.active,
body.theme-amber .bookmark-btn, body.theme-amber .bookmark-btn.second,
body.theme-amber .chapter-item-btn, body.theme-amber .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,170,0,0.35) 50%, rgba(255,190,30,0.2) 100%) !important;}
body.theme-amber .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,190,30,0.3) 50%, rgba(255,170,10,0.15) 100%) !important;}
body.theme-amber .progress-fill { background:linear-gradient(90deg, #ffb000, #ffd040) !important; box-shadow:0 0 6px rgba(255,170,0,0.4) !important; }
body.theme-amber .loading-spinner { border-color:rgba(255,170,0,0.2) !important; border-top-color:#ffb000 !important; }
body.theme-amber .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,170,0,0.35) 50%, rgba(255,190,30,0.2) 100%) !important; border-color:rgba(255,170,0,0.3) !important; color:#ffe8b0 !important; }
/* amber 阅读页面UI */
body.theme-amber .top-nav, body.theme-amber .top-nav a { color:#3d1f0e !important; }
body.theme-amber .top-nav .current { color:#ffb000 !important; font-weight:700; }
body.theme-amber .top-nav .split { color:rgba(220,180,100,0.4) !important; }
body.theme-amber #reader, body.theme-amber #reader * { color:#ffe8b0 !important; }
body.theme-amber .reader-menu { background:rgba(20,12,0,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-amber .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,170,0,0.35) 50%, rgba(255,190,30,0.2) 100%) !important; color:#ffe8b0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-amber .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,190,50,0.3) 100%) !important; color:#ffe8b0 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-amber .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,170,0,0.4) 50%, rgba(255,190,30,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,170,0,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-amber .bookmark-btn, body.theme-amber .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,170,0,0.35) 50%, rgba(255,190,30,0.2) 100%) !important; color:#ffe8b0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-amber .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,190,50,0.3) 100%) !important; color:#ffe8b0 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-amber .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,170,0,0.4) 50%, rgba(255,190,30,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,170,0,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-amber .bookmark-panel { background:rgba(20,12,0,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-amber .bm-header { color:#ffe8b0 !important; }
body.theme-amber .bm-item { background:rgba(255,180,30,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffe8b0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-amber .bm-item .book, body.theme-amber .bm-item .chap, body.theme-amber .bm-item .page { color:#ffd060 !important; }
body.theme-amber .canvas-container { background:rgba(255,190,30,0.12) !important; }
body.theme-amber .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(20,12,0,0.95) 40%) !important; }
body.theme-amber .progress-track { background:rgba(255,180,40,0.15) !important; }
body.theme-amber .progress-text { color:rgba(220,180,100,0.7) !important; }
body.theme-amber .chapter-indicator { color:#ffe8b0 !important; }
body.theme-amber .ebook-chapter { background:rgba(20,12,0,0.92) !important; color:#ffe8b0 !important; }
body.theme-amber .ebook-chapter .chapter-title { color:#ffb000 !important; }
body.theme-amber .menu-title, body.theme-amber .section-title { color:#ffe8b0 !important; }
body.theme-amber .back-btn { color:#ffe8b0 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-amber .page-title { color:#ffe8b0 !important; }
body.theme-amber .shelf-item { color:#ffe8b0 !important; }
body.theme-amber h1, body.theme-amber h3, body.theme-amber h3 a { color:#ffe8b0 !important; }
body.theme-amber .item a { color:#ffe8b0 !important; }
body.theme-amber .book-chapter-item a { color:#ffe8b0 !important; }

/* magenta 品红 */
body.theme-magenta { background:#100008 !important; color:#ffc0e0 !important; }
body.theme-magenta .top-nav, body.theme-magenta h1, body.theme-magenta h3,
body.theme-magenta .item, body.theme-magenta .bottom-nav, body.theme-magenta .reader-menu,
body.theme-magenta .bookmark-panel, body.theme-magenta .section-box,
body.theme-magenta .auto-scroll-btn, body.theme-magenta .speed-btn, body.theme-magenta .speed-btn.active,
body.theme-magenta .bookmark-btn, body.theme-magenta .bookmark-btn.second,
body.theme-magenta .chapter-item-btn, body.theme-magenta .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,0,160,0.35) 50%, rgba(240,20,180,0.2) 100%) !important;}
body.theme-magenta .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(240,20,180,0.3) 50%, rgba(220,10,160,0.15) 100%) !important;}
body.theme-magenta .progress-fill { background:linear-gradient(90deg, #e000a0, #ff20c0) !important; box-shadow:0 0 6px rgba(220,0,160,0.4) !important; }
body.theme-magenta .loading-spinner { border-color:rgba(220,0,160,0.2) !important; border-top-color:#e000a0 !important; }
body.theme-magenta .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,0,160,0.35) 50%, rgba(240,20,180,0.2) 100%) !important; border-color:rgba(220,0,160,0.3) !important; color:#ffc0e0 !important; }
/* magenta 阅读页面UI */
body.theme-magenta .top-nav, body.theme-magenta .top-nav a { color:#3d1f0e !important; }
body.theme-magenta .top-nav .current { color:#e000a0 !important; font-weight:700; }
body.theme-magenta .top-nav .split { color:rgba(220,150,190,0.4) !important; }
body.theme-magenta #reader, body.theme-magenta #reader * { color:#ffc0e0 !important; }
body.theme-magenta .reader-menu { background:rgba(20,3,12,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-magenta .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,0,160,0.35) 50%, rgba(240,20,180,0.2) 100%) !important; color:#ffc0e0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-magenta .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(240,40,190,0.3) 100%) !important; color:#ffc0e0 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-magenta .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,0,160,0.4) 50%, rgba(240,20,180,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(220,0,160,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-magenta .bookmark-btn, body.theme-magenta .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,0,160,0.35) 50%, rgba(240,20,180,0.2) 100%) !important; color:#ffc0e0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-magenta .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(240,40,190,0.3) 100%) !important; color:#ffc0e0 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-magenta .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(220,0,160,0.4) 50%, rgba(240,20,180,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(220,0,160,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-magenta .bookmark-panel { background:rgba(20,3,12,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-magenta .bm-header { color:#ffc0e0 !important; }
body.theme-magenta .bm-item { background:rgba(230,30,170,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffc0e0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-magenta .bm-item .book, body.theme-magenta .bm-item .chap, body.theme-magenta .bm-item .page { color:#ff80d0 !important; }
body.theme-magenta .canvas-container { background:rgba(240,20,180,0.12) !important; }
body.theme-magenta .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(20,3,12,0.95) 40%) !important; }
body.theme-magenta .progress-track { background:rgba(230,30,170,0.15) !important; }
body.theme-magenta .progress-text { color:rgba(220,150,190,0.7) !important; }
body.theme-magenta .chapter-indicator { color:#ffc0e0 !important; }
body.theme-magenta .ebook-chapter { background:rgba(20,3,12,0.92) !important; color:#ffc0e0 !important; }
body.theme-magenta .ebook-chapter .chapter-title { color:#e000a0 !important; }
body.theme-magenta .menu-title, body.theme-magenta .section-title { color:#ffc0e0 !important; }
body.theme-magenta .back-btn { color:#ffc0e0 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-magenta .page-title { color:#ffc0e0 !important; }
body.theme-magenta .shelf-item { color:#ffc0e0 !important; }
body.theme-magenta h1, body.theme-magenta h3, body.theme-magenta h3 a { color:#ffc0e0 !important; }
body.theme-magenta .item a { color:#ffc0e0 !important; }
body.theme-magenta .book-chapter-item a { color:#ffc0e0 !important; }

/* indigo 靛青 */
body.theme-indigo { background:#050818 !important; color:#c8c0ff !important; }
body.theme-indigo .top-nav, body.theme-indigo h1, body.theme-indigo h3,
body.theme-indigo .item, body.theme-indigo .bottom-nav, body.theme-indigo .reader-menu,
body.theme-indigo .bookmark-panel, body.theme-indigo .section-box,
body.theme-indigo .auto-scroll-btn, body.theme-indigo .speed-btn, body.theme-indigo .speed-btn.active,
body.theme-indigo .bookmark-btn, body.theme-indigo .bookmark-btn.second,
body.theme-indigo .chapter-item-btn, body.theme-indigo .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(70,60,200,0.35) 50%, rgba(90,80,220,0.2) 100%) !important;}
body.theme-indigo .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(90,80,220,0.3) 50%, rgba(70,60,200,0.15) 100%) !important;}
body.theme-indigo .progress-fill { background:linear-gradient(90deg, #4a40d0, #7a70f0) !important; box-shadow:0 0 6px rgba(70,60,200,0.4) !important; }
body.theme-indigo .loading-spinner { border-color:rgba(70,60,200,0.2) !important; border-top-color:#4a40d0 !important; }
body.theme-indigo .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(70,60,200,0.35) 50%, rgba(90,80,220,0.2) 100%) !important; border-color:rgba(70,60,200,0.3) !important; color:#c8c0ff !important; }
/* indigo 阅读页面UI */
body.theme-indigo .top-nav, body.theme-indigo .top-nav a { color:#3d1f0e !important; }
body.theme-indigo .top-nav .current { color:#4a40d0 !important; font-weight:700; }
body.theme-indigo .top-nav .split { color:rgba(160,150,210,0.4) !important; }
body.theme-indigo #reader, body.theme-indigo #reader * { color:#c8c0ff !important; }
body.theme-indigo .reader-menu { background:rgba(8,10,25,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-indigo .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(70,60,200,0.35) 50%, rgba(90,80,220,0.2) 100%) !important; color:#c8c0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-indigo .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(100,90,230,0.3) 100%) !important; color:#c8c0ff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-indigo .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(70,60,200,0.4) 50%, rgba(90,80,220,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(70,60,200,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-indigo .bookmark-btn, body.theme-indigo .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(70,60,200,0.35) 50%, rgba(90,80,220,0.2) 100%) !important; color:#c8c0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-indigo .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(100,90,230,0.3) 100%) !important; color:#c8c0ff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-indigo .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(70,60,200,0.4) 50%, rgba(90,80,220,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(70,60,200,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-indigo .bookmark-panel { background:rgba(8,10,25,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-indigo .bm-header { color:#c8c0ff !important; }
body.theme-indigo .bm-item { background:rgba(80,70,210,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#c8c0ff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-indigo .bm-item .book, body.theme-indigo .bm-item .chap, body.theme-indigo .bm-item .page { color:#9080ff !important; }
body.theme-indigo .canvas-container { background:rgba(90,80,220,0.12) !important; }
body.theme-indigo .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(8,10,25,0.95) 40%) !important; }
body.theme-indigo .progress-track { background:rgba(80,70,210,0.15) !important; }
body.theme-indigo .progress-text { color:rgba(160,150,210,0.7) !important; }
body.theme-indigo .chapter-indicator { color:#c8c0ff !important; }
body.theme-indigo .ebook-chapter { background:rgba(8,10,25,0.92) !important; color:#c8c0ff !important; }
body.theme-indigo .ebook-chapter .chapter-title { color:#4a40d0 !important; }
body.theme-indigo .menu-title, body.theme-indigo .section-title { color:#c8c0ff !important; }
body.theme-indigo .back-btn { color:#c8c0ff !important; background:rgba(255,255,255,0.5) !important; }
body.theme-indigo .page-title { color:#c8c0ff !important; }
body.theme-indigo .shelf-item { color:#c8c0ff !important; }
body.theme-indigo h1, body.theme-indigo h3, body.theme-indigo h3 a { color:#c8c0ff !important; }
body.theme-indigo .item a { color:#c8c0ff !important; }
body.theme-indigo .book-chapter-item a { color:#c8c0ff !important; }

/* coral 珊瑚 */
body.theme-coral { background:#180505 !important; color:#ffc0c0 !important; }
body.theme-coral .top-nav, body.theme-coral h1, body.theme-coral h3,
body.theme-coral .item, body.theme-coral .bottom-nav, body.theme-coral .reader-menu,
body.theme-coral .bookmark-panel, body.theme-coral .section-box,
body.theme-coral .auto-scroll-btn, body.theme-coral .speed-btn, body.theme-coral .speed-btn.active,
body.theme-coral .bookmark-btn, body.theme-coral .bookmark-btn.second,
body.theme-coral .chapter-item-btn, body.theme-coral .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,70,70,0.35) 50%, rgba(255,90,90,0.2) 100%) !important;}
body.theme-coral .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,90,90,0.3) 50%, rgba(255,70,70,0.15) 100%) !important;}
body.theme-coral .progress-fill { background:linear-gradient(90deg, #ff5050, #ff8080) !important; box-shadow:0 0 6px rgba(255,70,70,0.4) !important; }
body.theme-coral .loading-spinner { border-color:rgba(255,70,70,0.2) !important; border-top-color:#ff5050 !important; }
body.theme-coral .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,70,70,0.35) 50%, rgba(255,90,90,0.2) 100%) !important; border-color:rgba(255,70,70,0.3) !important; color:#ffc0c0 !important; }
/* coral 阅读页面UI */
body.theme-coral .top-nav, body.theme-coral .top-nav a { color:#3d1f0e !important; }
body.theme-coral .top-nav .current { color:#ff5050 !important; font-weight:700; }
body.theme-coral .top-nav .split { color:rgba(220,150,150,0.4) !important; }
body.theme-coral #reader, body.theme-coral #reader * { color:#ffc0c0 !important; }
body.theme-coral .reader-menu { background:rgba(25,8,8,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-coral .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,70,70,0.35) 50%, rgba(255,90,90,0.2) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-coral .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,100,100,0.3) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-coral .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,70,70,0.4) 50%, rgba(255,90,90,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,70,70,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-coral .bookmark-btn, body.theme-coral .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,70,70,0.35) 50%, rgba(255,90,90,0.2) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-coral .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,100,100,0.3) 100%) !important; color:#ffc0c0 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-coral .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,70,70,0.4) 50%, rgba(255,90,90,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,70,70,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-coral .bookmark-panel { background:rgba(25,8,8,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-coral .bm-header { color:#ffc0c0 !important; }
body.theme-coral .bm-item { background:rgba(255,80,80,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffc0c0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-coral .bm-item .book, body.theme-coral .bm-item .chap, body.theme-coral .bm-item .page { color:#ff8080 !important; }
body.theme-coral .canvas-container { background:rgba(255,90,90,0.12) !important; }
body.theme-coral .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(25,8,8,0.95) 40%) !important; }
body.theme-coral .progress-track { background:rgba(255,80,80,0.15) !important; }
body.theme-coral .progress-text { color:rgba(220,150,150,0.7) !important; }
body.theme-coral .chapter-indicator { color:#ffc0c0 !important; }
body.theme-coral .ebook-chapter { background:rgba(25,8,8,0.92) !important; color:#ffc0c0 !important; }
body.theme-coral .ebook-chapter .chapter-title { color:#ff5050 !important; }
body.theme-coral .menu-title, body.theme-coral .section-title { color:#ffc0c0 !important; }
body.theme-coral .back-btn { color:#ffc0c0 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-coral .page-title { color:#ffc0c0 !important; }
body.theme-coral .shelf-item { color:#ffc0c0 !important; }
body.theme-coral h1, body.theme-coral h3, body.theme-coral h3 a { color:#ffc0c0 !important; }
body.theme-coral .item a { color:#ffc0c0 !important; }
body.theme-coral .book-chapter-item a { color:#ffc0c0 !important; }

/* mint 薄荷 */
body.theme-mint { background:#000a06 !important; color:#b0ffd8 !important; }
body.theme-mint .top-nav, body.theme-mint h1, body.theme-mint h3,
body.theme-mint .item, body.theme-mint .bottom-nav, body.theme-mint .reader-menu,
body.theme-mint .bookmark-panel, body.theme-mint .section-box,
body.theme-mint .auto-scroll-btn, body.theme-mint .speed-btn, body.theme-mint .speed-btn.active,
body.theme-mint .bookmark-btn, body.theme-mint .bookmark-btn.second,
body.theme-mint .chapter-item-btn, body.theme-mint .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,190,120,0.35) 50%, rgba(40,210,140,0.2) 100%) !important;}
body.theme-mint .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(40,210,140,0.3) 50%, rgba(30,190,120,0.15) 100%) !important;}
body.theme-mint .progress-fill { background:linear-gradient(90deg, #20c080, #40e8a0) !important; box-shadow:0 0 6px rgba(30,190,120,0.4) !important; }
body.theme-mint .loading-spinner { border-color:rgba(30,190,120,0.2) !important; border-top-color:#20c080 !important; }
body.theme-mint .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,190,120,0.35) 50%, rgba(40,210,140,0.2) 100%) !important; border-color:rgba(30,190,120,0.3) !important; color:#b0ffd8 !important; }
/* mint 阅读页面UI */
body.theme-mint .top-nav, body.theme-mint .top-nav a { color:#3d1f0e !important; }
body.theme-mint .top-nav .current { color:#20c080 !important; font-weight:700; }
body.theme-mint .top-nav .split { color:rgba(120,210,170,0.4) !important; }
body.theme-mint #reader, body.theme-mint #reader * { color:#b0ffd8 !important; }
body.theme-mint .reader-menu { background:rgba(0,15,8,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-mint .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,190,120,0.35) 50%, rgba(40,210,140,0.2) 100%) !important; color:#b0ffd8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-mint .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(40,210,150,0.3) 100%) !important; color:#b0ffd8 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-mint .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,190,120,0.4) 50%, rgba(40,210,140,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(30,190,120,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-mint .bookmark-btn, body.theme-mint .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,190,120,0.35) 50%, rgba(40,210,140,0.2) 100%) !important; color:#b0ffd8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-mint .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(40,210,150,0.3) 100%) !important; color:#b0ffd8 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-mint .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(30,190,120,0.4) 50%, rgba(40,210,140,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(30,190,120,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-mint .bookmark-panel { background:rgba(0,15,8,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-mint .bm-header { color:#b0ffd8 !important; }
body.theme-mint .bm-item { background:rgba(30,200,130,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#b0ffd8 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-mint .bm-item .book, body.theme-mint .bm-item .chap, body.theme-mint .bm-item .page { color:#60e8a8 !important; }
body.theme-mint .canvas-container { background:rgba(40,210,140,0.12) !important; }
body.theme-mint .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(0,15,8,0.95) 40%) !important; }
body.theme-mint .progress-track { background:rgba(30,200,130,0.15) !important; }
body.theme-mint .progress-text { color:rgba(120,210,170,0.7) !important; }
body.theme-mint .chapter-indicator { color:#b0ffd8 !important; }
body.theme-mint .ebook-chapter { background:rgba(0,15,8,0.92) !important; color:#b0ffd8 !important; }
body.theme-mint .ebook-chapter .chapter-title { color:#20c080 !important; }
body.theme-mint .menu-title, body.theme-mint .section-title { color:#b0ffd8 !important; }
body.theme-mint .back-btn { color:#b0ffd8 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-mint .page-title { color:#b0ffd8 !important; }
body.theme-mint .shelf-item { color:#b0ffd8 !important; }
body.theme-mint h1, body.theme-mint h3, body.theme-mint h3 a { color:#b0ffd8 !important; }
body.theme-mint .item a { color:#b0ffd8 !important; }
body.theme-mint .book-chapter-item a { color:#b0ffd8 !important; }

/* 金灿灿 */
body.theme-gold { background:#fff8e0 !important; color:#704e00 !important; }
body.theme-gold .top-nav, body.theme-gold h1, body.theme-gold h3,
body.theme-gold .item, body.theme-gold .bottom-nav, body.theme-gold .reader-menu,
body.theme-gold .bookmark-panel, body.theme-gold .section-box,
body.theme-gold .auto-scroll-btn, body.theme-gold .speed-btn, body.theme-gold .speed-btn.active,
body.theme-gold .bookmark-btn, body.theme-gold .bookmark-btn.second,
body.theme-gold .chapter-item-btn, body.theme-gold .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,215,80,0.55) 50%, rgba(230,180,30,0.35) 100%) !important;}
body.theme-gold .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,225,120,0.45) 50%, rgba(240,195,60,0.25) 100%) !important;}
body.theme-gold .progress-fill { background:linear-gradient(90deg, #fff, #ffd740) !important; box-shadow:0 0 6px rgba(255,200,40,0.5) !important; }
body.theme-gold .loading-spinner { border-color:rgba(255,210,60,0.25) !important; border-top-color:#ffbc20 !important; }
body.theme-gold .toast { background:linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,215,80,0.55) 50%, rgba(230,180,30,0.35) 100%) !important; border-color:rgba(255,200,40,0.4) !important; color:#5c3f00 !important; }
/* 金灿灿亮面黄金UI - 明亮奢华 */
body.theme-gold .top-nav, body.theme-gold .top-nav a { color:#3d1f0e !important; }
body.theme-gold .top-nav .current { color:#b88600 !important; font-weight:700; }
body.theme-gold .top-nav .split { color:rgba(92,63,0,0.4) !important; }
body.theme-gold #reader, body.theme-gold #reader * { color:#6b4a00 !important; }
body.theme-gold .reader-menu { background:rgba(255,248,220,0.92) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(180,130,20,0.15), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.04) !important; }
body.theme-gold .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,215,80,0.55) 50%, rgba(230,180,30,0.35) 100%) !important; color:#5c3f00 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(200,150,30,0.15), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.04) !important; }
body.theme-gold .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,225,120,0.45) 100%) !important; color:#5c3f00 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.03) !important; }
body.theme-gold .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,210,60,0.6) 50%, rgba(235,185,35,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,200,40,0.3), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.04) !important; }
body.theme-gold .bookmark-btn, body.theme-gold .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,215,80,0.55) 50%, rgba(230,180,30,0.35) 100%) !important; color:#5c3f00 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(200,150,30,0.15), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.04) !important; }
body.theme-gold .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,225,120,0.45) 100%) !important; color:#5c3f00 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.03) !important; }
body.theme-gold .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,210,60,0.6) 50%, rgba(235,185,35,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,200,40,0.3), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.04) !important; }
body.theme-gold .bookmark-panel { background:rgba(255,248,220,0.92) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(180,130,20,0.15), inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.04) !important; }
body.theme-gold .bm-header { color:#5c3f00 !important; }
body.theme-gold .bm-item { background:rgba(255,235,170,0.75) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#5c3f00 !important; box-shadow: 0 2px 8px rgba(180,130,20,0.1), inset 0 1px 3px rgba(255,255,255,0.6), inset 0 -1px 3px rgba(0,0,0,0.03) !important; }
body.theme-gold .bm-item .book, body.theme-gold .bm-item .chap, body.theme-gold .page { color:#704e00 !important; }
body.theme-gold .canvas-container { background:rgba(255,210,60,0.15) !important; }
body.theme-gold .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(255,245,210,0.95) 40%) !important; }
body.theme-gold .progress-track { background:rgba(255,200,40,0.2) !important; }
body.theme-gold .progress-text { color:rgba(92,63,0,0.75) !important; }
body.theme-gold .chapter-indicator { color:#5c3f00 !important; }
body.theme-gold .ebook-chapter { background:rgba(255,252,235,0.96) !important; color:#6b4a00 !important; }
body.theme-gold .ebook-chapter .chapter-title { color:#b88600 !important; }
body.theme-gold .menu-title, body.theme-gold .section-title { color:#5c3f00 !important; }
body.theme-gold .back-btn { color:#5c3f00 !important; background:rgba(255,255,255,0.65) !important; }
body.theme-gold .page-title { color:#5c3f00 !important; }
body.theme-gold .shelf-item { color:#6b4a00 !important; }
body.theme-gold h1, body.theme-gold h3, body.theme-gold h3 a { color:#5c3f00 !important; }
body.theme-gold .item a { color:#6b4a00 !important; }
body.theme-gold .book-chapter-item a { color:#5c3f00 !important; }

/* 熔岩机甲 */
body.theme-mecha { background:#1a1a1a !important; color:#ff7722 !important; }
body.theme-mecha .top-nav, body.theme-mecha h1, body.theme-mecha h3,
body.theme-mecha .item, body.theme-mecha .bottom-nav, body.theme-mecha .reader-menu,
body.theme-mecha .bookmark-panel, body.theme-mecha .section-box,
body.theme-mecha .auto-scroll-btn, body.theme-mecha .speed-btn, body.theme-mecha .speed-btn.active,
body.theme-mecha .bookmark-btn, body.theme-mecha .bookmark-btn.second,
body.theme-mecha .chapter-item-btn, body.theme-mecha .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.6) 50%, rgba(255,80,0,0.4) 100%) !important;}
body.theme-mecha .book-chapter-item {background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.5) 50%, rgba(255,80,0,0.3) 100%) !important;}
body.theme-mecha .progress-fill { background:linear-gradient(90deg, #ff5500, #ff9933) !important; box-shadow:0 0 6px rgba(255,80,0,0.6) !important; }
body.theme-mecha .loading-spinner { border-color:rgba(255,100,30,0.2) !important; border-top-color:#ff5500 !important; }
body.theme-mecha .toast { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.6) 50%, rgba(255,80,0,0.4) 100%) !important; border-color:rgba(255,100,30,0.5) !important; color:#ffcc99 !important; }
/* 熔岩机甲 - 阅读页面UI */
body.theme-mecha .top-nav, body.theme-mecha .top-nav a { color:#3d1f0e !important; }
body.theme-mecha .top-nav .current { color:#ff5500 !important; font-weight:700; }
body.theme-mecha .top-nav .split { color:rgba(255,150,50,0.4) !important; }
body.theme-mecha #reader, body.theme-mecha #reader * { color:#ffcc99 !important; }
body.theme-mecha .reader-menu { background:rgba(40,40,40,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-mecha .auto-scroll-btn { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.6) 50%, rgba(255,80,0,0.4) 100%) !important; color:#ffcc99 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(255,80,0,0.4), inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-mecha .speed-btn { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.5) 100%) !important; color:#ffcc99 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-mecha .speed-btn.active { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.7) 50%, rgba(255,80,0,0.5) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,80,0,0.6), inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-mecha .bookmark-btn, body.theme-mecha .bookmark-btn.second { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.6) 50%, rgba(255,80,0,0.4) 100%) !important; color:#ffcc99 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(255,80,0,0.4), inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-mecha .chapter-item-btn { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.5) 100%) !important; color:#ffcc99 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-mecha .chapter-item-btn.active { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.7) 50%, rgba(255,80,0,0.5) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,80,0,0.6), inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-mecha .bookmark-panel { background:rgba(40,40,40,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,100,30,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-mecha .bm-header { color:#ffcc99 !important; }
body.theme-mecha .bm-item { background:linear-gradient(180deg, rgba(80,80,80,0.8) 0%, rgba(255,100,30,0.6) 50%, rgba(255,80,0,0.4) 100%) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffcc99 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,100,30,0.3), inset 0 -1px 3px rgba(0,0,0,0.2) !important; }
body.theme-mecha .bm-item .book, body.theme-mecha .bm-item .chap, body.theme-mecha .bm-item .page { color:#ff9933 !important; }
body.theme-mecha .canvas-container { background:rgba(255,100,30,0.15) !important; }
body.theme-mecha .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(40,40,40,0.95) 40%) !important; }
body.theme-mecha .progress-track { background:rgba(255,100,30,0.2) !important; }
body.theme-mecha .progress-text { color:rgba(255,150,50,0.7) !important; }
body.theme-mecha .chapter-indicator { color:#ffcc99 !important; }
body.theme-mecha .ebook-chapter { background:rgba(50,50,50,0.95) !important; color:#ffcc99 !important; }
body.theme-mecha .ebook-chapter .chapter-title { color:#ff5500 !important; }
body.theme-mecha .menu-title, body.theme-mecha .section-title { color:#ffcc99 !important; }
body.theme-mecha .back-btn { color:#ffcc99 !important; background:rgba(80,80,80,0.8) !important; }
body.theme-mecha .page-title { color:#ffcc99 !important; }
body.theme-mecha .shelf-item { color:#ffcc99 !important; }
body.theme-mecha h1, body.theme-mecha h3, body.theme-mecha h3 a { color:#ffcc99 !important; }
body.theme-mecha .item a { color:#ffcc99 !important; }
body.theme-mecha .book-chapter-item a { color:#ffcc99 !important; }

/* 复古宫廷 */
body.theme-royal { background:#4a1a1a !important; color:#e6c28a !important; }
body.theme-royal .top-nav, body.theme-royal h1, body.theme-royal h3,
body.theme-royal .item, body.theme-royal .bottom-nav, body.theme-royal .reader-menu,
body.theme-royal .bookmark-panel, body.theme-royal .section-box,
body.theme-royal .auto-scroll-btn, body.theme-royal .speed-btn, body.theme-royal .speed-btn.active,
body.theme-royal .bookmark-btn, body.theme-royal .bookmark-btn.second,
body.theme-royal .chapter-item-btn, body.theme-royal .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important;}
body.theme-royal .book-chapter-item {background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.4) 50%, rgba(180,120,60,0.2) 100%) !important;}
body.theme-royal .progress-fill { background:linear-gradient(90deg, #b8860b, #daa520) !important; box-shadow:0 0 6px rgba(218,165,32,0.5) !important; }
body.theme-royal .loading-spinner { border-color:rgba(218,165,32,0.2) !important; border-top-color:#b8860b !important; }
body.theme-royal .toast { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important; border-color:rgba(218,165,32,0.4) !important; color:#f0e6d2 !important; }
/* 复古宫廷 - 阅读页面UI */
body.theme-royal .top-nav, body.theme-royal .top-nav a { color:#3d1f0e !important; }
body.theme-royal .top-nav .current { color:#daa520 !important; font-weight:700; }
body.theme-royal .top-nav .split { color:rgba(230,194,138,0.4) !important; }
body.theme-royal #reader, body.theme-royal #reader * { color:#f0e6d2 !important; }
body.theme-royal .reader-menu { background:rgba(100,40,40,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .auto-scroll-btn { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.3), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .speed-btn { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.4) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-royal .speed-btn.active { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.6) 50%, rgba(180,120,60,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.5), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .bookmark-btn, body.theme-royal .bookmark-btn.second { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.3), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .chapter-item-btn { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.4) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-royal .chapter-item-btn.active { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.6) 50%, rgba(180,120,60,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.5), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .bookmark-panel { background:rgba(100,40,40,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .bm-header { color:#e6c28a !important; }
body.theme-royal .bm-item { background:rgba(130,60,60,0.8) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#f0e6d2 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 3px rgba(218,165,32,0.3), inset 0 -1px 3px rgba(0,0,0,0.2) !important; }
body.theme-royal .bm-item .book, body.theme-royal .bm-item .chap, body.theme-royal .bm-item .page { color:#daa520 !important; }
body.theme-royal .canvas-container { background:rgba(218,165,32,0.15) !important; }
body.theme-royal .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(100,40,40,0.95) 40%) !important; }
body.theme-royal .progress-track { background:rgba(218,165,32,0.2) !important; }
body.theme-royal .progress-text { color:rgba(230,194,138,0.7) !important; }
body.theme-royal .chapter-indicator { color:#f0e6d2 !important; }
body.theme-royal .ebook-chapter { background:rgba(120,50,50,0.95) !important; color:#f0e6d2 !important; }
body.theme-royal .ebook-chapter .chapter-title { color:#daa520 !important; }
body.theme-royal .menu-title, body.theme-royal .section-title { color:#e6c28a !important; }
body.theme-royal .back-btn { color:#e6c28a !important; background:rgba(150,80,80,0.7) !important; }
body.theme-royal .page-title { color:#e6c28a !important; }
body.theme-royal .shelf-item { color:#e6c28a !important; }
body.theme-royal h1, body.theme-royal h3, body.theme-royal h3 a { color:#e6c28a !important; }
body.theme-royal .item a { color:#e6c28a !important; }
body.theme-royal .book-chapter-item a { color:#e6c28a !important; }

/* 复古宫廷 */
body.theme-royal { background:#4a1a1a !important; color:#e6c28a !important; }
body.theme-royal .top-nav, body.theme-royal h1, body.theme-royal h3,
body.theme-royal .item, body.theme-royal .bottom-nav, body.theme-royal .reader-menu,
body.theme-royal .bookmark-panel, body.theme-royal .section-box,
body.theme-royal .auto-scroll-btn, body.theme-royal .speed-btn, body.theme-royal .speed-btn.active,
body.theme-royal .bookmark-btn, body.theme-royal .bookmark-btn.second,
body.theme-royal .chapter-item-btn, body.theme-royal .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important;}
body.theme-royal .book-chapter-item {background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.4) 50%, rgba(180,120,60,0.2) 100%) !important;}
body.theme-royal .progress-fill { background:linear-gradient(90deg, #b8860b, #daa520) !important; box-shadow:0 0 6px rgba(218,165,32,0.5) !important; }
body.theme-royal .loading-spinner { border-color:rgba(218,165,32,0.2) !important; border-top-color:#b8860b !important; }
body.theme-royal .toast { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important; border-color:rgba(218,165,32,0.4) !important; color:#f0e6d2 !important; }
/* 复古宫廷 - 阅读页面UI */
body.theme-royal .top-nav, body.theme-royal .top-nav a { color:#3d1f0e !important; }
body.theme-royal .top-nav .current { color:#daa520 !important; font-weight:700; }
body.theme-royal .top-nav .split { color:rgba(230,194,138,0.4) !important; }
body.theme-royal #reader, body.theme-royal #reader * { color:#f0e6d2 !important; }
body.theme-royal .reader-menu { background:rgba(100,40,40,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .auto-scroll-btn { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.3), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .speed-btn { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.4) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-royal .speed-btn.active { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.6) 50%, rgba(180,120,60,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.5), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .bookmark-btn, body.theme-royal .bookmark-btn.second { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.5) 50%, rgba(180,120,60,0.3) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.3), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .chapter-item-btn { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.4) 100%) !important; color:#f0e6d2 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-royal .chapter-item-btn.active { background:linear-gradient(180deg, rgba(150,80,80,0.7) 0%, rgba(200,150,80,0.6) 50%, rgba(180,120,60,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(218,165,32,0.5), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .bookmark-panel { background:rgba(100,40,40,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(218,165,32,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-royal .bm-header { color:#e6c28a !important; }
body.theme-royal .bm-item { background:rgba(130,60,60,0.8) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#f0e6d2 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 3px rgba(218,165,32,0.3), inset 0 -1px 3px rgba(0,0,0,0.2) !important; }
body.theme-royal .bm-item .book, body.theme-royal .bm-item .chap, body.theme-royal .bm-item .page { color:#daa520 !important; }
body.theme-royal .canvas-container { background:rgba(218,165,32,0.15) !important; }
body.theme-royal .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(100,40,40,0.95) 40%) !important; }
body.theme-royal .progress-track { background:rgba(218,165,32,0.2) !important; }
body.theme-royal .progress-text { color:rgba(230,194,138,0.7) !important; }
body.theme-royal .chapter-indicator { color:#f0e6d2 !important; }
body.theme-royal .ebook-chapter { background:rgba(120,50,50,0.95) !important; color:#f0e6d2 !important; }
body.theme-royal .ebook-chapter .chapter-title { color:#daa520 !important; }
body.theme-royal .menu-title, body.theme-royal .section-title { color:#e6c28a !important; }
body.theme-royal .back-btn { color:#e6c28a !important; background:rgba(150,80,80,0.7) !important; }
body.theme-royal .page-title { color:#e6c28a !important; }
body.theme-royal .shelf-item { color:#e6c28a !important; }
body.theme-royal h1, body.theme-royal h3, body.theme-royal h3 a { color:#e6c28a !important; }
body.theme-royal .item a { color:#e6c28a !important; }
body.theme-royal .book-chapter-item a { color:#e6c28a !important; }

/* 橘黄暖阳 */
body.theme-orangea { background:#f5f0e8 !important; color:#2d1f0e !important; }
body.theme-orangea .top-nav, body.theme-orangea h1, body.theme-orangea h3,
body.theme-orangea .item, body.theme-orangea .bottom-nav, body.theme-orangea .reader-menu,
body.theme-orangea .bookmark-panel, body.theme-orangea .section-box,
body.theme-orangea .auto-scroll-btn, body.theme-orangea .speed-btn, body.theme-orangea .speed-btn.active,
body.theme-orangea .bookmark-btn, body.theme-orangea .bookmark-btn.second,
body.theme-orangea .chapter-item-btn, body.theme-orangea .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important;}
body.theme-orangea .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,180,100,0.3) 50%, rgba(255,160,60,0.15) 100%) !important;}
body.theme-orangea .progress-fill { background:linear-gradient(90deg, #ff8c42, #ffaa5a) !important; box-shadow:0 0 6px rgba(255,140,66,0.4) !important; }
body.theme-orangea .loading-spinner { border-color:rgba(255,140,66,0.2) !important; border-top-color:#ff8c42 !important; }
body.theme-orangea .toast { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important; border-color:rgba(255,160,60,0.3) !important; color:#3d1f0e !important; }
/* 橘黄暖阳 - 阅读页面UI */
body.theme-orangea .top-nav, body.theme-orangea .top-nav a { color:#3d1f0e !important; }
body.theme-orangea .top-nav .current { color:#b85c00 !important; font-weight:700; }
body.theme-orangea .top-nav .split { color:rgba(60,30,10,0.4) !important; }
body.theme-orangea #reader, body.theme-orangea #reader * { color:#3d1f0e !important; }
body.theme-orangea .reader-menu { background:rgba(255,240,220,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orangea .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orangea .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,180,100,0.3) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-orangea .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.4) 50%, rgba(255,140,30,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,100,30,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orangea .bookmark-btn, body.theme-orangea .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.35) 50%, rgba(255,140,30,0.2) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orangea .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,180,100,0.3) 100%) !important; color:#3d1f0e !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-orangea .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,160,60,0.4) 50%, rgba(255,140,30,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,100,30,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orangea .bookmark-panel { background:rgba(255,240,220,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-orangea .bm-header { color:#3d1f0e !important; }
body.theme-orangea .bm-item { background:rgba(255,220,180,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#3d1f0e !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-orangea .bm-item .book, body.theme-orangea .bm-item .chap, body.theme-orangea .bm-item .page { color:#5a3a1a !important; }
body.theme-orangea .canvas-container { background:rgba(255,180,100,0.12) !important; }
body.theme-orangea .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(245,230,210,0.95) 40%) !important; }
body.theme-orangea .progress-track { background:rgba(200,140,80,0.15) !important; }
body.theme-orangea .progress-text { color:rgba(60,30,10,0.7) !important; }
body.theme-orangea .chapter-indicator { color:#3d1f0e !important; }
body.theme-orangea .ebook-chapter { background:rgba(255,248,240,0.92) !important; color:#3d1f0e !important; }
body.theme-orangea .ebook-chapter .chapter-title { color:#b85c00 !important; }
body.theme-orangea .menu-title, body.theme-orangea .section-title { color:#3d1f0e !important; }
body.theme-orangea .back-btn { color:#3d1f0e !important; background:rgba(255,255,255,0.5) !important; }
body.theme-orangea .page-title { color:#3d1f0e !important; }
body.theme-orangea .shelf-item { color:#3d1f0e !important; }
body.theme-orangea h1, body.theme-orangea h3, body.theme-orangea h3 a { color:#3d1f0e !important; }
body.theme-orangea .item a { color:#3d1f0e !important; }
body.theme-orangea .book-chapter-item a { color:#3d1f0e !important; }

/* 翡翠宫廷 */
body.theme-emeraldd { background:#0d2b1d !important; color:#c9b06c !important; }
body.theme-emeraldd .top-nav, body.theme-emeraldd h1, body.theme-emeraldd h3,
body.theme-emeraldd .item, body.theme-emeraldd .bottom-nav, body.theme-emeraldd .reader-menu,
body.theme-emeraldd .bookmark-panel, body.theme-emeraldd .section-box,
body.theme-emeraldd .auto-scroll-btn, body.theme-emeraldd .speed-btn, body.theme-emeraldd .speed-btn.active,
body.theme-emeraldd .bookmark-btn, body.theme-emeraldd .bookmark-btn.second,
body.theme-emeraldd .chapter-item-btn, body.theme-emeraldd .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.5) 50%, rgba(30,150,100,0.3) 100%) !important;}
body.theme-emeraldd .book-chapter-item {background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.4) 50%, rgba(30,150,100,0.2) 100%) !important;}
body.theme-emeraldd .progress-fill { background:linear-gradient(90deg, #00b86b, #00d88b) !important; box-shadow:0 0 6px rgba(0,184,107,0.5) !important; }
body.theme-emeraldd .loading-spinner { border-color:rgba(0,184,107,0.2) !important; border-top-color:#00b86b !important; }
body.theme-emeraldd .toast { background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.5) 50%, rgba(30,150,100,0.3) 100%) !important; border-color:rgba(0,184,107,0.4) !important; color:#e8e0d0 !important; }
/* 翡翠宫廷 - 阅读页面UI */
body.theme-emeraldd .top-nav, body.theme-emeraldd .top-nav a { color:#3d1f0e !important; }
body.theme-emeraldd .top-nav .current { color:#ffd700 !important; font-weight:700; }
body.theme-emeraldd .top-nav .split { color:rgba(201,176,108,0.4) !important; }
body.theme-emeraldd #reader, body.theme-emeraldd #reader * { color:#e8e0d0 !important; }
body.theme-emeraldd .reader-menu { background:rgba(15,60,45,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .auto-scroll-btn { background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.5) 50%, rgba(30,150,100,0.3) 100%) !important; color:#e8e0d0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,184,107,0.3), inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .speed-btn { background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.4) 100%) !important; color:#e8e0d0 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .speed-btn.active { background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.6) 50%, rgba(30,150,100,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(0,184,107,0.5), inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .bookmark-btn, body.theme-emeraldd .bookmark-btn.second { background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.5) 50%, rgba(30,150,100,0.3) 100%) !important; color:#e8e0d0 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,184,107,0.3), inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .chapter-item-btn { background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.4) 100%) !important; color:#e8e0d0 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -1px 2px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .chapter-item-btn.active { background:linear-gradient(180deg, rgba(20,80,60,0.8) 0%, rgba(40,180,120,0.6) 50%, rgba(30,150,100,0.4) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(0,184,107,0.5), inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .bookmark-panel { background:rgba(15,60,45,0.9) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(0,184,107,0.3), inset 0 -2px 4px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .bm-header { color:#c9b06c !important; }
body.theme-emeraldd .bm-item { background:rgba(30,100,75,0.8) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#e8e0d0 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 3px rgba(0,184,107,0.3), inset 0 -1px 3px rgba(0,0,0,0.2) !important; }
body.theme-emeraldd .bm-item .book, body.theme-emeraldd .bm-item .chap, body.theme-emeraldd .bm-item .page { color:#ffd700 !important; }
body.theme-emeraldd .canvas-container { background:rgba(0,184,107,0.15) !important; }
body.theme-emeraldd .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(15,60,45,0.95) 40%) !important; }
body.theme-emeraldd .progress-track { background:rgba(0,184,107,0.2) !important; }
body.theme-emeraldd .progress-text { color:rgba(201,176,108,0.7) !important; }
body.theme-emeraldd .chapter-indicator { color:#e8e0d0 !important; }
body.theme-emeraldd .ebook-chapter { background:rgba(25,85,65,0.95) !important; color:#e8e0d0 !important; }
body.theme-emeraldd .ebook-chapter .chapter-title { color:#ffd700 !important; }
body.theme-emeraldd .menu-title, body.theme-emeraldd .section-title { color:#c9b06c !important; }
body.theme-emeraldd .back-btn { color:#c9b06c !important; background:rgba(20,80,60,0.8) !important; }
body.theme-emeraldd .page-title { color:#c9b06c !important; }
body.theme-emeraldd .shelf-item { color:#c9b06c !important; }
body.theme-emeraldd h1, body.theme-emeraldd h3, body.theme-emeraldd h3 a { color:#c9b06c !important; }
body.theme-emeraldd .item a { color:#c9b06c !important; }
body.theme-emeraldd .book-chapter-item a { color:#c9b06c !important; }

/* 森系童话 */
body.theme-forest { background:#e8f5e9 !important; color:#2d4a35 !important; }
body.theme-forest .top-nav, body.theme-forest h1, body.theme-forest h3,
body.theme-forest .item, body.theme-forest .bottom-nav, body.theme-forest .reader-menu,
body.theme-forest .bookmark-panel, body.theme-forest .section-box,
body.theme-forest .auto-scroll-btn, body.theme-forest .speed-btn, body.theme-forest .speed-btn.active,
body.theme-forest .bookmark-btn, body.theme-forest .bookmark-btn.second,
body.theme-forest .chapter-item-btn, body.theme-forest .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(160,230,180,0.4) 50%, rgba(120,210,150,0.2) 100%) !important;}
body.theme-forest .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(160,230,180,0.3) 50%, rgba(120,210,150,0.15) 100%) !important;}
body.theme-forest .progress-fill { background:linear-gradient(90deg, #66bb6a, #81c784) !important; box-shadow:0 0 6px rgba(102,187,106,0.4) !important; }
body.theme-forest .loading-spinner { border-color:rgba(102,187,106,0.2) !important; border-top-color:#66bb6a !important; }
body.theme-forest .toast { background:linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(160,230,180,0.4) 50%, rgba(120,210,150,0.2) 100%) !important; border-color:rgba(120,210,150,0.3) !important; color:#2d4a35 !important; }
/* 森系童话 - 阅读页面UI */
body.theme-forest .top-nav, body.theme-forest .top-nav a { color:#3d1f0e !important; }
body.theme-forest .top-nav .current { color:#4caf50 !important; font-weight:700; }
body.theme-forest .top-nav .split { color:rgba(45,74,53,0.4) !important; }
body.theme-forest #reader, body.theme-forest #reader * { color:#2d4a35 !important; }
body.theme-forest .reader-menu { background:rgba(230,250,235,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forest .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(160,230,180,0.4) 50%, rgba(120,210,150,0.2) 100%) !important; color:#2d4a35 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forest .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(160,230,180,0.3) 100%) !important; color:#2d4a35 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-forest .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(160,230,180,0.5) 50%, rgba(120,210,150,0.3) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(102,187,106,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forest .bookmark-btn, body.theme-forest .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(160,230,180,0.4) 50%, rgba(120,210,150,0.2) 100%) !important; color:#2d4a35 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forest .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(160,230,180,0.3) 100%) !important; color:#2d4a35 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-forest .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(160,230,180,0.5) 50%, rgba(120,210,150,0.3) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(102,187,106,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forest .bookmark-panel { background:rgba(230,250,235,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forest .bm-header { color:#2d4a35 !important; }
body.theme-forest .bm-item { background:rgba(200,240,210,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#2d4a35 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-forest .bm-item .book, body.theme-forest .bm-item .chap, body.theme-forest .bm-item .page { color:#4caf50 !important; }
body.theme-forest .canvas-container { background:rgba(102,187,106,0.12) !important; }
body.theme-forest .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(230,250,235,0.95) 40%) !important; }
body.theme-forest .progress-track { background:rgba(102,187,106,0.15) !important; }
body.theme-forest .progress-text { color:rgba(45,74,53,0.7) !important; }
body.theme-forest .chapter-indicator { color:#2d4a35 !important; }
body.theme-forest .ebook-chapter { background:rgba(240,255,245,0.92) !important; color:#2d4a35 !important; }
body.theme-forest .ebook-chapter .chapter-title { color:#4caf50 !important; }
body.theme-forest .menu-title, body.theme-forest .section-title { color:#2d4a35 !important; }
body.theme-forest .back-btn { color:#2d4a35 !important; background:rgba(255,255,255,0.5) !important; }
body.theme-forest .page-title { color:#2d4a35 !important; }
body.theme-forest .shelf-item { color:#2d4a35 !important; }
body.theme-forest h1, body.theme-forest h3, body.theme-forest h3 a { color:#2d4a35 !important; }
body.theme-forest .item a { color:#2d4a35 !important; }
body.theme-forest .book-chapter-item a { color:#2d4a35 !important; }

/* 暗夜紫晶 */
body.theme-purplee { background:#1a1428 !important; color:#e8e0ff !important; }
body.theme-purplee .top-nav, body.theme-purplee h1, body.theme-purplee h3,
body.theme-purplee .item, body.theme-purplee .bottom-nav, body.theme-purplee .reader-menu,
body.theme-purplee .bookmark-panel, body.theme-purplee .section-box,
body.theme-purplee .auto-scroll-btn, body.theme-purplee .speed-btn, body.theme-purplee .speed-btn.active,
body.theme-purplee .bookmark-btn, body.theme-purplee .bookmark-btn.second,
body.theme-purplee .chapter-item-btn, body.theme-purplee .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(160,110,255,0.35) 50%, rgba(120,80,200,0.2) 100%) !important;}
body.theme-purplee .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(140,100,220,0.3) 50%, rgba(100,70,180,0.15) 100%) !important;}
body.theme-purplee .progress-fill { background:linear-gradient(90deg, #9c6aff, #c09dff) !important; box-shadow:0 0 6px rgba(156,106,255,0.4) !important; }
body.theme-purplee .loading-spinner { border-color:rgba(156,106,255,0.2) !important; border-top-color:#9c6aff !important; }
body.theme-purplee .toast { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(160,110,255,0.35) 50%, rgba(120,80,200,0.2) 100%) !important; border-color:rgba(160,110,255,0.3) !important; color:#f0e8ff !important; }
/* 暗夜紫晶 - 阅读页面UI */
body.theme-purplee .top-nav, body.theme-purplee .top-nav a { color:#3d1f0e !important; }
body.theme-purplee .top-nav .current { color:#b886ff !important; font-weight:700; }
body.theme-purplee .top-nav .split { color:rgba(240,230,255,0.4) !important; }
body.theme-purplee #reader, body.theme-purplee #reader * { color:#f0e8ff !important; }
body.theme-purplee .reader-menu { background:rgba(40,30,65,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purplee .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(160,110,255,0.35) 50%, rgba(120,80,200,0.2) 100%) !important; color:#f0e8ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purplee .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(140,100,220,0.3) 100%) !important; color:#f0e8ff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-purplee .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(160,110,255,0.4) 50%, rgba(120,80,200,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(156,106,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purplee .bookmark-btn, body.theme-purplee .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(160,110,255,0.35) 50%, rgba(120,80,200,0.2) 100%) !important; color:#f0e8ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purplee .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(140,100,220,0.3) 100%) !important; color:#f0e8ff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-purplee .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(160,110,255,0.4) 50%, rgba(120,80,200,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(156,106,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purplee .bookmark-panel { background:rgba(40,30,65,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-purplee .bm-header { color:#f0e8ff !important; }
body.theme-purplee .bm-item { background:rgba(80,60,130,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#f0e8ff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-purplee .bm-item .book, body.theme-purplee .bm-item .chap, body.theme-purplee .bm-item .page { color:#d4c2ff !important; }
body.theme-purplee .canvas-container { background:rgba(156,106,255,0.12) !important; }
body.theme-purplee .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(40,30,65,0.95) 40%) !important; }
body.theme-purplee .progress-track { background:rgba(156,106,255,0.15) !important; }
body.theme-purplee .progress-text { color:rgba(240,230,255,0.7) !important; }
body.theme-purplee .chapter-indicator { color:#f0e8ff !important; }
body.theme-purplee .ebook-chapter { background:rgba(30,20,50,0.92) !important; color:#f0e8ff !important; }
body.theme-purplee .ebook-chapter .chapter-title { color:#b886ff !important; }
body.theme-purplee .menu-title, body.theme-purplee .section-title { color:#f0e8ff !important; }
body.theme-purplee .back-btn { color:#f0e8ff !important; background:rgba(255,255,255,0.1) !important; }
body.theme-purplee .page-title { color:#f0e8ff !important; }
body.theme-purplee .shelf-item { color:#f0e8ff !important; }
body.theme-purplee h1, body.theme-purplee h3, body.theme-purplee h3 a { color:#f0e8ff !important; }
body.theme-purplee .item a { color:#f0e8ff !important; }
body.theme-purplee .book-chapter-item a { color:#f0e8ff !important; }

/* 深海幽蓝 */
body.theme-ocean { background:#0f1c32 !important; color:#d0e8ff !important; }
body.theme-ocean .top-nav, body.theme-ocean h1, body.theme-ocean h3,
body.theme-ocean .item, body.theme-ocean .bottom-nav, body.theme-ocean .reader-menu,
body.theme-ocean .bookmark-panel, body.theme-ocean .section-box,
body.theme-ocean .auto-scroll-btn, body.theme-ocean .speed-btn, body.theme-ocean .speed-btn.active,
body.theme-ocean .bookmark-btn, body.theme-ocean .bookmark-btn.second,
body.theme-ocean .chapter-item-btn, body.theme-ocean .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(80,160,255,0.35) 50%, rgba(50,120,200,0.2) 100%) !important;}
body.theme-ocean .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(70,140,230,0.3) 50%, rgba(40,100,180,0.15) 100%) !important;}
body.theme-ocean .progress-fill { background:linear-gradient(90deg, #42a5ff, #7fc4ff) !important; box-shadow:0 0 6px rgba(66,165,255,0.4) !important; }
body.theme-ocean .loading-spinner { border-color:rgba(66,165,255,0.2) !important; border-top-color:#42a5ff !important; }
body.theme-ocean .toast { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(80,160,255,0.35) 50%, rgba(50,120,200,0.2) 100%) !important; border-color:rgba(80,160,255,0.3) !important; color:#e0f0ff !important; }
/* 深海幽蓝 - 阅读页面UI */
body.theme-ocean .top-nav, body.theme-ocean .top-nav a { color:#3d1f0e !important; }
body.theme-ocean .top-nav .current { color:#64b5ff !important; font-weight:700; }
body.theme-ocean .top-nav .split { color:rgba(220,240,255,0.4) !important; }
body.theme-ocean #reader, body.theme-ocean #reader * { color:#e0f0ff !important; }
body.theme-ocean .reader-menu { background:rgba(20,40,75,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-ocean .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(80,160,255,0.35) 50%, rgba(50,120,200,0.2) 100%) !important; color:#e0f0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-ocean .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(70,140,230,0.3) 100%) !important; color:#e0f0ff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-ocean .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(80,160,255,0.4) 50%, rgba(50,120,200,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(66,165,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-ocean .bookmark-btn, body.theme-ocean .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(80,160,255,0.35) 50%, rgba(50,120,200,0.2) 100%) !important; color:#e0f0ff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-ocean .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(70,140,230,0.3) 100%) !important; color:#e0f0ff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-ocean .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(80,160,255,0.4) 50%, rgba(50,120,200,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(66,165,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-ocean .bookmark-panel { background:rgba(20,40,75,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-ocean .bm-header { color:#e0f0ff !important; }
body.theme-ocean .bm-item { background:rgba(40,80,140,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#e0f0ff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-ocean .bm-item .book, body.theme-ocean .bm-item .chap, body.theme-ocean .bm-item .page { color:#b8d8ff !important; }
body.theme-ocean .canvas-container { background:rgba(66,165,255,0.12) !important; }
body.theme-ocean .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(20,40,75,0.95) 40%) !important; }
body.theme-ocean .progress-track { background:rgba(66,165,255,0.15) !important; }
body.theme-ocean .progress-text { color:rgba(220,240,255,0.7) !important; }
body.theme-ocean .chapter-indicator { color:#e0f0ff !important; }
body.theme-ocean .ebook-chapter { background:rgba(15,30,55,0.92) !important; color:#e0f0ff !important; }
body.theme-ocean .ebook-chapter .chapter-title { color:#64b5ff !important; }
body.theme-ocean .menu-title, body.theme-ocean .section-title { color:#e0f0ff !important; }
body.theme-ocean .back-btn { color:#e0f0ff !important; background:rgba(255,255,255,0.08) !important; }
body.theme-ocean .page-title { color:#e0f0ff !important; }
body.theme-ocean .shelf-item { color:#e0f0ff !important; }
body.theme-ocean h1, body.theme-ocean h3, body.theme-ocean h3 a { color:#e0f0ff !important; }
body.theme-ocean .item a { color:#e0f0ff !important; }
body.theme-ocean .book-chapter-item a { color:#e0f0ff !important; }

/* 极光幻彩 */
body.theme-aurora { background:#121a2f !important; color:#f0f8ff !important; }
body.theme-aurora .top-nav, body.theme-aurora h1, body.theme-aurora h3,
body.theme-aurora .item, body.theme-aurora .bottom-nav, body.theme-aurora .reader-menu,
body.theme-aurora .bookmark-panel, body.theme-aurora .section-box,
body.theme-aurora .auto-scroll-btn, body.theme-aurora .speed-btn, body.theme-aurora .speed-btn.active,
body.theme-aurora .bookmark-btn, body.theme-aurora .bookmark-btn.second,
body.theme-aurora .chapter-item-btn, body.theme-aurora .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(120,220,255,0.35) 50%, rgba(80,180,220,0.2) 100%) !important;}
body.theme-aurora .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(100,200,235,0.3) 50%, rgba(70,160,200,0.15) 100%) !important;}
body.theme-aurora .progress-fill { background:linear-gradient(90deg, #64e8ff, #a8f0ff) !important; box-shadow:0 0 6px rgba(100,232,255,0.4) !important; }
body.theme-aurora .loading-spinner { border-color:rgba(100,232,255,0.2) !important; border-top-color:#64e8ff !important; }
body.theme-aurora .toast { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(120,220,255,0.35) 50%, rgba(80,180,220,0.2) 100%) !important; border-color:rgba(120,220,255,0.3) !important; color:#f8ffff !important; }
/* 极光幻彩 - 阅读页面UI */
body.theme-aurora .top-nav, body.theme-aurora .top-nav a { color:#3d1f0e !important; }
body.theme-aurora .top-nav .current { color:#86f2ff !important; font-weight:700; }
body.theme-aurora .top-nav .split { color:rgba(240,255,255,0.4) !important; }
body.theme-aurora #reader, body.theme-aurora #reader * { color:#f8ffff !important; }
body.theme-aurora .reader-menu { background:rgba(25,40,75,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-aurora .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(120,220,255,0.35) 50%, rgba(80,180,220,0.2) 100%) !important; color:#f8ffff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-aurora .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(100,200,235,0.3) 100%) !important; color:#f8ffff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-aurora .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(120,220,255,0.4) 50%, rgba(80,180,220,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(100,232,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-aurora .bookmark-btn, body.theme-aurora .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(120,220,255,0.35) 50%, rgba(80,180,220,0.2) 100%) !important; color:#f8ffff !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-aurora .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(100,200,235,0.3) 100%) !important; color:#f8ffff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-aurora .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(120,220,255,0.4) 50%, rgba(80,180,220,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(100,232,255,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-aurora .bookmark-panel { background:rgba(25,40,75,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-aurora .bm-header { color:#f8ffff !important; }
body.theme-aurora .bm-item { background:rgba(50,90,140,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#f8ffff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-aurora .bm-item .book, body.theme-aurora .bm-item .chap, body.theme-aurora .bm-item .page { color:#c8f8ff !important; }
body.theme-aurora .canvas-container { background:rgba(100,232,255,0.12) !important; }
body.theme-aurora .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(25,40,75,0.95) 40%) !important; }
body.theme-aurora .progress-track { background:rgba(100,232,255,0.15) !important; }
body.theme-aurora .progress-text { color:rgba(240,255,255,0.7) !important; }
body.theme-aurora .chapter-indicator { color:#f8ffff !important; }
body.theme-aurora .ebook-chapter { background:rgba(18,26,47,0.92) !important; color:#f8ffff !important; }
body.theme-aurora .ebook-chapter .chapter-title { color:#86f2ff !important; }
body.theme-aurora .menu-title, body.theme-aurora .section-title { color:#f8ffff !important; }
body.theme-aurora .back-btn { color:#f8ffff !important; background:rgba(255,255,255,0.1) !important; }
body.theme-aurora .page-title { color:#f8ffff !important; }
body.theme-aurora .shelf-item { color:#f8ffff !important; }
body.theme-aurora h1, body.theme-aurora h3, body.theme-aurora h3 a { color:#f8ffff !important; }
body.theme-aurora .item a { color:#f8ffff !important; }
body.theme-aurora .book-chapter-item a { color:#f8ffff !important; }

/* 黑曜鎏金 */
body.theme-blackgold { background:#101010 !important; color:#f8e8c8 !important; }
body.theme-blackgold .top-nav, body.theme-blackgold h1, body.theme-blackgold h3,
body.theme-blackgold .item, body.theme-blackgold .bottom-nav, body.theme-blackgold .reader-menu,
body.theme-blackgold .bookmark-panel, body.theme-blackgold .section-box,
body.theme-blackgold .auto-scroll-btn, body.theme-blackgold .speed-btn, body.theme-blackgold .speed-btn.active,
body.theme-blackgold .bookmark-btn, body.theme-blackgold .bookmark-btn.second,
body.theme-blackgold .chapter-item-btn, body.theme-blackgold .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,200,80,0.35) 50%, rgba(220,160,40,0.2) 100%) !important;}
body.theme-blackgold .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(240,180,70,0.3) 50%, rgba(200,140,30,0.15) 100%) !important;}
body.theme-blackgold .progress-fill { background:linear-gradient(90deg, #e6b850, #ffd070) !important; box-shadow:0 0 6px rgba(230,184,80,0.4) !important; }
body.theme-blackgold .loading-spinner { border-color:rgba(230,184,80,0.2) !important; border-top-color:#e6b850 !important; }
body.theme-blackgold .toast { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,200,80,0.35) 50%, rgba(220,160,40,0.2) 100%) !important; border-color:rgba(255,200,80,0.3) !important; color:#f8e8c8 !important; }
/* 黑曜鎏金 - 阅读页面UI */
body.theme-blackgold .top-nav, body.theme-blackgold .top-nav a { color:#3d1f0e !important; }
body.theme-blackgold .top-nav .current { color:#ffc864 !important; font-weight:700; }
body.theme-blackgold .top-nav .split { color:rgba(248,232,200,0.4) !important; }
body.theme-blackgold #reader, body.theme-blackgold #reader * { color:#f8e8c8 !important; }
body.theme-blackgold .reader-menu { background:rgba(30,30,30,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blackgold .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,200,80,0.35) 50%, rgba(220,160,40,0.2) 100%) !important; color:#f8e8c8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blackgold .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(240,180,70,0.3) 100%) !important; color:#f8e8c8 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-blackgold .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,200,80,0.4) 50%, rgba(220,160,40,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(230,184,80,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blackgold .bookmark-btn, body.theme-blackgold .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,200,80,0.35) 50%, rgba(220,160,40,0.2) 100%) !important; color:#f8e8c8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blackgold .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(240,180,70,0.3) 100%) !important; color:#f8e8c8 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-blackgold .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,200,80,0.4) 50%, rgba(220,160,40,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(230,184,80,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blackgold .bookmark-panel { background:rgba(30,30,30,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-blackgold .bm-header { color:#f8e8c8 !important; }
body.theme-blackgold .bm-item { background:rgba(60,50,30,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#f8e8c8 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-blackgold .bm-item .book, body.theme-blackgold .bm-item .chap, body.theme-blackgold .bm-item .page { color:#f0d8a8 !important; }
body.theme-blackgold .canvas-container { background:rgba(230,184,80,0.12) !important; }
body.theme-blackgold .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(30,30,30,0.95) 40%) !important; }
body.theme-blackgold .progress-track { background:rgba(230,184,80,0.15) !important; }
body.theme-blackgold .progress-text { color:rgba(248,232,200,0.7) !important; }
body.theme-blackgold .chapter-indicator { color:#f8e8c8 !important; }
body.theme-blackgold .ebook-chapter { background:rgba(16,16,16,0.92) !important; color:#f8e8c8 !important; }
body.theme-blackgold .ebook-chapter .chapter-title { color:#ffc864 !important; }
body.theme-blackgold .menu-title, body.theme-blackgold .section-title { color:#f8e8c8 !important; }
body.theme-blackgold .back-btn { color:#f8e8c8 !important; background:rgba(255,255,255,0.05) !important; }
body.theme-blackgold .page-title { color:#f8e8c8 !important; }
body.theme-blackgold .shelf-item { color:#f8e8c8 !important; }
body.theme-blackgold h1, body.theme-blackgold h3, body.theme-blackgold h3 a { color:#f8e8c8 !important; }
body.theme-blackgold .item a { color:#f8e8c8 !important; }
body.theme-blackgold .book-chapter-item a { color:#f8e8c8 !important; }

/* 星夜绯红 */
body.theme-crimsonn { background:#1c0f1c !important; color:#ffe0f0 !important; }
body.theme-crimsonn .top-nav, body.theme-crimsonn h1, body.theme-crimsonn h3,
body.theme-crimsonn .item, body.theme-crimsonn .bottom-nav, body.theme-crimsonn .reader-menu,
body.theme-crimsonn .bookmark-panel, body.theme-crimsonn .section-box,
body.theme-crimsonn .auto-scroll-btn, body.theme-crimsonn .speed-btn, body.theme-crimsonn .speed-btn.active,
body.theme-crimsonn .bookmark-btn, body.theme-crimsonn .bookmark-btn.second,
body.theme-crimsonn .chapter-item-btn, body.theme-crimsonn .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,90,140,0.35) 50%, rgba(220,60,110,0.2) 100%) !important;}
body.theme-crimsonn .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(240,80,130,0.3) 50%, rgba(200,50,100,0.15) 100%) !important;}
body.theme-crimsonn .progress-fill { background:linear-gradient(90deg, #ff5a8c, #ff8cb0) !important; box-shadow:0 0 6px rgba(255,90,140,0.4) !important; }
body.theme-crimsonn .loading-spinner { border-color:rgba(255,90,140,0.2) !important; border-top-color:#ff5a8c !important; }
body.theme-crimsonn .toast { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,90,140,0.35) 50%, rgba(220,60,110,0.2) 100%) !important; border-color:rgba(255,90,140,0.3) !important; color:#ffe8f4 !important; }
/* 星夜绯红 - 阅读页面UI */
body.theme-crimsonn .top-nav, body.theme-crimsonn .top-nav a { color:#3d1f0e !important; }
body.theme-crimsonn .top-nav .current { color:#ff86a8 !important; font-weight:700; }
body.theme-crimsonn .top-nav .split { color:rgba(255,232,244,0.4) !important; }
body.theme-crimsonn #reader, body.theme-crimsonn #reader * { color:#ffe8f4 !important; }
body.theme-crimsonn .reader-menu { background:rgba(50,25,50,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimsonn .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,90,140,0.35) 50%, rgba(220,60,110,0.2) 100%) !important; color:#ffe8f4 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimsonn .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(240,80,130,0.3) 100%) !important; color:#ffe8f4 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-crimsonn .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,90,140,0.4) 50%, rgba(220,60,110,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(255,90,140,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimsonn .bookmark-btn, body.theme-crimsonn .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,90,140,0.35) 50%, rgba(220,60,110,0.2) 100%) !important; color:#ffe8f4 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimsonn .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(240,80,130,0.3) 100%) !important; color:#ffe8f4 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-crimsonn .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,90,140,0.4) 50%, rgba(220,60,110,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(255,90,140,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimsonn .bookmark-panel { background:rgba(50,25,50,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-crimsonn .bm-header { color:#ffe8f4 !important; }
body.theme-crimsonn .bm-item { background:rgba(100,50,80,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#ffe8f4 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-crimsonn .bm-item .book, body.theme-crimsonn .bm-item .chap, body.theme-crimsonn .bm-item .page { color:#f8d0e4 !important; }
body.theme-crimsonn .canvas-container { background:rgba(255,90,140,0.12) !important; }
body.theme-crimsonn .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(50,25,50,0.95) 40%) !important; }
body.theme-crimsonn .progress-track { background:rgba(255,90,140,0.15) !important; }
body.theme-crimsonn .progress-text { color:rgba(255,232,244,0.7) !important; }
body.theme-crimsonn .chapter-indicator { color:#ffe8f4 !important; }
body.theme-crimsonn .ebook-chapter { background:rgba(28,15,28,0.92) !important; color:#ffe8f4 !important; }
body.theme-crimsonn .ebook-chapter .chapter-title { color:#ff86a8 !important; }
body.theme-crimsonn .menu-title, body.theme-crimsonn .section-title { color:#ffe8f4 !important; }
body.theme-crimsonn .back-btn { color:#ffe8f4 !important; background:rgba(255,255,255,0.06) !important; }
body.theme-crimsonn .page-title { color:#ffe8f4 !important; }
body.theme-crimsonn .shelf-item { color:#ffe8f4 !important; }
body.theme-crimsonn h1, body.theme-crimsonn h3, body.theme-crimsonn h3 a { color:#ffe8f4 !important; }
body.theme-crimsonn .item a { color:#ffe8f4 !important; }
body.theme-crimsonn .book-chapter-item a { color:#ffe8f4 !important; }

/* 幽林雾影 */
body.theme-forestfog { background:#121f18 !important; color:#e0f8e8 !important; }
body.theme-forestfog .top-nav, body.theme-forestfog h1, body.theme-forestfog h3,
body.theme-forestfog .item, body.theme-forestfog .bottom-nav, body.theme-forestfog .reader-menu,
body.theme-forestfog .bookmark-panel, body.theme-forestfog .section-box,
body.theme-forestfog .auto-scroll-btn, body.theme-forestfog .speed-btn, body.theme-forestfog .speed-btn.active,
body.theme-forestfog .bookmark-btn, body.theme-forestfog .bookmark-btn.second,
body.theme-forestfog .chapter-item-btn, body.theme-forestfog .chapter-item-btn.active {background-image:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(100,220,140,0.35) 50%, rgba(70,180,110,0.2) 100%) !important;}
body.theme-forestfog .book-chapter-item {background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(90,200,130,0.3) 50%, rgba(60,160,100,0.15) 100%) !important;}
body.theme-forestfog .progress-fill { background:linear-gradient(90deg, #50d888, #80e8b0) !important; box-shadow:0 0 6px rgba(80,216,136,0.4) !important; }
body.theme-forestfog .loading-spinner { border-color:rgba(80,216,136,0.2) !important; border-top-color:#50d888 !important; }
body.theme-forestfog .toast { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(100,220,140,0.35) 50%, rgba(70,180,110,0.2) 100%) !important; border-color:rgba(100,220,140,0.3) !important; color:#e8ffe8 !important; }
/* 幽林雾影 - 阅读页面UI */
body.theme-forestfog .top-nav, body.theme-forestfog .top-nav a { color:#3d1f0e !important; }
body.theme-forestfog .top-nav .current { color:#68e8a0 !important; font-weight:700; }
body.theme-forestfog .top-nav .split { color:rgba(232,255,232,0.4) !important; }
body.theme-forestfog #reader, body.theme-forestfog #reader * { color:#e8ffe8 !important; }
body.theme-forestfog .reader-menu { background:rgba(25,45,35,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forestfog .auto-scroll-btn { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(100,220,140,0.35) 50%, rgba(70,180,110,0.2) 100%) !important; color:#e8ffe8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forestfog .speed-btn { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(90,200,130,0.3) 100%) !important; color:#e8ffe8 !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-forestfog .speed-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(100,220,140,0.4) 50%, rgba(70,180,110,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(8px) !important; -webkit-backdrop-filter:blur(8px) !important; box-shadow: 0 4px 16px rgba(80,216,136,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forestfog .bookmark-btn, body.theme-forestfog .bookmark-btn.second { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(100,220,140,0.35) 50%, rgba(70,180,110,0.2) 100%) !important; color:#e8ffe8 !important; backdrop-filter:blur(12px) !important; -webkit-backdrop-filter:blur(12px) !important; box-shadow: 0 4px 16px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forestfog .chapter-item-btn { background:linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(90,200,130,0.3) 100%) !important; color:#e8ffe8 !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.04) !important; }
body.theme-forestfog .chapter-item-btn.active { background:linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(100,220,140,0.4) 50%, rgba(70,180,110,0.25) 100%) !important; color:#fff !important; backdrop-filter:blur(6px) !important; -webkit-backdrop-filter:blur(6px) !important; box-shadow: 0 4px 16px rgba(80,216,136,0.2), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forestfog .bookmark-panel { background:rgba(25,45,35,0.85) !important; backdrop-filter:blur(20px) !important; -webkit-backdrop-filter:blur(20px) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.06) !important; }
body.theme-forestfog .bm-header { color:#e8ffe8 !important; }
body.theme-forestfog .bm-item { background:rgba(50,90,70,0.6) !important; backdrop-filter:blur(10px) !important; -webkit-backdrop-filter:blur(10px) !important; color:#e8ffe8 !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 3px rgba(255,255,255,0.5), inset 0 -1px 3px rgba(0,0,0,0.04) !important; }
body.theme-forestfog .bm-item .book, body.theme-forestfog .bm-item .chap, body.theme-forestfog .bm-item .page { color:#c8f8d8 !important; }
body.theme-forestfog .canvas-container { background:rgba(80,216,136,0.12) !important; }
body.theme-forestfog .progress-bar-wrap { background:linear-gradient(180deg, transparent, rgba(25,45,35,0.95) 40%) !important; }
body.theme-forestfog .progress-track { background:rgba(80,216,136,0.15) !important; }
body.theme-forestfog .progress-text { color:rgba(232,255,232,0.7) !important; }
body.theme-forestfog .chapter-indicator { color:#e8ffe8 !important; }
body.theme-forestfog .ebook-chapter { background:rgba(18,31,24,0.92) !important; color:#e8ffe8 !important; }
body.theme-forestfog .ebook-chapter .chapter-title { color:#68e8a0 !important; }
body.theme-forestfog .menu-title, body.theme-forestfog .section-title { color:#e8ffe8 !important; }
body.theme-forestfog .back-btn { color:#e8ffe8 !important; background:rgba(255,255,255,0.08) !important; }
body.theme-forestfog .page-title { color:#e8ffe8 !important; }
body.theme-forestfog .shelf-item { color:#e8ffe8 !important; }
body.theme-forestfog h1, body.theme-forestfog h3, body.theme-forestfog h3 a { color:#e8ffe8 !important; }
body.theme-forestfog .item a { color:#e8ffe8 !important; }
body.theme-forestfog .book-chapter-item a { color:#e8ffe8 !important; }
</style>
</head>
<body>
<script>document.body.className='theme-'+(localStorage.getItem('reader_theme')||'orange');</script>
<?php if ($isChapterPage): ?>
<div class="top-nav">
    <a href="<?=$currentFile?>">🏠 首页</a>
    <a href="<?=$currentFile?>?book=<?=rawurlencode($book)?>"><?=htmlspecialchars(mb_substr($book,0,14))?></a>
    <span class="split">/</span>
    <span class="current"><?=htmlspecialchars(mb_substr($chapterTitle,0,16))?></span>
    <button id="themeBtn" style="cursor:pointer;background:none;border:none;font-size:20px;margin-left:auto;">🎨</button>
</div>
<div class="toast" id="toast"></div>
<div class="loading-overlay" id="loadingOverlay" style="display:none">
    <div class="loading-spinner"></div>
</div>
<div class="mask" id="mask"></div>
<div class="reader-menu" id="menu">
    <div class="menu-title">
    阅读控制
    <span class="bm-close" id="closeMenuBtn" style="float:right;cursor:pointer;font-size:20px;">✕</span>
</div>
    <div class="section-box">
        <div class="section-title">⚙️ 自动阅读</div>
        <button class="auto-scroll-btn" id="toggleScroll">▶️ 开始自动阅读</button>
        <div class="speed-row">
            <button class="speed-btn" data-speed="1.5">🐢 慢</button>
            <button class="speed-btn active" data-speed="3">⚡ 中</button>
            <button class="speed-btn" data-speed="8">💨 快</button>
        </div>
    </div>
    <div class="section-box">
        <div class="section-title">📌 书签功能</div>
        <button class="bookmark-btn" id="addBookmarkBtn">
            <span>🔖</span> 添加当前页书签
        </button>
        <button class="bookmark-btn second" id="openBookmarkBtn">
            <span>📋</span> 查看我的书签
        </button>
    </div>
    <div class="section-box">
        <div class="section-title">📖 章节目录</div>
        <div class="chapter-grid" id="chapterGrid"></div>
    </div>
</div>
<div class="bookmark-panel" id="bookmarkPanel">
    <div class="bm-header">
        <span>📋 我的书签</span>
        <span class="bm-close" id="closeBmPanel">✕</span>
    </div>
    <div id="bookmarkList" style="padding-top:4px;">
        <div style="color:#aaa;text-align:center;padding:20px;">暂无书签</div>
    </div>
</div>
<div id="reader"></div>
<div class="progress-bar-wrap" id="progressBar" style="display:none">
    <div class="progress-track">
        <div class="progress-fill" id="progressFill"></div>
    </div>
    <span class="progress-text" id="progressText">0 / 0</span>
</div>
<script>
const mask = document.getElementById('mask');
const menu = document.getElementById('menu');
const toast = document.getElementById('toast');
const bookmarkPanel = document.getElementById('bookmarkPanel');
const bookmarkList = document.getElementById('bookmarkList');
let menuOpen = false;

// 手势返回：第一次回章节目录，第二次回主页
(function() {
    let chapterUrl = "<?=$currentFile?>?book=<?=rawurlencode($book)?>";
    <?php if($isEpub): ?>
    chapterUrl += "&chapter=<?=rawurlencode($chapter)?>";
    <?php endif; ?>
    let homeUrl = "<?=$currentFile?>";
    if (location.href.indexOf('&chapter=') > -1 || location.href.indexOf('&chap=') > -1) {
        history.replaceState(null, '', location.href);
        history.pushState(null, '', chapterUrl);
        history.pushState(null, '', homeUrl);
    }
    window.addEventListener('popstate', function(e) {
        // 已经到首页就不再跳
        if (location.href.indexOf('?book=') === -1 && location.href.indexOf('&chapter=') === -1) return;
        history.back();
    });
})();
let lastTap = 0;
let savedPage = 1;
document.getElementById('reader').addEventListener('click', e => {
    e.stopPropagation();
    const now = Date.now();
    const delta = now - lastTap;
    lastTap = now;
    if (delta > 0 && delta < 300) {
        savedPage = getCurrentPage();
        menuOpen = !menuOpen;
        menu.classList.toggle('show', menuOpen);
        mask.classList.toggle('show', menuOpen);
        if (!menuOpen) closeMenu();
    }
});

let speed = 6;
const speedBtns = document.querySelectorAll('.speed-btn');
speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        speed = Number(btn.dataset.speed);
        if (isPlaying) {
            clearInterval(scrollTimer);
            scrollTimer = setInterval(() => { window.scrollBy(0, speed); updateProgressBar(); }, 30);
        }
    });
});

const BM_KEY = "bookmarks_v6";
const CURRENT_BOOK = <?=json_encode($book, JSON_UNESCAPED_UNICODE) ?>;
const CURRENT_CHAPTER = <?=json_encode($chapter, JSON_UNESCAPED_UNICODE) ?>;
const CURRENT_CHAPTER_TITLE = <?=json_encode($chapterTitle, JSON_UNESCAPED_UNICODE) ?>;
const CURRENT_CHAP = <?=$chap?>;
const IS_EPUB = <?=$isEpub ? 'true' : 'false'?>;

function getBookmarks() {
    try { return JSON.parse(localStorage.getItem(BM_KEY) || "[]"); } 
    catch (e) { return []; }
}
function saveBookmarks(list) {
    localStorage.setItem(BM_KEY, JSON.stringify(list));
}
function showToast(msg) {
    closeMenu();
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}
function getCurrentPage() {
    let els = document.querySelectorAll("#reader > img, #reader > canvas");
    let best = 1;
    let maxVisible = 0;
    let vh = window.innerHeight;
    els.forEach((el, i) => {
        let r = el.getBoundingClientRect();
        let visibleTop = Math.max(r.top, 0);
        let visibleBottom = Math.min(r.bottom, vh);
        let visibleHeight = Math.max(0, visibleBottom - visibleTop);
        if (visibleHeight > maxVisible) {
            maxVisible = visibleHeight;
            best = i + 1;
        }
    });
    return best;
}
function updateProgressBar() {
    let wrap = document.getElementById('progressBar');
    let fill = document.getElementById('progressFill');
    let text = document.getElementById('progressText');
    if (!wrap || !fill || !text) return;
    let total = 0;
    <?php if(!$isPdf): ?>
    total = allImages.length;
    <?php else: ?>
    total = pdfDoc ? pdfDoc.numPages : 0;
    <?php endif; ?>
    if (total > 0) {
        wrap.style.display = 'flex';
        <?php if(!$isPdf): ?>
        // 用已加载图片数量计算进度
        let loaded = document.querySelectorAll('#reader > img').length;
        let current = Math.min(total, Math.max(1, loaded));
        let pct = Math.min(100, (loaded / total) * 100);
        <?php else: ?>
        // PDF 用已渲染 canvas 数量
        let loaded = renderedPages.size;
        let current = Math.min(total, Math.max(1, loaded));
        let pct = Math.min(100, (loaded / total) * 100);
        <?php endif; ?>
        fill.style.width = pct + '%';
        text.textContent = current + ' / ' + total;
    }
}

document.getElementById("addBookmarkBtn").onclick = () => {
    let list = getBookmarks();
    let idx = list.findIndex(b => b.book === CURRENT_BOOK);
    let item = {
        book: CURRENT_BOOK,
        chapter: CURRENT_CHAPTER,
        chapterTitle: CURRENT_CHAPTER_TITLE,
        page: savedPage,
        chap: IS_EPUB ? CURRENT_CHAP : undefined,
        time: Date.now()
    };
    idx >= 0 ? list[idx] = item : list.push(item);
    saveBookmarks(list);
    showToast(`✅ 已保存：${CURRENT_CHAPTER_TITLE} 第${savedPage}页`);
};

document.getElementById('closeMenuBtn').onclick = function() {
    menu.classList.remove('show');
    mask.classList.remove('show');
    menuOpen = false;
};
document.getElementById("openBookmarkBtn").onclick = () => {
    menu.classList.remove('show');
    mask.classList.remove('show');
    menuOpen = false;
    renderBookmarkList();
    bookmarkPanel.classList.add("show");
};
document.getElementById("closeBmPanel").onclick = () => {
    bookmarkPanel.classList.remove("show");
};
bookmarkPanel.onclick = (e) => {
    if (e.target === bookmarkPanel) bookmarkPanel.classList.remove("show");
};

function renderBookmarkList() {
    let list = getBookmarks().sort((a, b) => b.time - a.time);
    if (list.length === 0) {
        bookmarkList.innerHTML = `<div style="color:#aaa;text-align:center;padding:20px;">暂无书签</div>`;
        return;
    }
    let html = "";
    list.forEach(b => {
        html += `
        <div class="bm-item" data-book="${b.book}" data-chapter="${b.chapter}" data-page="${b.page || 1}" data-chap="${b.chap || 0}">
            <span class="bm-del">🗑️</span>
            <div class="book">${b.book}</div>
            <div class="chap">${b.chapterTitle.substring(0,4)}</div>
            <div class="page">📄 第${b.page || 1}页</div>
        </div>`;
    });
    bookmarkList.innerHTML = html;
    document.querySelectorAll(".bm-item").forEach(item => {
        item.onclick = (e) => {
            if (e.target.classList.contains("bm-del")) return;
            let book = item.dataset.book;
            let chapter = item.dataset.chapter;
            let page = item.dataset.page || 1;
            let chap = item.dataset.chap || 0;
            sessionStorage.setItem("jump_to", JSON.stringify({page: page, chap: chap}));
            let chapParam = chap ? '&chap=' + chap : '';
            location.href = `<?=$currentFile?>?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(chapter)}${chapParam}`;
            bookmarkPanel.classList.remove("show");
        };
    });
    document.querySelectorAll(".bm-del").forEach(del => {
        del.onclick = (e) => {
            let item = del.closest(".bm-item");
            let book = item.dataset.book;
            let chapter = item.dataset.chapter;
            let list = getBookmarks().filter(b => !(b.book === book && b.chapter === chapter));
            saveBookmarks(list);
            renderBookmarkList();
            showToast("🗑️ 已删除");
        };
    });
}

function jumpToPage(page) {
    let els = document.querySelectorAll("#reader > img, #reader > canvas");
    let idx = page - 1;
    if (els[idx]) {
        els[idx].scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
        showToast("⌛ 加载中…");
    }
}

window.onload = () => {
    let j = sessionStorage.getItem("jump_to");
    if (j) {
        sessionStorage.removeItem("jump_to");
        try {
            let data = JSON.parse(j);
            if (data.page && data.page > 1) {
                let targetPage = data.page;
                let overlay = document.getElementById('loadingOverlay');
                if (overlay) overlay.style.display = 'flex';
                function loadUntilTarget() {
                    let els = document.querySelectorAll("#reader > img, #reader > canvas");
                    if (els.length >= targetPage) {
                        els[targetPage - 1].scrollIntoView({ behavior: "instant", block: "start" });
                        updateProgressBar();
                        setTimeout(() => {
                            let rect = els[targetPage - 1].getBoundingClientRect();
                            if (Math.abs(rect.top) > 10) {
                                els[targetPage - 1].scrollIntoView({ behavior: "instant", block: "start" });
                            }
                            if (overlay) overlay.style.display = 'none';
                        }, 500);
                        setTimeout(() => {
                            let rect = els[targetPage - 1].getBoundingClientRect();
                            if (Math.abs(rect.top) > 10) {
                                els[targetPage - 1].scrollIntoView({ behavior: "instant", block: "start" });
                            }
                        }, 1500);
                        return;
                    }
                    <?php if(!$isPdf): ?>
                    if (typeof loadMore === 'function') loadMore();
                    <?php else: ?>
                    if (typeof window.pdfRender === 'function') window.pdfRender();
                    <?php endif; ?>
                    setTimeout(loadUntilTarget, 100);
                }
                loadUntilTarget();
            }
        } catch(e) {}
    }
};

function closeMenu() {
    menuOpen = false;
    menu.classList.remove('show');
    mask.classList.remove('show');
    lock = false;
    pageLoadedTime = Date.now();
}
mask.addEventListener('click', closeMenu);

let scrollTimer = null;
let isPlaying = false;
const toggleBtn = document.getElementById('toggleScroll');
function toggleScroll() {
    if (isPlaying) {
        clearInterval(scrollTimer);
        toggleBtn.innerHTML = "▶️ 开始自动阅读";
    } else {
        scrollTimer = setInterval(() => window.scrollBy(0, speed), 30);
        toggleBtn.innerHTML = "⏸️ 暂停阅读";
    }
    isPlaying = !isPlaying;
}
// 恢复自动滚动状态
if (sessionStorage.getItem('autoScroll') === '1') {
    sessionStorage.removeItem('autoScroll');
    let savedSpeed = sessionStorage.getItem('autoSpeed');
    if (savedSpeed) {
        speed = parseInt(savedSpeed);
        sessionStorage.removeItem('autoSpeed');
        speedBtns.forEach(b => {
            b.classList.remove('active');
            if (Number(b.dataset.speed) === speed) b.classList.add('active');
        });
    }
    setTimeout(() => toggleScroll(), 500);
}
toggleBtn.addEventListener('click', toggleScroll);

const currentChapter = "<?=$chapter?>";
const grid = document.getElementById('chapterGrid');
<?php if($isEpub && !empty($epubChapters)): ?>
const epubChapters = <?=json_encode($epubChapters, JSON_UNESCAPED_UNICODE)?>;
const currentChap = <?=$chap?>;
epubChapters.forEach((ch, i) => {
    let btn = document.createElement('button');
    btn.className = 'chapter-item-btn';
    if (i === currentChap) btn.classList.add('active');
    btn.innerText = ch.title;
    grid.appendChild(btn);
    btn.onclick = () => {
        location.href = "<?=$currentFile.'?book='.rawurlencode($book)?>&chapter=<?=rawurlencode($chapter)?>&chap="+i;
    };
});
<?php else: ?>
const chapters = [<?php foreach($allChapters as $ch) echo '"'.basename($ch).'",'; ?>];
const currentIdx = <?=$currentIdx?>;
const totalChapters = chapters.length;
chapters.forEach((name, i) => {
    let btn = document.createElement('button');
    btn.className = 'chapter-item-btn';
    if (name === currentChapter) btn.classList.add('active');
    btn.innerText = name.replace('.pdf','').replace('.epub','').replace('第','').replace('话','');
    grid.appendChild(btn);
    btn.onclick = () => {
        location.href = "<?=$currentFile.'?book='.rawurlencode($book)?>&chapter="+encodeURIComponent(name);
    };
});
<?php endif; ?>

let lock = false;
let pageLoadedTime = Date.now();
let scrollDebounceTimer;
window.addEventListener('scroll', () => {
    clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = setTimeout(() => {
        updateProgressBar();
        if (lock || menuOpen) return;
        const top = window.scrollY;
        const bottom = window.innerHeight + top;
        const total = document.body.scrollHeight;
        if (bottom >= total - 100) {
            lock = true;
            <?php if($isEpub): ?>
            if (CURRENT_CHAP >= <?=count($epubChapters)-1?>) {
                showToast("✅ 已到最终话");
                clearInterval(scrollTimer);
                isPlaying = false;
                toggleBtn.innerHTML = "▶️ 开始自动阅读";
                setTimeout(() => lock = false, 1200);
                return;
            }
            if (isPlaying) { sessionStorage.setItem('autoScroll', '1'); sessionStorage.setItem('autoSpeed', speed); }
            location.href = "<?=$currentFile.'?book='.rawurlencode($book)?>&chapter=<?=rawurlencode($chapter)?>&chap="+(CURRENT_CHAP+1);
            <?php else: ?>
            if (currentIdx >= totalChapters - 1) {
                showToast("✅ 已到最终话");
                clearInterval(scrollTimer);
                isPlaying = false;
                toggleBtn.innerHTML = "▶️ 开始自动阅读";
                setTimeout(() => lock = false, 1200);
                return;
            }
            if (isPlaying) { sessionStorage.setItem('autoScroll', '1'); sessionStorage.setItem('autoSpeed', speed); }
            location.href = "<?=$currentFile.'?book='.rawurlencode($book)?>&chapter="+encodeURIComponent(chapters[currentIdx+1]);
            <?php endif; ?>
        }
        if (top <= 30) {
            lock = true;
            <?php if($isEpub): ?>
            if (CURRENT_CHAP <= 0) {
                showToast("✅ 已是第一话");
                setTimeout(() => lock = false, 1200);
                return;
            }
            if (isPlaying) { sessionStorage.setItem('autoScroll', '1'); sessionStorage.setItem('autoSpeed', speed); }
            location.href = "<?=$currentFile.'?book='.rawurlencode($book)?>&chapter=<?=rawurlencode($chapter)?>&chap="+(CURRENT_CHAP-1);
            <?php else: ?>
            if (currentIdx <= 0) {
                showToast("✅ 已是第一话");
                setTimeout(() => lock = false, 1200);
                return;
            }
            if (isPlaying) { sessionStorage.setItem('autoScroll', '1'); sessionStorage.setItem('autoSpeed', speed); }
            location.href = "<?=$currentFile.'?book='.rawurlencode($book)?>&chapter="+encodeURIComponent(chapters[currentIdx-1]);
            <?php endif; ?>
        }
    }, 120);
});

const BATCH = 8;
const reader = document.getElementById('reader');
let renderedPages = new Set();
let pdfDoc = null;
async function renderPage(n) {
    if (renderedPages.has(n)) return;
    renderedPages.add(n);
    let p = await pdfDoc.getPage(n);
    let vp = p.getViewport({scale:1.2});
    let c = document.createElement('canvas');
    c.width=vp.width; c.height=vp.height; c.style.width='100%';
    await p.render({canvasContext:c.getContext('2d'), viewport:vp}).promise;
    reader.appendChild(c);
}

<?php if(!$isPdf): ?>
const allImages = [
<?php foreach($images as $img): ?>
<?php if($isEpub): ?>"<?=$currentFile?>?action=epub_img&book=<?=rawurlencode($book)?>&chapter=<?=rawurlencode($chapter)?>&path=<?=implode('/', array_map('rawurlencode', explode('/', $img)))?>"<?php else: ?>"<?=$img?>"<?php endif; ?>,
<?php endforeach; ?>
];
let idx=0,loading=false;
function loadMore(){
    if(loading||idx>=allImages.length)return;
    loading=true;
    let end=Math.min(idx+BATCH,allImages.length);
    for(let i=idx;i<end;i++){
        let im=new Image(); im.src=allImages[i]; reader.appendChild(im);
    }
    idx=end; loading=false;
}
window.addEventListener('scroll',()=>{
    if(window.innerHeight + window.scrollY >= document.body.scrollHeight - 800) loadMore();
});
loadMore();
<?php if($isEpub): ?>
// 保证封面和纯文字章节也能触发滚动切换
let spacer = document.createElement('div');
spacer.style.cssText = 'height:200vh;pointer-events:none';
document.getElementById('reader').appendChild(spacer);
<?php endif; ?>
<?php endif; ?>
<?php if(!$isEpub): ?>
(async ()=>{
    pdfDoc = await pdfjsLib.getDocument("<?=$fileUrl?>").promise;
    let p=1,rendering=false;
    async function render(){
        if(rendering) return;
        rendering=true;
        let end = Math.min(p+BATCH, pdfDoc.numPages);
        while(p<=end){
            await renderPage(p); p++;
        }
        rendering=false;
    }
    window.pdfRender = render;
    window.addEventListener('scroll',()=>{
        if(window.innerHeight + window.scrollY >= document.body.scrollHeight - 800) render();
    });
    render();
})();

// ===== 主题切换（阅读页面） =====
document.getElementById('themeBtn').onclick = function(e) {
    e.stopPropagation();
    var p = document.getElementById('themePanelChapter');
    p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
};
function setThemeChapter(name) {
    localStorage.setItem('reader_theme', name);
    var tp = document.getElementById('themePanelChapter');
    if (tp) tp.style.display = 'none';
    document.body.className = 'theme-' + name;
}
(function(){
    var saved = localStorage.getItem('reader_theme');
    document.body.className = 'theme-' + (saved || 'orange');
})();
<?php endif; ?>
</script>

<!-- 阅读页面主题面板 -->
<div id="themePanelChapter" style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.15);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.25);border-radius:20px;padding:8px 10px;width:274px;z-index:10001;display:none;box-shadow:0 8px 32px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.3);width:274px;" onclick="event.stopPropagation()">
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:7px;justify-content:center;">
        <button onclick="setThemeChapter('orange')" style="width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff8c42 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,140,66,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('blue')" style="width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #4a90d9 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(74,144,217,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('pink')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff9eb5 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,158,181,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('green')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #5aab8a 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(90,171,138,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('dark')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #1a1a2e 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.5),inset 0 -2px 4px rgba(0,0,0,0.3),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('purple')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #7a5aff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(122,90,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>

        <button onclick="setThemeChapter('crimson')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #e01020 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(220,10,30,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('lava')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #ff5a00 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,80,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('bronze')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #c89830 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(200,150,40,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('emerald')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #00c060 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,190,90,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('teal')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #00b090 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,170,140,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('cobalt')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #2060ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(30,90,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>

        <button onclick="setThemeChapter('violet')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #9030ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(140,40,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('amber')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #ffb000 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,170,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('magenta')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #e000a0 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(220,0,160,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('indigo')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #4a40d0 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(70,60,200,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('coral')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #ff5050 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,70,70,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setThemeChapter('mint')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #20c080 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(30,190,120,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        
        <button onclick="setThemeChapter('gold')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ffd740 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,215,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('gold')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ffd740 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,215,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('mecha')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff5500 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,80,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('royal')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #daa520 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(218,165,32,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('orangea')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff8c42 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,140,66,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('emeraldd')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #00b86b 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,184,107,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('forest')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #66bb6a 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(102,187,106,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>

        <button onclick="setThemeChapter('purplee')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #9c6aff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(156,106,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('ocean')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #42a5ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(66,165,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('aurora')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #64e8ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(100,232,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('blackgold')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #e6b850 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(230,184,80,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('crimsonn')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff5a8c 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,90,140,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setThemeChapter('forestfog')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #50d888 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(80,216,136,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>

    </div>
</div>
</script>

<?php elseif($book): ?>
<h3 style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding-right:12px;">
<a href="<?=$currentFile?>">🏠 首页</a>
<?php
$parts = explode('/', $book);
$path = '';
foreach ($parts as $i => $part) {
    $path .= ($i > 0 ? '/' : '') . $part;
    $display = htmlspecialchars(mb_substr($part, 0, 8));
    echo ' / <a href="'.$currentFile.'?book='.rawurlencode($path).'">'.$display.'</a>';
}
?></h3>
<div class="mask" id="maskChapter" style="display:none"></div>
<div class="bookmark-panel" id="bookmarkPanelChapter" style="display:none">
    <div class="bm-header">
        <span>📋 我的书签</span>
        <span class="bm-close" id="closeBmPanelChapter">✕</span>
    </div>
    <div id="bookmarkListChapter" style="padding-top:4px;">
        <div style="color:#aaa;text-align:center;padding:20px;">暂无书签</div>
    </div>
</div>
<div class="book-chapter-grid">
<?php
$files=scanDirectory($baseDir.'/'.$book);
if($files){
    foreach($files as $f){
        $n=basename($f);
        if (is_dir($f)) {
            // 检查目录下是否有图片，没有图片就走中间层（PDF由下层扫描）
            $children = scanDirectory($f);
            $hasImages = false;
            foreach ($children as $child) {
                if (!is_dir($child)) {
                    $ext = strtolower(pathinfo($child, PATHINFO_EXTENSION));
                    if (in_array($ext, ['jpg','jpeg','png','webp'])) {
                        $hasImages = true;
                        break;
                    }
                }
            }
            if ($hasImages) {
                $u = $currentFile.'?book='.rawurlencode($book).'&chapter='.rawurlencode($n);
                echo '<div class="book-chapter-item"><a href="'.$u.'">📁 '.htmlspecialchars($n).'</a></div>';
            } else {
                $u = $currentFile.'?book='.rawurlencode($book.'/'.$n);
                echo '<div class="book-chapter-item"><a class="level2" href="'.$u.'">📁 '.htmlspecialchars($n).'</a></div>';
            }
        } elseif (stripos($n, '.pdf') !== false) {
            $u = $currentFile.'?book='.rawurlencode($book).'&chapter='.rawurlencode($n);
            echo '<div class="book-chapter-item"><a href="'.$u.'">📄 '.htmlspecialchars($n).'</a></div>';
        } elseif (stripos($n, '.epub') !== false) {
            $u = $currentFile.'?book='.rawurlencode($book).'&chapter='.rawurlencode($n);
            echo '<div class="book-chapter-item"><a href="'.$u.'">📘 '.htmlspecialchars($n).'</a></div>';
        }
    }
} else {
    echo '<div style="grid-column:1/-1;text-align:center;padding:40px;">暂无章节</div>';
}
?>
</div>
<?php else: ?>
<h1>📚 我的书架</h1>
<div class="mask" id="maskHome" style="display:none"></div>
<div class="bookmark-panel" id="bookmarkPanelHome" style="display:none">
    <div class="bm-header">
        <span>📋 我的书签</span>
        <span class="bm-close" id="closeBmPanelHome">✕</span>
    </div>
    <div id="bookmarkListHome" style="padding-top:4px;">
        <div style="color:#aaa;text-align:center;padding:20px;">暂无书签</div>
    </div>
</div>
<div class="grid">
<?php
$books=scanDirectory($baseDir);
if($books){
    foreach($books as $b){
        if(is_dir($b)){
            $n=basename($b);
            echo '<div class="item"><a href="'.$currentFile.'?book='.rawurlencode($n).'">📖 '.htmlspecialchars($n).'</a></div>';
        }
    }
} else {
    echo '<div style="grid-column:1/-1;text-align:center;padding:30px;">请放入书籍文件夹</div>';
}
?>
</div>
<?php endif; ?>
<?php if($book && !$isChapterPage): ?>
<script>
(function() {
    const BM_KEY = "bookmarks_v6";
    const currentFile = "<?=$currentFile?>";
    const mask = document.getElementById('maskChapter');
    const panel = document.getElementById('bookmarkPanelChapter');
    const list = document.getElementById('bookmarkListChapter');
    function getBookmarks() {
        try { return JSON.parse(localStorage.getItem(BM_KEY) || "[]"); }
        catch(e) { return []; }
    }
    function renderBookmarks() {
        let bookmarks = getBookmarks().sort((a,b) => b.time - a.time);
        if (bookmarks.length === 0) {
            list.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">暂无书签</div>';
            return;
        }
        let html = '';
        bookmarks.forEach(b => {
            html += '<div class="bm-item" data-book="'+b.book+'" data-chapter="'+b.chapter+'" data-page="'+(b.page||1)+'" data-chap="'+(b.chap||0)+'">' +
                '<span class="bm-del">🗑️</span>' +
                '<div class="book">'+b.book+'</div>' +
                '<div class="chap">'+((b.chapterTitle||b.chapter).substring(0,4))+'</div>' +
                '<div class="page">📄 第'+(b.page||1)+'页</div></div>';
        });
        list.innerHTML = html;
        list.querySelectorAll('.bm-item').forEach(item => {
            item.onclick = function(e) {
                if (e.target.classList.contains('bm-del')) return;
                let bk = this.dataset.book, ch = this.dataset.chapter, pg = this.dataset.page||1, cp = this.dataset.chap||0;
                let cpParam = cp ? '&chap='+cp : '';
                sessionStorage.setItem("jump_to", JSON.stringify({page: pg, chap: cp}));
                location.href = currentFile+'?book='+encodeURIComponent(bk)+'&chapter='+encodeURIComponent(ch)+cpParam;
            };
        });
        list.querySelectorAll('.bm-del').forEach(del => {
            del.onclick = function(e) {
                e.stopPropagation();
                let item = del.closest('.bm-item');
                let bm = getBookmarks().filter(b => !(b.book===item.dataset.book && b.chapter===item.dataset.chapter));
                localStorage.setItem(BM_KEY, JSON.stringify(bm));
                renderBookmarks();
            };
        });
    }
    document.getElementById('chapterBookmarkBtn').onclick = function(e) {
        e.stopPropagation();
        renderBookmarks();
        panel.style.display = 'block';
        mask.style.display = 'block';
        mask.onclick = function() { panel.style.display = 'none'; mask.style.display = 'none'; };
    };
    document.getElementById('closeBmPanelChapter').onclick = function() {
        panel.style.display = 'none'; mask.style.display = 'none';
    };
})();
</script>
<?php endif; ?>
<?php if(!$isChapterPage): ?>
<div class="bottom-nav">
    <a href="<?=$currentFile?>">🏠</a>
    <?php if(!$book): ?>
    <button id="bottomBookmarkBtn">🔖</button>
    <?php else: ?>
    <button id="chapterBookmarkBtn">🔖</button>
    <?php endif; ?>
<button id="themeBtn" style="cursor:pointer;">🎨</button>
</div>
<?php if($book): ?>
<script>
(function(){
    var btn = document.getElementById('chapterBookmarkBtn');
    var panel = document.getElementById('bookmarkPanelChapter');
    var mask = document.getElementById('maskChapter');
    var list = document.getElementById('bookmarkListChapter');
    var BM_KEY = "bookmarks_v6";
    function getBookmarks() { try { return JSON.parse(localStorage.getItem(BM_KEY) || "[]"); } catch(e) { return []; } }
    function renderBookmarks() {
        var bookmarks = getBookmarks().sort((a,b) => b.time - a.time);
        if (bookmarks.length === 0) { list.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">暂无书签</div>'; return; }
        var html = '';
        bookmarks.forEach(function(b) {
            html += '<div class="bm-item" data-book="'+b.book+'" data-chapter="'+b.chapter+'" data-page="'+(b.page||1)+'" data-chap="'+(b.chap||0)+'">' +
                '<span class="bm-del">🗑️</span><div class="book">'+b.book+'</div><div class="chap">'+(b.chapterTitle||b.chapter)+'</div><div class="page">📄 第'+(b.page||1)+'页</div></div>';
        });
        list.innerHTML = html;
        list.querySelectorAll('.bm-item').forEach(function(item) {
            item.onclick = function(e) {
                if (e.target.classList.contains('bm-del')) return;
                var bk = this.dataset.book, ch = this.dataset.chapter, pg = this.dataset.page||1, cp = this.dataset.chap||0;
                var cpParam = cp ? '&chap='+cp : '';
                sessionStorage.setItem("jump_to", JSON.stringify({page: pg, chap: cp}));
                location.href = '<?=$currentFile?>?book='+encodeURIComponent(bk)+'&chapter='+encodeURIComponent(ch)+cpParam;
            };
        });
        list.querySelectorAll('.bm-del').forEach(function(del) {
            del.onclick = function(e) {
                e.stopPropagation();
                var item = del.closest('.bm-item');
                var bm = getBookmarks().filter(function(b) { return !(b.book===item.dataset.book && b.chapter===item.dataset.chapter); });
                localStorage.setItem(BM_KEY, JSON.stringify(bm));
                renderBookmarks();
            };
        });
    }
    btn.onclick = function(e) {
        e.stopPropagation();
        renderBookmarks();
        panel.style.display = 'block';
        mask.style.display = 'block';
        mask.onclick = function() { panel.style.display = 'none'; mask.style.display = 'none'; };
    };
    document.getElementById('closeBmPanelChapter').onclick = function() {
        panel.style.display = 'none'; mask.style.display = 'none';
    };
})();
</script>
<?php endif; ?>
<?php endif; ?>
<?php if(!$book): ?>
<script>
(function() {
    const BM_KEY = "bookmarks_v6";
    const currentFile = "<?=$currentFile?>";
    const mask = document.getElementById('maskHome');
    const panel = document.getElementById('bookmarkPanelHome');
    const list = document.getElementById('bookmarkListHome');
    function getBookmarks() {
        try { return JSON.parse(localStorage.getItem(BM_KEY) || "[]"); }
        catch(e) { return []; }
    }
    function renderBookmarks() {
        let bookmarks = getBookmarks().sort((a,b) => b.time - a.time);
        if (bookmarks.length === 0) {
            list.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">暂无书签</div>';
            return;
        }
        let html = '';
        bookmarks.forEach(b => {
            html +=
            '<div class="bm-item" data-book="' + b.book + '" data-chapter="' + b.chapter + '" data-page="' + (b.page||1) + '" data-chap="' + (b.chap||0) + '">' +
                '<span class="bm-del" style="pointer-events:none">🗑️</span>' +
                '<div class="book">' + b.book + '</div>' +
                '<div class="chap">' + ((b.chapterTitle || b.chapter).substring(0,4)) + '</div>' +
                '<div class="page">📄 第' + (b.page||1) + '页</div>' +
            '</div>';
        });
        list.innerHTML = html;
        list.querySelectorAll('.bm-item').forEach(item => {
            item.onclick = function(e) {
                if (e.target.classList.contains('bm-del')) return;
                let book = this.dataset.book;
                let chapter = this.dataset.chapter;
                let page = this.dataset.page || 1;
                let chap = this.dataset.chap || 0;
                let chapParam = chap ? '&chap=' + chap : '';
                sessionStorage.setItem("jump_to", JSON.stringify({page: page, chap: chap}));
                location.href = currentFile + '?book=' + encodeURIComponent(book) + '&chapter=' + encodeURIComponent(chapter) + chapParam;
            };
        });
        list.querySelectorAll('.bm-del').forEach(del => {
            del.style.pointerEvents = 'auto';
            del.onclick = function(e) {
                e.stopPropagation();
                let item = del.closest('.bm-item');
                let book = item.dataset.book;
                let chapter = item.dataset.chapter;
                let bm = getBookmarks().filter(b => !(b.book === book && b.chapter === chapter));
                localStorage.setItem(BM_KEY, JSON.stringify(bm));
                renderBookmarks();
            };
        });
    }
    if (location.hash === '#bookmark') {
        setTimeout(function() {
            renderBookmarks();
            panel.style.display = 'block';
            mask.style.display = 'block';
            mask.onclick = function() {
                panel.style.display = 'none';
                mask.style.display = 'none';
            };
            history.replaceState(null, '', location.pathname);
        }, 300);
    }
    var bmBtn = document.getElementById('bottomBookmarkBtn');
    if (bmBtn) {
        bmBtn.onclick = function(e) {
            e.stopPropagation();
            renderBookmarks();
            panel.style.display = 'block';
            mask.style.display = 'block';
            mask.onclick = function() {
                panel.style.display = 'none';
                mask.style.display = 'none';
            };
        };
    }
    let lastTap = 0;
    document.addEventListener('click', function(e) {
        if (e.target.closest('.item') || e.target.closest('.book-chapter-item') || e.target.closest('.bookmark-panel') || e.target.closest('.bm-item')) return;
        const now = Date.now();
        const delta = now - lastTap;
        lastTap = now;
        if (delta > 0 && delta < 300) {
            renderBookmarks();
            panel.style.display = 'block';
            mask.style.display = 'block';
            mask.onclick = function() {
                panel.style.display = 'none';
                mask.style.display = 'none';
            };
        }
    });
    document.getElementById('closeBmPanelHome').onclick = function() {
        panel.style.display = 'none';
        mask.style.display = 'none';
    };
    // 委托删除事件
    document.getElementById('bookmarkListHome').addEventListener('click', function(e) {
        if (e.target.classList.contains('bm-del')) {
            e.stopPropagation();
            let item = e.target.closest('.bm-item');
            let book = item.dataset.book;
            let chapter = item.dataset.chapter;
            let bookmarks = getBookmarks().filter(b => !(b.book === book && b.chapter === chapter));
            localStorage.setItem(BM_KEY, JSON.stringify(bookmarks));
            renderBookmarks();
        }
    });
})();
</script>
<?php endif; ?>
<div id="themePanel" style="position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.15);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.25);border-radius:20px;padding:8px 10px;z-index:10001;display:none;box-shadow:0 8px 32px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.3);" onclick="event.stopPropagation()">
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:7px;justify-content:center;">
        <button onclick="setTheme('orange')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff8c42 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,140,66,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('blue')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #4a90d9 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(74,144,217,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('pink')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff9eb5 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,158,181,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('green')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #5aab8a 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(90,171,138,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('dark')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #1a1a2e 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.5),inset 0 -2px 4px rgba(0,0,0,0.3),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('purple')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #7a5aff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(122,90,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>

        <button onclick="setTheme('crimson')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #e01020 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(220,10,30,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('lava')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #ff5a00 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,80,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('bronze')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #c89830 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(200,150,40,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('emerald')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #00c060 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,190,90,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('teal')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #00b090 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,170,140,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('cobalt')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #2060ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(30,90,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>

        <button onclick="setTheme('violet')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #9030ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(140,40,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('amber')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #ffb000 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,170,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('magenta')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #e000a0 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(220,0,160,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('indigo')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #4a40d0 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(70,60,200,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('coral')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #ff5050 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,70,70,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        <button onclick="setTheme('mint')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), #20c080 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(30,190,120,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.3);"></button>
        
        <button onclick="setTheme('gold')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ffd740 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,215,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('mecha')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff5500 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,80,0,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('royal')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #daa520 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(218,165,32,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('orangea')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff8c42 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,140,66,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('emeraldd')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #00b86b 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(0,184,107,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('forest')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #66bb6a 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(102,187,106,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>

        <button onclick="setTheme('purplee')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #9c6aff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(156,106,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('ocean')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #42a5ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(66,165,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('aurora')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #64e8ff 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(100,232,255,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('blackgold')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #e6b850 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(230,184,80,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('crimsonn')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #ff5a8c 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(255,90,140,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>
        <button onclick="setTheme('forestfog')" style="width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(255,255,255,0.7), #50d888 70%);border:none;cursor:pointer;box-shadow:0 3px 10px rgba(80,216,136,0.4),inset 0 -2px 4px rgba(0,0,0,0.2),inset 0 1px 3px rgba(255,255,255,0.5);"></button>

    </div>
</div>
<script>
document.getElementById('themeBtn').onclick = function(e) {
    e.stopPropagation();
    var p = document.getElementById('themePanel');
    p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
};
function setTheme(name) {
    localStorage.setItem('reader_theme', name);
    var tp = document.getElementById('themePanel');
    if (tp) tp.style.display = 'none';
    document.body.className = 'theme-' + name;
}
(function(){
    var saved = localStorage.getItem('reader_theme');
    document.body.className = 'theme-' + (saved || 'orange');
})();
</script>
</html>