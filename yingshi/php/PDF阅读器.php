<?php
// PDF阅读器.php - 全屏沉浸版：双击唤出工具栏 + 18主题 + 3D翻书动画 + 底部全局进度条
header("Content-Type: text/html; charset=utf-8");
$baseDir = 'PDF';

if (!is_dir($baseDir)) { 
    mkdir($baseDir); 
    echo "已自动创建 PDF 目录，请放入PDF/EPUB/TXT"; 
    exit; 
}

function scanDirectory($path) {
    $result = [];
    if (!is_dir($path)) return $result;
    $handle = opendir($path);
    if ($handle) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != '.' && $entry != '..') {
                if ($entry == '.epub_cache' || $entry == '.txt_cache') {
                    continue;
                }
                if (strpos($entry, '.') === 0) {
                    continue;
                }
                $result[] = $path . '/' . $entry;
            }
        }
        closedir($handle);
    }
    natsort($result);
    return $result;
}

function scanImages($path) {
    $images = [];
    $extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
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
}

function parseTxtFile($txtPath, $book, $chapter, $baseDir) {
    $cacheDir = $baseDir . '/.txt_cache/' . $book . '/' . md5($chapter);
    $cacheFile = $cacheDir . '/chapters.json';
    
    if (file_exists($cacheFile)) {
        $data = json_decode(file_get_contents($cacheFile), true);
        if ($data && isset($data['chapters'])) {
            return $data;
        }
    }
    
    $content = file_get_contents($txtPath);
    $encoding = mb_detect_encoding($content, ['UTF-8', 'GBK', 'GB2312', 'BIG5'], true);
    if (!$encoding) $encoding = 'UTF-8';
    $content = mb_convert_encoding($content, 'UTF-8', $encoding);
    
    $patterns = [
        '/第[零〇一二三四五六七八九十百千万\d]+章[\s]*[^\n]*/u',
        '/第[零〇一二三四五六七八九十百千万\d]+节[\s]*[^\n]*/u',
        '/第[零〇一二三四五六七八九十百千万\d]+卷[\s]*[^\n]*/u',
        '/(?:Chapter|CHAPTER|Ch\.?)\s*\d+[.:\s]*[^\n]*/i',
        '/\[\d+\][\s]*[^\n]*/',
        '/(?:一|二|三|四|五|六|七|八|九|十)、[\s]*[^\n]*/u',
    ];
    
    $lines = preg_split('/\r\n|\r|\n/', $content);
    $chapters = [];
    $currentChapter = ['title' => '序章', 'content' => ''];
    $foundFirstChapter = false;
    
    foreach ($lines as $line) {
        $line = rtrim($line);
        $isChapter = false;
        $chapterTitle = '';
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $line, $matches)) {
                $chapterTitle = trim($matches[0]);
                $isChapter = true;
                break;
            }
        }
        
        if ($isChapter && $chapterTitle) {
            if ($foundFirstChapter && $currentChapter['content'] !== '') {
                $chapters[] = $currentChapter;
            }
            $currentChapter = ['title' => $chapterTitle, 'content' => ''];
            $foundFirstChapter = true;
        } else {
            if ($line !== '' || $currentChapter['content'] !== '') {
                $currentChapter['content'] .= $line . "\n";
            }
        }
    }
    
    if ($currentChapter['content'] !== '') {
        $chapters[] = $currentChapter;
    }
    
    if (empty($chapters)) {
        $chapters = [['title' => basename($chapter, '.txt'), 'content' => $content]];
    }
    
    foreach ($chapters as &$chap) {
        $chap['content'] = preg_replace('/\n\s*\n/', "</p><p>", $chap['content']);
        $chap['content'] = "<p>" . str_replace("\n", "<br>", $chap['content']) . "</p>";
        $chap['content'] = preg_replace('/<p>\s*<\/p>/', '', $chap['content']);
    }
    
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0777, true);
    }
    
    $result = ['type' => 'txt', 'chapters' => $chapters, 'totalChapters' => count($chapters)];
    file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    return $result;
}

function parseEpub($epubFilePath, $book, $chapter, $baseDir) {
    $cacheDir = $baseDir . '/.epub_cache/' . $book . '/' . md5($chapter);
    $cacheTypeFile = $cacheDir . '/type.json';
    
    if (!class_exists('ZipArchive')) {
        return ['error' => '请启用ZipArchive扩展'];
    }
    
    $zip = new ZipArchive();
    if ($zip->open($epubFilePath) !== true) {
        return ['error' => '无法打开EPUB文件'];
    }
    
    $container = $zip->getFromName('META-INF/container.xml');
    if (!$container) {
        $zip->close();
        return ['error' => '无效的EPUB文件'];
    }
    
    $rootFile = '';
    if (preg_match('/full-path="([^"]+)"/', $container, $matches)) {
        $rootFile = $matches[1];
    }
    
    if (!$rootFile) {
        $zip->close();
        return ['error' => '无法解析EPUB结构'];
    }
    
    $opfContent = $zip->getFromName($rootFile);
    if (!$opfContent) {
        $zip->close();
        return ['error' => '无法解析OPF文件'];
    }
    
    $opfDir = dirname($rootFile);
    if ($opfDir == '.') $opfDir = '';
    else $opfDir .= '/';
    
    $imagePaths = [];
    preg_match_all('/<item[^>]*href="([^"]+)"[^>]*media-type="image\/[^"]+"/i', $opfContent, $matches1);
    if (!empty($matches1[1])) {
        foreach ($matches1[1] as $imgPath) {
            $imagePaths[] = $opfDir . $imgPath;
        }
    }
    
    if (empty($imagePaths)) {
        preg_match_all('/<item[^>]*href="([^"]+\.(jpg|jpeg|png|webp|gif))"[^>]*>/i', $opfContent, $matches2);
        foreach ($matches2[1] as $imgPath) {
            $imagePaths[] = $opfDir . $imgPath;
        }
    }
    
    $spineItems = [];
    preg_match_all('/<itemref[^>]*idref="([^"]+)"/i', $opfContent, $spineMatches);
    if (!empty($spineMatches[1])) {
        foreach ($spineMatches[1] as $idref) {
            preg_match('/<item[^>]*id="' . preg_quote($idref) . '"[^>]*href="([^"]+)"/i', $opfContent, $itemMatch);
            if (!empty($itemMatch[1])) {
                $spineItems[] = $opfDir . $itemMatch[1];
            }
        }
    }
    
    $htmlItems = [];
    preg_match_all('/<item[^>]*href="([^"]+)"[^>]*media-type="application\/xhtml\+xml"[^>]*>/i', $opfContent, $matchesHtml);
    foreach ($matchesHtml[1] as $htmlPath) {
        $htmlItems[] = $opfDir . $htmlPath;
    }
    
    $totalImages = count($imagePaths);
    $totalHtml = count($htmlItems) ?: count($spineItems);
    $isComic = ($totalImages > 0 && $totalHtml == 0) || ($totalImages > 30 && $totalImages / max($totalHtml, 1) > 5);
    
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0777, true);
    }
    
    $result = ['type' => $isComic ? 'comic' : 'ebook'];
    
    if ($isComic) {
        $cachedImages = [];
        $orderedImages = $imagePaths;
        $orderedImages = array_values(array_unique($orderedImages));
        
        foreach ($orderedImages as $idx => $relativePath) {
            $ext = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) $ext = 'jpg';
            $cacheFile = $cacheDir . '/' . sprintf('%03d', $idx+1) . '.' . $ext;
            $imageData = $zip->getFromName($relativePath);
            if ($imageData !== false) {
                file_put_contents($cacheFile, $imageData);
                $cachedImages[] = $cacheFile;
            } else {
                $decodedPath = urldecode($relativePath);
                $imageData = $zip->getFromName($decodedPath);
                if ($imageData !== false) {
                    file_put_contents($cacheFile, $imageData);
                    $cachedImages[] = $cacheFile;
                }
            }
        }
        
        $result['images'] = $cachedImages;
        $result['totalPages'] = count($cachedImages);
    } else {
        $imagesDir = $cacheDir . '/images/';
        if (!is_dir($imagesDir)) mkdir($imagesDir, 0777, true);
        
        $imageUrlMap = [];
        foreach ($imagePaths as $relativePath) {
            $originalFilename = basename($relativePath);
            $ext = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'])) $ext = 'jpg';
            
            $cacheFilename = md5($relativePath) . '_' . preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $originalFilename);
            $cacheFile = $imagesDir . $cacheFilename;
            
            $imageData = $zip->getFromName($relativePath);
            if ($imageData !== false) {
                file_put_contents($cacheFile, $imageData);
                $imageUrlMap[$originalFilename] = $cacheFile;
                $nameNoExt = pathinfo($originalFilename, PATHINFO_FILENAME);
                $imageUrlMap[$nameNoExt] = $cacheFile;
            }
        }
        
        $cssContent = '';
        preg_match_all('/<item[^>]*href="([^"]+\.css)"[^>]*media-type="text\/css"[^>]*>/i', $opfContent, $cssMatches);
        foreach ($cssMatches[1] as $cssPath) {
            $fullPath = $opfDir . $cssPath;
            $cssData = $zip->getFromName($fullPath);
            if ($cssData !== false) {
                $cssContent .= $cssData . "\n";
            }
        }
        
        $htmlContents = [];
        $itemsToProcess = !empty($htmlItems) ? $htmlItems : $spineItems;
        
        foreach ($itemsToProcess as $idx => $htmlPath) {
            $htmlData = $zip->getFromName($htmlPath);
            if ($htmlData !== false) {
                $htmlData = preg_replace_callback('/src=["\']([^"\']+)["\']/i', function($matches) use ($imageUrlMap) {
                    $src = $matches[1];
                    if (strpos($src, 'http://') === 0 || strpos($src, 'https://') === 0 || strpos($src, 'data:') === 0) {
                        return $matches[0];
                    }
                    if (strpos($src, '.epub_cache/') !== false) {
                        return $matches[0];
                    }
                    $filename = basename(urldecode($src));
                    if (isset($imageUrlMap[$filename])) {
                        return 'src="' . $imageUrlMap[$filename] . '"';
                    }
                    $name = pathinfo($filename, PATHINFO_FILENAME);
                    if (isset($imageUrlMap[$name])) {
                        return 'src="' . $imageUrlMap[$name] . '"';
                    }
                    return $matches[0];
                }, $htmlData);
                
                $htmlData = preg_replace_callback('/url\([\'"]?([^\'"\)]+)[\'"]?\)/i', function($matches) use ($imageUrlMap) {
                    $url = $matches[1];
                    $filename = basename(urldecode($url));
                    if (isset($imageUrlMap[$filename])) {
                        return 'url("' . $imageUrlMap[$filename] . '")';
                    }
                    return $matches[0];
                }, $htmlData);
                
                $title = '';
                if (preg_match('/<title[^>]*>([^<]+)<\/title>/i', $htmlData, $titleMatch)) {
                    $title = trim($titleMatch[1]);
                }
                if (!$title) {
                    if (preg_match('/<h1[^>]*>([^<]+)<\/h1>/i', $htmlData, $h1Match)) {
                        $title = trim($h1Match[1]);
                    } else {
                        $title = '第 ' . ($idx + 1) . ' 章';
                    }
                }
                
                if (preg_match('/<body[^>]*>([\s\S]*?)<\/body>/i', $htmlData, $bodyMatch)) {
                    $htmlData = $bodyMatch[1];
                }
                
                $htmlContents[] = [
                    'title' => $title,
                    'content' => $htmlData,
                    'index' => $idx
                ];
            }
        }
        
        $result['htmlContents'] = $htmlContents;
        $result['cssContent'] = $cssContent;
        $result['totalChapters'] = count($htmlContents);
    }
    
    $zip->close();
    
    file_put_contents($cacheTypeFile, json_encode($result, JSON_UNESCAPED_UNICODE));
    return $result;
}

$book = isset($_GET['book']) ? $_GET['book'] : '';
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';
$isChapterPage = ($book && $chapter);
$isPdf = $chapter && (stripos($chapter, '.pdf') !== false);
$isEpub = $chapter && (stripos($chapter, '.epub') !== false);
$isTxt = $chapter && (stripos($chapter, '.txt') !== false);

if ($book && $chapter) {
    $encodedBook = rawurlencode($book);
    $encodedChapter = rawurlencode($chapter);
    $fileUrl = "$baseDir/$encodedBook/$encodedChapter";
}

