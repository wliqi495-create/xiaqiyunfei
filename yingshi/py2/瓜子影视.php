<?php

/**
 * 瓜子影视 - PHP 版本
 * 修复选集显示问题
 */

class Spider extends BaseSpider {
    
    private $host = 'https://api.w32z7vtd.com';
    private $privateKey = <<<EOD
-----BEGIN PRIVATE KEY-----
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGAe6hKrWLi1zQmjTT1
ozbE4QdFeJGNxubxld6GrFGximxfMsMB6BpJhpcTouAqywAFppiKetUBBbXwYsYU
1wNr648XVmPmCMCy4rY8vdliFnbMUj086DU6Z+/oXBdWU3/b1G0DN3E9wULRSwcK
ZT3wj/cCI1vsCm3gj2R5SqkA9Y0CAwEAAQKBgAJH+4CxV0/zBVcLiBCHvSANm0l7
HetybTh/j2p0Y1sTXro4ALwAaCTUeqdBjWiLSo9lNwDHFyq8zX90+gNxa7c5EqcW
V9FmlVXr8VhfBzcZo1nXeNdXFT7tQ2yah/odtdcx+vRMSGJd1t/5k5bDd9wAvYdI
DblMAg+wiKKZ5KcdAkEA1cCakEN4NexkF5tHPRrR6XOY/XHfkqXxEhMqmNbB9U34
saTJnLWIHC8IXys6Qmzz30TtzCjuOqKRRy+FMM4TdwJBAJQZFPjsGC+RqcG5UvVM
iMPhnwe/bXEehShK86yJK/g/UiKrO87h3aEu5gcJqBygTq3BBBoH2md3pr/W+hUM
WBsCQQChfhTIrdDinKi6lRxrdBnn0Ohjg2cwuqK5zzU9p/N+S9x7Ck8wUI53DKm8
jUJE8WAG7WLj/oCOWEh+ic6NIwTdAkEAj0X8nhx6AXsgCYRql1klbqtVmL8+95KZ
K7PnLWG/IfjQUy3pPGoSaZ7fdquG8bq8oyf5+dzjE/oTXcByS+6XRQJAP/5ciy1b
L3NhUhsaOVy55MHXnPjdcTX0FaLi+ybXZIfIQ2P4rb19mVq1feMbCXhz+L1rG8oa
t5lYKfpe8k83ZA==
-----END PRIVATE KEY-----
EOD;
    
    private $staticKeys = "Qmxi5ciWXbQzkr7o+SUNiUuQxQEf8/AVyUWY4T/BGhcXBIUz4nOyHBGf9A4KbM0iKF3yp9M7WAY0rrs5PzdTAOB45plcS2zZ0wUibcXuGJ29VVGRWKGwE9zu2vLwhfgjTaaDpXo4rby+7GxXTktzJmxvneOUdYeHi+PZsThlvPI=";
    private $token = '1be86e8e18a9fa18b2b8d5432699dad0.ac008ed650fd087bfbecf2fda9d82e9835253ef24843e6b18fcd128b10763497bcf9d53e959f5377cde038c20ccf9d17f604c9b8bb6e61041def86729b2fc7408bd241e23c213ac57f0226ee656e2bb0a583ae0e4f3bf6c6ab6c490c9a6f0d8cdfd366aacf5d83193671a8f77cd1af1ff2e9145de92ec43ec87cf4bdc563f6e919fe32861b0e93b118ec37d8035fbb3c.59dd05c5d9a8ae726528783128218f15fe6f2c0c8145eddab112b374fcfe3d79';
    
    private $cache = [];
    private $cacheTtl = [
        'category' => 300,
        'detail' => 600,
        'play' => 300,
        'search' => 60
    ];
    
    // API路径
    private $apiPaths = [
        'INDEX_LIST' => '/App/IndexList/indexList',
        'PLAY_INFO' => '/App/IndexPlay/playInfo',
        'VURL_SHOW' => '/App/Resource/Vurl/show',
        'VURL_DETAIL' => '/App/Resource/VurlDetail/showOne',
        'FIND_MORE' => '/App/Index/findMoreVod'
    ];
    
