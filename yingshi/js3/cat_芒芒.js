import { _ } from 'assets://js/lib/cat.js';

let host = 'https://www.mgtv.com';
let siteKey = '';
let siteId = '';

/**
 * 基础请求函数
 */
async function request(url, timeout = 10000) {
    let res = await req(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': host
        },
        timeout: timeout
    });
    return res.content;
}

/**
 * 初始化
 */
async function init(cfg) {
    siteKey = cfg.skey;
    siteId = cfg.sid;
}

/**
 * 首页分类（带筛选）
 */
async function home(filter) {
    const classes = [
        { type_id: '3', type_name: '电影' },
        { type_id: '2', type_name: '电视剧' },
        { type_id: '1', type_name: '综艺' },
        { type_id: '50', type_name: '动漫' },
        { type_id: '51', type_name: '纪录片' }
    ];

    // 筛选配置
    const filters = {
        "3": [ // 电影
            {
                key: "chargeInfo",
                name: "付费类型",
                value: [
                    { n: "全部", v: "all" },
                    { n: "免费", v: "b1" },
                    { n: "VIP", v: "b2" },
                    { n: "VIP用券", v: "b3" },
                    { n: "付费点播", v: "b4" }
                ]
            },
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "c1" },
                    { n: "最热", v: "c2" },
                    { n: "高分", v: "c4" }
                ]
            },
            {
                key: "year",
                name: "年代",
                value: [
                    { n: "全部", v: "all" },
                    { n: "2026", v: "2026" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" },
                    { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" },
                    { n: "2019", v: "2019" },
                    { n: "2018", v: "2018" }
                ]
            }
        ],
        "2": [ // 电视剧
            {
                key: "chargeInfo",
                name: "付费类型",
                value: [
                    { n: "全部", v: "all" },
                    { n: "免费", v: "b1" },
                    { n: "VIP", v: "b2" },
                    { n: "VIP用券", v: "b3" },
                    { n: "付费点播", v: "b4" }
                ]
            },
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "c1" },
                    { n: "最热", v: "c2" },
                    { n: "高分", v: "c4" }
                ]
            },
            {
                key: "year",
                name: "年代",
                value: [
                    { n: "全部", v: "all" },
                    { n: "2026", v: "2026" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" },
                    { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" },
                    { n: "2019", v: "2019" },
                    { n: "2018", v: "2018" }
                ]
            }
        ],
        "1": [ // 综艺
            {
                key: "chargeInfo",
                name: "付费类型",
                value: [
                    { n: "全部", v: "all" },
                    { n: "免费", v: "b1" },
                    { n: "VIP", v: "b2" },
                    { n: "VIP用券", v: "b3" },
                    { n: "付费点播", v: "b4" }
                ]
            },
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "c1" },
                    { n: "最热", v: "c2" },
                    { n: "高分", v: "c4" }
                ]
            },
            {
                key: "year",
                name: "年代",
                value: [
                    { n: "全部", v: "all" },
                    { n: "2026", v: "2026" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" },
                    { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" },
                    { n: "2019", v: "2019" },
                    { n: "2018", v: "2018" }
                ]
            }
        ],
        "50": [ // 动漫
            {
                key: "chargeInfo",
                name: "付费类型",
                value: [
                    { n: "全部", v: "all" },
                    { n: "免费", v: "b1" },
                    { n: "VIP", v: "b2" },
                    { n: "VIP用券", v: "b3" },
                    { n: "付费点播", v: "b4" }
                ]
            },
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "c1" },
                    { n: "最热", v: "c2" },
                    { n: "高分", v: "c4" }
                ]
            },
            {
                key: "year",
                name: "年代",
                value: [
                    { n: "全部", v: "all" },
                    { n: "2026", v: "2026" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" },
                    { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" },
                    { n: "2019", v: "2019" },
                    { n: "2018", v: "2018" }
                ]
            }
        ],
        "51": [ // 纪录片
            {
                key: "chargeInfo",
                name: "付费类型",
                value: [
                    { n: "全部", v: "all" },
                    { n: "免费", v: "b1" },
                    { n: "VIP", v: "b2" },
                    { n: "VIP用券", v: "b3" },
                    { n: "付费点播", v: "b4" }
                ]
            },
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "c1" },
                    { n: "最热", v: "c2" },
                    { n: "高分", v: "c4" }
                ]
            },
            {
                key: "year",
                name: "年代",
                value: [
                    { n: "全部", v: "all" },
                    { n: "2026", v: "2026" },
                    { n: "2025", v: "2025" },
                    { n: "2024", v: "2024" },
                    { n: "2023", v: "2023" },
                    { n: "2022", v: "2022" },
                    { n: "2021", v: "2021" },
                    { n: "2020", v: "2020" },
                    { n: "2019", v: "2019" },
                    { n: "2018", v: "2018" }
                ]
            }
        ]
    };

    return JSON.stringify({
        class: classes,
        filters: filters
    });
}

