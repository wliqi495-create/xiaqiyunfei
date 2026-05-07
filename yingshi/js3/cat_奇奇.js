import { _ } from 'assets://js/lib/cat.js';

const host = 'https://www.iqiyi.com';
const apihost = 'https://pcw-api.iqiyi.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let danmakuAPI = '';

async function init(cfg) {
    danmakuAPI = cfg.ext || '';
}

// 通用请求封装
async function request(url, method = 'get', params = {}) {
    let reqOptions = {
        method: method,
        headers: {
            'User-Agent': UA,
            'Referer': host
        }
    };
    const res = await req(url, reqOptions);
    return JSON.parse(res.content);
}

// 首页分类（含短剧 + 正确筛选）
async function home() {
    const classes = [
        { type_id: '1', type_name: '电影' },
        { type_id: '2', type_name: '电视剧' },
        { type_id: '3', type_name: '纪录片' },
        { type_id: '4', type_name: '动漫' },
        { type_id: '6', type_name: '综艺' },
        { type_id: '5', type_name: '音乐' },
        { type_id: '16', type_name: '网络电影' },
        { type_id: 'short', type_name: '短剧' }
    ];

    const filters = {
        "1": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] },
            { key: "area", name: "地区", value: [{ n: "全部", v: "" }, { n: "内地", v: "1" }, { n: "港台", v: "2" }, { n: "欧美", v: "3" }, { n: "日韩", v: "4" }] },
            { key: "genre", name: "类型", value: [{ n: "全部", v: "" }, { n: "喜剧", v: "1" }, { n: "爱情", v: "2" }, { n: "动作", v: "3" }, { n: "悬疑", v: "4" }, { n: "科幻", v: "5" }] }
        ],
        "2": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] },
            { key: "area", name: "地区", value: [{ n: "全部", v: "" }, { n: "内地", v: "1" }, { n: "港台", v: "2" }, { n: "欧美", v: "3" }, { n: "日韩", v: "4" }] },
            { key: "genre", name: "类型", value: [{ n: "全部", v: "" }, { n: "都市", v: "1" }, { n: "古装", v: "2" }, { n: "悬疑", v: "3" }, { n: "爱情", v: "4" }, { n: "家庭", v: "5" }] }
        ],
        "3": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }] },
            { key: "genre", name: "类型", value: [{ n: "全部", v: "" }, { n: "自然", v: "1" }, { n: "历史", v: "2" }, { n: "军事", v: "3" }, { n: "美食", v: "4" }] }
        ],
        "4": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }] },
            { key: "area", name: "地区", value: [{ n: "全部", v: "" }, { n: "内地", v: "1" }, { n: "日本", v: "2" }, { n: "欧美", v: "3" }] },
            { key: "genre", name: "类型", value: [{ n: "全部", v: "" }, { n: "热血", v: "1" }, { n: "搞笑", v: "2" }, { n: "恋爱", v: "3" }, { n: "科幻", v: "4" }] }
        ],
        "6": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }] },
            { key: "genre", name: "类型", value: [{ n: "全部", v: "" }, { n: "搞笑", v: "1" }, { n: "真人秀", v: "2" }, { n: "访谈", v: "3" }, { n: "音乐", v: "4" }] }
        ],
        "16": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }] },
            { key: "genre", name: "类型", value: [{ n: "全部", v: "" }, { n: "喜剧", v: "1" }, { n: "动作", v: "2" }, { n: "爱情", v: "3" }, { n: "悬疑", v: "4" }] }
        ],
        "short": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }] },
            { key: "genre", name: "类型", value: [{ n: "全部", v: "" }, { n: "爱情", v: "1" }, { n: "古装", v: "2" }, { n: "悬疑", v: "3" }, { n: "都市", v: "4" }, { n: "玄幻", v: "5" }] }
        ]
    };

    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

