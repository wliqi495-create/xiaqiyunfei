// 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
// 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

const host = 'https://rrsp-api.kejiqianxian.com:60425';

const def_headers = {
    'User-Agent': 'rrsp.wang',
    'origin': '*',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
};

const headers = {
    ...def_headers,
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'accept-language': 'zh-CN'
};

async function init(cfg) {}

async function home(filter) {
    const classes = [
        { 'type_id': '1', 'type_name': '电影' },
        { 'type_id': '2', 'type_name': '电视剧' },
        { 'type_id': '3', 'type_name': '综艺' },
        { 'type_id': '5', 'type_name': '动漫' },
        { 'type_id': '4', 'type_name': '纪录片' },
        { 'type_id': '6', 'type_name': '短剧' },
        { 'type_id': '7', 'type_name': '特别节目' },
        { 'type_id': '8', 'type_name': '少儿内容' }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    return await category('', 1, {}, {});
}

async function category(tid, pg, filter, extend) {
    const payload = {
        'type': tid.toString(),
        'sort': 'vod_time',
        'area': '',
        'style': '',
        'time': '',
        'pay': '',
        'page': pg,
        'limit': '60'
    };

    const resp = await req(`${host}/api.php/main_program/moviesAll/`, {
        method: 'post',
        data: payload,
        headers: headers
    });
    const json = JSON.parse(resp.content);
    const data = json.data;
    return JSON.stringify({
        list: arr2vods(data.list),
        pagecount: data.pagecount,
        page: pg
    });
}

async function search(wd, quick, pg) {
    if (pg.toString() !== '1') return JSON.stringify({ list: [] });
    const payload = { 'keyword': wd };
    const resp = await req(`${host}/api.php/search/syntheticalSearch/`, {
        method: 'post',
        data: payload,
        headers: headers
    });
    const json = JSON.parse(resp.content);
    const data = json.data;
    const videos = [];
    if (data.chasingFanCorrelation) {
        videos.push(...arr2vods(data.chasingFanCorrelation));
    }
    if (data.moviesCorrelation) {
        videos.push(...arr2vods(data.moviesCorrelation));
    }
    return JSON.stringify({ list: videos, page: pg });
}

async function detail(id) {
    const payload = { 'id': id.toString() };
    const resp = await req(`${host}/api.php/player/details/`, {
        method: 'post',
        data: payload,
        headers: headers
    });
    const json = JSON.parse(resp.content);
    const data = json.detailData;
    const video = {
        'vod_id': data.vod_id.toString(),
        'vod_name': data.vod_name,
        'vod_pic': data.vod_pic,
        'vod_remarks': data.vod_remarks,
        'vod_year': data.vod_year,
        'vod_area': data.vod_area,
        'vod_actor': data.vod_actor,
        'vod_director': data.vod_director,
        'vod_content': data.vod_content,
        'vod_play_from': data.vod_play_from,
        'vod_play_url': data.vod_play_url,
        'type_name': data.vod_class
    };
    return JSON.stringify({ list: [video] });
}

async function play(flag, id, flags) {
    let jx = 0;
    let final_url = '';
    try {
        const payload = { 'url': id };
        const resp = await req(`${host}/api.php/player/payVideoUrl/`, {
            method: 'post',
            data: payload,
            headers: headers,
            timeout: 30000
        });
        const json = JSON.parse(resp.content);
        const play_url = json.data.url;
        if (play_url && play_url.startsWith('http')) {
            final_url = play_url;
        }
    } catch (e) {}
    if (!final_url) {
        final_url = id;
        if (/(?:www\.iqiyi|v\.qq|v\.youku|www\.mgtv|www\.bilibili)\.com/.test(id)) {
            jx = 1;
        }
    }
    const play_headers = {
        ...def_headers,
        'accept-language': 'zh-CN',
        'referer': 'https://docs.qq.com/'
    };
    return JSON.stringify({
        parse: jx,
        url: final_url,
        header: play_headers
    });
}

function arr2vods(arr) {
    const videos = [];
    for (const i of arr) {
        let remarks = '';
        if (i.vod_serial === '1') {
            remarks = `${i.vod_serial}集`;
        } else {
            remarks = `评分：${i.vod_score || i.vod_douban_score || ''}`;
        }
        videos.push({
            'vod_id': i.vod_id.toString(),
            'vod_name': i.vod_name,
            'vod_pic': i.vod_pic,
            'vod_remarks': remarks,
            'vod_year': null
        });
    }
    return videos;
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