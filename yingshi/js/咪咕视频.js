/**
 * 咪咕视频 - 猫影视/TVBox JS爬虫格式
 * 继承BaseSpider类，使用壳子超级解析
 */

class Spider extends BaseSpider {
    
    constructor() {
        super();
        this.host = "https://webapi.miguvideo.com";
        this.host2 = "https://jadeite.migu.cn";
        this.siteName = "咪咕视频";
        this.sessionStore = {};
        this.videoCache = {};
        
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
            "Referer": "https://www.miguvideo.com",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Content-Type": "application/json"
        };
        
        this.oldHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.87 Safari/537.36'
        };
    }
    
    init(extend = "") {
        return "";
    }
    
    getName() {
        return this.siteName;
    }
    
    isVideoFormat(url) {
        return true;
    }
    
    manualVideoCheck() {
        return false;
    }
    
    destroy() {
        this.sessionStore = {};
        this.videoCache = {};
    }
    
    homeContent(filter) {
        const categories = [
            { "type_id": "1000", "type_name": "电影" },
            { "type_id": "1001", "type_name": "剧集" },
            { "type_id": "1007", "type_name": "动漫" },
            { "type_id": "601382", "type_name": "少儿" },
            { "type_id": "1002", "type_name": "纪录" },
            { "type_id": "1005", "type_name": "综艺" }
        ];
        
        const filters = {
            "1001": [{
                "key": "年代",
                "name": "年代",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2025", "v": "2025" },
                    { "n": "2024", "v": "2024" },
                    { "n": "2023", "v": "2023" },
                    { "n": "2022", "v": "2022" },
                    { "n": "2021", "v": "2021" },
                    { "n": "2020", "v": "2020" },
                    { "n": "2019", "v": "2019" },
                    { "n": "2018", "v": "2018" }
                ]
            }],
            "1000": [{
                "key": "年代",
                "name": "年代",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2024", "v": "2024" },
                    { "n": "2023", "v": "2023" },
                    { "n": "2022", "v": "2022" },
                    { "n": "2021", "v": "2021" },
                    { "n": "2020", "v": "2020" },
                    { "n": "2019", "v": "2019" },
                    { "n": "2018", "v": "2018" },
                    { "n": "2017", "v": "2017" }
                ]
            }],
            "1005": [{
                "key": "年代",
                "name": "年代",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2023", "v": "2023" },
                    { "n": "2022", "v": "2022" },
                    { "n": "2021", "v": "2021" },
                    { "n": "2020", "v": "2020" },
                    { "n": "2019", "v": "2019" },
                    { "n": "2018", "v": "2018" },
                    { "n": "2017", "v": "2017" },
                    { "n": "2016", "v": "2016" }
                ]
            }],
            "1007": [{
                "key": "年代",
                "name": "年代",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2023", "v": "2023" },
                    { "n": "2022", "v": "2022" },
                    { "n": "2021", "v": "2021" },
                    { "n": "2020", "v": "2020" },
                    { "n": "2019", "v": "2019" },
                    { "n": "2018", "v": "2018" },
                    { "n": "2017", "v": "2017" },
                    { "n": "2016", "v": "2016" }
                ]
            }],
            "601382": [{
                "key": "年代",
                "name": "年代",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2023", "v": "2023" },
                    { "n": "2022", "v": "2022" },
                    { "n": "2021", "v": "2021" },
                    { "n": "2020", "v": "2020" },
                    { "n": "2019", "v": "2019" },
                    { "n": "2018", "v": "2018" },
                    { "n": "2017", "v": "2017" },
                    { "n": "2016", "v": "2016" }
                ]
            }],
            "1002": [{
                "key": "年代",
                "name": "年代",
                "value": [
                    { "n": "全部", "v": "" },
                    { "n": "2023", "v": "2023" },
                    { "n": "2022", "v": "2022" },
                    { "n": "2021", "v": "2021" },
                    { "n": "2020", "v": "2020" },
                    { "n": "2019", "v": "2019" },
                    { "n": "2018", "v": "2018" },
                    { "n": "2017", "v": "2017" },
                    { "n": "2016", "v": "2016" }
                ]
            }]
        };
        
        return {
            class: categories,
            filters: filters
        };
    }
    
    async homeVideoContent() {
        // 咪咕首页推荐
        return { list: [] };
    }
    
    async categoryContent(tid, pg, filter, extend) {
        try {
            const page = parseInt(pg) || 1;
            
            let filterObj = {};
            if (extend && typeof extend === 'object') {
                filterObj = extend;
            }
            
            // 获取年代筛选条件
            const NdType = filterObj['年代'] || '';
            
            const url = `${this.host2}/search/v3/category?&pageStart=${page}&pageNum=21&contDisplayType=${tid}&mediaYear=${NdType}`;
            
            const response = await this.fetch(url, {}, this.oldHeaders);
            const data = response.data;
            const stup = data.body?.data || [];
            
            const videos = [];
            for (const vod of stup) {
                videos.push({
                    vod_id: vod.pID || '',
                    vod_name: vod.name || '',
                    vod_pic: vod.pics?.highResolutionV || '',
                    vod_remarks: vod.rightDownTip || '推荐',
                    vod_content: ''
                });
            }
            
            return {
                list: videos,
                page: page,
                pagecount: 9999,
                limit: 90,
                total: 999999
            };
            
        } catch (error) {
            console.error(`categoryContent error: ${error.message}`);
            return {
                list: [],
                page: pg,
                pagecount: 0,
                limit: 90,
                total: 0
            };
        }
    }
    
    async detailContent(ids) {
        try {
            const id = ids[0];
            if (!id) return { list: [] };
            
            // 检查缓存
            const cacheKey = `detail_${id}`;
            if (this.videoCache[cacheKey]) {
                return { list: [this.videoCache[cacheKey]] };
            }
            
            const url = `${this.host}/gateway/program-dynamic/v3/cont/dynamic-cdn/${id}/1`;
            
            const response = await this.fetch(url, {}, this.oldHeaders);
            const detail = response.data;
            const data = detail.body?.data;
            
            if (!data) {
                return { list: [] };
            }
            
            const content = data.detail || '未知';
            const actor = data.actor || '未知';
            const director = data.director || '未知';
            const score = data.score || '未知';
            const stateTime = data.stateTime || '未知';
            const remarks = (data.contentStyle || '未知') + ' 评分 ' + score + ' 状态 ' + stateTime;
            const year = data.year || '未知';
            const area = data.area || '未知';
            const vodName = data.name || '未知';
            const vodPic = data.image || '';
            
            // 构建播放列表
            let playUrls = [];
            let playFrom = "";
            
            const stup = data.datas;
            if (stup && Array.isArray(stup)) {
                for (const vod of stup) {
                    const playUrl = `${this.host}/p/detail/${vod.pID}`;
                    const title = vod.name || `第${vod.index || '?'}集`;
                    playUrls.push(`${title}$${playUrl}`);
                }
                playFrom = "咪咕";
            } else if (data.playing) {
                const playing = data.playing;
                const playUrl = `${this.host}/p/detail/${playing.pID}`;
                const title = playing.name || '播放';
                playUrls.push(`${title}$${playUrl}`);
                playFrom = "咪咕";
            }
            
            const vod = {
                vod_id: id,
                vod_name: vodName,
                vod_pic: vodPic,
                type_name: '',
                vod_year: year,
                vod_area: area,
                vod_remarks: remarks,
                vod_actor: actor,
                vod_director: director,
                vod_content: content,
                vod_play_from: playFrom,
                vod_play_url: playUrls.length > 0 ? playUrls.join('#') : ''
            };
            
            // 缓存结果
            this.videoCache[cacheKey] = vod;
            
            return { list: [vod] };
            
        } catch (error) {
            console.error(`detailContent error: ${error.message}`);
            return { list: [] };
        }
    }
    
    async searchContent(key, quick, pg = "1") {
        try {
            const page = parseInt(pg) || 1;
            
            const payload = {
                k: key,
                pageIdx: page.toString()
            };
            
            const url = `${this.host2}/search/v3/open-search`;
            
            const response = await this.fetch(url, {
                method: 'POST',
                body: JSON.stringify(payload)
            }, this.headers);
            
            const data = response.data;
            const stup = data.body?.shortMediaAssetList || [];
            
            const videos = [];
            for (const vod of stup) {
                videos.push({
                    vod_id: vod.pID || '',
                    vod_name: vod.name || '',
                    vod_pic: vod.pics?.highResolutionV || '',
                    vod_remarks: vod.contentType || '推荐',
                    vod_content: ''
                });
            }
            
            return {
                list: videos,
                page: page,
                pagecount: 9999,
                limit: 90,
                total: 999999
            };
            
        } catch (error) {
            console.error(`searchContent error: ${error.message}`);
            return {
                list: [],
                page: pg,
                pagecount: 0,
                limit: 90,
                total: 0
            };
        }
    }
    
    async playerContent(flag, id, vipFlags) {
        try {
            // 关键：调用壳子超级解析
            // 壳子会自动读取json配置中的解析规则
            const playData = {
                parse: 1,           // 必须为1，表示需要解析
                jx: 1,              // 必须为1，启用解析
                play_parse: true,   // 启用播放解析
                parse_type: '壳子超级解析',
                parse_source: '咪咕视频',
                url: id,            // 咪咕视频链接
                header: JSON.stringify({
                    'User-Agent': this.headers['User-Agent'],
                    'Referer': 'https://www.miguvideo.com',
                    'Origin': 'https://www.miguvideo.com'
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
                parse_source: '咪咕视频',
                url: id,
                header: JSON.stringify(this.headers)
            };
        }
    }
    
    localProxy(param) {
        return null;
    }
    
    // 辅助方法：安全获取对象属性
    getSafe(obj, path, defaultValue = '') {
        if (!obj || typeof obj !== 'object') return defaultValue;
        try {
            return path.split('.').reduce((o, key) => {
                if (o == null) return defaultValue;
                return o[key];
            }, obj) ?? defaultValue;
        } catch {
            return defaultValue;
        }
    }
}

// 导出 Spider 类
module.exports = Spider;