// 分类列表（正确筛选参数）
async function category(tid, pg, filter, extend) {
    let channelId = tid;
    let dataType = '1';
    let extraParams = '';

    // 短剧
    if (tid === 'short') {
        channelId = '1';
        extraParams = '&three_category_id=27402';
    }
    // 网络电影
    else if (tid === '16') {
        channelId = '1';
        extraParams = '&three_category_id=27401';
    }
    // 音乐
    else if (tid === '5') {
        dataType = '2';
    }

    // 爱奇艺真实筛选参数
    const order = extend.order || 'hot';
    const year = extend.year || '';
    const area = extend.area || '';
    const genre = extend.genre || '';

    let filterParams = `&order=${order}`;
    if (year) filterParams += `&year=${year}`;
    if (area) filterParams += `&area=${area}`;
    if (genre) filterParams += `&genre=${genre}`;

    const url = `${apihost}/search/recommend/list?channel_id=${channelId}&data_type=${dataType}&page_id=${pg}&ret_num=48${extraParams}${filterParams}`;
    const res = await request(url);

    let list = (res.data.list || []).map(it => ({
        vod_id: it.albumId.toString(),
        vod_name: it.name,
        vod_pic: it.imageUrl.replace(".jpg", "_390_520.jpg"),
        vod_remarks: it.score ? it.score + "分" : (it.period || it.focus || "")
    }));

    return JSON.stringify({ page: parseInt(pg), list: list });
}

// 详情页
async function detail(id) {
    const detailUrl = `${apihost}/video/video/videoinfowithuser/video_info?agent_type=1&authcookie=&subkey=${id}&subscribe=1`.replace('video_info', id);
    const res = await request(detailUrl);
    const data = res.data;

    let vod = {
        vod_id: data.albumId.toString(),
        vod_name: data.name,
        vod_pic: data.imageUrl.replace(".jpg", "_579_772.jpg"),
        type_name: data.categories ? data.categories.map(c => c.name).join('/') : '',
        vod_content: data.description || '',
        vod_remarks: (data.score ? data.score + "分 " : "") + (data.latestOrder ? "更新至" + data.latestOrder + "集" : ""),
        vod_play_from: '奇珍异兽'
    };

    let playUrls = [];
    if (data.channelId === 1 || data.channelId === 5) {
        playUrls.push(`正片$${data.playUrl}`);
    } else {
        const listUrl = `${apihost}/albums/album/avlistinfo?aid=${id}&size=300&page=1`;
        const listRes = await request(listUrl);
        if (listRes.data && listRes.data.epsodelist) {
            listRes.data.epsodelist.forEach(it => {
                playUrls.push(`${it.shortTitle || "第" + it.order + "集"}$${it.playUrl}`);
            });
        }
    }
    vod.vod_play_url = playUrls.join('#');
    return JSON.stringify({ list: [vod] });
}

// 核心播放解析逻辑：内置解析 -> 失败 -> 壳子解析
async function play(flag, id, flags) {
    const privateApi = 'https://jx.xmflv.cc/?url=';

    try {
        // 1. 尝试调用内置解析
        const res = await req(privateApi + encodeURIComponent(id), {
            headers: { 'User-Agent': UA }
        });
        const json = JSON.parse(res.content);

        // 假设接口返回数据包含 url 且不为空
        if (json.url || (json.data && json.data.url)) {
            const finalUrl = json.url || json.data.url;
            return JSON.stringify({
                parse: 0, // 直连播放
                url: finalUrl,
                danmaku: danmakuAPI ? danmakuAPI + id : ""
            });
        }
    } catch (e) {
        console.log('内置解析失败，尝试转交壳子：' + e.message);
    }

    // 2. 内置解析失败或无返回，转交壳子配置的解析插件
    return JSON.stringify({
        parse: 1,
        jx: 1,
        url: id,
        danmaku: danmakuAPI ? danmakuAPI + id : ""
    });
}

async function search(wd, quick) {
    const searchUrl = `https://search.video.iqiyi.com/o?if=html5&key=${encodeURIComponent(wd)}&pageNum=1&pos=1&pageSize=30&site=iqiyi`;
    const res = await request(searchUrl);
    let list = (res.data.docinfos || []).map(i => {
        const info = i.albumDocInfo;
        return {
            vod_id: info.albumId.toString(),
            vod_name: info.albumTitle,
            vod_pic: info.albumVImage,
            vod_remarks: info.tvFocus || ""
        };
    });
    return JSON.stringify({ list: list });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search };
}