    // 调试开关
    private $debug = true;
    
    public function init($extend = '') {
        return '';
    }
    
    public function getName() {
        return '瓜子影视';
    }
    
    public function isVideoFormat($url) {
        return true;
    }
    
    public function manualVideoCheck() {
        return false;
    }
    
    public function destroy() {
    }
    
    // ========== 工具方法 ==========
    
    private function debugLog($message, $data = null) {
        if ($this->debug) {
            error_log("[瓜子影视] " . $message);
            if ($data !== null) {
                if (is_array($data)) {
                    $data = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                }
                error_log("[瓜子影视] 数据: " . $data);
            }
        }
    }
    
    private function md5($text) {
        return md5($text);
    }
    
    private function aesEncrypt($text) {
        try {
            $key = 'mvXBSW7ekreItNsT';
            $iv = '2U3IrJL8szAKp0Fj';
            $cipher = 'aes-128-cbc';
            
            if (is_array($text)) {
                $text = json_encode($text, JSON_UNESCAPED_UNICODE);
            }
            
            $encrypted = openssl_encrypt($text, $cipher, $key, OPENSSL_RAW_DATA, $iv);
            if ($encrypted === false) {
                return '';
            }
            return strtoupper(bin2hex($encrypted));
        } catch (Exception $e) {
            return '';
        }
    }
    
    private function aesDecrypt($text, $keyStr, $ivStr) {
        try {
            $cipher = 'aes-128-cbc';
            
            if (!ctype_xdigit($text)) {
                return '';
            }
            
            $binaryData = hex2bin($text);
            if ($binaryData === false) {
                return '';
            }
            
            $decrypted = openssl_decrypt($binaryData, $cipher, $keyStr, OPENSSL_RAW_DATA, $ivStr);
            return $decrypted;
        } catch (Exception $e) {
            return '';
        }
    }
    
    private function rsaDecode($data) {
        if (empty($data)) {
            return null;
        }
        
        try {
            $binary = base64_decode($data);
            if ($binary === false) {
                return null;
            }
            
            $blockSize = 256;
            $decryptedParts = [];
            $length = strlen($binary);
            
            for ($i = 0; $i < $length; $i += $blockSize) {
                $chunk = substr($binary, $i, $blockSize);
                if (strlen($chunk) === 0) continue;
                
                $decChunk = '';
                $result = openssl_private_decrypt($chunk, $decChunk, $this->privateKey, OPENSSL_NO_PADDING);
                
                if ($result && $decChunk) {
                    // 简化处理：直接找最后一个0x00
                    $lastZero = strrpos($decChunk, "\x00");
                    if ($lastZero !== false) {
                        $decryptedParts[] = substr($decChunk, $lastZero + 1);
                    } else {
                        // 如果没有0x00，尝试从开头找非0字节
                        $start = 0;
                        while ($start < strlen($decChunk) && ord($decChunk[$start]) === 0) {
                            $start++;
                        }
                        $decryptedParts[] = substr($decChunk, $start);
                    }
                }
            }
            
            if (empty($decryptedParts)) {
                return null;
            }
            
            $result = implode('', $decryptedParts);
            return trim($result);
        } catch (Exception $e) {
            return null;
        }
    }
    
    private function generateSignature($requestKey, $timestamp) {
        $signStr = "token_id=,token={$this->token},phone_type=1,request_key={$requestKey},app_id=1,time={$timestamp},keys={$this->staticKeys}*&zvdvdvddbfikkkumtmdwqppp?|4Y!s!2br";
        return $this->md5($signStr);
    }
    
    private function getCache($key) {
        if (!isset($this->cache[$key])) {
            return null;
        }
        
        $item = $this->cache[$key];
        if (time() > $item['expire']) {
            unset($this->cache[$key]);
            return null;
        }
        
        return $item['data'];
    }
    
