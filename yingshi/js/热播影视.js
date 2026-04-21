let host = "http://v.rbotv.cn";
const tab = new Set(['泰剧', '日剧', '美剧', '台剧']);
const headers = {
    'User-Agent': 'okhttp-okgo/jeasonlzy',
    'Connection': 'Keep-Alive',
    //'Accept-Encoding': 'gzip',
    'Accept-Language': 'zh-CN,zh;q=0.8'
};

async function init(cfg) {
    let ext = cfg.ext;
    if (typeof ext === 'string' && ext.startsWith('http')) {
        //host = ext;
    }
}

async function home(filter) {
    if (!host) return JSON.stringify({ class: [] });
    const resp = await req(`${host}/v3/type/top_type`, {
        method: 'post',
        data: payload(),
        postType: 'form',
        headers: headers
    });
    const json = JSON.parse(resp.content);
    let classes = [];
    for (const i of json.data.list) {
        if (!tab.has(i.type_name)) {
            classes.push({
                'type_id': i.type_id.toString(),
                'type_name': i.type_name
            });
        }
    }
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    if (!host) return JSON.stringify({ list: [] });
    const resp = await req(`${host}/v3/type/tj_vod`, {
        method: 'post',
        data: payload({ '': '' }),
        postType: 'form',
        headers: headers
    });
    const data = JSON.parse(resp.content).data;
    let videos = [];
    videos.push(...arr2vods(data.cai || []));
    videos.push(...arr2vods(data.loop || []));
    for (const i of (data.type_vod || [])) {
        if (!tab.has(i.type_name)) {
            videos.push(...arr2vods(i.vod || []));
        }
    }
    return JSON.stringify({ list: videos });
}

async function category(tid, pg, filter, extend) {
    if (!host) return JSON.stringify({ list: [] });

    const resp = await req(`${host}/v3/home/type_search`, {
        method: 'post',
        data: payload({ 'type_id': tid.toString(), 'page': pg.toString() }),
        postType: 'form',
        headers: headers
    });
    const json = JSON.parse(resp.content);
    return JSON.stringify({
        list: arr2vods(json.data.list),
        page: parseInt(pg)
    });
}

async function search(wd, quick, pg) {
    if (!host) return JSON.stringify({ list: [] });
    const resp = await req(`${host}/v3/home/search`, {
        method: 'post',
        data: payload({ 'keyword': wd }),
        postType: 'form',
        headers: headers
    });
    const json = JSON.parse(resp.content);
    let videos = [];
    for (const i of json.data.list) {
        delete i.vod_play_list;
        videos.push({
            'vod_id': i.vod_id.toString(),
            'vod_name': i.vod_name,
            'vod_pic': i.vod_pic || i.vod_pic_thumb,
            'vod_remarks': i.vod_remarks || '',
        });
    }
    return JSON.stringify({ list: videos, page: parseInt(pg || '1') });
}

async function detail(id) {
    if (!host) return JSON.stringify({ list: [] });
    const resp = await req(`${host}/v3/home/vod_details`, {
        method: 'post',
        data: payload({ 'vod_id': id.toString() }),
        postType: 'form',
        headers: headers
    });
    const data = JSON.parse(resp.content).data;
    let shows = [];
    let play_urls = [];
    for (const i of data.vod_play_list) {
        const parses = i.parse_urls.join(',');
        let urls = [];
        for (const j of i.urls) {
            urls.push(`${j.name}$${j.url}@${parses}@${i.ua || ''}@${i.referer || ''}`);
        }
        play_urls.push(urls.join('#'));
        let name = (i.title || i.name || '').replace(/[\(（](?:点击|换)[^)]*[\)）]|[Z▶❤【].*/g, '');
        if (name === i.flag) {
            shows.push(name);
        } else {
            shows.push(`${name}(${i.flag})`);
        }
    }
    const video = {
        'vod_id': data.vod_id.toString(),
        'vod_name': data.vod_name,
        'vod_pic': data.vod_pic || data.vod_pic_thumb,
        'vod_remarks': data.vod_remarks,
        'vod_year': data.vod_year,
        'vod_area': data.vod_area,
        'vod_actor': data.vod_actor,
        'vod_director': data.vod_director,
        'vod_content': data.vod_content,
        'vod_play_from': shows.join('$$$'),
        'vod_play_url': play_urls.join('$$$'),
        'type_name': data.vod_class
    };
    return JSON.stringify({ list: [video] });
}

async function play(flag, id, flags) {
    const parts = id.split('@');
    const raw_url = parts[0];
    const parses = parts[1] ? parts[1].split(',') : [];
    const ua = parts[2] || '';
    const referer = parts[3] || '';
    let play_headers = {};
    if (ua) play_headers['User-Agent'] = ua;
    if (referer) play_headers['Referer'] = referer;
    let final_url = '';
    let jx = 0;
    for (const parse of parses) {
        if (parse.startsWith('http')) {
            try {
                const res = await req(parse + raw_url, { headers: headers });
                const json = JSON.parse(res.content);
                if (json.url && json.url.startsWith('http')) {
                    final_url = json.url;
                    break;
                }
            } catch (e) {}
        }
    }
    if (!final_url && raw_url.startsWith('http')) {
        final_url = raw_url;
        if (/(?:www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(raw_url)) {
            jx = 1;
        }
    }
    return JSON.stringify({parse: jx, url: final_url, header: play_headers});
}

function arr2vods(arr) {
    let videos = [];
    for (const i of arr) {
        try {
            videos.push({
                'vod_id': i.vod_id.toString(),
                'vod_name': i.vod_name,
                'vod_pic': i.vod_pic || i.vod_pic_thumb,
                'vod_remarks': i.vod_remarks || '',
                'vod_year': null
            });
        } catch (e) {}
    }
    return videos;
}
function md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}
function payload(payload = {}) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = md5('7gp0bnd2sr85ydii2j32pcypscoc4w6c7g5spl' + timestamp);
    return {...payload, 'sign': sign, 'timestamp': timestamp};
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