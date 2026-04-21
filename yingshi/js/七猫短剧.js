/**
 * 七猫短剧 - 标准 JS 导出格式 (适配 server.js)
 */

const h_ost = 'https://api-store.qmplaylet.com';
const h_ost1 = 'https://api-read.qmplaylet.com';
const keys = 'd3dGiJc651gSQ8w1';
const char_map = {
    '+': 'P', '/': 'X', '0': 'M', '1': 'U', '2': 'l', '3': 'E', '4': 'r', '5': 'Y', '6': 'W', '7': 'b', '8': 'd', '9': 'J',
    'A': '9', 'B': 's', 'C': 'a', 'D': 'I', 'E': '0', 'F': 'o', 'G': 'y', 'H': '_', 'I': 'H', 'J': 'G', 'K': 'i', 'L': 't',
    'M': 'g', 'N': 'N', 'O': 'A', 'P': '8', 'Q': 'F', 'R': 'k', 'S': '3', 'T': 'h', 'U': 'f', 'V': 'R', 'W': 'q', 'X': 'C',
    'Y': '4', 'Z': 'p', 'a': 'm', 'b': 'B', 'c': 'O', 'd': 'u', 'e': 'c', 'f': '6', 'g': 'K', 'h': 'x', 'i': '5', 'j': 'T',
    'k': '-', 'l': '2', 'm': 'z', 'n': 'S', 'o': 'Z', 'p': '1', 'q': 'V', 'r': 'v', 's': 'j', 't': 'Q', 'u': '7', 'v': 'D',
    'w': 'w', 'x': 'n', 'y': 'L', 'z': 'e'
};

// --- 内部算法函数 ---

async function getQmParamsAndSign() {
    let sessionId = Date.now().toString();
    let data = {
        "static_score": "0.8", "uuid": "00000000-7fc7-08dc-0000-000000000000",
        "device-id": "20250220125449b9b8cac84c2dd3d035c9052a2572f7dd0122edde3cc42a70",
        "mac": "", "sourceuid": "aa7de295aad621a6", "refresh-type": "0", "model": "22021211RC",
        "wlb-imei": "", "client-id": "aa7de295aad621a6", "brand": "Redmi", "oaid": "",
        "oaid-no-cache": "", "sys-ver": "12", "trusted-id": "", "phone-level": "H",
        "imei": "", "wlb-uid": "aa7de295aad621a6", "session-id": sessionId
    };
    let jsonStr = JSON.stringify(data);
    let base64Str = base64Encode(jsonStr); // 使用 server.js 注入的 base64Encode
    
    let qmParams = '';
    for (let c of base64Str) {
        qmParams += char_map[c] || c;
    }
    
    let paramsStr = `AUTHORIZATION=app-version=10001application-id=com.duoduo.readchannel=unknownis-white=net-env=5platform=androidqm-params=${qmParams}reg=${keys}`;
    let sign = md5(paramsStr); // 使用 server.js 注入的 md5
    return { qmParams, sign };
}

async function getHeaderX() {
    let { qmParams, sign } = await getQmParamsAndSign();
    return {
        'net-env': '5', 'reg': '', 'channel': 'unknown', 'is-white': '', 'platform': 'android',
        'application-id': 'com.duoduo.read', 'authorization': '', 'app-version': '10001',
        'user-agent': 'webviewversion/0', 'qm-params': qmParams,
        'sign': sign
    };
}

// --- 爬虫导出函数 ---

async function init(cfg) {
    return "";
}

async function home() {
    let signString = `operation=1playlet_privacy=1tag_id=0${keys}`;
    let apiSign = md5(signString);
    let url = `${h_ost}/api/v1/playlet/index?tag_id=0&playlet_privacy=1&operation=1&sign=${apiSign}`;

    let headers = await getHeaderX();
    let res = await req(url, { headers });
    let data = typeof res.content === 'string' ? JSON.parse(res.content) : res.content;

    let classList = [];
    let duoxuan = [0, 1, 2, 3, 4];
    duoxuan.forEach(index => {
        let tags = data?.data?.tag_categories?.[index]?.tags || [];
        tags.forEach(vod => {
            classList.push({
                type_id: String(vod.tag_id),
                type_name: vod.tag_name || ''
            });
        });
    });
    return { class: classList };
}

async function category(tid, pg, filter, extend) {
    let page = pg || 1;
    let signString = page === 1 ? 
        `operation=1playlet_privacy=1tag_id=${tid}${keys}` : 
        `next_id=${page}operation=1playlet_privacy=1tag_id=${tid}${keys}`;
    let sign = md5(signString);

    let url = page === 1 ?
        `${h_ost}/api/v1/playlet/index?tag_id=${tid}&playlet_privacy=1&operation=1&sign=${sign}` :
        `${h_ost}/api/v1/playlet/index?tag_id=${tid}&next_id=${page}&playlet_privacy=1&operation=1&sign=${sign}`;

    let headers = await getHeaderX();
    let res = await req(url, { headers });
    let data = typeof res.content === 'string' ? JSON.parse(res.content) : res.content;
    let videoList = data?.data?.list || [];

    let videos = videoList.map(vod => ({
        vod_id: String(vod.playlet_id),
        vod_name: vod.title || '未知标题',
        vod_pic: vod.image_link || '',
        vod_remarks: `${vod.total_episode_num}集 · ${vod.hot_value}`
    }));

    return {
        page: parseInt(page),
        list: videos
    };
}

async function detail(id) {
    let did = Array.isArray(id) ? id[0] : id;
    let signString = `playlet_id=${did}${keys}`;
    let sign = md5(signString);

    let detailUrl = `${h_ost1}/player/api/v1/playlet/info?playlet_id=${did}&sign=${sign}`;
    let headers = await getHeaderX();
    let res = await req(detailUrl, { headers });
    let data = (typeof res.content === 'string' ? JSON.parse(res.content) : res.content).data;

    let play_url = data.play_list.map(it => `${it.sort}$${it.video_url}`).join('#');
    
    return {
        list: [{
            vod_name: data.title || "未知标题",
            vod_pic: data.image_link || "未知图片",
            vod_remarks: `${data.total_episode_num}集`,
            vod_content: data.intro || "",
            vod_play_from: '七猫短剧',
            vod_play_url: play_url
        }]
    };
}

async function search(wd, quick, pg) {
    let page = pg || 1;
    let trackId = 'ec1280db127955061754851657967';
    let signString = `extend=page=${page}read_preference=0track_id=${trackId}wd=${wd}${keys}`;
    let sign = md5(signString);
    
    let url = `${h_ost}/api/v1/playlet/search?extend=&page=${page}&wd=${encodeURIComponent(wd)}&read_preference=0&track_id=${trackId}&sign=${sign}`;

    let headers = await getHeaderX();
    let res = await req(url, { headers });
    let data = typeof res.content === 'string' ? JSON.parse(res.content) : res.content;
    let videoList = data?.data?.list || [];

    let d = videoList.map(vod => ({
        vod_id: String(vod.id),
        vod_name: (vod.title || '').replace(/<[^>]+>/g, '').trim(),
        vod_pic: vod.image_link || '',
        vod_remarks: `${vod.total_num}集`
    }));

    return { list: d };
}

async function play(flag, id, flags) {
    return {
        parse: 0,
        url: id
    };
}

// 导出模块
module.exports = {
    init,
    home,
    homeVod: async () => ({ list: [] }),
    category,
    detail,
    search,
    play
};
