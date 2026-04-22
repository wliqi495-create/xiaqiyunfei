const axios = require("axios");
const http = require("http");
const https = require("https");
const cheerio = require("cheerio");

const _http = axios.create({
    timeout: 15 * 1000,
    httpsAgent: new https.Agent({ keepAlive: true, rejectUnauthorized: false }),
    httpAgent: new http.Agent({ keepAlive: true }),
});

// 4K-AV配置
const avConfig = {
    host: "https://4k-av.com",
    headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
        "Content-Type": "application/json",
        "Referer": "https://4k-av.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br"
    }
};

const PAGE_LIMIT = 9;

// 解析4K-AV播放页，提取真实视频地址
const parseAvPlayPage = async (playUrl) => {
    try {
        console.log('🔍 解析4K-AV播放页:', playUrl);
        
        const response = await _http.get(playUrl, {
            headers: {
                ...avConfig.headers,
                "Referer": avConfig.host + "/"
            }
        });
        
        const html = response.data;
        
        // 查找source标签中的视频地址
        const sourceMatch = html.match(/<source src="(.*?)"/);
        if (sourceMatch && sourceMatch[1]) {
            let videoUrl = sourceMatch[1];
            
            // 处理相对路径
            if (videoUrl.startsWith('//')) {
                videoUrl = 'https:' + videoUrl;
            } else if (videoUrl.startsWith('/')) {
                videoUrl = avConfig.host + videoUrl;
            }
            
            console.log('✅ 找到视频地址:', videoUrl);
            return videoUrl;
        }
        
        // 如果直接就是m3u8或mp4链接，直接返回
        if (playUrl.match(/\.(m3u8|mp4)/i)) {
            console.log('✅ 直接播放链接:', playUrl);
            return playUrl;
        }
        
        // 查找iframe中的视频地址
        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/);
        if (iframeMatch && iframeMatch[1]) {
            let iframeUrl = iframeMatch[1];
            if (iframeUrl.startsWith('//')) {
                iframeUrl = 'https:' + iframeUrl;
            } else if (iframeUrl.startsWith('/')) {
                iframeUrl = avConfig.host + iframeUrl;
            }
            
            // 递归解析iframe
            return await parseAvPlayPage(iframeUrl);
        }
        
        console.log('❌ 未找到可播放的视频地址');
        return null;
    } catch (error) {
        console.error('❌ 解析播放页错误:', error.message);
        return null;
    }
};

// 获取分类数据
const getClasses = async () => {
    return [
        { type_id: "movie", type_name: "电影" },
        { type_id: "tv", type_name: "剧集" }
    ];
};

// 获取首页推荐
const getHomeRecommend = async () => {
    try {
        const url = avConfig.host + "/";
        const response = await _http.get(url, { headers: avConfig.headers });
        const html = response.data;
        
        const list = [];
        const $ = cheerio.load(html);
        
        $('.NTMitem').each((i, it) => {
            const $it = $(it);
            const title = $it.find('a').attr('title') || $it.find('a').text().trim();
            const pic = $it.find('img').attr('src') || $it.find('img').attr('data-src');
            const desc = $it.find('.tags').text().trim();
            const href = $it.find('a').attr('href');
            
            // 确保href是相对路径时转换为完整路径
            let vodId = href;
            if (vodId && vodId.startsWith('/')) {
                vodId = vodId.substring(1);
            }
            
            if (title) {
                list.push({
                    vod_id: vodId || '',
                    vod_name: title,
                    vod_pic: pic ? (pic.startsWith('http') ? pic : avConfig.host + pic) : '',
                    vod_remarks: desc || ''
                });
            }
        });
        
        console.log(`✅ 获取到 ${list.length} 个首页推荐`);
        return list;
    } catch (error) {
        console.error('❌ 首页推荐错误:', error.message);
        return [];
    }
};

// 分类列表请求
const getCategoryList = async (type, page = 1, extend = {}) => {
    try {
        // 构建URL，支持过滤条件
        let url = avConfig.host + "/";
        
        if (type) {
            url += type;
            
            // 处理过滤条件
            if (extend.class) {
                url += extend.class;
            }
            
            url += `/page-${page}.html`;
            
            // 如果type是tv且有过滤条件，需要特殊处理
            if (type === 'tv' && extend.class) {
                // 对于tv分类，过滤条件会重复一次
                url = avConfig.host + "/" + type + extend.class + `/page-${page}.html` + "/" + type + extend.class;
            }
        } else {
            // 首页情况
            url = avConfig.host + `/page-${page}.html`;
        }
        
        console.log('📥 分类列表URL:', url);
        
        const response = await _http.get(url, { headers: avConfig.headers });
        const html = response.data;
        const $ = cheerio.load(html);
        
        const list = [];
        
        $('.NTMitem').each((i, it) => {
            const $it = $(it);
            const title = $it.find('a').attr('title') || $it.find('a').text().trim();
            const pic = $it.find('img').attr('src') || $it.find('img').attr('data-src');
            const desc = $it.find('.tags').text().trim();
            const href = $it.find('a').attr('href');
            
            if (title) {
                let vodId = href;
                if (vodId && vodId.startsWith('/')) {
                    vodId = vodId.substring(1);
                }
                
                list.push({
                    vod_id: vodId || '',
                    vod_name: title,
                    vod_pic: pic ? (pic.startsWith('http') ? pic : avConfig.host + pic) : '',
                    vod_remarks: desc || ''
                });
            }
        });
        
        console.log(`✅ 分类 ${type} 第 ${page} 页获取到 ${list.length} 个项目`);
        return {
            list: list,
            page: parseInt(page),
            pagecount: list.length >= PAGE_LIMIT ? parseInt(page) + 1 : parseInt(page)
        };
    } catch (error) {
        console.error('❌ 分类列表错误:', error.message);
        return { list: [], page: parseInt(page), pagecount: 1 };
    }
};

