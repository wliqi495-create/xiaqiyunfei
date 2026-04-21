// 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
// 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

// 移除 lodash 导入，改用原生 JS
let host = 'http://pqysdq.gxttkeji.cn:2026';
let key = '';
const iv = '1234567890123456';
const headers = {
    'User-Agent': 'okhttp/3.12.0',
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip'
};

async function init(cfg) {
    const ext = cfg.ext;
    if (typeof ext === 'string' && ext.startsWith('http')) {
        host = ext.trim().replace(/\/$/, '');
    }
    try {
        const resp1 = await req(`${host}/public/?service=App.Mov.GetTypeList`, { headers });
        const data1 = decodeJson(resp1.content);
        let sign_start = '';
        // 使用原生 for...of 循环
        if (data1.Data && Array.isArray(data1.Data)) {
            for (const i of data1.Data) {
                if (i.type_id && i.type_id.toString() === '1') {
                    sign_start = i.type_union;
                    break;
                }
            }
        }
        const resp2 = await req(`${host}/public/?service=App.Mov.GetAdType`, { headers });
        const data2 = decodeJson(resp2.content);
        const sign_end = data2.Data ? data2.Data.tmp : '';
        const fullKey = sign_start + sign_end;
        if (fullKey.length >= 16) {
            key = fullKey.substring(0, 16);
        }
    } catch (e) {
        // 移除 console.error，避免环境不支持
        // console.error('初始化 Key 失败:', e);
        host = '';
    }
}

async function home(filter) {
    if (!host) return JSON.stringify({ class: [] });
    return JSON.stringify({
        class: [
            { 'type_id': 1, 'type_name': '电影' },
            { 'type_id': 2, 'type_name': '连续剧' },
            { 'type_id': 3, 'type_name': '综艺' },
            { 'type_id': 4, 'type_name': '动漫' }
        ]
    });
}

async function homeVod() {
    if (!host) return JSON.stringify({ list: [] });
    const resp = await req(`${host}/public/?service=App.Mov.GetHomeLevel`, { headers });
    const data = decodeJson(resp.content);
    const videos = [];
    // 使用原生对象遍历
    if (data && typeof data === 'object') {
        for (const key in data) {
            const item = data[key];
            if (item && typeof item === 'object') {
                for (const listKey in item) {
                    const list = item[listKey];
                    if (Array.isArray(list)) {
                        for (const k of list) {
                            videos.push({
                                'vod_id': k.vod_id ? k.vod_id.toString() : '',
                                'vod_name': k.vod_name || '',
                                'vod_pic': k.vod_pic || '',
                                'vod_remarks': k.vod_remarks || '',
                                'vod_year': k.vod_year || '',
                                'vod_content': k.vod_content || ''
                            });
                        }
                    }
                }
            }
        }
    }
    return JSON.stringify({ list: videos });
}

async function category(tid, pg, filter, extend) {
    if (!host) return JSON.stringify({ list: [] });
    const url = `${host}/public/?service=App.Mov.GetOnlineList&type_id=${tid}&page=${pg}&limit=18`;
    const resp = await req(url, { headers });
    const data = decodeJson(resp.content);
    // 使用原生 Array.map
    const videos = (data.Data && Array.isArray(data.Data)) ? data.Data.map(i => ({
        'vod_id': i.vod_id ? i.vod_id.toString() : '',
        'vod_name': i.vod_name || '',
        'vod_pic': i.vod_pic || '',
        'vod_remarks': i.vod_remarks || '',
        'vod_year': i.vod_year || '',
        'vod_content': i.vod_content || ''
    })) : [];
    return JSON.stringify({ list: videos, page: parseInt(pg) });
}

async function search(wd, quick, pg) {
    if (!host) return JSON.stringify({ list: [] });
    const url = `${host}/public/?service=App.Mov.SearchVod&key=${encodeURIComponent(wd)}`;
    const resp = await req(url, { headers });
    const data = decodeJson(resp.content);
    // 使用原生 Array.map
    const videos = (data.Data && Array.isArray(data.Data)) ? data.Data.map(i => ({
        'vod_id': i.vod_id ? i.vod_id.toString() : '',
        'vod_name': i.vod_name || '',
        'vod_pic': i.vod_pic || '',
        'vod_remarks': i.vod_remarks || '',
        'vod_year': i.vod_year || '',
        'vod_content': i.vod_content || ''
    })) : [];
    return JSON.stringify({ list: videos, page: parseInt(pg || '1') });
}

async function detail(id) {
    const url = `${host}/public/?service=App.Mov.GetOnlineMvById&vodid=${id}`;
    const resp = await req(url, { headers });
    const data = decodeJson(resp.content);
    // 使用原生 Array.find
    let firstItem = null;
    if (data.Data && Array.isArray(data.Data)) {
        for (const i of data.Data) {
            if (i && typeof i === 'object') {
                firstItem = i;
                break;
            }
        }
    }
    if (firstItem) {
        const video = {
            'vod_id': firstItem.vod_id ? firstItem.vod_id.toString() : '',
            'vod_name': firstItem.vod_name || '',
            'vod_pic': firstItem.vod_pic || '',
            'vod_remarks': firstItem.vod_remarks || '',
            'vod_year': firstItem.vod_year || '',
            'vod_area': firstItem.vod_area || '',
            'vod_actor': firstItem.vod_actor || '',
            'vod_content': firstItem.vod_content || '',
            'vod_play_from': firstItem.vod_play_from || '',
            'vod_play_url': firstItem.vod_play_url || '',
            'type_name': firstItem.vod_class || ''
        };
        return JSON.stringify({ list: [video] });
    }
    return JSON.stringify({ list: [] });
}

async function play(flag, id, flags) {
    let jx = 0;
    let url = '';
    let ua = 'com.gjkj.zxysdq/1.1.0 (Linux;Android 12) ExoPlayerLib/2.12.3';
    if (id.match(/^https?:\/\/.*\.(m3u8|mp4|flv|mkv)/i)) {
        url = id;
    } else {
        try {
            const resp = await req(`${host}/public/?service=App.Mov.GetMvJXUrlByUrl&url=${id}`, { headers });
            const data = decodeJson(resp.content);
            const raw_url = data.Data ? data.Data.url : '';
            if (raw_url && key) {
                // 注意：aesX 函数需要外部定义，这里假设环境中存在
                const decryptedUrl = aesX('AES/CBC/PKCS5', false, raw_url, true, key, iv, false);
                if (decryptedUrl && decryptedUrl.startsWith('http')) {
                    url = decryptedUrl;
                }
            }
        } catch (e) {
            if (/(?:www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(id)) {
                url = id;
                jx = 1;
                ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
            }
        }
    }
    return JSON.stringify({jx: jx, parse: 0, url: url, header: { 'User-Agent': ua }});
}

function decodeJson(text) {
    if (text.startsWith('\ufeff')) {
        text = text.substring(1);
    }
    return JSON.parse(text);
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        search: search,
        detail: detail,
        play: play
    };
}