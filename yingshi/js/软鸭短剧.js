const host = 'https://api.xingzhige.com';
// 1. 彻底移除海龟的 Referer，改用符合软鸭 API 的头信息
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; U; Android 8.0.0; zh-cn; Mi Note 2) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36',
    'Origin': 'https://api.xingzhige.com'
};

async function init(cfg) {}

function getList(data) {
    return (data || []).map(it => ({
        vod_id: it.book_id.toString(),
        vod_name: it.title,
        vod_pic: it.cover,
        vod_remarks: it.type || it.author
    }));
}

async function home(filter) {
    const classes = [
        {type_id: "最新", type_name: "最新"}, {type_id: "战神", type_name: "战神"}, 
        {type_id: "逆袭", type_name: "逆袭"}, {type_id: "甜宠", type_name: "甜宠"}, 
        {type_id: "虐渣", type_name: "虐渣"}, {type_id: "总裁", type_name: "总裁"}
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    const r = await req(`${host}/API/playlet/?keyword=推荐&page=1`, { headers });
    const data = JSON.parse(r.content);
    return JSON.stringify({ list: getList(data.data) });
}

async function category(tid, pg, filter, extend = {}) {
    let p = parseInt(pg || 1);
    const url = `${host}/API/playlet/?keyword=${encodeURIComponent(tid)}&page=${p}`;
    const r = await req(url, { headers });
    const res = JSON.parse(r.content);
    const list = getList(res.data);
    return JSON.stringify({
        page: p,
        pagecount: list.length >= 20 ? p + 1 : p,
        list: list
    });
}

async function detail(id) {
    // 定位：使用 book_id 获取整部剧的详情
    const r = await req(`${host}/API/playlet/?book_id=${id}`, { headers });
    const res = JSON.parse(r.content);
    const data = res.data;

    // 重点：软鸭 API 返回的是 video_list 数组
    let playUrl = "";
    if (data && data.video_list) {
        playUrl = data.video_list.map(ep => {
            // 集数名$video_id
            return `${ep.title.trim()}$${ep.video_id}`;
        }).join("#");
    }

    const vod = {
        vod_id: id,
        vod_name: data.title,
        vod_pic: data.cover,
        type_name: data.type,
        vod_actor: data.author,
        vod_content: data.desc || "暂无简介",
        vod_remarks: "共" + (data.video_list ? data.video_list.length : 0) + "集",
        vod_play_from: "软鸭源",
        vod_play_url: playUrl
    };

    return JSON.stringify({ list: [vod] });
}

async function search(wd, quick, pg = 1) {
    let p = parseInt(pg || 1);
    const r = await req(`${host}/API/playlet/?keyword=${encodeURIComponent(wd)}&page=${p}`, { headers });
    const res = JSON.parse(r.content);
    const list = getList(res.data);
    return JSON.stringify({ page: p, pagecount: list.length >= 20 ? p + 1 : p, list });
}

// --- 核心修复：播放链接精准定位 ---
async function play(flag, id, flags) {
    // 软鸭 API 获取 1080p 播放地址需要传入 video_id
    const url = `${host}/API/playlet/?video_id=${id}&quality=1080p`;
    
    try {
        const r = await req(url, { headers });
        const res = JSON.parse(r.content);
        
        // 软鸭数据结构层级为 res.data.video.url
        let realUrl = "";
        if (res.data && res.data.video && res.data.video.url) {
            realUrl = res.data.video.url;
        }

        return JSON.stringify({
            parse: 0,
            url: realUrl,
            header: {
                'User-Agent': headers['User-Agent']
            }
        });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: "" });
    }
}

export default { init, home, homeVod, category, detail, search, play };
