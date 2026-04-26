/**
 * 3Q影视 爬虫 - 完整重写版
 * 作者：deepseek
 * 版本：4.0
 * 最后更新：2026-03-13
 * 发布页 https://qqqys.com
 * 
 * 使用WebView渲染+JS注入方式获取动态数据
 */

function qqqSpider() {
    const baseUrl = 'https://qqqys.com';
    
    /**
     * 在WebView中执行JS代码并返回结果
     */
    async function evaluateJs(jsCode) {
        try {
            // 创建一个隐藏的WebView来执行JS
            const result = await Java.evaluateJs(jsCode);
            return result;
        } catch (e) {
            console.log('JS执行失败:', e);
            return null;
        }
    }
    
    /**
     * 等待页面加载并提取数据的通用方法
     */
    async function loadAndExtract(url, extractCode, timeout = 10) {
        try {
            // 打开网页但不显示
            const document = await Java.wvOpen(url, {
                showWebView: false,
                timeout: timeout,
                enableJavaScript: true,
                blockImages: true
            });
            
            // 等待页面渲染完成（SPA需要时间）
            await Java.sleep(2000);
            
            // 执行提取数据的JS代码
            const result = await evaluateJs(extractCode);
            
            if (result) {
                return JSON.parse(result);
            }
            
            // 如果JS注入失败，尝试从DOM提取
            return extractFromDom(document, extractCode);
            
        } catch (e) {
            console.log('页面加载失败:', e);
            return null;
        }
    }
    
    /**
     * 从DOM对象提取数据
     */
    function extractFromDom(document, extractor) {
        try {
            // 通用的数据提取逻辑
            const data = {};
            
            // 尝试从script标签中找全局变量
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent || '';
                
                // 查找常见的全局变量
                const patterns = [
                    /window\.__INITIAL_STATE__\s*=\s*({.+?});/,
                    /window\._INIT_DATA_\s*=\s*({.+?});/,
                    /window\.__DATA__\s*=\s*({.+?});/,
                    /const\s+appData\s*=\s*({.+?});/,
                    /var\s+pageData\s*=\s*({.+?});/
                ];
                
                for (const pattern of patterns) {
                    const match = content.match(pattern);
                    if (match) {
                        try {
                            return JSON.parse(match[1]);
                        } catch (e) {}
                    }
                }
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }

    return {
        async init(cfg) {
            return {
                webview: {
                    debug: true,
                    showWebView: false,
                    widthPercent: 80,
                    heightPercent: 60,
                    returnType: 'dom',
                    timeout: 30,
                    blockImages: true,
                    enableJavaScript: true,
                    header: {
                        'Referer': baseUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            };
        },

        /**
         * 首页分类
         */
        async homeContent(filter) {
            // 从网站导航提取分类
            const extractCode = `
                (function() {
                    try {
                        // 等待Vue渲染完成
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                // 查找分类导航元素
                                const navItems = document.querySelectorAll('.nav-item, .menu-item, .category-item');
                                const categories = [];
                                
                                navItems.forEach(item => {
                                    const link = item.querySelector('a');
                                    const text = item.textContent?.trim();
                                    const href = link?.getAttribute('href') || '';
                                    
                                    if (text && href && !text.includes('首页') && !text.includes('home')) {
                                        // 提取分类ID
                                        let typeId = text;
                                        const match = href.match(/\/([^/]+)\.html/);
                                        if (match) {
                                            typeId = match[1];
                                        }
                                        
                                        categories.push({
                                            type_id: typeId,
                                            type_name: text
                                        });
                                    }
                                });
                                
                                if (categories.length > 0) {
                                    resolve(JSON.stringify({ class: categories }));
                                } else {
                                    // 如果没有找到，返回默认分类
                                    resolve(JSON.stringify({
                                        class: [
                                            { type_id: "dianying", type_name: "电影" },
                                            { type_id: "dianshiju", type_name: "电视剧" },
                                            { type_id: "dongman", type_name: "动漫" },
                                            { type_id: "zongyi", type_name: "综艺" }
                                        ]
                                    }));
                                }
                            }, 3000);
                        });
                    } catch (e) {
                        return JSON.stringify({ 
                            class: [
                                { type_id: "dianying", type_name: "电影" },
                                { type_id: "dianshiju", type_name: "电视剧" },
                                { type_id: "dongman", type_name: "动漫" },
                                { type_id: "zongyi", type_name: "综艺" }
                            ]
                        });
                    }
                })();
            `;
            
            const result = await loadAndExtract(baseUrl, extractCode, 15);
            
            if (result && result.class) {
                return result;
            }
            
            // 返回默认分类
            return {
                class: [
                    { type_id: "dianying", type_name: "电影" },
                    { type_id: "dianshiju", type_name: "电视剧" },
                    { type_id: "dongman", type_name: "动漫" },
                    { type_id: "zongyi", type_name: "综艺" }
                ],
                filters: {
                    "dianying": [
                        { key: "class", name: "类型", value: [ {n:"全部",v:""}, {n:"动作",v:"动作"}, {n:"喜剧",v:"喜剧"} ] },
                        { key: "year", name: "年份", value: [ {n:"全部",v:""}, {n:"2026",v:"2026"}, {n:"2025",v:"2025"} ] }
                    ]
                }
            };
        },

        /**
         * 首页推荐视频
         */
        async homeVideoContent() {
            const extractCode = `
                (function() {
                    try {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                const videos = [];
                                
                                // 尝试多种选择器查找视频元素
                                const selectors = [
                                    '.video-item', '.vod-item', '.movie-item',
                                    '.list-item', '.card-item', '.item',
                                    '[class*="video"]', '[class*="vod"]', '[class*="movie"]'
                                ];
                                
                                for (const selector of selectors) {
                                    const items = document.querySelectorAll(selector);
                                    if (items.length > 0) {
                                        items.forEach(item => {
                                            const link = item.querySelector('a');
                                            const img = item.querySelector('img');
                                            const titleEl = item.querySelector('.title, .name, h3, h4');
                                            const remarkEl = item.querySelector('.remark, .status, .update, .episode');
                                            
                                            let vodId = link?.getAttribute('href') || '';
                                            if (vodId && !vodId.startsWith('http')) {
                                                vodId = vodId.startsWith('/') ? '${baseUrl}' + vodId : '${baseUrl}/' + vodId;
                                            }
                                            
                                            // 提取图片
                                            let vodPic = '';
                                            if (img) {
                                                vodPic = img.getAttribute('data-src') || 
                                                        img.getAttribute('src') || 
                                                        img.getAttribute('data-original') || '';
                                            }
                                            
                                            // 修复图片URL
                                            if (vodPic && !vodPic.startsWith('http')) {
                                                if (vodPic.startsWith('//')) {
                                                    vodPic = 'https:' + vodPic;
                                                } else if (vodPic.startsWith('/')) {
                                                    vodPic = '${baseUrl}' + vodPic;
                                                } else {
                                                    vodPic = '${baseUrl}/' + vodPic;
                                                }
                                            }
                                            
                                            videos.push({
                                                vod_id: vodId,
                                                vod_name: titleEl?.textContent?.trim() || link?.textContent?.trim() || '',
                                                vod_pic: vodPic,
                                                vod_remarks: remarkEl?.textContent?.trim() || ''
                                            });
                                        });
                                        
                                        if (videos.length > 0) break;
                                    }
                                }
                                
                                // 如果还是没找到，尝试从Vue数据中提取
                                if (videos.length === 0) {
                                    // 查找Vue实例的数据
                                    const vueRoot = document.querySelector('#app');
                                    if (vueRoot && vueRoot.__vue__) {
                                        const vueData = vueRoot.__vue__.$data;
                                        if (vueData) {
                                            // 递归查找视频数据
                                            const findVideos = (obj, depth = 0) => {
                                                if (depth > 3) return null;
                                                if (!obj || typeof obj !== 'object') return null;
                                                
                                                for (const key in obj) {
                                                    if (Array.isArray(obj[key]) && obj[key].length > 0) {
                                                        const item = obj[key][0];
                                                        if (item && (item.vod_name || item.name || item.title)) {
                                                            return obj[key];
                                                        }
                                                    }
                                                    
                                                    const found = findVideos(obj[key], depth + 1);
                                                    if (found) return found;
                                                }
                                                return null;
                                            };
                                            
                                            const videoArray = findVideos(vueData);
                                            if (videoArray) {
                                                videoArray.forEach(item => {
                                                    videos.push({
                                                        vod_id: item.vod_id || item.id || item.vid || '',
                                                        vod_name: item.vod_name || item.name || item.title || '',
                                                        vod_pic: item.vod_pic || item.pic || item.cover || '',
                                                        vod_remarks: item.vod_remarks || item.remarks || item.status || ''
                                                    });
                                                });
                                            }
                                        }
                                    }
                                }
                                
                                resolve(JSON.stringify({ list: videos.slice(0, 30) }));
                            }, 5000); // 等待5秒让页面完全渲染
                        });
                    } catch (e) {
                        return JSON.stringify({ list: [] });
                    }
                })();
            `;
            
            const result = await loadAndExtract(baseUrl, extractCode, 20);
            
            if (result && result.list) {
                return result;
            }
            
            return { list: [] };
        },

        /**
         * 分类内容
         */
        async categoryContent(tid, pg, filter, extend) {
            // 构建分类页URL
            let url = `${baseUrl}/list/${tid}`;
            if (pg > 1) {
                url += `/${pg}`;
            }
            url += '.html';
            
            const extractCode = `
                (function() {
                    try {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                const videos = [];
                                let total = 0;
                                let pageCount = 1;
                                let currentPage = ${parseInt(pg) || 1};
                                
                                // 提取视频列表
                                const selectors = [
                                    '.video-list .item', '.vod-list .vod-item',
                                    '.movie-list .movie-item', '.list-content .list-item',
                                    '.grid .item', '.content .item'
                                ];
                                
                                for (const selector of selectors) {
                                    const items = document.querySelectorAll(selector);
                                    if (items.length > 0) {
                                        items.forEach(item => {
                                            const link = item.querySelector('a');
                                            const img = item.querySelector('img');
                                            const titleEl = item.querySelector('.title, .name, h3, h4');
                                            const remarkEl = item.querySelector('.remark, .status, .update, .episode, .subtitle');
                                            
                                            let vodId = link?.getAttribute('href') || '';
                                            if (vodId && !vodId.startsWith('http')) {
                                                vodId = vodId.startsWith('/') ? '${baseUrl}' + vodId : '${baseUrl}/' + vodId;
                                            }
                                            
                                            let vodPic = '';
                                            if (img) {
                                                vodPic = img.getAttribute('data-src') || 
                                                        img.getAttribute('src') || 
                                                        img.getAttribute('data-original') || '';
                                            }
                                            
                                            if (vodPic && !vodPic.startsWith('http')) {
                                                if (vodPic.startsWith('//')) {
                                                    vodPic = 'https:' + vodPic;
                                                } else if (vodPic.startsWith('/')) {
                                                    vodPic = '${baseUrl}' + vodPic;
                                                }
                                            }
                                            
                                            videos.push({
                                                vod_id: vodId,
                                                vod_name: titleEl?.textContent?.trim() || link?.textContent?.trim() || '',
                                                vod_pic: vodPic,
                                                vod_remarks: remarkEl?.textContent?.trim() || ''
                                            });
                                        });
                                        break;
                                    }
                                }
                                
                                // 提取分页信息
                                const pageEl = document.querySelector('.pagination, .page, .pages');
                                if (pageEl) {
                                    const pageLinks = pageEl.querySelectorAll('a');
                                    if (pageLinks.length > 0) {
                                        // 尝试找最后一页的数字
                                        pageLinks.forEach(link => {
                                            const num = parseInt(link.textContent);
                                            if (!isNaN(num) && num > pageCount) {
                                                pageCount = num;
                                            }
                                        });
                                    }
                                    
                                    const totalEl = pageEl.querySelector('.total, .count');
                                    if (totalEl) {
                                        const totalMatch = totalEl.textContent.match(/(\\d+)/);
                                        if (totalMatch) {
                                            total = parseInt(totalMatch[1]);
                                        }
                                    }
                                }
                                
                                // 如果没有分页信息，估算
                                if (pageCount === 1 && videos.length > 0) {
                                    pageCount = Math.ceil(videos.length / 24) * 5;
                                }
                                
                                resolve(JSON.stringify({
                                    code: 1,
                                    list: videos,
                                    page: currentPage,
                                    pagecount: pageCount || 1,
                                    limit: 24,
                                    total: total || videos.length * pageCount
                                }));
                            }, 5000);
                        });
                    } catch (e) {
                        return JSON.stringify({ 
                            code: 1, 
                            list: [], 
                            page: ${parseInt(pg) || 1}, 
                            pagecount: 1, 
                            limit: 24, 
                            total: 0 
                        });
                    }
                })();
            `;
            
            const result = await loadAndExtract(url, extractCode, 20);
            
            if (result) {
                return result;
            }
            
            return {
                code: 1,
                msg: "数据列表",
                list: [],
                page: parseInt(pg) || 1,
                pagecount: 1,
                limit: 24,
                total: 0
            };
        },

        /**
         * 详情页
         */
        async detailContent(ids) {
            const vodUrl = ids[0].startsWith('http') ? ids[0] : `${baseUrl}/detail/${ids[0]}.html`;
            
            const extractCode = `
                (function() {
                    try {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                // 提取基本信息
                                const title = document.querySelector('h1')?.textContent || 
                                             document.querySelector('.title')?.textContent || 
                                             document.querySelector('.name')?.textContent || '';
                                
                                const imgEl = document.querySelector('.cover img, .poster img, .thumb img, .vod-pic img');
                                let vodPic = imgEl?.getAttribute('data-src') || imgEl?.src || '';
                                
                                if (vodPic && !vodPic.startsWith('http')) {
                                    if (vodPic.startsWith('//')) {
                                        vodPic = 'https:' + vodPic;
                                    } else if (vodPic.startsWith('/')) {
                                        vodPic = '${baseUrl}' + vodPic;
                                    }
                                }
                                
                                // 提取详情信息
                                const getInfo = (label) => {
                                    const elements = document.querySelectorAll('.info-item, .meta-item, .detail-item, p');
                                    for (const el of elements) {
                                        if (el.textContent.includes(label)) {
                                            return el.textContent.replace(label, '').replace('：', '').trim();
                                        }
                                    }
                                    return '';
                                };
                                
                                // 提取简介
                                const contentEl = document.querySelector('.desc, .summary, .intro, .content');
                                const vod_content = contentEl?.textContent?.trim() || '';
                                
                                // 提取播放列表
                                const playFromList = [];
                                const playUrlList = [];
                                
                                // 查找所有播放源
                                const sourceTabs = document.querySelectorAll('.play-source, .source-tab, .play-tab');
                                if (sourceTabs.length > 0) {
                                    sourceTabs.forEach((tab, index) => {
                                        const sourceName = tab.textContent?.trim() || \`线路\${index + 1}\`;
                                        
                                        // 查找对应的播放列表
                                        let playlist = null;
                                        const targetId = tab.getAttribute('data-target') || tab.getAttribute('href');
                                        if (targetId && targetId.startsWith('#')) {
                                            playlist = document.querySelector(targetId);
                                        }
                                        
                                        if (!playlist) {
                                            // 尝试找下一个兄弟元素
                                            let next = tab.nextElementSibling;
                                            while (next) {
                                                if (next.classList.contains('playlist') || 
                                                    next.classList.contains('episode-list') ||
                                                    next.tagName === 'UL') {
                                                    playlist = next;
                                                    break;
                                                }
                                                next = next.nextElementSibling;
                                            }
                                        }
                                        
                                        if (playlist) {
                                            const episodes = [];
                                            const links = playlist.querySelectorAll('a');
                                            
                                            links.forEach((link, idx) => {
                                                const episodeName = link.textContent?.trim() || \`第\${idx + 1}集\`;
                                                const episodeUrl = link.getAttribute('href') || '';
                                                
                                                if (episodeUrl) {
                                                    const fullUrl = episodeUrl.startsWith('http') ? episodeUrl : 
                                                                   (episodeUrl.startsWith('/') ? '${baseUrl}' + episodeUrl : '${baseUrl}/' + episodeUrl);
                                                    
                                                    // 构造播放ID
                                                    const playId = \`\${sourceName}@@source\${index}@@qqqparse@@\${'${ids[0]}'}@@\${idx + 1}@@\${fullUrl}\`;
                                                    episodes.push(\`\${episodeName}$\${playId}\`);
                                                }
                                            });
                                            
                                            if (episodes.length > 0) {
                                                playFromList.push(sourceName);
                                                playUrlList.push(episodes.join('#'));
                                            }
                                        }
                                    });
                                } else {
                                    // 如果没有标签页，直接找播放列表
                                    const playlists = document.querySelectorAll('.playlist, .episode-list, .play-url-list');
                                    playlists.forEach((playlist, index) => {
                                        const episodes = [];
                                        const links = playlist.querySelectorAll('a');
                                        
                                        links.forEach((link, idx) => {
                                            const episodeName = link.textContent?.trim() || \`第\${idx + 1}集\`;
                                            const episodeUrl = link.getAttribute('href') || '';
                                            
                                            if (episodeUrl) {
                                                const fullUrl = episodeUrl.startsWith('http') ? episodeUrl : 
                                                               (episodeUrl.startsWith('/') ? '${baseUrl}' + episodeUrl : '${baseUrl}/' + episodeUrl);
                                                
                                                const playId = \`线路\${index + 1}@@playlist\${index}@@qqqparse@@\${'${ids[0]}'}@@\${idx + 1}@@\${fullUrl}\`;
                                                episodes.push(\`\${episodeName}$\${playId}\`);
                                            }
                                        });
                                        
                                        if (episodes.length > 0) {
                                            playFromList.push(\`线路\${index + 1}\`);
                                            playUrlList.push(episodes.join('#'));
                                        }
                                    });
                                }
                                
                                // 如果还没找到，尝试从Vue数据中提取
                                if (playFromList.length === 0) {
                                    const vueRoot = document.querySelector('#app');
                                    if (vueRoot && vueRoot.__vue__) {
                                        const vueData = vueRoot.__vue__.$data;
                                        if (vueData && vueData.vod) {
                                            const vod = vueData.vod;
                                            if (vod.vod_play_from && vod.vod_play_url) {
                                                const fromList = vod.vod_play_from.split('\\\$\\\$\\\$');
                                                const urlList = vod.vod_play_url.split('\\\$\\\$\\\$');
                                                
                                                fromList.forEach((from, i) => {
                                                    const urls = urlList[i] || '';
                                                    const episodes = [];
                                                    
                                                    urls.split('#').forEach((item, j) => {
                                                        if (item.includes('\\$')) {
                                                            const [name, url] = item.split('\\$');
                                                            const playId = \`\${from}@@vod@@qqqparse@@\${vod.vod_id}@@\${j + 1}@@\${url}\`;
                                                            episodes.push(\`\${name}$\${playId}\`);
                                                        }
                                                    });
                                                    
                                                    if (episodes.length > 0) {
                                                        playFromList.push(from);
                                                        playUrlList.push(episodes.join('#'));
                                                    }
                                                });
                                            }
                                        }
                                    }
                                }
                                
                                resolve(JSON.stringify({
                                    code: 1,
                                    page: 1,
                                    pagecount: 1,
                                    limit: 1,
                                    total: 1,
                                    list: [{
                                        vod_id: '${ids[0]}',
                                        vod_name: title,
                                        vod_pic: vodPic,
                                        vod_content: vod_content,
                                        vod_director: getInfo('导演'),
                                        vod_actor: getInfo('主演'),
                                        vod_year: getInfo('年份'),
                                        vod_area: getInfo('地区'),
                                        vod_class: getInfo('类型'),
                                        vod_remarks: getInfo('更新') || getInfo('状态'),
                                        vod_play_from: playFromList.join('\\\$\\\$\\\$') || '默认线路',
                                        vod_play_url: playUrlList.join('\\\$\\\$\\\$') || ''
                                    }]
                                }));
                            }, 5000);
                        });
                    } catch (e) {
                        return JSON.stringify({ list: [] });
                    }
                })();
            `;
            
            const result = await loadAndExtract(vodUrl, extractCode, 25);
            
            if (result && result.list) {
                return result;
            }
            
            return { list: [] };
        },

        /**
         * 搜索
         */
        async searchContent(key, quick, pg) {
            const searchUrl = `${baseUrl}/search?wd=${encodeURIComponent(key)}&page=${pg || 1}`;
            
            const extractCode = `
                (function() {
                    try {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                const videos = [];
                                
                                // 查找搜索结果
                                const selectors = [
                                    '.search-list .item', '.result-list .item',
                                    '.video-list .vod-item', '.list .item'
                                ];
                                
                                for (const selector of selectors) {
                                    const items = document.querySelectorAll(selector);
                                    if (items.length > 0) {
                                        items.forEach(item => {
                                            const link = item.querySelector('a');
                                            const img = item.querySelector('img');
                                            const titleEl = item.querySelector('.title, .name, h3');
                                            const remarkEl = item.querySelector('.remark, .status');
                                            
                                            let vodId = link?.getAttribute('href') || '';
                                            if (vodId && !vodId.startsWith('http')) {
                                                vodId = vodId.startsWith('/') ? '${baseUrl}' + vodId : '${baseUrl}/' + vodId;
                                            }
                                            
                                            let vodPic = '';
                                            if (img) {
                                                vodPic = img.getAttribute('data-src') || img.src || '';
                                            }
                                            
                                            if (vodPic && !vodPic.startsWith('http')) {
                                                if (vodPic.startsWith('//')) {
                                                    vodPic = 'https:' + vodPic;
                                                } else if (vodPic.startsWith('/')) {
                                                    vodPic = '${baseUrl}' + vodPic;
                                                }
                                            }
                                            
                                            videos.push({
                                                vod_id: vodId,
                                                vod_name: titleEl?.textContent?.trim() || link?.textContent?.trim() || '',
                                                vod_pic: vodPic,
                                                vod_remarks: remarkEl?.textContent?.trim() || ''
                                            });
                                        });
                                        break;
                                    }
                                }
                                
                                resolve(JSON.stringify({
                                    code: 1,
                                    list: videos,
                                    page: ${parseInt(pg) || 1},
                                    pagecount: Math.ceil(videos.length / 15) || 1,
                                    limit: 15,
                                    total: videos.length
                                }));
                            }, 5000);
                        });
                    } catch (e) {
                        return JSON.stringify({ list: [] });
                    }
                })();
            `;
            
            const result = await loadAndExtract(searchUrl, extractCode, 20);
            
            if (result) {
                return result;
            }
            
            return { list: [] };
        },

        /**
         * 播放器
         */
        async playerContent(flag, id, vipFlags) {
            console.log('播放请求:', { flag, id });
            
            try {
                if (id.includes('@@')) {
                    const parts = id.split('@@');
                    
                    if (parts.length >= 6) {
                        const lineName = parts[0];
                        const sourceId = parts[1];
                        const mode = parts[2];
                        const mediaId = parts[3];
                        const nid = parts[4];
                        const rawUrl = parts[5];
                        
                        // 构建完整的播放页URL
                        const playUrl = rawUrl.startsWith('http') ? rawUrl : 
                                       (rawUrl.startsWith('/') ? baseUrl + rawUrl : baseUrl + '/' + rawUrl);
                        
                        console.log('播放页URL:', playUrl);
                        
                        // 尝试从播放页提取真实视频地址
                        try {
                            const document = await Java.wvOpen(playUrl, {
                                showWebView: false,
                                timeout: 15,
                                enableJavaScript: true
                            });
                            
                            // 等待播放器加载
                            await Java.sleep(3000);
                            
                            // 执行JS提取视频地址
                            const videoUrl = await evaluateJs(`
                                (function() {
                                    // 查找video元素
                                    const video = document.querySelector('video');
                                    if (video && video.src) {
                                        return video.src;
                                    }
                                    
                                    // 查找source元素
                                    const source = document.querySelector('source');
                                    if (source && source.src) {
                                        return source.src;
                                    }
                                    
                                    // 查找iframe
                                    const iframe = document.querySelector('iframe');
                                    if (iframe && iframe.src) {
                                        return iframe.src;
                                    }
                                    
                                    // 查找各种播放器变量
                                    const players = ['player', 'vodPlayer', 'videoPlayer', 'dplayer'];
                                    for (const player of players) {
                                        if (window[player] && window[player].url) {
                                            return window[player].url;
                                        }
                                    }
                                    
                                    // 查找可能的视频地址变量
                                    const urlVars = ['videoUrl', 'playUrl', 'vod_url', 'play_url'];
                                    for (const varName of urlVars) {
                                        if (window[varName]) {
                                            return window[varName];
                                        }
                                    }
                                    
                                    return null;
                                })();
                            `);
                            
                            if (videoUrl) {
                                console.log('找到视频地址:', videoUrl);
                                return { url: videoUrl, parse: 0 };
                            }
                            
                        } catch (e) {
                            console.log('从播放页提取失败:', e);
                        }
                        
                        // 如果无法提取，返回播放页让解析器处理
                        return {
                            parse: 1,
                            url: playUrl,
                            header: {
                                'Referer': baseUrl,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        };
                    }
                }
                
                // 处理直接URL
                if (id.startsWith('http')) {
                    return { url: id, parse: 0 };
                }
                
                return { url: id, parse: 1 };
                
            } catch (error) {
                console.log('播放器处理失败:', error);
                return { url: id, parse: 1 };
            }
        },

        /**
         * 本地搜索（用于调试）
         */
        async localSearch(key) {
            // 获取所有分类的数据并搜索
            const categories = ['dianying', 'dianshiju', 'dongman', 'zongyi'];
            const allVideos = [];
            
            for (const cat of categories) {
                const result = await this.categoryContent(cat, 1, {}, {});
                if (result && result.list) {
                    const matched = result.list.filter(vod => 
                        vod.vod_name.toLowerCase().includes(key.toLowerCase())
                    );
                    allVideos.push(...matched);
                }
            }
            
            return {
                list: allVideos.slice(0, 50)
            };
        },

        /**
         * 自定义动作
         */
        async action(actionStr) {
            try {
                const params = JSON.parse(actionStr);
                console.log('action params:', params);
                
                switch (params.action) {
                    case 'debug':
                        // 打开WebView显示调试
                        await Java.showWebView();
                        return { msg: 'WebView已打开' };
                        
                    case 'localSearch':
                        if (params.key) {
                            return await this.localSearch(params.key);
                        }
                        break;
                        
                    case 'testUrl':
                        if (params.url) {
                            const result = await loadAndExtract(params.url, 'return document.title;', 10);
                            return { title: result };
                        }
                        break;
                }
                
            } catch (e) {
                console.log('action解析失败');
            }
            
            return { list: [] };
        }
    };
}

const spider = qqqSpider();
spider;