// 搜索功能
const searchVod = async (keyword, page = 1) => {
    try {
        const searchUrl = avConfig.host + `/s?q=${encodeURIComponent(keyword)}`;
        console.log('🔍 搜索URL:', searchUrl);
        
        const response = await _http.get(searchUrl, { headers: avConfig.headers });
        const html = response.data;
        const $ = cheerio.load(html);
        
        const list = [];
        
        $('.NTMitem').each((i, it) => {
            const $it = $(it);
            const title = $it.find('a').attr('title') || $it.find('a').text().trim();
            const pic = $it.find('img').attr('src') || $it.find('img').attr('data-src');
            const desc = $it.find('.tags').text().trim();
            const href = $it.find('a').attr('href');
            
            if (title && title.toLowerCase().includes(keyword.toLowerCase())) {
                let vodId = href;
                if (vodId && vodId.startsWith('/')) {
                    vodId = vodId.substring(1);
                }
                
                list.push({
                    vod_id: vodId || '',
                    vod_name: title,
                    vod_pic: pic ? (pic.startsWith('http') ? pic : avConfig.host + pic) : '',
                    vod_remarks: desc || ''
                });
            }
        });
        
        console.log(`✅ 搜索 "${keyword}" 找到 ${list.length} 个结果`);
        return {
            list: list,
            page: parseInt(page),
            pagecount: list.length >= PAGE_LIMIT ? parseInt(page) + 1 : parseInt(page),
            total: list.length
        };
    } catch (error) {
        console.error('❌ 搜索错误:', error.message);
        return { list: [], page: parseInt(page), pagecount: 1, total: 0 };
    }
};

// 详情获取
const getDetail = async (id) => {
    try {
        // 确保id是完整路径
        let detailUrl = id.startsWith('http') ? id : avConfig.host + '/' + id;
        console.log('🔍 获取详情:', detailUrl);
        
        const response = await _http.get(detailUrl, { headers: avConfig.headers });
        const html = response.data;
        const $ = cheerio.load(html);
        
        // 基本信息
        const vod_name = $('#MainContent_titleh12 div:eq(1)').text().trim() || $('title').text().replace(' - 4KAV', '').trim();
        const vod_content = $('.videodesc').text().trim();
        const vod_pic = $('#MainContent_poster img').attr('src') || $('img.lazy').attr('src');
        const type_name = $('.tags--span').text().trim();
        const vod_remarks = $('.videodetail label:eq(0)').text().trim();
        const vod_year = $('.videodetail a').text().trim();
        const vod_area = $('.videodetail label:eq(1)').text().trim();
        
        // 播放列表提取
        const playmap = {};
        const playLines = ['4KAV专线'];
        playmap['4KAV专线'] = [];
        
        // 方法1：查找ul#rtlist中的剧集
        $('#rtlist li').each((i, li) => {
            const $li = $(li);
            const title = $li.find('span').text().trim();
            let url = $li.find('img').attr('src');
            
            if (title && url) {
                // 替换screenshot.jpg为空，获取视频页面URL
                url = url.replace('screenshot.jpg', '');
                if (url.startsWith('/')) {
                    url = avConfig.host + url;
                }
                playmap['4KAV专线'].push(title + "$" + url);
            }
        });
        
        // 方法2：如果rtlist为空，尝试从海报链接获取
        if (playmap['4KAV专线'].length === 0) {
            $('#MainContent_poster a').each((i, a) => {
                const $a = $(a);
                const title = $a.attr('title') || '';
                let url = $a.attr('href');
                
                if (title && url && !title.includes('电影海报')) {
                    const kname = title.replace('电影海报', '').trim();
                    url = url.replace('poster.jpg', '');
                    if (url.startsWith('/')) {
                        url = avConfig.host + url;
                    }
                    playmap['4KAV专线'].push(kname + "$" + url);
                }
            });
        }
        
        // 如果还是没有找到，使用详情页作为默认播放
        if (playmap['4KAV专线'].length === 0) {
            console.log('⚠️ 未找到播放列表，使用详情页作为默认');
            playmap['4KAV专线'].push(`正片$${detailUrl}`);
        }
        
        console.log(`✅ 找到 ${playmap['4KAV专线'].length} 个剧集`);
        
        const detail = {
            vod_id: id,
            vod_name: vod_name,
            vod_pic: vod_pic ? (vod_pic.startsWith('http') ? vod_pic : avConfig.host + vod_pic) : '',
            vod_content: vod_content,
            type_name: type_name,
            vod_remarks: vod_remarks,
            vod_year: vod_year,
            vod_area: vod_area,
            vod_director: '未知',
            vod_actor: '未知',
            vod_play_from: playLines.join('$$$'),
            vod_play_url: playmap['4KAV专线'].join('#')
        };
        
        console.log('✅ 详情获取成功');
        return detail;
    } catch (error) {
        console.error('❌ 详情获取错误:', error.message);
        return null;
    }
};