$images = [];
$epubData = null;
$txtData = null;
$epubError = null;

if ($isTxt && $isChapterPage && $book && $chapter) {
    $txtPath = $baseDir . '/' . $book . '/' . $chapter;
    if (file_exists($txtPath)) {
        $txtData = parseTxtFile($txtPath, $book, $chapter, $baseDir);
    } else {
        $epubError = 'TXT文件不存在';
    }
} elseif ($isEpub && $isChapterPage && $book && $chapter) {
    $epubPath = $baseDir . '/' . $book . '/' . $chapter;
    if (file_exists($epubPath)) {
        $result = parseEpub($epubPath, $book, $chapter, $baseDir);
        if (isset($result['error'])) {
            $epubError = $result['error'];
        } else {
            $epubData = $result;
            if ($epubData['type'] == 'comic') {
                $images = $epubData['images'];
            }
        }
    } else {
        $epubError = 'EPUB文件不存在';
    }
} elseif (!$isPdf && $isChapterPage && $book && $chapter) {
    $localPath = $baseDir . '/' . $book . '/' . $chapter;
    $images = scanImages($localPath);
}

$currentFile = 'PDF阅读器.php';
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
<script>pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';</script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; min-height: 100vh; transition: all 0.3s ease; }

.floating-buttons, .speed-panel, .theme-selector, .font-controls {
    transition: opacity 0.2s ease, transform 0.2s ease;
    opacity: 0;
    transform: translateX(20px);
    pointer-events: none;
}
.floating-buttons.visible, .speed-panel.visible, .theme-selector.visible, .font-controls.visible {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
}

/* 底部全局进度条样式 */
.global-progress-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1003;
    padding: 8px 16px 16px 16px;
    border-top: 1px solid rgba(255,255,255,0.2);
    transition: transform 0.3s ease, background 0.3s ease;
    transform: translateY(0);
    backdrop-filter: blur(20px);
}
.global-progress-container.hide {
    transform: translateY(100%);
}
.progress-range-area {
    position: relative;
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
}
.progress-slider-global {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    background: rgba(255,255,255,0.25);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
}
.progress-slider-global::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ff9800;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(255,152,0,0.8);
    border: 2px solid #fff;
    transition: transform 0.1s;
}
.progress-slider-global::-webkit-slider-thumb:hover { transform: scale(1.2); }
.progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 4px 0 2px;
    color: rgba(255,255,255,0.85);
}

/* 章节提示框 - 固定在右侧，bottom:280px，right:30px */
.chapter-tooltip {
    position: fixed;
    background: rgba(0,0,0,0.95);
    backdrop-filter: blur(16px);
    color: #ff9800;
    padding: 10px 20px;
    border-radius: 40px;
    font-size: 13px;
    font-weight: bold;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    z-index: 10007;
    border: 1px solid rgba(255,152,0,0.6);
    transition: all 0.1s ease;
    font-family: monospace;
    letter-spacing: 0.5px;
    bottom: 280px;
    right: 12px;
    transform: translateX(0);
    left: auto;
}

/* 全屏3D翻页动画样式 */
.page-turn-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeInOutFull 0.5s ease-out forwards;
    perspective: 2000px;
    backdrop-filter: blur(4px);
}
.page-turn-overlay .book-container {
    position: relative;
    width: 70%;
    max-width: 500px;
    height: 70%;
    max-height: 500px;
    transform-style: preserve-3d;
    animation: bookFlipFull 0.5s ease-in-out forwards;
}
.page-turn-overlay .book-left, .page-turn-overlay .book-right {
    position: absolute;
    width: 50%;
    height: 100%;
    backdrop-filter: blur(12px);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 80px;
    box-shadow: 0 0 40px rgba(0,0,0,0.4);
}
.page-turn-overlay .book-left {
    left: 0;
    transform-origin: right center;
    border-radius: 16px 0 0 16px;
}
.page-turn-overlay .book-right {
    right: 0;
    transform-origin: left center;
    border-radius: 0 16px 16px 0;
}
.page-turn-overlay .message {
    position: absolute;
    bottom: 20%;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 28px;
    border-radius: 50px;
    font-size: 18px;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    backdrop-filter: blur(8px);
    letter-spacing: 2px;
}
@keyframes fadeInOutFull {
    0% { opacity: 0; backdrop-filter: blur(0px); }
    15% { opacity: 1; backdrop-filter: blur(4px); }
    85% { opacity: 1; backdrop-filter: blur(4px); }
    100% { opacity: 0; backdrop-filter: blur(0px); visibility: hidden; }
}
@keyframes bookFlipFull {
    0% { transform: scale(0.9) rotateY(0deg); opacity: 0.5; }
    30% { transform: scale(1.05) rotateY(-15deg); opacity: 1; }
    70% { transform: scale(1.05) rotateY(-5deg); opacity: 1; }
    100% { transform: scale(1) rotateY(0deg); opacity: 1; }
}