    private function setCache($key, $data, $type = 'category') {
        $this->cache[$key] = [
            'data' => $data,
            'expire' => time() + $this->cacheTtl[$type]
        ];
        
        if (count($this->cache) > 200) {
            $this->cache = [];
        }
    }
    
    private function apiRequest($data, $path, $cacheType = 'category', $retries = 1) {
        $cacheKey = $path . '|' . json_encode($data, JSON_UNESCAPED_UNICODE);
        
        if ($cacheType !== 'none') {
            $cached = $this->getCache($cacheKey);
            if ($cached !== null) {
                return $cached;
            }
        }
        
        $timestamp = time();
        $requestKey = $this->aesEncrypt($data);
        
        if (empty($requestKey)) {
            return null;
        }
        
        $signature = $this->generateSignature($requestKey, $timestamp);
        
        $postData = [
            'token' => $this->token,
            'token_id' => '',
            'phone_type' => '1',
            'time' => $timestamp,
            'phone_model' => 'xiaomi-22021211rc',
            'keys' => $this->staticKeys,
            'request_key' => $requestKey,
            'signature' => $signature,
            'app_id' => '1',
            'ad_version' => '1'
        ];
        
        $postBody = http_build_query($postData);
        
        $lastError = null;
        for ($i = 0; $i <= $retries; $i++) {
            try {
                $ch = curl_init($this->host . $path);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $postBody,
                    CURLOPT_TIMEOUT => 15,
                    CURLOPT_HTTPHEADER => [
                        'Cache-Control: no-cache',
                        'Version: 2406025',
                        'PackageName: com.uf076bf0c246.qe439f0d5e.m8aaf56b725a.ifeb647346f',
                        'Ver: 1.9.2',
                        'Referer: ' . $this->host,
                        'Content-Type: application/x-www-form-urlencoded',
                        'User-Agent: okhttp/3.12.0'
                    ],
                    CURLOPT_SSL_VERIFYPEER => false,
                    CURLOPT_SSL_VERIFYHOST => false,
                ]);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($httpCode !== 200 || !$response) {
                    throw new Exception("HTTP Error: {$httpCode}");
                }
                
                $responseData = json_decode($response, true);
                
                if (!$responseData || !isset($responseData['data'])) {
                    throw new Exception("API Error: Invalid response");
                }
                
                $keysData = $this->rsaDecode($responseData['data']['keys']);
                if (!$keysData) {
                    throw new Exception("RSA Decode Error");
                }
                
                $keys = json_decode($keysData, true);
                
                if (!$keys || !isset($keys['key']) || !isset($keys['iv'])) {
                    throw new Exception("Invalid keys structure");
                }
                
                $decryptedData = $this->aesDecrypt(
                    $responseData['data']['response_key'],
                    $keys['key'],
                    $keys['iv']
                );
                
                if (!$decryptedData) {
                    throw new Exception("AES Decode Error");
                }
                
                $result = json_decode($decryptedData, true);
                
                if ($result === null && json_last_error() !== JSON_ERROR_NONE) {
                    return null;
                }
                
                if ($cacheType !== 'none' && $result) {
                    $this->setCache($cacheKey, $result, $cacheType);
                }
                
                return $result;
            } catch (Exception $e) {
                $lastError = $e->getMessage();
                if ($i < $retries) {
                    usleep(500000);
                }
            }
        }
        
        return null;
    }
    
    private function getResolutionScore($res) {
        $r = strtolower(str_replace('p', '', $res));
        if ($r === '8k') return 100;
        if ($r === '4k' || $r === '2160') return 90;
        if ($r === '1440') return 80;
        if ($r === '1080') return 70;
        if ($r === '720') return 60;
        if ($r === '超清') return 50;
        if ($r === '高清') return 40;
        if ($r === '标清') return 30;
        return 10;
    }
    
    // ========== 业务方法 ==========
    
    public function homeContent($filter = false) {
        return [
            'class' => [
                ['type_id' => '1', 'type_name' => '电影'],
                ['type_id' => '2', 'type_name' => '电视剧'],
                ['type_id' => '4', 'type_name' => '动漫'],
                ['type_id' => '3', 'type_name' => '综艺'],
                ['type_id' => '64', 'type_name' => '短剧']
            ]
        ];
    }
    
    public function homeVideoContent() {
        return ['list' => []];
    }
    
    public function categoryContent($tid, $pg, $filter, $extend) {
        $page = intval($pg);
        
        $data = $this->apiRequest([
            'area' => '0',
            'year' => '0',
            'pageSize' => '20',
            'sort' => 'd_id',
            'page' => strval($page),
            'tid' => $tid
        ], $this->apiPaths['INDEX_LIST'], 'category');
        
        if (!$data || !isset($data['list'])) {
            return ['list' => [], 'page' => $page, 'pagecount' => 0];
        }
        
        $totalPage = isset($data['totalPage']) ? intval($data['totalPage']) : 0;
        
        $videos = [];
        foreach ($data['list'] as $item) {
            $vod_continu = isset($item['vod_continu']) ? intval($item['vod_continu']) : 0;
            $videos[] = [
                'vod_id' => $item['vod_id'] . '/' . $vod_continu,
                'vod_name' => $item['vod_name'] ?? '',
                'vod_pic' => $item['vod_pic'] ?? '',
                'vod_remarks' => $vod_continu === 0 ? '电影' : '更新至' . $vod_continu . '集'
            ];
        }
        
        return [
            'list' => $videos,
            'page' => $page,
            'pagecount' => $totalPage === 0 ? 999 : $totalPage
        ];
    }
    
    public function detailContent($ids) {
        $this->debugLog("详情内容", "ID: " . (is_array($ids) ? implode(',', $ids) : $ids));
        
        $idList = is_array($ids) ? $ids : [$ids];
        $results = [];
        
        foreach ($idList as $idStr) {
            try {
                $parts = explode('/', $idStr);
                $vodId = $parts[0];
                
                $this->debugLog("处理视频ID", $vodId);
                
                // 获取基本信息
                $detailData = $this->apiRequest([
                    'token_id' => '1649412',
                    'vod_id' => $vodId,
                    'mobile_time' => time(),
                    'token' => $this->token
                ], $this->apiPaths['PLAY_INFO'], 'detail');
                
                if (!$detailData || !isset($detailData['vodInfo'])) {
                    $this->debugLog("详情数据获取失败");
                    continue;
                }
                
                $vod = $detailData['vodInfo'];
                $this->debugLog("视频基本信息", [
                    'name' => $vod['vod_name'] ?? '',
                    'continu' => $vod['vod_continu'] ?? 0
                ]);
                
                // 获取播放列表
                $playData = $this->apiRequest([
                    'vurl_cloud_id' => '2',
                    'vod_d_id' => $vodId
                ], $this->apiPaths['VURL_SHOW'], 'detail');
                
                $video = [
                    'vod_id' => $vodId,
                    'vod_name' => $vod['vod_name'] ?? '',
                    'vod_pic' => $vod['vod_pic'] ?? '',
                    'vod_year' => $vod['vod_year'] ?? '',
                    'vod_area' => $vod['vod_area'] ?? '',
                    'vod_actor' => $vod['vod_actor'] ?? '',
                    'vod_content' => isset($vod['vod_use_content']) ? trim($vod['vod_use_content']) : '',
                    'vod_play_from' => '瓜子专线',
                    'vod_play_url' => ''
                ];
                
                $playList = [];
                
                if ($playData && isset($playData['list']) && is_array($playData['list'])) {
                    $playCount = count($playData['list']);
                    $this->debugLog("播放列表信息", [
                        '总数' => $playCount,
                        '示例' => isset($playData['list'][0]) ? $playData['list'][0] : []
                    ]);
                    
                    // 修复：检查是否真的是单个文件（电影）
                    $isSingleFile = false;
                    
                    // 判断逻辑：
                    // 1. 如果播放列表只有1项，但vod_continu > 1，说明是剧集但API只返回了第一个播放地址
                    // 2. 如果播放列表只有1项，且vod_continu <= 1，可能是电影
                    $vodContinu = isset($vod['vod_continu']) ? intval($vod['vod_continu']) : 0;
                    
                    if ($playCount === 1 && $vodContinu <= 1) {
                        $isSingleFile = true;
                        $this->debugLog("判断为单个文件（电影）");
                    } else if ($playCount === 1 && $vodContinu > 1) {
                        $this->debugLog("警告：播放列表只有1项，但vod_continu={$vodContinu}，可能API返回不完整");
                    }
                    
                    foreach ($playData['list'] as $index => $item) {
                        if (!isset($item['play'])) {
                            continue;
                        }
                        
                        $resolutions = [];
                        $params = [];
                        
                        foreach ($item['play'] as $key => $val) {
                            if (isset($val['param']) && !empty($val['param'])) {
                                $resolutions[] = $key;
                                $params[] = $val['param'];
                            }
                        }
                        
                        if (!empty($params)) {
                            // 按分辨率排序
                            usort($resolutions, function($a, $b) {
                                return $this->getResolutionScore($b) - $this->getResolutionScore($a);
                            });
                            
                            // 确定播放名称 - 修复逻辑
                            if ($isSingleFile) {
                                // 单个文件：显示"正片"或视频名称
                                $playName = '正片';
                            } else {
                                // 多个文件：使用集数或名称
                                if (isset($item['name']) && !empty($item['name'])) {
                                    $playName = $item['name'];
                                } else if (isset($item['episode']) && !empty($item['episode'])) {
                                    $playName = '第' . $item['episode'] . '集';
                                } else {
                                    $playName = '第' . ($index + 1) . '集';
                                }
                            }
                            
                            // 构建播放URL
                            $playUrl = $params[0] . '||' . implode('@', $resolutions);
                            $playList[] = $playName . '$' . $playUrl;
                            
                            $this->debugLog("添加播放项", [
                                '名称' => $playName,
                                '参数' => $params[0],
                                '分辨率' => $resolutions
                            ]);
                        }
                    }
                } else {
                    $this->debugLog("无播放列表数据");
                }
                
                // 如果没有获取到播放列表，尝试其他方式
                if (empty($playList)) {
                    $this->debugLog("播放列表为空，检查是否有备用数据");
                    
                    // 检查是否有其他播放信息
                    if (isset($detailData['playInfo']) && is_array($detailData['playInfo'])) {
                        $this->debugLog("使用playInfo数据", $detailData['playInfo']);
                        foreach ($detailData['playInfo'] as $index => $playItem) {
                            if (isset($playItem['url']) && !empty($playItem['url'])) {
                                $playName = isset($playItem['name']) ? $playItem['name'] : ('第' . ($index + 1) . '集');
                                $playUrl = $playItem['url'] . '||1080p@720p@标清';
                                $playList[] = $playName . '$' . $playUrl;
                            }
                        }
                    }
                    
                    // 如果还是没有，创建默认项
                    if (empty($playList)) {
                        $vodContinu = isset($vod['vod_continu']) ? intval($vod['vod_continu']) : 0;
                        
                        if ($vodContinu <= 1) {
                            // 电影或单集
                            $playList[] = '正片$' . $vodId . '||1080p@720p@标清';
                        } else {
                            // 多集剧集，创建多个播放项
                            for ($i = 1; $i <= min($vodContinu, 50); $i++) {
                                $playList[] = '第' . $i . '集$' . $vodId . '_' . $i . '||1080p@720p@标清';
                            }
                        }
                    }
                }
                
                $video['vod_play_url'] = implode('#', $playList);
                $results[] = $video;
                
                $this->debugLog("视频处理完成", [
                    '名称' => $video['vod_name'],
                    '播放集数' => count($playList)
                ]);
                
            } catch (Exception $e) {
                $this->debugLog("处理视频详情异常", $e->getMessage());
                continue;
            }
        }
        
        $this->debugLog("详情处理完成", "共" . count($results) . "个视频");
        return ['list' => $results];
    }
    
    public function searchContent($key, $quick, $pg = '1') {
        $page = intval($pg);
        
        if (empty($key)) {
            return ['list' => [], 'page' => $page, 'pagecount' => 0];
        }
        
        $data = $this->apiRequest([
            'keywords' => $key,
            'order_val' => '1',
            'page' => strval($page)
        ], $this->apiPaths['FIND_MORE'], 'search');
        
        if (!$data || !isset($data['list'])) {
            return ['list' => [], 'page' => $page, 'pagecount' => 0];
        }
        
        $totalPage = isset($data['totalPage']) ? intval($data['totalPage']) : 0;
        
        $videos = [];
        foreach ($data['list'] as $item) {
            $vod_continu = isset($item['vod_continu']) ? intval($item['vod_continu']) : 0;
            $videos[] = [
                'vod_id' => $item['vod_id'] . '/' . $vod_continu,
                'vod_name' => $item['vod_name'] ?? '',
                'vod_pic' => $item['vod_pic'] ?? '',
                'vod_remarks' => $vod_continu === 0 ? '电影' : '更新至' . $vod_continu . '集'
            ];
        }
        
        return [
            'list' => $videos,
            'page' => $page,
            'pagecount' => $totalPage === 0 ? 1 : $totalPage
        ];
    }
    
    public function playerContent($flag, $id, $vipFlags) {
        $this->debugLog("播放内容", "ID: {$id}");
        
        try {
            if (empty($id)) {
                return ['parse' => 0, 'url' => ''];
            }
            
            // 解析ID参数
            $parts = explode('||', $id);
            if (count($parts) < 2) {
                // 可能是简化的ID，尝试处理
                $paramStr = $id;
                $resolutions = ['1080p', '720p', '标清'];
            } else {
                $paramStr = $parts[0];
                $resolutions = isset($parts[1]) ? explode('@', $parts[1]) : ['1080p', '720p', '标清'];
            }
            
            // 解析参数
            $params = [];
            $pairs = explode('&', $paramStr);
            foreach ($pairs as $pair) {
                $kv = explode('=', $pair);
                if (!empty($kv[0])) {
                    $params[$kv[0]] = isset($kv[1]) ? $kv[1] : '';
                }
            }
            
            $this->debugLog("播放参数", $params);
            
            // 如果参数为空，尝试从ID中提取
            if (empty($params)) {
                // 检查是否是带下划线的ID（如：123_1 表示第1集）
                if (strpos($id, '_') !== false) {
                    $idParts = explode('_', $id);
                    $params = [
                        'vod_d_id' => $idParts[0],
                        'episode' => $idParts[1] ?? '1'
                    ];
                } else {
                    $params = [
                        'vod_d_id' => $id,
                        'vod_id' => $id
                    ];
                }
            }
            
            // 确保有必要的参数
            if (!isset($params['vod_d_id']) && isset($params['vod_id'])) {
                $params['vod_d_id'] = $params['vod_id'];
            }
            
            // 添加分辨率参数
            if (!empty($resolutions)) {
                usort($resolutions, function($a, $b) {
                    return $this->getResolutionScore($b) - $this->getResolutionScore($a);
                });
                $params['resolution'] = $resolutions[0];
            }
            
            $this->debugLog("最终请求参数", $params);
            
            // 请求播放地址
            $data = $this->apiRequest($params, $this->apiPaths['VURL_DETAIL'], 'play');
            
            if ($data && !empty($data['url'])) {
                $playUrl = $data['url'];
                $this->debugLog("获取到播放地址", $playUrl);
                
                return [
                    'parse' => 0,
                    'url' => $playUrl,
                    'header' => [
                        'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                        'Referer' => $this->host
                    ]
                ];
            } else {
                $this->debugLog("获取播放地址失败");
                return ['parse' => 0, 'url' => ''];
            }
        } catch (Exception $e) {
            $this->debugLog("播放内容异常", $e->getMessage());
            return ['parse' => 0, 'url' => ''];
        }
    }
    
    public function localProxy($param) {
        return null;
    }
}