/**
 * 首页推荐
 */
async function homeVod() {
    return JSON.stringify({ list: [] });
}

/**
 * 分类列表查询（带筛选参数）
 */
async function category(tid, pg, filter, extend) {
    // 处理筛选参数
    let chargeInfo = extend.chargeInfo || "all";
    let sort = extend.sort || "c1";
    let year = extend.year || "all";

    let url = `https://pianku.api.mgtv.com/rider/list/pcweb/v3?platform=pcweb&channelId=${tid}&pn=${pg}&pc=20&hudong=1&kind=a1&area=a1&chargeInfo=${chargeInfo}&sort=${sort}&year=${year}`;
    let res = await request(url);
    let json = JSON.parse(res);
    
    let videos = _.map(json.data.hitDocs, (it) => {
        return {
            vod_id: it.playPartId, 
            vod_name: it.title,
            vod_pic: it.img,
            vod_remarks: it.updateInfo || (it.rightCorner ? it.rightCorner.text : '')
        };
    });

    return JSON.stringify({
        page: parseInt(pg),
        list: videos
    });
}

/**
 * 详情页：解析剧集列表
 */
async function detail(id) {
    let url = `https://pcweb.api.mgtv.com/episode/list?page=1&size=50&video_id=${id}`;
    let res = await request(url);
    let json = JSON.parse(res);
    
    let list = json.data.list || [];
    // 构造播放链接，直接把完整的芒果网页地址传给 play 函数
    let playUrls = _.map(list, (it) => {
        let name = it.t4 || it.t2;
        let link = `https://www.mgtv.com${it.url}`;
        return `${name}$${link}`;
    }).join('#');

    const video = {
        vod_id: id,
        vod_name: list.length > 0 ? list[0].t4 : '视频详情',
        vod_pic: list.length > 0 ? list[0].img : '',
        vod_play_from: '芒果TV',
        vod_play_url: playUrls,
        vod_content: '芒果TV官方源解析',
        type_name: '精选'
    };

    return JSON.stringify({ list: [video] });
}

/**
 * 搜索功能
 */
async function search(wd, quick, pg) {
    let url = `https://mobileso.bz.mgtv.com/msite/search/v2?q=${encodeURIComponent(wd)}&pn=${pg || 1}&pc=10`;
    let res = await request(url);
    let json = JSON.parse(res);
    
    let videos = [];
    _.each(json.data.contents, (content) => {
        if (content.type === 'media' && content.data) {
            let item = content.data[0];
            let vidMatch = item.url.match(/\/(.*?)\.html/);
            if (vidMatch) {
                videos.push({
                    vod_id: vidMatch[1],
                    vod_name: item.title.replace(/<\/?[^>]+>/g, ''),
                    vod_pic: item.img,
                    vod_remarks: (item.desc || []).join('/')
                });
            }
        }
    });

    return JSON.stringify({ list: videos });
}

/**
 * 播放解析：多接口自动轮询逻辑
 */
async function play(flag, id, flags) {
    // 解析接口池：如果第一个失效会自动尝试下一个
    const parseApis = [
        'https://jx.xmflv.cc/?url='
    ];

    // id 已经在 detail 函数中处理成了完整的 https 链接
    let rawUrl = id;
    
    for (let api of parseApis) {
        try {
            let targetUrl = api + encodeURIComponent(rawUrl);
            let res = await req(targetUrl, {
                headers: {
                    'User-Agent': 'okhttp/4.12.0',
                    'Referer': 'https://www.mgtv.com/'
                },
                timeout: 8000 
            });

            let content = typeof res === 'object' ? res.content : res;
            if (!content) continue;

            let json = JSON.parse(content);
            let playUrl = json.url || (json.data ? json.data.url : null) || json.vurl;

            if (playUrl && playUrl.startsWith('http')) {
                return JSON.stringify({
                    parse: 0, // 脚本已完成解析，直接播放直链
                    url: playUrl,
                    header: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.mgtv.com/',
                        'Origin': 'https://www.mgtv.com'
                    }
                });
            }
        } catch (e) {
            console.log(`接口解析尝试失败，切换下一路...`);
        }
    }

    // 最终失败则尝试让壳子兜底
    return JSON.stringify({
        parse: 1,
        url: rawUrl,
        jx: 1
    });
}

/**
 * 导出钩子
 */
export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search
    };
}