// 播放请求处理
const getPlayUrl = async (playUrl) => {
    try {
        console.log('🎬 处理播放URL:', playUrl);
        
        // 确保URL格式正确
        if (playUrl && !playUrl.startsWith('http')) {
            playUrl = playUrl.startsWith('/') ? 
                avConfig.host + playUrl : 
                avConfig.host + '/' + playUrl;
        }
        
        console.log('🔧 处理后的播放URL:', playUrl);
        
        // 检查是否是直接播放链接
        const isDirectPlayable = playUrl.match(/\.(m3u8|mp4|flv|avi|mkv|ts)/i);
        
        if (isDirectPlayable) {
            console.log('✅ 直接播放链接');
            // 直接播放
            return {
                parse: 0,
                url: playUrl,
                header: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
                    "Referer": avConfig.host + "/",
                    "Origin": avConfig.host
                }
            };
        } else {
            console.log('🔍 需要解析播放页');
            // 需要解析播放页
            const realVideoUrl = await parseAvPlayPage(playUrl);
            
            if (realVideoUrl) {
                console.log('✅ 解析成功，真实视频地址:', realVideoUrl);
                return {
                    parse: 0,
                    url: realVideoUrl,
                    header: {
                        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
                        "Referer": playUrl,
                        "Origin": avConfig.host
                    }
                };
            }
            
            console.log('⚠️ 未解析出真实地址，让TVBox尝试解析');
            // 如果没解析出真实地址，让TVBox尝试解析
            return {
                parse: 1,
                url: playUrl,
                header: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
                    "Referer": avConfig.host + "/",
                    "Origin": avConfig.host
                }
            };
        }
    } catch (error) {
        console.error('❌ 播放处理错误:', error.message);
        return {
            parse: 1,
            url: playUrl,
            header: avConfig.headers
        };
    }
};

// TVBox T4 接口请求处理
const handleT4Request = async (req) => {
    try {
        const { ac, t, pg, wd, ids, play, quick, extend } = req.query;
        const page = parseInt(pg) || 1;

        console.log('📥 请求参数:', { ac, t, pg, wd, ids, play: play ? '***' : null, quick, extend });

        // 1. 搜索请求
        if (wd) {
            console.log('🔍 搜索请求:', wd);
            const result = await searchVod(wd, page);
            if (quick === 'true') {
                result.list = result.list.slice(0, 10);
            }
            return {
                list: result.list,
                page: result.page,
                pagecount: result.pagecount,
                limit: PAGE_LIMIT,
                total: result.total
            };
        }

        // 2. 播放请求 - 最高优先级
        if (play) {
            console.log('🎬 播放请求');
            return await getPlayUrl(play);
        }

        // 3. 详情请求
        if (ids) {
            console.log('📋 详情请求:', ids);
            const detail = await getDetail(ids);
            return {
                list: detail ? [detail] : [],
                page: 1,
                pagecount: 1,
                total: detail ? 1 : 0
            };
        }

        // 4. 分类内容请求
        if (t) {
            console.log('📁 分类请求:', t, '页码:', page);
            const extendParams = {};
            if (extend) {
                try { 
                    Object.assign(extendParams, JSON.parse(extend)); 
                } catch (e) {
                    console.error('❌ extend参数解析错误:', e.message);
                }
            }
            const result = await getCategoryList(t, page, extendParams);
            return {
                list: result.list,
                page: result.page,
                pagecount: result.pagecount,
                limit: PAGE_LIMIT
            };
        }

        // 5. 首页请求
        if (!ac || ac === 'class') {
            console.log('🏠 首页请求');
            const classes = await getClasses();
            if (ac === 'class') {
                console.log('📋 分类列表请求');
                return { class: classes };
            }
            
            const homeList = await getHomeRecommend();
            return {
                class: classes,
                list: homeList.slice(0, 20),
                page: 1,
                pagecount: 1,
                total: homeList.length
            };
        }

        console.log('⚠️ 未知请求类型');
        return { list: [], page: 1, pagecount: 1 };
    } catch (error) {
        console.error('❌ 接口处理错误:', error.message);
        return { 
            list: [], 
            page: 1, 
            pagecount: 1,
            error: error.message 
        };
    }
};

const meta = {
    key: "4KAV",
    name: "4K-AV",
    type: 4,
    api: "/video/4KAV",
};

module.exports = async (app, opt) => {
    app.get(meta.api, async (req, reply) => {
        const result = await handleT4Request(req);
        return result;
    });
    opt.sites.push(meta);
};