/* 滚动速度调节面板 - 右边缘60px */
.speed-panel {
    position: fixed;
    right: 80px;
    bottom: 105px;
    backdrop-filter: blur(12px);
    padding: 12px 16px;
    border-radius: 30px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 10001;
    min-width: 170px;
    border: 1px solid rgba(255,255,255,0.2);
    transition: background 0.3s ease;
}
.speed-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    gap: 12px;
    transition: color 0.3s ease;
}
.speed-value {
    background: rgba(255,255,255,0.2);
    padding: 2px 8px;
    border-radius: 20px;
    font-family: monospace;
    font-size: 13px;
}
.speed-slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    background: rgba(255,255,255,0.3);
    border-radius: 2px;
    outline: none;
}
.speed-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff9800;
    cursor: pointer;
}
.speed-presets {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin-top: 4px;
}
.speed-preset {
    flex: 1;
    text-align: center;
    font-size: 10px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 12px;
    transition: all 0.1s;
}
.speed-preset.active { color: #ff9800; background: rgba(255,152,0,0.2); }
.auto-chapter-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.2);
}
.auto-chapter-line input { width: 36px; height: 20px; cursor: pointer; accent-color: #ff9800; }

/* 字体控制 - 右侧12px */
.font-controls { 
    position: fixed; right: 12px; bottom: 230px; backdrop-filter: blur(10px); padding: 8px 12px; border-radius: 30px; display: flex; gap: 12px; z-index: 10001; transition: background 0.3s ease;
}
.font-controls button { background: none; border: none; font-size: 18px; padding: 4px 8px; cursor: pointer; transition: color 0.3s ease; }

/* 主题选择器 - 右侧12px */
.theme-selector { 
    position: fixed; right: 12px; bottom: 250px; backdrop-filter: blur(12px); padding: 12px; border-radius: 20px; display: flex; flex-wrap: wrap; gap: 8px; z-index: 10001; max-width: 280px; width: max-content; transition: background 0.3s ease;
}

/* 浮动按钮 - 右侧12px */
.floating-buttons { position: fixed; right: 12px; bottom: 100px; display: flex; flex-direction: column; gap: 12px; z-index: 10000; }
.floating-btn { width: 52px; height: 52px; backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; transition: all 0.2s; transition: background 0.3s ease; }
.floating-btn.bookmark-btn { background: linear-gradient(135deg, #ff9800, #ff5722); }
.floating-btn.active { background: #ff9800; }

/* 书签面板 - 右侧12px */
.bookmark-panel {
    position: fixed;
    right: 12px;
    bottom: 220px;
    backdrop-filter: blur(20px);
    border-radius: 20px;
    width: 320px;
    max-height: 450px;
    overflow-y: auto;
    display: none;
    z-index: 10002;
    transition: background 0.3s ease;
}
.bookmark-panel.show { display: block; }
.bookmark-header { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.15); font-weight: 600; display: flex; justify-content: space-between; }
.bookmark-header span:last-child { cursor: pointer; font-size: 22px; }
.bookmark-list { padding: 10px; }
.bookmark-item { background: rgba(255,255,255,0.1); margin: 8px 0; padding: 12px; border-radius: 14px; cursor: pointer; }
.bookmark-item:hover { background: rgba(255,255,255,0.2); }
.bookmark-item .title { font-weight: 600; color: #ffb347; font-size: 14px; }
.bookmark-item .info { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 5px; }
.bookmark-item .delete { float: right; color: #ff6b6b; font-size: 16px; cursor: pointer; }
.empty-bookmark { color: rgba(255,255,255,0.5); text-align: center; padding: 30px; font-size: 13px; }

.theme-dot { width: 36px; height: 36px; border-radius: 12px; cursor: pointer; border: 2px solid rgba(255,255,255,0.5); transition: all 0.1s; box-sizing: border-box; }
.theme-dot.active { border-color: #ff9800; transform: scale(1.05); box-shadow: 0 0 8px rgba(255,152,0,0.5); }

.top-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    transition: all 0.2s ease;
}
.top-bar-left { display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.15); border: none; }
.top-bar .nav-links { font-size: 14px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.top-bar a { text-decoration: none; }
.top-bar button { padding: 8px 18px; border-radius: 30px; cursor: pointer; font-size: 14px; margin-left: 8px; background: rgba(255,255,255,0.15); border: none; }
.top-bar button.bookmark { background: rgba(255, 152, 0, 0.8); color: white; }
.content { margin-top: 70px; padding: 16px; position: relative; z-index: 1; margin-bottom: 70px; }
.ebook-chapter { border-radius: 24px; padding: 30px 24px; margin: 20px auto; max-width: 800px; transition: all 0.2s ease; }
.ebook-chapter p { margin-bottom: 1em; line-height: 1.8; }
.ebook-chapter .chapter-title { font-size: 1.8em; text-align: center; margin-bottom: 1em; padding-bottom: 0.3em; }
.ebook-nav { display: flex; justify-content: space-between; gap: 12px; margin: 20px auto; max-width: 800px; }
.ebook-nav button { border: none; padding: 12px 24px; border-radius: 40px; cursor: pointer; font-size: 16px; flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.ebook-nav button:disabled { opacity: 0.5; cursor: not-allowed; }
.chapter-indicator { text-align: center; margin: 10px auto; font-size: 14px; }
.toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); color: white; padding: 10px 20px; border-radius: 50px; font-size: 14px; z-index: 2000; pointer-events: none; white-space: nowrap; }
.shelf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; padding: 16px; }
.shelf-item { background: rgba(255,255,255,0.12); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); padding: 24px 12px; text-align: center; text-decoration: none; color: white; border-radius: 24px; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.shelf-item:hover { transform: translateY(-3px); background: rgba(255,255,255,0.2); }
.shelf-item .emoji { font-size: 48px; display: block; margin-bottom: 10px; }
.page-title { font-size: 26px; font-weight: 600; color: white; padding: 16px; margin: 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
.progress-bar { position: fixed; top: 60px; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.2); z-index: 1002; }
.progress-fill { width: 0%; height: 100%; background: #ff9800; transition: width 0.3s; }

/* ==================== 18个主题样式 ==================== */

/* 1. 深邃星空 */
body.theme-deep-space { background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); }
body.theme-deep-space .top-bar { background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(20px); border-bottom-color: rgba(255,255,255,0.1); }
body.theme-deep-space .top-bar, body.theme-deep-space .top-bar a, body.theme-deep-space .top-bar button { color: #fff; }
body.theme-deep-space .ebook-chapter { background: rgba(30, 30, 50, 0.95); color: #e0e0e0; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
body.theme-deep-space .ebook-chapter .chapter-title { color: #9b59b6; border-bottom-color: #9b59b6; }
body.theme-deep-space .chapter-indicator { color: rgba(255,255,255,0.7); }
body.theme-deep-space .speed-panel, body.theme-deep-space .font-controls, body.theme-deep-space .theme-selector, body.theme-deep-space .bookmark-panel { background: rgba(15, 12, 41, 0.95); color: #e0e0e0; }
body.theme-deep-space .floating-btn { background: rgba(15, 12, 41, 0.9); color: #fff; }
body.theme-deep-space .global-progress-container { background: rgba(15, 12, 41, 0.92); border-top-color: rgba(155, 89, 182, 0.4); }

/* 2. 羊皮纸 */
body.theme-parchment { background: linear-gradient(135deg, #e6d5b8 0%, #c9a87b 100%); }
body.theme-parchment .top-bar { background: rgba(101, 67, 33, 0.9); backdrop-filter: blur(20px); }
body.theme-parchment .top-bar, body.theme-parchment .top-bar a, body.theme-parchment .top-bar button { color: #3e2723; }
body.theme-parchment .ebook-chapter { background: rgba(253, 245, 220, 0.98); color: #4a3728; }
body.theme-parchment .ebook-chapter .chapter-title { color: #8b4513; border-bottom-color: #8b4513; }
body.theme-parchment .chapter-indicator { color: #3e2723; }
body.theme-parchment .speed-panel, body.theme-parchment .font-controls, body.theme-parchment .theme-selector, body.theme-parchment .bookmark-panel { background: rgba(230, 213, 184, 0.95); color: #3e2723; }
body.theme-parchment .floating-btn { background: rgba(201, 168, 123, 0.9); color: #3e2723; }
body.theme-parchment .global-progress-container { background: rgba(230, 213, 184, 0.92); border-top-color: rgba(139, 69, 19, 0.3); }
body.theme-parchment .progress-info { color: #3e2723; }
body.theme-parchment .progress-slider-global { background: rgba(139, 69, 19, 0.3); }

/* 3. 深海宁静 */
body.theme-ocean { background: linear-gradient(135deg, #1a2980 0%, #26d0ce 100%); }
body.theme-ocean .top-bar { background: rgba(0, 40, 60, 0.85); }
body.theme-ocean .top-bar, body.theme-ocean .top-bar a, body.theme-ocean .top-bar button { color: #e0f7fa; }
body.theme-ocean .ebook-chapter { background: rgba(255, 255, 255, 0.95); color: #2c3e50; }
body.theme-ocean .ebook-chapter .chapter-title { color: #1a2980; border-bottom-color: #1a2980; }
body.theme-ocean .speed-panel, body.theme-ocean .font-controls, body.theme-ocean .theme-selector, body.theme-ocean .bookmark-panel { background: rgba(26, 41, 128, 0.95); color: #e0f7fa; }
body.theme-ocean .floating-btn { background: rgba(38, 208, 206, 0.85); color: #e0f7fa; }
body.theme-ocean .global-progress-container { background: rgba(26, 41, 128, 0.92); border-top-color: rgba(38, 208, 206, 0.4); }

/* 4. 樱花 */
body.theme-cherry { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
body.theme-cherry .top-bar { background: rgba(219, 112, 147, 0.85); }
body.theme-cherry .top-bar, body.theme-cherry .top-bar a, body.theme-cherry .top-bar button { color: #5a2e3e; }
body.theme-cherry .ebook-chapter { background: rgba(255, 245, 245, 0.95); color: #5a3a3a; }
body.theme-cherry .ebook-chapter .chapter-title { color: #db7093; border-bottom-color: #db7093; }
body.theme-cherry .speed-panel, body.theme-cherry .font-controls, body.theme-cherry .theme-selector, body.theme-cherry .bookmark-panel { background: rgba(255, 245, 245, 0.95); color: #5a2e3e; }
body.theme-cherry .floating-btn { background: rgba(219, 112, 147, 0.85); color: #5a2e3e; }
body.theme-cherry .global-progress-container { background: rgba(255, 245, 245, 0.92); border-top-color: rgba(219, 112, 147, 0.4); }
body.theme-cherry .progress-info { color: #5a2e3e; }

/* 5. 黑夜模式 */
body.theme-night { background: #0a0a0a; }
body.theme-night .top-bar { background: rgba(10, 10, 10, 0.95); }
body.theme-night .top-bar, body.theme-night .top-bar a, body.theme-night .top-bar button { color: #aaa; }
body.theme-night .ebook-chapter { background: #1a1a1a; color: #b0b0b0; border: 1px solid #333; }
body.theme-night .ebook-chapter .chapter-title { color: #888; border-bottom-color: #444; }
body.theme-night .speed-panel, body.theme-night .font-controls, body.theme-night .theme-selector, body.theme-night .bookmark-panel { background: rgba(10, 10, 10, 0.95); color: #aaa; }
body.theme-night .floating-btn { background: rgba(30, 30, 30, 0.95); color: #aaa; }
body.theme-night .global-progress-container { background: rgba(10, 10, 10, 0.92); border-top-color: #333; }

/* 6. 森林绿意 */
body.theme-forest { background: linear-gradient(135deg, #134e5e 0%, #71b280 100%); }
body.theme-forest .top-bar { background: rgba(20, 60, 40, 0.85); }
body.theme-forest .top-bar, body.theme-forest .top-bar a, body.theme-forest .top-bar button { color: #e8f5e9; }
body.theme-forest .ebook-chapter { background: rgba(255, 255, 245, 0.95); color: #2d5a3b; }
body.theme-forest .ebook-chapter .chapter-title { color: #2e7d32; border-bottom-color: #2e7d32; }
body.theme-forest .speed-panel, body.theme-forest .font-controls, body.theme-forest .theme-selector, body.theme-forest .bookmark-panel { background: rgba(19, 78, 94, 0.95); color: #e8f5e9; }
body.theme-forest .floating-btn { background: rgba(113, 178, 128, 0.85); color: #e8f5e9; }
body.theme-forest .global-progress-container { background: rgba(19, 78, 94, 0.92); border-top-color: rgba(113, 178, 128, 0.4); }

/* 7. 日落橙 */
body.theme-sunset { background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); }
body.theme-sunset .top-bar { background: rgba(180, 70, 40, 0.85); }
body.theme-sunset .top-bar, body.theme-sunset .top-bar a, body.theme-sunset .top-bar button { color: #fff3e0; }
body.theme-sunset .ebook-chapter { background: rgba(255, 248, 240, 0.96); color: #6b3e1f; }
body.theme-sunset .ebook-chapter .chapter-title { color: #d84315; border-bottom-color: #d84315; }
body.theme-sunset .speed-panel, body.theme-sunset .font-controls, body.theme-sunset .theme-selector, body.theme-sunset .bookmark-panel { background: rgba(255, 126, 95, 0.95); color: #fff3e0; }
body.theme-sunset .floating-btn { background: rgba(254, 180, 123, 0.85); color: #fff3e0; }
body.theme-sunset .global-progress-container { background: rgba(255, 126, 95, 0.92); }

/* 8. 薰衣草 */
body.theme-lavender { background: linear-gradient(135deg, #8e9ecc 0%, #e0bbff 100%); }
body.theme-lavender .top-bar { background: rgba(100, 80, 140, 0.85); }
body.theme-lavender .top-bar, body.theme-lavender .top-bar a, body.theme-lavender .top-bar button { color: #f3e5f5; }
body.theme-lavender .ebook-chapter { background: rgba(245, 235, 255, 0.96); color: #4a3a6e; }
body.theme-lavender .ebook-chapter .chapter-title { color: #7b1fa2; border-bottom-color: #7b1fa2; }
body.theme-lavender .speed-panel, body.theme-lavender .font-controls, body.theme-lavender .theme-selector, body.theme-lavender .bookmark-panel { background: rgba(142, 158, 204, 0.95); color: #4a3a6e; }
body.theme-lavender .floating-btn { background: rgba(224, 187, 255, 0.85); color: #4a3a6e; }
body.theme-lavender .global-progress-container { background: rgba(142, 158, 204, 0.92); }
body.theme-lavender .progress-info { color: #4a3a6e; }

/* 9. 抹茶 */
body.theme-matcha { background: linear-gradient(135deg, #a8c0aa 0%, #6b8c5c 100%); }
body.theme-matcha .top-bar { background: rgba(70, 100, 60, 0.85); }
body.theme-matcha .top-bar, body.theme-matcha .top-bar a, body.theme-matcha .top-bar button { color: #f1f8e9; }
body.theme-matcha .ebook-chapter { background: rgba(248, 255, 240, 0.96); color: #3e5a2e; }
body.theme-matcha .ebook-chapter .chapter-title { color: #558b2f; border-bottom-color: #558b2f; }
body.theme-matcha .speed-panel, body.theme-matcha .font-controls, body.theme-matcha .theme-selector, body.theme-matcha .bookmark-panel { background: rgba(168, 192, 170, 0.95); color: #3e5a2e; }
body.theme-matcha .floating-btn { background: rgba(107, 140, 92, 0.85); color: #3e5a2e; }
body.theme-matcha .global-progress-container { background: rgba(168, 192, 170, 0.92); }
body.theme-matcha .progress-info { color: #3e5a2e; }

/* 10. 蓝莓 */
body.theme-blueberry { background: linear-gradient(135deg, #2c3e66 0%, #4a69bd 100%); }
body.theme-blueberry .top-bar { background: rgba(30, 50, 80, 0.85); }
body.theme-blueberry .top-bar, body.theme-blueberry .top-bar a, body.theme-blueberry .top-bar button { color: #dfe6e9; }
body.theme-blueberry .ebook-chapter { background: rgba(240, 245, 255, 0.96); color: #2c3e66; }
body.theme-blueberry .ebook-chapter .chapter-title { color: #3b82f6; border-bottom-color: #3b82f6; }
body.theme-blueberry .speed-panel, body.theme-blueberry .font-controls, body.theme-blueberry .theme-selector, body.theme-blueberry .bookmark-panel { background: rgba(44, 62, 102, 0.95); color: #dfe6e9; }
body.theme-blueberry .floating-btn { background: rgba(74, 105, 189, 0.85); color: #dfe6e9; }
body.theme-blueberry .global-progress-container { background: rgba(44, 62, 102, 0.92); }

/* 11. 琥珀 */
body.theme-amber { background: linear-gradient(135deg, #ffb347 0%, #ffcc33 100%); }
body.theme-amber .top-bar { background: rgba(160, 90, 30, 0.85); }
body.theme-amber .top-bar, body.theme-amber .top-bar a, body.theme-amber .top-bar button { color: #3e2723; }
body.theme-amber .ebook-chapter { background: rgba(255, 250, 230, 0.96); color: #5d4037; }
body.theme-amber .ebook-chapter .chapter-title { color: #f57c00; border-bottom-color: #f57c00; }
body.theme-amber .speed-panel, body.theme-amber .font-controls, body.theme-amber .theme-selector, body.theme-amber .bookmark-panel { background: rgba(255, 179, 71, 0.95); color: #3e2723; }
body.theme-amber .floating-btn { background: rgba(255, 204, 51, 0.85); color: #3e2723; }
body.theme-amber .global-progress-container { background: rgba(255, 179, 71, 0.92); }
body.theme-amber .progress-info { color: #3e2723; }

/* 12. 石墨 */
body.theme-graphite { background: linear-gradient(135deg, #4a4a4a 0%, #2c2c2c 100%); }
body.theme-graphite .top-bar { background: rgba(30, 30, 30, 0.9); }
body.theme-graphite .top-bar, body.theme-graphite .top-bar a, body.theme-graphite .top-bar button { color: #ccc; }
body.theme-graphite .ebook-chapter { background: rgba(50, 50, 55, 0.96); color: #c0c0c0; border: 1px solid #555; }
body.theme-graphite .ebook-chapter .chapter-title { color: #aaa; border-bottom-color: #666; }
body.theme-graphite .speed-panel, body.theme-graphite .font-controls, body.theme-graphite .theme-selector, body.theme-graphite .bookmark-panel { background: rgba(74, 74, 74, 0.95); color: #ccc; }
body.theme-graphite .floating-btn { background: rgba(44, 44, 44, 0.95); color: #ccc; }
body.theme-graphite .global-progress-container { background: rgba(74, 74, 74, 0.92); }

/* 13. 珊瑚粉 */
body.theme-coral { background: linear-gradient(135deg, #ff6b6b 0%, #ffb8b8 100%); }
body.theme-coral .top-bar { background: rgba(200, 80, 80, 0.85); }
body.theme-coral .top-bar, body.theme-coral .top-bar a, body.theme-coral .top-bar button { color: #fff; }
body.theme-coral .ebook-chapter { background: rgba(255, 240, 240, 0.95); color: #5a3a3a; }
body.theme-coral .ebook-chapter .chapter-title { color: #ff6b6b; border-bottom-color: #ff6b6b; }
body.theme-coral .speed-panel, body.theme-coral .font-controls, body.theme-coral .theme-selector, body.theme-coral .bookmark-panel { background: rgba(200, 80, 80, 0.95); color: #fff; }
body.theme-coral .floating-btn { background: rgba(200, 80, 80, 0.9); color: #fff; }
body.theme-coral .global-progress-container { background: rgba(200, 80, 80, 0.92); }

/* 14. 薄荷绿 */
body.theme-mint { background: linear-gradient(135deg, #a8e6cf 0%, #80deea 100%); }
body.theme-mint .top-bar { background: rgba(60, 120, 100, 0.85); }
body.theme-mint .top-bar, body.theme-mint .top-bar a, body.theme-mint .top-bar button { color: #2d5a3b; }
body.theme-mint .ebook-chapter { background: rgba(255, 255, 250, 0.95); color: #2d5a3b; }
body.theme-mint .ebook-chapter .chapter-title { color: #2ecc71; border-bottom-color: #2ecc71; }
body.theme-mint .speed-panel, body.theme-mint .font-controls, body.theme-mint .theme-selector, body.theme-mint .bookmark-panel { background: rgba(60, 120, 100, 0.95); color: #fff; }
body.theme-mint .floating-btn { background: rgba(60, 120, 100, 0.9); color: #fff; }
body.theme-mint .global-progress-container { background: rgba(60, 120, 100, 0.92); }

/* 15. 浆果紫 */
body.theme-berry { background: linear-gradient(135deg, #6c3483 0%, #a569bd 100%); }
body.theme-berry .top-bar { background: rgba(80, 40, 100, 0.85); }
body.theme-berry .top-bar, body.theme-berry .top-bar a, body.theme-berry .top-bar button { color: #f3e5f5; }
body.theme-berry .ebook-chapter { background: rgba(245, 235, 255, 0.95); color: #4a235a; }
body.theme-berry .ebook-chapter .chapter-title { color: #9b59b6; border-bottom-color: #9b59b6; }
body.theme-berry .speed-panel, body.theme-berry .font-controls, body.theme-berry .theme-selector, body.theme-berry .bookmark-panel { background: rgba(80, 40, 100, 0.95); color: #f3e5f5; }
body.theme-berry .floating-btn { background: rgba(80, 40, 100, 0.9); color: #f3e5f5; }
body.theme-berry .global-progress-container { background: rgba(80, 40, 100, 0.92); }

/* 16. 金盏花 */
body.theme-marigold { background: linear-gradient(135deg, #ffb347 0%, #ffeaa7 100%); }
body.theme-marigold .top-bar { background: rgba(180, 120, 50, 0.85); }
body.theme-marigold .top-bar, body.theme-marigold .top-bar a, body.theme-marigold .top-bar button { color: #5d4037; }
body.theme-marigold .ebook-chapter { background: rgba(255, 252, 240, 0.95); color: #5d4037; }
body.theme-marigold .ebook-chapter .chapter-title { color: #f39c12; border-bottom-color: #f39c12; }
body.theme-marigold .speed-panel, body.theme-marigold .font-controls, body.theme-marigold .theme-selector, body.theme-marigold .bookmark-panel { background: rgba(180, 120, 50, 0.95); color: #fff; }
body.theme-marigold .floating-btn { background: rgba(180, 120, 50, 0.9); color: #fff; }
body.theme-marigold .global-progress-container { background: rgba(180, 120, 50, 0.92); }
body.theme-marigold .progress-info { color: #fff3e0; }

/* 17. 冰川蓝 */
body.theme-glacier { background: linear-gradient(135deg, #4a90e2 0%, #dfe6e9 100%); }
body.theme-glacier .top-bar { background: rgba(30, 70, 120, 0.85); }
body.theme-glacier .top-bar, body.theme-glacier .top-bar a, body.theme-glacier .top-bar button { color: #ecf0f1; }
body.theme-glacier .ebook-chapter { background: rgba(240, 248, 255, 0.95); color: #2c3e50; }
body.theme-glacier .ebook-chapter .chapter-title { color: #4a90e2; border-bottom-color: #4a90e2; }
body.theme-glacier .speed-panel, body.theme-glacier .font-controls, body.theme-glacier .theme-selector, body.theme-glacier .bookmark-panel { background: rgba(30, 70, 120, 0.95); color: #ecf0f1; }
body.theme-glacier .floating-btn { background: rgba(30, 70, 120, 0.9); color: #ecf0f1; }
body.theme-glacier .global-progress-container { background: rgba(30, 70, 120, 0.92); }

/* 18. 玫瑰金 */
body.theme-rosegold { background: linear-gradient(135deg, #e8b4b8 0%, #ffd9e2 100%); }
body.theme-rosegold .top-bar { background: rgba(160, 100, 110, 0.85); }
body.theme-rosegold .top-bar, body.theme-rosegold .top-bar a, body.theme-rosegold .top-bar button { color: #5a3a3e; }
body.theme-rosegold .ebook-chapter { background: rgba(255, 248, 250, 0.95); color: #5a3a3e; }
body.theme-rosegold .ebook-chapter .chapter-title { color: #e8b4b8; border-bottom-color: #e8b4b8; }
body.theme-rosegold .speed-panel, body.theme-rosegold .font-controls, body.theme-rosegold .theme-selector, body.theme-rosegold .bookmark-panel { background: rgba(160, 100, 110, 0.95); color: #fff; }
body.theme-rosegold .floating-btn { background: rgba(160, 100, 110, 0.9); color: #fff; }
body.theme-rosegold .global-progress-container { background: rgba(160, 100, 110, 0.92); }
body.theme-rosegold .progress-info { color: #fff0f0; }

/* 主题色块样式 */
.theme-dot[data-theme="deep-space"] { background: linear-gradient(135deg, #0f0c29, #302b63); }
.theme-dot[data-theme="parchment"] { background: linear-gradient(135deg, #e6d5b8, #c9a87b); }
.theme-dot[data-theme="ocean"] { background: linear-gradient(135deg, #1a2980, #26d0ce); }
.theme-dot[data-theme="cherry"] { background: linear-gradient(135deg, #ff9a9e, #fecfef); }
.theme-dot[data-theme="night"] { background: #1a1a1a; }
.theme-dot[data-theme="forest"] { background: linear-gradient(135deg, #134e5e, #71b280); }
.theme-dot[data-theme="sunset"] { background: linear-gradient(135deg, #ff7e5f, #feb47b); }
.theme-dot[data-theme="lavender"] { background: linear-gradient(135deg, #8e9ecc, #e0bbff); }
.theme-dot[data-theme="matcha"] { background: linear-gradient(135deg, #a8c0aa, #6b8c5c); }
.theme-dot[data-theme="blueberry"] { background: linear-gradient(135deg, #2c3e66, #4a69bd); }
.theme-dot[data-theme="amber"] { background: linear-gradient(135deg, #ffb347, #ffcc33); }
.theme-dot[data-theme="graphite"] { background: linear-gradient(135deg, #4a4a4a, #2c2c2c); }
.theme-dot[data-theme="coral"] { background: linear-gradient(135deg, #ff6b6b, #ffb8b8); }
.theme-dot[data-theme="mint"] { background: linear-gradient(135deg, #a8e6cf, #80deea); }
.theme-dot[data-theme="berry"] { background: linear-gradient(135deg, #6c3483, #a569bd); }
.theme-dot[data-theme="marigold"] { background: linear-gradient(135deg, #ffb347, #ffeaa7); }
.theme-dot[data-theme="glacier"] { background: linear-gradient(135deg, #4a90e2, #dfe6e9); }
.theme-dot[data-theme="rosegold"] { background: linear-gradient(135deg, #e8b4b8, #ffd9e2); }
</style>
</head>
<body class="theme-deep-space">

<div class="floating-buttons" id="floatingButtons">
    <div class="floating-btn bookmark-btn" id="bookmarkFloatBtn">📋</div>
    <div class="floating-btn scroll-down" id="scrollToggleBtn">▼</div>
    <div class="floating-btn" id="themeFloatBtn">🎨</div>
</div>

<div class="speed-panel" id="speedPanel">
    <div class="speed-label">
        <span>⚡ 滚动速度</span>
        <span class="speed-value" id="speedValue">6 px/帧</span>
    </div>
    <input type="range" class="speed-slider" id="speedSlider" min="1" max="30" value="6" step="1">
    <div class="speed-presets">
        <div class="speed-preset" data-speed="3">🐢 慢</div>
        <div class="speed-preset" data-speed="6">⚡ 中</div>
        <div class="speed-preset" data-speed="10">🚀 快</div>
        <div class="speed-preset" data-speed="18">💨 极快</div>
    </div>
    <div class="auto-chapter-line">
        <span>📖 自动翻章</span>
        <input type="checkbox" id="autoChapterCheckbox" checked>
    </div>
</div>

<div class="font-controls" id="fontControls">
    <button id="fontMinus">A-</button>
    <button id="fontPlus">A+</button>
</div>
<div class="theme-selector" id="themeSelector">
    <div class="theme-dot" data-theme="deep-space" title="深邃星空"></div>
    <div class="theme-dot" data-theme="parchment" title="羊皮纸"></div>
    <div class="theme-dot" data-theme="ocean" title="深海宁静"></div>
    <div class="theme-dot" data-theme="cherry" title="樱花"></div>
    <div class="theme-dot" data-theme="night" title="黑夜模式"></div>
    <div class="theme-dot" data-theme="forest" title="森林绿意"></div>
    <div class="theme-dot" data-theme="sunset" title="日落橙"></div>
    <div class="theme-dot" data-theme="lavender" title="薰衣草"></div>
    <div class="theme-dot" data-theme="matcha" title="抹茶"></div>
    <div class="theme-dot" data-theme="blueberry" title="蓝莓"></div>
    <div class="theme-dot" data-theme="amber" title="琥珀"></div>
    <div class="theme-dot" data-theme="graphite" title="石墨"></div>
    <div class="theme-dot" data-theme="coral" title="珊瑚粉"></div>
    <div class="theme-dot" data-theme="mint" title="薄荷绿"></div>
    <div class="theme-dot" data-theme="berry" title="浆果紫"></div>
    <div class="theme-dot" data-theme="marigold" title="金盏花"></div>
    <div class="theme-dot" data-theme="glacier" title="冰川蓝"></div>
    <div class="theme-dot" data-theme="rosegold" title="玫瑰金"></div>
</div>
<div class="bookmark-panel" id="bookmarkPanel">
    <div class="bookmark-header">
        <span>📖 我的书签</span>
        <span id="closePanelBtn">✕</span>
    </div>
    <div class="bookmark-list" id="bookmarkList">
        <div class="empty-bookmark">📭 暂无书签<br>点击 ⭐ 添加</div>
    </div>
</div>

<!-- 底部全局进度条占位 -->
<div id="globalProgressPlaceholder"></div>

<script>
const floatingBtns = document.getElementById('floatingButtons');
const speedPanel = document.getElementById('speedPanel');
const fontControls = document.getElementById('fontControls');
const themeSelector = document.getElementById('themeSelector');
const bookmarkPanel = document.getElementById('bookmarkPanel');

let hideTimer = null;
let globalProgressBar = null;

function showControls() {
    floatingBtns.classList.add('visible');
    speedPanel.classList.add('visible');
    if (globalProgressBar) globalProgressBar.classList.remove('hide');
    resetHideTimer();
}

function hideControls() {
    floatingBtns.classList.remove('visible');
    speedPanel.classList.remove('visible');
    fontControls.classList.remove('visible');
    themeSelector.classList.remove('visible');
    if (globalProgressBar) globalProgressBar.classList.add('hide');
}

function resetHideTimer() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        if (!bookmarkPanel.classList.contains('show') && !themeSelector.classList.contains('visible') && !fontControls.classList.contains('visible') && !speedPanel.classList.contains('visible')) {
            hideControls();
        } else {
            resetHideTimer();
        }
    }, 5000);
}

let lastTap = 0;
document.body.addEventListener('click', (e) => {
    const now = Date.now();
    const timeDiff = now - lastTap;
    const isControlElement = e.target.closest('.floating-btn') || e.target.closest('.bookmark-panel') || 
                             e.target.closest('.theme-selector') || e.target.closest('.font-controls') ||
                             e.target.closest('.speed-panel') || e.target.closest('.global-progress-container');
    if (!isControlElement && timeDiff < 300 && timeDiff > 0) {
        e.preventDefault();
        if (floatingBtns.classList.contains('visible')) {
            hideControls();
            if (hideTimer) clearTimeout(hideTimer);
        } else {
            showControls();
        }
    }
    lastTap = now;
});

const interactiveElements = [floatingBtns, speedPanel, fontControls, themeSelector];
interactiveElements.forEach(el => {
    if (!el) return;
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (floatingBtns.classList.contains('visible')) resetHideTimer();
    });
    const slider = el.querySelector('.speed-slider');
    if (slider) {
        slider.addEventListener('input', () => {
            if (floatingBtns.classList.contains('visible')) resetHideTimer();
        });
    }
});

const bookmarkFloatBtn = document.getElementById('bookmarkFloatBtn');
const closePanelBtn = document.getElementById('closePanelBtn');
if (bookmarkFloatBtn) {
    bookmarkFloatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bookmarkPanel.classList.toggle('show');
        if (bookmarkPanel.classList.contains('show')) {
            showControls();
            if (hideTimer) clearTimeout(hideTimer);
        } else {
            resetHideTimer();
        }
    });
}
if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => {
        bookmarkPanel.classList.remove('show');
        resetHideTimer();
    });
}

const themeFloatBtn = document.getElementById('themeFloatBtn');
if (themeFloatBtn) {
    themeFloatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (themeSelector.classList.contains('visible')) {
            themeSelector.classList.remove('visible');
        } else {
            themeSelector.classList.add('visible');
            resetHideTimer();
        }
    });
}

const THEMES = [
    'deep-space', 'parchment', 'ocean', 'cherry', 'night',
    'forest', 'sunset', 'lavender', 'matcha', 'blueberry', 'amber', 'graphite',
    'coral', 'mint', 'berry', 'marigold', 'glacier', 'rosegold'
];
function setTheme(themeName) {
    document.body.className = 'theme-' + themeName;
    localStorage.setItem('reader_theme', themeName);
    document.querySelectorAll('.theme-dot').forEach(dot => {
        if (dot.dataset.theme === themeName) dot.classList.add('active');
        else dot.classList.remove('active');
    });
    if (window.updateAllTooltipColors) window.updateAllTooltipColors();
}
const savedTheme = localStorage.getItem('reader_theme');
if (savedTheme && THEMES.includes(savedTheme)) setTheme(savedTheme);
else setTheme('deep-space');

document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
        e.stopPropagation();
        setTheme(dot.dataset.theme);
        themeSelector.classList.remove('visible');
        showToast('🎨 主题已切换');
        resetHideTimer();
    });
});

const scrollBtn = document.getElementById('scrollToggleBtn');
if (scrollBtn) {
    scrollBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (fontControls.classList.contains('visible')) {
            fontControls.classList.remove('visible');
        } else {
            fontControls.classList.add('visible');
            resetHideTimer();
        }
    });
}

const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const speedPresets = document.querySelectorAll('.speed-preset');
let currentSpeed = 6;
let autoScrollInterval = null;
let isAutoScrolling = false;
const savedSpeed = localStorage.getItem('scroll_speed');
if (savedSpeed) {
    currentSpeed = parseInt(savedSpeed);
    if (speedSlider) speedSlider.value = currentSpeed;
    if (speedValue) speedValue.innerText = currentSpeed + ' px/帧';
    speedPresets.forEach(preset => {
        const presetSpeed = parseInt(preset.dataset.speed);
        if (presetSpeed === currentSpeed) preset.classList.add('active');
        else preset.classList.remove('active');
    });
}
function updateSpeed(newSpeed) {
    currentSpeed = Math.min(30, Math.max(1, newSpeed));
    if (speedSlider) speedSlider.value = currentSpeed;
    if (speedValue) speedValue.innerText = currentSpeed + ' px/帧';
    localStorage.setItem('scroll_speed', currentSpeed);
    speedPresets.forEach(preset => {
        const presetSpeed = parseInt(preset.dataset.speed);
        if (presetSpeed === currentSpeed) preset.classList.add('active');
        else preset.classList.remove('active');
    });
    if (isAutoScrolling) {
        stopAutoScroll();
        startAutoScroll();
    }
}
if (speedSlider) {
    speedSlider.oninput = (e) => {
        updateSpeed(parseInt(e.target.value));
        showToast(`⚡ 速度 ${currentSpeed} px/帧`);
        resetHideTimer();
    };
}
speedPresets.forEach(preset => {
    preset.onclick = () => {
        const newSpeed = parseInt(preset.dataset.speed);
        updateSpeed(newSpeed);
        showToast(`⚡ ${preset.innerText} ${newSpeed} px/帧`);
        resetHideTimer();
    };
});
function startAutoScroll() {
    if (autoScrollInterval) clearInterval(autoScrollInterval);
    autoScrollInterval = setInterval(() => window.scrollBy(0, currentSpeed), 25);
    isAutoScrolling = true;
    if (scrollBtn) {
        scrollBtn.classList.add('active');
        scrollBtn.innerHTML = "⏸";
    }
    showToast(`▶ 滚动中 (${currentSpeed}px/帧)`);
}
function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    isAutoScrolling = false;
    if (scrollBtn) {
        scrollBtn.classList.remove('active');
        scrollBtn.innerHTML = "▼";
    }
    showToast('⏹ 已停止');
}
if (scrollBtn) {
    scrollBtn.onclick = (e) => {
        e.stopPropagation();
        if (isAutoScrolling) stopAutoScroll();
        else startAutoScroll();
        resetHideTimer();
    };
}
function showToast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 1500);
}

const STORAGE_KEY = "bookmarks_v6";
function getBookmarks(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }catch(e){ return []; }
}
function saveBookmarks(list){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    refreshBookmarkList();
}
function refreshBookmarkList(){
    let list = getBookmarks();
    let container = document.getElementById('bookmarkList');
    if(!container) return;
    if(list.length===0){
        container.innerHTML='<div class="empty-bookmark">📭 暂无书签<br>点击 ⭐ 添加</div>';
        return;
    }
    list.sort((a,b)=>b.time-a.time);
    let html='';
    for(let b of list){
        let pageLabel = b.type==='txt'?'第'+b.page+'章':(b.type==='ebook'?'第'+b.page+'章':'第'+b.page+'页');
        html+=`<div class="bookmark-item" data-book="${escapeHtml(b.book)}" data-chapter="${escapeHtml(b.chapter)}" data-page="${b.page}">
            <span class="delete" data-book="${escapeHtml(b.book)}" data-chapter="${escapeHtml(b.chapter)}">🗑</span>
            <div class="title">📖 ${escapeHtml(b.book.length>18?b.book.substring(0,18)+'...':b.book)}</div>
            <div class="info">📄 ${escapeHtml(b.chapterName||b.chapter.substring(0,25))} &nbsp;|&nbsp; 📍 ${pageLabel}</div>
        </div>`;
    }
    container.innerHTML=html;
    document.querySelectorAll('#bookmarkList .bookmark-item').forEach(item=>{
        let book=item.getAttribute('data-book'), chapter=item.getAttribute('data-chapter'), page=parseInt(item.getAttribute('data-page'))||1;
        item.onclick=(e)=>{
            if(e.target.classList.contains('delete')) return;
            jumpToBookmark(book,chapter,page);
        };
        let db=item.querySelector('.delete');
        if(db) db.onclick=(e)=>{
            e.stopPropagation();
            removeBookmark(db.getAttribute('data-book'), db.getAttribute('data-chapter'));
        };
    });
}
function removeBookmark(book,chapter){
    let list=getBookmarks();
    list=list.filter(b=>!(b.book===book&&b.chapter===chapter));
    saveBookmarks(list);
    showToast('🗑 删除书签');
}
function escapeHtml(s){
    return (s||'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}
let CURRENT_BOOK = '', CURRENT_CHAPTER = '';
function jumpToBookmark(book,chapter,page){
    if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER){
        if (typeof jumpToPage === 'function') jumpToPage(page);
        else if (typeof renderChapter === 'function') renderChapter(Math.min(Math.max(1,page), (typeof chapters !== 'undefined' ? chapters.length : 1))-1);
    }else{
        sessionStorage.setItem('jump_target', JSON.stringify({book,chapter,page}));
        location.href = '<?php echo $currentFile; ?>?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);
    }
}

// ==================== 全屏3D翻书动画自动翻章功能 ====================
let autoChapterEnabled = true;
let isTurningPage = false;
let turnTimer = null;
let lastScrollTop = 0;
let scrollDirection = 'down';
const autoChapterCheckbox = document.getElementById('autoChapterCheckbox');

function getThemeColorsForAnimation() {
    const bodyClass = document.body.className;
    let overlayBg = 'rgba(15, 12, 41, 0.92)';
    let leftBg = 'rgba(48, 43, 99, 0.95)';
    let rightBg = 'rgba(48, 43, 99, 0.95)';
    let leftBorder = '2px solid rgba(155, 89, 182, 0.6)';
    let rightBorder = '2px solid rgba(155, 89, 182, 0.6)';
    let msgBg = 'rgba(48, 43, 99, 0.95)';
    let msgColor = '#bb86fc';
    let msgBorder = '1px solid rgba(155, 89, 182, 0.5)';
    
    if (bodyClass.includes('parchment')) {
        overlayBg = 'rgba(230, 213, 184, 0.92)';
        leftBg = 'rgba(201, 168, 123, 0.95)';
        rightBg = 'rgba(201, 168, 123, 0.95)';
        leftBorder = '2px solid rgba(139, 69, 19, 0.5)';
        rightBorder = '2px solid rgba(139, 69, 19, 0.5)';
        msgBg = 'rgba(201, 168, 123, 0.95)';
        msgColor = '#3e2723';
        msgBorder = '1px solid rgba(139, 69, 19, 0.4)';
    } else if (bodyClass.includes('ocean')) {
        overlayBg = 'rgba(26, 41, 128, 0.92)';
        leftBg = 'rgba(38, 208, 206, 0.9)';
        rightBg = 'rgba(38, 208, 206, 0.9)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(26, 41, 128, 0.95)';
        msgColor = '#e0f7fa';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('cherry')) {
        overlayBg = 'rgba(255, 154, 158, 0.92)';
        leftBg = 'rgba(254, 207, 239, 0.95)';
        rightBg = 'rgba(254, 207, 239, 0.95)';
        leftBorder = '2px solid rgba(219, 112, 147, 0.6)';
        rightBorder = '2px solid rgba(219, 112, 147, 0.6)';
        msgBg = 'rgba(219, 112, 147, 0.95)';
        msgColor = '#5a2e3e';
        msgBorder = '1px solid rgba(219, 112, 147, 0.4)';
    } else if (bodyClass.includes('night')) {
        overlayBg = 'rgba(10, 10, 10, 0.95)';
        leftBg = 'rgba(30, 30, 30, 0.98)';
        rightBg = 'rgba(30, 30, 30, 0.98)';
        leftBorder = '2px solid #555';
        rightBorder = '2px solid #555';
        msgBg = 'rgba(30, 30, 30, 0.98)';
        msgColor = '#aaa';
        msgBorder = '1px solid #555';
    } else if (bodyClass.includes('forest')) {
        overlayBg = 'rgba(19, 78, 94, 0.92)';
        leftBg = 'rgba(113, 178, 128, 0.9)';
        rightBg = 'rgba(113, 178, 128, 0.9)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(19, 78, 94, 0.95)';
        msgColor = '#e8f5e9';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('sunset')) {
        overlayBg = 'rgba(255, 126, 95, 0.92)';
        leftBg = 'rgba(254, 180, 123, 0.95)';
        rightBg = 'rgba(254, 180, 123, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(255, 126, 95, 0.95)';
        msgColor = '#fff3e0';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('lavender')) {
        overlayBg = 'rgba(142, 158, 204, 0.92)';
        leftBg = 'rgba(224, 187, 255, 0.95)';
        rightBg = 'rgba(224, 187, 255, 0.95)';
        leftBorder = '2px solid rgba(123, 31, 162, 0.5)';
        rightBorder = '2px solid rgba(123, 31, 162, 0.5)';
        msgBg = 'rgba(142, 158, 204, 0.95)';
        msgColor = '#4a3a6e';
        msgBorder = '1px solid rgba(123, 31, 162, 0.4)';
    } else if (bodyClass.includes('matcha')) {
        overlayBg = 'rgba(168, 192, 170, 0.92)';
        leftBg = 'rgba(107, 140, 92, 0.95)';
        rightBg = 'rgba(107, 140, 92, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(168, 192, 170, 0.95)';
        msgColor = '#3e5a2e';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('blueberry')) {
        overlayBg = 'rgba(44, 62, 102, 0.92)';
        leftBg = 'rgba(74, 105, 189, 0.9)';
        rightBg = 'rgba(74, 105, 189, 0.9)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(44, 62, 102, 0.95)';
        msgColor = '#dfe6e9';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('amber')) {
        overlayBg = 'rgba(255, 179, 71, 0.92)';
        leftBg = 'rgba(255, 204, 51, 0.95)';
        rightBg = 'rgba(255, 204, 51, 0.95)';
        leftBorder = '2px solid rgba(160, 90, 30, 0.5)';
        rightBorder = '2px solid rgba(160, 90, 30, 0.5)';
        msgBg = 'rgba(255, 179, 71, 0.95)';
        msgColor = '#3e2723';
        msgBorder = '1px solid rgba(160, 90, 30, 0.4)';
    } else if (bodyClass.includes('graphite')) {
        overlayBg = 'rgba(74, 74, 74, 0.95)';
        leftBg = 'rgba(44, 44, 44, 0.98)';
        rightBg = 'rgba(44, 44, 44, 0.98)';
        leftBorder = '2px solid #777';
        rightBorder = '2px solid #777';
        msgBg = 'rgba(74, 74, 74, 0.98)';
        msgColor = '#ddd';
        msgBorder = '1px solid #666';
    } else if (bodyClass.includes('coral')) {
        overlayBg = 'rgba(255, 107, 107, 0.92)';
        leftBg = 'rgba(255, 142, 142, 0.95)';
        rightBg = 'rgba(255, 142, 142, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(255, 107, 107, 0.95)';
        msgColor = '#fff';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('mint')) {
        overlayBg = 'rgba(168, 230, 207, 0.92)';
        leftBg = 'rgba(128, 222, 234, 0.95)';
        rightBg = 'rgba(128, 222, 234, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(168, 230, 207, 0.95)';
        msgColor = '#2d5a3b';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('berry')) {
        overlayBg = 'rgba(108, 52, 131, 0.92)';
        leftBg = 'rgba(142, 68, 173, 0.95)';
        rightBg = 'rgba(142, 68, 173, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(108, 52, 131, 0.95)';
        msgColor = '#f3e5f5';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('marigold')) {
        overlayBg = 'rgba(255, 179, 71, 0.92)';
        leftBg = 'rgba(255, 204, 51, 0.95)';
        rightBg = 'rgba(255, 204, 51, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(255, 179, 71, 0.95)';
        msgColor = '#5d4037';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('glacier')) {
        overlayBg = 'rgba(74, 144, 226, 0.92)';
        leftBg = 'rgba(116, 185, 255, 0.95)';
        rightBg = 'rgba(116, 185, 255, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(74, 144, 226, 0.95)';
        msgColor = '#ecf0f1';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    } else if (bodyClass.includes('rosegold')) {
        overlayBg = 'rgba(232, 180, 184, 0.92)';
        leftBg = 'rgba(245, 198, 203, 0.95)';
        rightBg = 'rgba(245, 198, 203, 0.95)';
        leftBorder = '2px solid rgba(255,255,255,0.4)';
        rightBorder = '2px solid rgba(255,255,255,0.4)';
        msgBg = 'rgba(232, 180, 184, 0.95)';
        msgColor = '#5a3a3e';
        msgBorder = '1px solid rgba(255,255,255,0.3)';
    }
    
    return { overlayBg, leftBg, rightBg, leftBorder, rightBorder, msgBg, msgColor, msgBorder };
}

function showBookTurnAnimation(callback) {
    if (isTurningPage) {
        if (callback) callback();
        return;
    }
    isTurningPage = true;
    
    const colors = getThemeColorsForAnimation();
    
    let overlay = document.createElement('div');
    overlay.className = 'page-turn-overlay';
    overlay.style.background = colors.overlayBg;
    overlay.innerHTML = `
        <div class="book-container">
            <div class="book-left">📖</div>
            <div class="book-right">📖</div>
            <div class="message">✨ 正在翻开新篇章 ✨</div>
        </div>
    `;
    
    const bookLeft = overlay.querySelector('.book-left');
    const bookRight = overlay.querySelector('.book-right');
    const message = overlay.querySelector('.message');
    
    if (bookLeft) {
        bookLeft.style.background = colors.leftBg;
        bookLeft.style.border = colors.leftBorder;
        bookLeft.style.boxShadow = '0 0 30px rgba(0,0,0,0.4)';
    }
    if (bookRight) {
        bookRight.style.background = colors.rightBg;
        bookRight.style.border = colors.rightBorder;
        bookRight.style.boxShadow = '0 0 30px rgba(0,0,0,0.4)';
    }
    if (message) {
        message.style.background = colors.msgBg;
        message.style.color = colors.msgColor;
        message.style.border = colors.msgBorder;
        message.style.backdropFilter = 'blur(8px)';
    }
    
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        if (callback) callback();
        setTimeout(() => {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            isTurningPage = false;
        }, 150);
    }, 450);
}

if (localStorage.getItem('autoChapterEnabled') !== null) {
    autoChapterEnabled = localStorage.getItem('autoChapterEnabled') === 'true';
    if (autoChapterCheckbox) autoChapterCheckbox.checked = autoChapterEnabled;
} else {
    autoChapterEnabled = true;
    if (autoChapterCheckbox) autoChapterCheckbox.checked = true;
}

if (autoChapterCheckbox) {
    autoChapterCheckbox.onchange = function(e) {
        e.stopPropagation();
        autoChapterEnabled = this.checked;
        localStorage.setItem('autoChapterEnabled', autoChapterEnabled);
        showToast(autoChapterEnabled ? '✅ 自动翻章已开启' : '⏹ 自动翻章已关闭');
        resetHideTimer();
    };
}

let scrollTimer = null;

function checkScrollBottom() {
    if (!autoChapterEnabled) return;
    if (isTurningPage) return;
    
    let totalHeight = document.body.scrollHeight;
    let windowHeight = window.innerHeight;
    let scrollTop = window.scrollY;
    
    if (scrollTop > lastScrollTop) {
        scrollDirection = 'down';
    } else if (scrollTop < lastScrollTop) {
        scrollDirection = 'up';
        if (turnTimer) {
            clearTimeout(turnTimer);
            turnTimer = null;
        }
    }
    lastScrollTop = scrollTop;
    
    let isAtBottom = (scrollTop + windowHeight + 15) >= totalHeight;
    
    if (isAtBottom && scrollDirection === 'down' && !turnTimer) {
        let hasNext = false;
        let nextBtn = document.getElementById('nextChapterBtn');
        if (nextBtn && !nextBtn.disabled) {
            hasNext = true;
        }
        
        if (hasNext) {
            showToast('📖 3秒后自动翻到下一章...');
            turnTimer = setTimeout(() => {
                if (!autoChapterEnabled || isTurningPage) {
                    turnTimer = null;
                    return;
                }
                let currentScrollTop = window.scrollY;
                let currentIsAtBottom = (currentScrollTop + windowHeight + 15) >= document.body.scrollHeight;
                if (!currentIsAtBottom) {
                    turnTimer = null;
                    return;
                }
                
                showBookTurnAnimation(function() {
                    if (nextBtn) {
                        nextBtn.click();
                    }
                    setTimeout(() => {
                        turnTimer = null;
                    }, 1000);
                });
            }, 3000);
        }
    }
}

window.addEventListener('scroll', function() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(checkScrollBottom, 100);
});

function onChapterChange() {
    if (turnTimer) {
        clearTimeout(turnTimer);
        turnTimer = null;
    }
    isTurningPage = false;
    lastScrollTop = 0;
    scrollDirection = 'down';
    window.scrollTo(0, 0);
    if (typeof updateGlobalProgress === 'function') updateGlobalProgress();
}

// ==================== 全局进度条功能 ====================
let globalChapters = [];
let globalTotalChapters = 0;
let globalCurrentIndex = 0;
let lastChapterIndex = -1;
let tooltipHideTimer = null;

function getThemeTooltipColors() {
    const bodyClass = document.body.className;
    let bgColor = 'rgba(0,0,0,0.95)';
    let textColor = '#ff9800';
    let borderColor = 'rgba(255,152,0,0.6)';
    
    if (bodyClass.includes('parchment')) {
        bgColor = 'rgba(201, 168, 123, 0.98)';
        textColor = '#3e2723';
        borderColor = 'rgba(139, 69, 19, 0.6)';
    } else if (bodyClass.includes('ocean')) {
        bgColor = 'rgba(26, 41, 128, 0.98)';
        textColor = '#e0f7fa';
        borderColor = 'rgba(38, 208, 206, 0.6)';
    } else if (bodyClass.includes('cherry')) {
        bgColor = 'rgba(219, 112, 147, 0.98)';
        textColor = '#5a2e3e';
        borderColor = 'rgba(255,255,255,0.5)';
    } else if (bodyClass.includes('night')) {
        bgColor = 'rgba(30, 30, 30, 0.98)';
        textColor = '#aaa';
        borderColor = '#555';
    } else if (bodyClass.includes('forest')) {
        bgColor = 'rgba(19, 78, 94, 0.98)';
        textColor = '#e8f5e9';
        borderColor = 'rgba(113, 178, 128, 0.6)';
    } else if (bodyClass.includes('sunset')) {
        bgColor = 'rgba(255, 126, 95, 0.98)';
        textColor = '#fff3e0';
        borderColor = 'rgba(255,255,255,0.5)';
    } else if (bodyClass.includes('lavender')) {
        bgColor = 'rgba(142, 158, 204, 0.98)';
        textColor = '#4a3a6e';
        borderColor = 'rgba(123, 31, 162, 0.5)';
    } else if (bodyClass.includes('matcha')) {
        bgColor = 'rgba(107, 140, 92, 0.98)';
        textColor = '#3e5a2e';
        borderColor = 'rgba(255,255,255,0.5)';
    } else if (bodyClass.includes('blueberry')) {
        bgColor = 'rgba(44, 62, 102, 0.98)';
        textColor = '#dfe6e9';
        borderColor = 'rgba(74, 105, 189, 0.6)';
    } else if (bodyClass.includes('amber')) {
        bgColor = 'rgba(255, 179, 71, 0.98)';
        textColor = '#3e2723';
        borderColor = 'rgba(160, 90, 30, 0.5)';
    } else if (bodyClass.includes('graphite')) {
        bgColor = 'rgba(74, 74, 74, 0.98)';
        textColor = '#ddd';
        borderColor = '#777';
    } else if (bodyClass.includes('coral')) {
        bgColor = 'rgba(200, 80, 80, 0.98)';
        textColor = '#fff';
        borderColor = 'rgba(255,255,255,0.5)';
    } else if (bodyClass.includes('mint')) {
        bgColor = 'rgba(60, 120, 100, 0.98)';
        textColor = '#fff';
        borderColor = 'rgba(255,255,255,0.5)';
    } else if (bodyClass.includes('berry')) {
        bgColor = 'rgba(80, 40, 100, 0.98)';
        textColor = '#f3e5f5';
        borderColor = 'rgba(255,255,255,0.5)';
    } else if (bodyClass.includes('marigold')) {
        bgColor = 'rgba(180, 120, 50, 0.98)';
        textColor = '#fff3e0';
        borderColor = 'rgba(255,255,255,0.5)';
    } else if (bodyClass.includes('glacier')) {
        bgColor = 'rgba(30, 70, 120, 0.98)';
        textColor = '#ecf0f1';
        borderColor = 'rgba(74, 144, 226, 0.6)';
    } else if (bodyClass.includes('rosegold')) {
        bgColor = 'rgba(160, 100, 110, 0.98)';
        textColor = '#fff0f0';
        borderColor = 'rgba(255,255,255,0.5)';
    }
    
    return { bgColor, textColor, borderColor };
}

function updateTooltipStyle(tooltip) {
    if (!tooltip) return;
    const colors = getThemeTooltipColors();
    tooltip.style.backgroundColor = colors.bgColor;
    tooltip.style.color = colors.textColor;
    tooltip.style.border = `1px solid ${colors.borderColor}`;
}

window.updateAllTooltipColors = function() {
    const tooltip = document.getElementById('chapterTooltip');
    if (tooltip) updateTooltipStyle(tooltip);
};

function showChapterTooltip(chapterIndex, chapterTitle) {
    let tooltip = document.getElementById('chapterTooltip');
    if (!tooltip) return;
    
    if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
    
    let displayText = `📖 第 ${chapterIndex+1} 章 · ${chapterTitle.substring(0, 32)}`;
    if (chapterTitle.length > 32) displayText += '...';
    tooltip.textContent = displayText;
    
    updateTooltipStyle(tooltip);
    
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
    
    tooltipHideTimer = setTimeout(() => {
        if (tooltip) tooltip.style.display = 'none';
    }, 2000);
}

function createGlobalProgressBar(total, currentIdx, chaptersList) {
    let container = document.getElementById('globalProgressPlaceholder');
    if (!container) return;
    container.innerHTML = `
        <div class="global-progress-container" id="globalProgressBar">
            <div class="progress-range-area" id="progressRangeArea">
                <input type="range" class="progress-slider-global" id="globalProgressSlider" min="0" max="${total-1}" value="${currentIdx}" step="1">
                <div class="chapter-tooltip" id="chapterTooltip" style="display: none;">📖 ${escapeHtml(chaptersList[currentIdx]?.title || '章节')}</div>
            </div>
            <div class="progress-info">
                <div class="progress-label">
                    <span>📖 第 ${currentIdx+1} / ${total} 章</span>
                </div>
                <div>${escapeHtml(chaptersList[currentIdx]?.title || '')}</div>
            </div>
        </div>
    `;
    globalProgressBar = document.getElementById('globalProgressBar');
    let slider = document.getElementById('globalProgressSlider');
    let rangeArea = document.getElementById('progressRangeArea');
    
    if (slider) {
        slider.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        slider.addEventListener('input', (e) => {
            let idx = parseInt(e.target.value);
            let chapterTitle = chaptersList[idx]?.title || '章节';
            if (idx !== lastChapterIndex) {
                lastChapterIndex = idx;
                showChapterTooltip(idx, chapterTitle);
            }
        });
        
        slider.addEventListener('change', (e) => {
            let idx = parseInt(e.target.value);
            if (typeof renderChapter === 'function') {
                renderChapter(idx);
                showToast(`📖 跳转到第 ${idx+1} 章: ${chaptersList[idx]?.title || ''}`);
            }
            resetHideTimer();
        });
        
        slider.addEventListener('mousemove', (e) => {
            let rect = slider.getBoundingClientRect();
            let percent = (e.clientX - rect.left) / rect.width;
            let idx = Math.round(percent * (slider.max - slider.min)) + parseInt(slider.min);
            idx = Math.min(slider.max, Math.max(slider.min, idx));
            if (chaptersList[idx] && idx !== lastChapterIndex) {
                lastChapterIndex = idx;
                showChapterTooltip(idx, chaptersList[idx].title);
            }
        });
    }
    
    const observer = new MutationObserver(() => {
        const tooltip = document.getElementById('chapterTooltip');
        if (tooltip && tooltip.style.display === 'block') {
            updateTooltipStyle(tooltip);
        }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    if (globalProgressBar) globalProgressBar.classList.add('hide');
}

function updateGlobalProgress() {
    let container = document.getElementById('globalProgressBar');
    if (!container) return;
    let slider = document.getElementById('globalProgressSlider');
    let infoLabel = container.querySelector('.progress-label span');
    let infoTitle = container.querySelector('.progress-info > div:last-child');
    if (slider && globalTotalChapters > 0) {
        slider.value = globalCurrentIndex;
        if (infoLabel) infoLabel.innerText = `📖 第 ${globalCurrentIndex+1} / ${globalTotalChapters} 章`;
        if (infoTitle && globalChapters[globalCurrentIndex]) infoTitle.innerText = globalChapters[globalCurrentIndex].title || '';
        lastChapterIndex = globalCurrentIndex;
    }
}

window.updateGlobalProgress = updateGlobalProgress;
window.updateAllTooltipColors = updateAllTooltipColors;
</script>

<?php if ($isChapterPage && $isPdf): ?>
<!-- PDF阅读页 -->
<div class="top-bar">
    <div class="top-bar-left">
        <button class="back-btn" id="backBtn">←</button>
        <div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a> / <a href="<?php echo $currentFile; ?>?book=<?php echo rawurlencode($book); ?>"><?php echo htmlspecialchars(mb_substr($book, 0, 12)); ?></a></div>
    </div>
    <div><button id="addBookmarkBtn" class="bookmark">⭐ 加书签</button></div>
</div>
<div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
<div class="content" id="reader"><div class="loading-msg" id="loadingMsg">⏳ 正在加载 PDF...<br><?php echo htmlspecialchars($chapter); ?></div></div>
<script>
CURRENT_BOOK = "<?php echo addslashes($book); ?>";
CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
const PDF_URL = "<?php echo $fileUrl; ?>";
const BASE_FILE = "<?php echo $currentFile; ?>";

let pdfDoc=null,totalPages=0,renderedPages=new Set(),targetPage=null,scale=1.5;
document.getElementById('backBtn').onclick=()=>{if(document.referrer&&document.referrer.includes(window.location.host))history.back();else location.href=BASE_FILE;};
function getCurrentPage(){let cs=document.querySelectorAll('.canvas-container');for(let i=0;i<cs.length;i++){let r=cs[i].getBoundingClientRect();if(r.top<=150&&r.bottom>=100){let p=parseInt(cs[i].getAttribute('data-page'));if(!isNaN(p))return p;}}return 1;}
function addBookmark(){let p=getCurrentPage(),l=getBookmarks(),i=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),n={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:p,time:Date.now()};if(i>=0)l[i]=n;else l.push(n);saveBookmarks(l);showToast('✅ 第 '+p+' 页');}
function jumpToPage(p){p=Math.min(Math.max(1,p),totalPages);let t=document.querySelector(`.canvas-container[data-page="${p}"]`);if(t){t.scrollIntoView({behavior:'smooth',block:'start'});showToast('✨ 第 '+p+' 页');}else{showToast('📖 加载中...');(async()=>{let s=Math.max(1,p-3),e=Math.min(totalPages,p+3);for(let i=s;i<=e;i++)if(!renderedPages.has(i))await renderPage(i);setTimeout(()=>{let c=document.querySelector(`.canvas-container[data-page="${p}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'start'});showToast('✨ 第 '+p+' 页');}},300);})();}}
window.jumpToBookmark = function(book,chapter,p){if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER)jumpToPage(p);else{sessionStorage.setItem('jump_target',JSON.stringify({book,chapter,page:p}));location.href=BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);}};
async function renderPage(n){if(!pdfDoc||renderedPages.has(n))return;renderedPages.add(n);let div=document.createElement('div');div.className='canvas-container';div.setAttribute('data-page',n);let p=document.createElement('div');p.className='loading-placeholder';p.innerText=`⏳ 第 ${n} 页...`;div.appendChild(p);let ins=false,ex=document.querySelectorAll('.canvas-container');for(let i=0;i<ex.length;i++){let ep=parseInt(ex[i].getAttribute('data-page'));if(ep>n){ex[i].before(div);ins=true;break;}}if(!ins)document.getElementById('reader').appendChild(div);try{let page=await pdfDoc.getPage(n),vp=page.getViewport({scale:scale}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;cv.style.width='100%';cv.style.height='auto';await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;div.innerHTML='';div.appendChild(cv);let pf=document.getElementById('progressFill');if(pf)pf.style.width=(renderedPages.size/totalPages)*100+'%';}catch(e){p.innerText=`❌ 第 ${n} 页失败`;}}
let st;function onScrollLoad(){if(st)clearTimeout(st);st=setTimeout(()=>{if(!pdfDoc)return;let cs=document.querySelectorAll('.canvas-container'),need=new Set();cs.forEach(c=>{let r=c.getBoundingClientRect();if(r.top-600<window.innerHeight&&r.bottom+600>0){let p=parseInt(c.getAttribute('data-page'));if(!isNaN(p))need.add(p);}});let toRender=[];need.forEach(p=>{for(let i=-2;i<=2;i++){let np=p+i;if(np>=1&&np<=totalPages&&!renderedPages.has(np))toRender.push(np);}});toRender.sort((a,b)=>a-b).forEach(p=>renderPage(p));},200);}
async function loadPDF(){try{let lm=document.getElementById('loadingMsg');lm.style.display='block';pdfDoc=await pdfjsLib.getDocument(PDF_URL).promise;totalPages=pdfDoc.numPages;lm.innerText=`📄 共 ${totalPages} 页，加载中...`;let jump=sessionStorage.getItem('jump_target');if(jump){sessionStorage.removeItem('jump_target');try{let t=JSON.parse(jump);if(t.book===CURRENT_BOOK&&t.chapter===CURRENT_CHAPTER&&t.page)targetPage=t.page;}catch(e){}}else{let bks=getBookmarks(),ex=bks.find(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER);if(ex&&ex.page)targetPage=ex.page;}for(let i=1;i<=Math.min(5,totalPages);i++)await renderPage(i);lm.style.display='none';if(targetPage){let s=Math.max(1,targetPage-2),e=Math.min(totalPages,targetPage+2);for(let i=s;i<=e;i++)if(!renderedPages.has(i))await renderPage(i);setTimeout(()=>{let c=document.querySelector(`.canvas-container[data-page="${targetPage}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'start'});showToast('📖 第 '+targetPage+' 页');}targetPage=null;},500);}window.addEventListener('scroll',onScrollLoad);}catch(e){document.getElementById('loadingMsg').innerHTML=`❌ 加载失败<br>${e.message}`;}}
document.getElementById('addBookmarkBtn').onclick=addBookmark;
loadPDF(); refreshBookmarkList();
</script>

<?php elseif ($isChapterPage && $isTxt && $txtData): ?>
<!-- TXT小说阅读页 -->
<div class="top-bar"><div class="top-bar-left"><button class="back-btn" id="backBtn">←</button><div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a> / <a href="<?php echo $currentFile; ?>?book=<?php echo rawurlencode($book); ?>"><?php echo htmlspecialchars(mb_substr($book, 0, 12)); ?></a></div></div><div><button id="addBookmarkBtn" class="bookmark">⭐ 加书签</button></div></div>
<div class="content" id="reader"><div id="txtContent"></div><div class="ebook-nav"><button id="prevChapterBtn" disabled>◀ 上一章</button><button id="nextChapterBtn" disabled>下一章 ▶</button></div><div class="chapter-indicator" id="chapterIndicator"></div></div>
<script>
CURRENT_BOOK = "<?php echo addslashes($book); ?>";
CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
const BASE_FILE = "<?php echo $currentFile; ?>";
const TXT_DATA = <?php echo json_encode($txtData); ?>;
let curIdx=0,chapters=TXT_DATA.chapters||[],fontSize=18;
globalChapters = chapters;
globalTotalChapters = chapters.length;
globalCurrentIndex = 0;
function applyStyles(){let s=document.getElementById('txt-style');if(!s){s=document.createElement('style');s.id='txt-style';document.head.appendChild(s);}s.textContent=`.ebook-chapter{font-size:${fontSize}px}.ebook-chapter p{margin-bottom:1em;text-indent:2em}`;}
function renderChapter(i){if(!chapters||i<0||i>=chapters.length)return;onChapterChange();curIdx=i;globalCurrentIndex = i;document.getElementById('txtContent').innerHTML=`<div class="ebook-chapter"><div class="chapter-title">${escapeHtml(chapters[i].title)}</div>${chapters[i].content}</div>`;document.getElementById('prevChapterBtn').disabled=(i<=0);document.getElementById('nextChapterBtn').disabled=(i>=chapters.length-1);document.getElementById('chapterIndicator').innerText=`第 ${i+1}/${chapters.length} 章 · ${chapters[i].title}`;saveProgress(i);if(typeof updateGlobalProgress === 'function') updateGlobalProgress();}
function saveProgress(i){let l=getBookmarks(),idx=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),n={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:i+1,time:Date.now(),type:'txt'};if(idx>=0)l[idx]=n;else l.push(n);saveBookmarks(l);}
window.jumpToBookmark = function(book,chapter,page){if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER){renderChapter(Math.min(Math.max(1,page),chapters.length)-1);showToast('✨ 第 '+page+' 章');}else{sessionStorage.setItem('jump_target',JSON.stringify({book,chapter,page,type:'txt'}));location.href=BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);}};
function addBookmark(){let n=curIdx+1,l=getBookmarks(),i=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),ni={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:n,time:Date.now(),type:'txt'};if(i>=0)l[i]=ni;else l.push(ni);saveBookmarks(l);showToast('✅ 第 '+n+' 章');}
document.getElementById('fontPlus').onclick=()=>{fontSize=Math.min(fontSize+2,32);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
document.getElementById('fontMinus').onclick=()=>{fontSize=Math.max(fontSize-2,12);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
document.getElementById('backBtn').onclick=()=>{if(document.referrer&&document.referrer.includes(window.location.host))history.back();else location.href=BASE_FILE;};
document.getElementById('prevChapterBtn').onclick=()=>{if(curIdx>0)renderChapter(curIdx-1);resetHideTimer();};
document.getElementById('nextChapterBtn').onclick=()=>{if(curIdx<chapters.length-1)renderChapter(curIdx+1);resetHideTimer();};
document.getElementById('addBookmarkBtn').onclick=addBookmark;
applyStyles();if(chapters.length>0){let saved=0,jump=sessionStorage.getItem('jump_target');if(jump){sessionStorage.removeItem('jump_target');try{let t=JSON.parse(jump);if(t.book===CURRENT_BOOK&&t.chapter===CURRENT_CHAPTER&&t.page)saved=Math.min(Math.max(1,t.page),chapters.length)-1;}catch(e){}}else{let bks=getBookmarks(),ex=bks.find(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER);if(ex&&ex.page)saved=Math.min(Math.max(1,ex.page),chapters.length)-1;}renderChapter(saved);}
refreshBookmarkList();
createGlobalProgressBar(globalTotalChapters, globalCurrentIndex, globalChapters);
</script>

<?php elseif ($isChapterPage && $isEpub && $epubData): ?>
<!-- EPUB阅读页 -->
<div class="top-bar"><div class="top-bar-left"><button class="back-btn" id="backBtn">←</button><div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a> / <a href="<?php echo $currentFile; ?>?book=<?php echo rawurlencode($book); ?>"><?php echo htmlspecialchars(mb_substr($book, 0, 12)); ?></a></div></div><div><button id="addBookmarkBtn" class="bookmark">⭐ 加书签</button></div></div>
<div class="content" id="reader">
<?php if ($epubData['type'] == 'comic'): ?>
    <?php $comicImages = $epubData['images']; ?>
    <div id="comicViewer">
    <?php foreach($comicImages as $idx => $imgPath): ?>
    <div class="canvas-container" data-page="<?php echo $idx+1; ?>">
        <img src="<?php echo $imgPath; ?>" loading="lazy" style="max-width:100%; height:auto; border-radius:8px; display:block; margin:0 auto;" 
             onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22400%22%3E%3Crect width=%22300%22 height=%22400%22 fill=%22%23333%22/%3E%3Ctext x=%22150%22 y=%22200%22 fill=%22%23fff%22 text-anchor=%22middle%22%3E图片加载失败%3C/text%3E%3C/svg%3E';">
    </div>
    <?php endforeach; ?>
    </div>
    <script>
    CURRENT_BOOK = "<?php echo addslashes($book); ?>";
    CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
    const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
    const BASE_FILE = "<?php echo $currentFile; ?>";
    const TOTAL_PAGES = <?php echo count($comicImages); ?>;
    
    function getCurrentPage(){
        let cs = document.querySelectorAll('.canvas-container');
        let viewportTop = window.scrollY;
        let viewportHeight = window.innerHeight;
        let bestPage = 1;
        let bestDistance = Infinity;
        for(let i=0; i<cs.length; i++){
            let rect = cs[i].getBoundingClientRect();
            let center = rect.top + rect.height/2;
            let distance = Math.abs(center - viewportHeight/2);
            if(distance < bestDistance){
                bestDistance = distance;
                bestPage = i+1;
            }
        }
        return bestPage;
    }
    
    function addBookmark(){
        let p = getCurrentPage();
        let l = getBookmarks();
        let i = l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER);
        let n = {book:CURRENT_BOOK, chapter:CURRENT_CHAPTER, chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME, page:p, time:Date.now()};
        if(i>=0) l[i]=n;
        else l.push(n);
        saveBookmarks(l);
        showToast('✅ 第 '+p+' 页');
    }
    
    function jumpToPage(p){
        p = Math.min(Math.max(1, p), TOTAL_PAGES);
        let t = document.querySelector(`.canvas-container[data-page="${p}"]`);
        if(t){
            t.scrollIntoView({behavior:'smooth', block:'start'});
            showToast('✨ 第 '+p+' 页');
        }
    }
    
    window.jumpToBookmark = function(book,chapter,page){
        if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER){
            jumpToPage(page);
        }else{
            sessionStorage.setItem('jump_target', JSON.stringify({book,chapter,page}));
            location.href = BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);
        }
    };
    
    document.getElementById('backBtn').onclick = ()=>{
        if(document.referrer && document.referrer.includes(window.location.host)) history.back();
        else location.href = BASE_FILE;
    };
    document.getElementById('addBookmarkBtn').onclick = addBookmark;
    refreshBookmarkList();
    </script>
<?php else: ?>
    <div id="epubContent"></div>
    <div class="ebook-nav"><button id="prevChapterBtn" disabled>◀ 上一章</button><button id="nextChapterBtn" disabled>下一章 ▶</button></div>
    <div class="chapter-indicator" id="chapterIndicator"></div>
    <script>
    CURRENT_BOOK = "<?php echo addslashes($book); ?>";
    CURRENT_CHAPTER = "<?php echo addslashes($chapter); ?>";
    const CHAPTER_NAME = "<?php echo addslashes($chapter); ?>";
    const BASE_FILE = "<?php echo $currentFile; ?>";
    const EPUB_DATA = <?php echo json_encode($epubData); ?>;
    let curIdx=0,chapters=EPUB_DATA.htmlContents||[],css=EPUB_DATA.cssContent||'',fontSize=18;
    globalChapters = chapters;
    globalTotalChapters = chapters.length;
    globalCurrentIndex = 0;
    function applyStyles(){let s=document.getElementById('epub-style');if(!s){s=document.createElement('style');s.id='epub-style';document.head.appendChild(s);}s.textContent=`.ebook-chapter{font-size:${fontSize}px}.ebook-chapter img{max-width:100%;height:auto;display:block;margin:1em auto;border-radius:12px}.ebook-chapter p{margin-bottom:1em}${css}`;}
    function renderChapter(i){if(!chapters||i<0||i>=chapters.length)return;onChapterChange();curIdx=i;globalCurrentIndex = i;let c=chapters[i];document.getElementById('epubContent').innerHTML=`<div class="ebook-chapter"><div class="chapter-title">${escapeHtml(c.title)}</div>${c.content}</div>`;document.getElementById('prevChapterBtn').disabled=(i<=0);document.getElementById('nextChapterBtn').disabled=(i>=chapters.length-1);document.getElementById('chapterIndicator').innerText=`第 ${i+1}/${chapters.length} 章 · ${c.title}`;saveProgress(i);if(typeof updateGlobalProgress === 'function') updateGlobalProgress();}
    function saveProgress(i){let l=getBookmarks(),idx=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),n={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:i+1,time:Date.now(),type:'ebook'};if(idx>=0)l[idx]=n;else l.push(n);saveBookmarks(l);}
    window.jumpToBookmark = function(book,chapter,page){if(book===CURRENT_BOOK&&chapter===CURRENT_CHAPTER){renderChapter(Math.min(Math.max(1,page),chapters.length)-1);showToast('✨ 第 '+page+' 章');}else{sessionStorage.setItem('jump_target',JSON.stringify({book,chapter,page,type:'ebook'}));location.href=BASE_FILE+'?book='+encodeURIComponent(book)+'&chapter='+encodeURIComponent(chapter);}};
    function addBookmark(){let n=curIdx+1,l=getBookmarks(),i=l.findIndex(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER),ni={book:CURRENT_BOOK,chapter:CURRENT_CHAPTER,chapterName:CHAPTER_NAME.length>35?CHAPTER_NAME.substring(0,32)+'...':CHAPTER_NAME,page:n,time:Date.now(),type:'ebook'};if(i>=0)l[i]=ni;else l.push(ni);saveBookmarks(l);showToast('✅ 第 '+n+' 章');}
    document.getElementById('fontPlus').onclick=()=>{fontSize=Math.min(fontSize+2,32);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
    document.getElementById('fontMinus').onclick=()=>{fontSize=Math.max(fontSize-2,12);applyStyles();renderChapter(curIdx);showToast(`字体 ${fontSize}px`);resetHideTimer();};
    document.getElementById('backBtn').onclick=()=>{if(document.referrer&&document.referrer.includes(window.location.host))history.back();else location.href=BASE_FILE;};
    document.getElementById('prevChapterBtn').onclick=()=>{if(curIdx>0)renderChapter(curIdx-1);resetHideTimer();};
    document.getElementById('nextChapterBtn').onclick=()=>{if(curIdx<chapters.length-1)renderChapter(curIdx+1);resetHideTimer();};
    document.getElementById('addBookmarkBtn').onclick=addBookmark;
    applyStyles();if(chapters.length>0){let saved=0,jump=sessionStorage.getItem('jump_target');if(jump){sessionStorage.removeItem('jump_target');try{let t=JSON.parse(jump);if(t.book===CURRENT_BOOK&&t.chapter===CURRENT_CHAPTER&&t.page)saved=Math.min(Math.max(1,t.page),chapters.length)-1;}catch(e){}}else{let bks=getBookmarks(),ex=bks.find(b=>b.book===CURRENT_BOOK&&b.chapter===CURRENT_CHAPTER);if(ex&&ex.page)saved=Math.min(Math.max(1,ex.page),chapters.length)-1;}renderChapter(saved);}
    refreshBookmarkList();
    createGlobalProgressBar(globalTotalChapters, globalCurrentIndex, globalChapters);
    </script>
<?php endif; ?>
</div>

<?php elseif ($book): ?>
<!-- 书籍章节列表页 -->
<div class="content">
    <div class="top-bar" style="position:relative; margin-top:-70px; margin-bottom:20px;">
        <div class="top-bar-left">
            <button class="back-btn" id="backBtn">←</button>
            <div class="nav-links"><a href="<?php echo $currentFile; ?>">🏠 书架</a></div>
        </div>
    </div>
    <h2 class="page-title">📖 <?php echo htmlspecialchars($book); ?></h2>
    <div class="shelf-grid">
        <?php 
        $files = scanDirectory($baseDir . '/' . $book); 
        if ($files) { 
            foreach ($files as $f) { 
                $name = basename($f); 
                $url = $currentFile . "?book=" . rawurlencode($book) . "&chapter=" . rawurlencode($name); 
                if (stripos($name, '.txt') !== false) $icon = '📖'; 
                elseif (stripos($name, '.epub') !== false) $icon = '📘'; 
                else $icon = (stripos($name, '.pdf') !== false ? '📕' : '📁'); 
                echo '<a href="' . $url . '" class="shelf-item">';
                echo '<div class="emoji">' . $icon . '</div>';
                echo '<div>' . htmlspecialchars($name) . '</div>';
                echo '</a>';
            } 
        } else { 
            echo '<div style="grid-column:1/-1; text-align:center; padding:50px; color:rgba(255,255,255,0.6);">📭 没有章节</div>'; 
        } 
        ?>
    </div>
</div>
<script>
CURRENT_BOOK = "<?php echo addslashes($book); ?>";
refreshBookmarkList();
document.getElementById('backBtn').onclick=()=>{if(document.referrer?.includes(window.location.host))history.back();else location.href='<?php echo $currentFile; ?>';};
</script>

<?php else: ?>
<!-- 书架首页 -->
<div class="content">
    <h1 class="page-title">📚 我的书架</h1>
    <div class="shelf-grid">
        <?php 
        $books = scanDirectory($baseDir); 
        if ($books) { 
            foreach ($books as $b) { 
                if (is_dir($b)) { 
                    $name = basename($b); 
                    echo '<a href="' . $currentFile . '?book=' . rawurlencode($name) . '" class="shelf-item">';
                    echo '<div class="emoji">📖</div>';
                    echo '<div>' . htmlspecialchars($name) . '</div>';
                    echo '</a>';
                } 
            } 
        } else { 
            echo '<div style="grid-column:1/-1; text-align:center; padding:50px; color:rgba(255,255,255,0.6);">📭 请在 PDF 文件夹里放入书籍文件夹</div>'; 
        } 
        ?>
    </div>
</div>
<script>
refreshBookmarkList();
</script>
<?php endif; ?>

</body>
</html>