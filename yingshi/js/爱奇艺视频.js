/**
 * 爱奇艺视频 - 猫影视/TVBox JS爬虫格式
 * 调用壳子超级解析功能（壳子会自动读取json配置）
 */

class Spider extends BaseSpider {
    
    constructor() {
        super();
        this.host = 'https://www.iqiyi.com';
        this.sessionStore = {};
        
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.iqiyi.com',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
        };
        
        // 分类配置
        this.classes = [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '电视剧' },
            { type_id: '6', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' },
            { type_id: '3', type_name: '纪录片' },
            { type_id: '5', type_name: '音乐' },
            { type_id: '16', type_name: '网络电影' }
        ];
        
        // 筛选配置
        this.filters = {
            '1': [{ key: 'year', name: '年代', value: [{ n: '全部', v: '' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }, { n: '2023', v: '2023' }] }],
            '2': [{ key: 'year', name: '年代', value: [{ n: '全部', v: '' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }, { n: '2023', v: '2023' }] }]
        };
    }
    
    init(extend = '') {
        return '';
    }
    
    getName() {
        return '爱奇艺视频';
    }
    
    isVideoFormat(url) {
        return true;
    }
    
    manualVideoCheck() {
        return false;
    }
    
    destroy() {
        // 清理资源
    }
    
    homeContent(filter) {
        const result = {
            class: this.classes,
            filters: this.filters
        };
        
        return result;
    }
    
    homeVideoContent() {
        return { list: [] };
    }
    
    async categoryContent(tid, pg, filter, extend) {
        try {
            let channelId = tid;
            let dataType = 1;
            let extraParams = "";
            const page = parseInt(pg) || 1;

            if (tid === "16") {
                channelId = "1";
                extraParams = "&three_category_id=27401";
            } else if (tid === "5") {
                dataType = 2;
            }

            // 处理筛选条件
            if (extend) {
                let extendObj = {};
                if (typeof extend === 'string') {
                    try {
                        extendObj = JSON.parse(extend);
                    } catch (e) {
                        // 如果不是JSON，尝试解析为key=value格式
                        extend.split('&').forEach(item => {
                            const [key, value] = item.split('=');
                            if (key && value) {
                                extendObj[key] = value;
                            }
                        });
                    }
                } else if (typeof extend === 'object') {
                    extendObj = extend;
                }
                
                if (extendObj.year) {
                    extraParams += `&market_release_date_level=${extendObj.year}`;
                }
            }

            const url = `https://pcw-api.iqiyi.com/search/recommend/list?channel_id=${channelId}&data_type=${dataType}&page_id=${page}&ret_num=20${extraParams}`;
            
            const response = await this.fetch(url, {}, this.headers);
            const jsonData = response.data;
            
            const videos = [];
            if (jsonData.data && jsonData.data.list) {
                for (const item of jsonData.data.list) {
                    const vid = `${item.channelId}$${item.albumId}`;
                    let remarks = "";
                    
                    if (item.channelId === 1) {
                        remarks = item.score ? `${item.score}分` : "";
                    } else if (item.channelId === 2 || item.channelId === 4) {
                        if (item.latestOrder && item.videoCount) {
                            remarks = item.latestOrder === item.videoCount ? 
                                `${item.latestOrder}集全` : 
                                `更新至${item.latestOrder}集`;
                        } else {
                            remarks = item.focus || "";
                        }
                    } else {
                        remarks = item.period || item.focus || "";
                    }

                    videos.push({
                        vod_id: vid,
                        vod_name: item.name,
                        vod_pic: item.imageUrl ? item.imageUrl.replace(".jpg", "_390_520.jpg") : "",
                        vod_remarks: remarks
                    });
                }
            }
            
            return {
                list: videos,
                page: page,
                pagecount: 9999,
                limit: 20,
                total: 999999
            };
            
        } catch (error) {
            console.error(`categoryContent error: ${error.message}`);
            return {
                list: [],
                page: pg,
                pagecount: 0,
                limit: 20,
                total: 0
            };
        }
    }
    
    async getPlaylists(channelId, albumId, data) {
        let playlists = [];
        const cid = parseInt(channelId || data.channelId || 0);

        try {
            if (cid === 1 || cid === 5) {
                // 电影或音乐
                if (data.playUrl) {
                    playlists.push({ title: data.name || '正片', url: data.playUrl });
                }
            } else if (cid === 6 && data.period) {
                // 综艺
                let qs = data.period.toString().split("-")[0];
                let listUrl = `https://pcw-api.iqiyi.com/album/source/svlistinfo?cid=6&sourceid=${albumId}&timelist=${qs}`;
                try {
                    const listResp = await this.fetch(listUrl, {}, this.headers);
                    const listJson = listResp.data;
                    if (listJson.data && listJson.data[qs]) {
                        listJson.data[qs].forEach(it => {
                            playlists.push({ 
                                title: it.shortTitle || it.period || it.focus || `期${it.order}`, 
                                url: it.playUrl 
                            });
                        });
                    }
                } catch (e) { 
                    console.error(`综艺列表获取失败: ${e.message}`);
                }
            } else {
                // 电视剧、动漫等
                let listUrl = `https://pcw-api.iqiyi.com/albums/album/avlistinfo?aid=${albumId}&size=100&page=1`;
                try {
                    const listResp = await this.fetch(listUrl, {}, this.headers);
                    const listJson = listResp.data;
                    
                    if (listJson.data && listJson.data.epsodelist) {
                        playlists = listJson.data.epsodelist.map(item => ({
                            title: item.shortTitle || item.title || 
                                  (item.order ? `第${item.order}集` : `集${item.timelist}`),
                            url: item.playUrl || item.url || ''
                        }));

                        // 处理分页
                        const total = listJson.data.total;
                        if (total > 100) {
                            const totalPages = Math.ceil(total / 100);
                            for (let i = 2; i <= totalPages; i++) {
                                let nextUrl = `https://pcw-api.iqiyi.com/albums/album/avlistinfo?aid=${albumId}&size=100&page=${i}`;
                                try {
                                    const nextResp = await this.fetch(nextUrl, {}, this.headers);
                                    const nextJson = nextResp.data;
                                    if (nextJson.data && nextJson.data.epsodelist) {
                                        playlists = playlists.concat(nextJson.data.epsodelist.map(item => ({
                                            title: item.shortTitle || item.title || 
                                                  (item.order ? `第${item.order}集` : `集${item.timelist}`),
                                            url: item.playUrl || item.url || ''
                                        })));
                                    }
                                } catch (e) { break; }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`剧集列表获取失败: ${e.message}`);
                }
            }
        } catch (error) {
            console.error(`getPlaylists error: ${error.message}`);
        }
        
        return playlists;
    }
    
    async detailContent(ids) {
        try {
            const id = ids[0];
            let channelId = "";
            let albumId = id;
            
            if (id.includes('$')) {
                const parts = id.split('$');
                channelId = parts[0];
                albumId = parts[1];
            }

            // 获取视频基本信息
            const infoUrl = `https://pcw-api.iqiyi.com/video/video/videoinfowithuser/${albumId}?agent_type=1&authcookie=&subkey=${albumId}&subscribe=1`;
            const infoResp = await this.fetch(infoUrl, {}, this.headers);
            const infoJson = infoResp.data;
            const data = infoJson.data || {};

            // 获取播放列表
            const playlists = await this.getPlaylists(channelId, albumId, data);
            
            // 构建播放地址
            const playUrls = [];
            if (playlists.length > 0) {
                for (const item of playlists) {
                    if (item.url) {
                        playUrls.push(`${item.title}$${item.url}`);
                    }
                }
            }

            const vod = {
                vod_id: id,
                vod_name: data.name || '未知标题',
                type_name: data.categories ? data.categories.map(it => it.name).join(',') : '',
                vod_year: data.formatPeriod || '',
                vod_area: data.areas ? data.areas.map(it => it.name).join(',') : '',
                vod_remarks: data.latestOrder ? 
                    `更新至${data.latestOrder}集` : 
                    (data.period || playlists.length > 0 ? `${playlists.length}集` : ''),
                vod_actor: data.people && data.people.main_charactor ? 
                    data.people.main_charactor.map(it => it.name).join(',') : '',
                vod_director: data.people && data.people.director ? 
                    data.people.director.map(it => it.name).join(',') : '',
                vod_content: data.description || '暂无简介',
                vod_pic: data.imageUrl ? data.imageUrl.replace(".jpg", "_480_270.jpg") : '',
                vod_play_from: playUrls.length > 0 ? '爱奇艺视频' : '',
                vod_play_url: playUrls.length > 0 ? playUrls.join('#') : ''
            };
            
            return { list: [vod] };
            
        } catch (error) {
            console.error(`detailContent error: ${error.message}`);
            return { list: [] };
        }
    }
    
    async searchContent(key, quick, pg = '1') {
        try {
            const page = parseInt(pg) || 1;
            const url = `https://search.video.iqiyi.com/o?if=html5&key=${encodeURIComponent(key)}&pageNum=${page}&pos=1&pageSize=20&site=iqiyi`;
            
            const response = await this.fetch(url, {}, this.headers);
            const jsonData = response.data;
            
            const videos = [];
            
            if (jsonData.data && jsonData.data.docinfos) {
                for (const item of jsonData.data.docinfos) {
                    if (item.albumDocInfo) {
                        const doc = item.albumDocInfo;
                        const channelId = doc.channel ? doc.channel.split(',')[0] : '0';
                        videos.push({
                            vod_id: `${channelId}$${doc.albumId}`,
                            vod_name: doc.albumTitle || '',
                            vod_pic: doc.albumVImage || '',
                            vod_remarks: doc.tvFocus || doc.year || ''
                        });
                    }
                }
            }
            
            return {
                list: videos,
                page: page,
                pagecount: 10,
                limit: 20,
                total: videos.length
            };
            
        } catch (error) {
            console.error(`searchContent error: ${error.message}`);
            return {
                list: [],
                page: pg,
                pagecount: 0,
                limit: 20,
                total: 0
            };
        }
    }
    
    async playerContent(flag, id, vipFlags) {
        try {
            // 解析播放地址
            let playUrl = id;
            if (id.includes('$')) {
                playUrl = id.split('$')[1];
            }
            
            // 关键：调用壳子超级解析
            const playData = {
                parse: 1,           // 必须为1，表示需要解析
                jx: 1,              // 必须为1，启用解析
                play_parse: true,   // 启用播放解析
                parse_type: '壳子超级解析',
                parse_source: '爱奇艺视频',
                url: playUrl,       // 原始爱奇艺链接
                header: JSON.stringify({
                    'User-Agent': this.headers['User-Agent'],
                    'Referer': 'https://www.iqiyi.com',
                    'Origin': 'https://www.iqiyi.com'
                })
            };
            
            return playData;
            
        } catch (error) {
            console.error(`playerContent error: ${error.message}`);
            // 即使出错也返回超级解析参数，让壳子处理
            return {
                parse: 1,
                jx: 1,
                play_parse: true,
                parse_type: '壳子超级解析',
                parse_source: '爱奇艺视频',
                url: id,
                header: JSON.stringify(this.headers)
            };
        }
    }
    
    localProxy(param) {
        return null;
    }
}

// 导出 Spider 类
module.exports = Spider;