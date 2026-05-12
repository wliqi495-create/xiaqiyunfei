var rule = {

safeParseJSON: function(jStr){
    try {return JSON.parse(jStr);} catch(e) {return null;}
},

getkvods: function (url, words = '米', emode = false) {
    let kwd = words;
    let rbody = {
        "page": 1, 
        "q": kwd,
        "user": "", 
        "exact": emode,
        "format": [".mp4", ".mkv", ".flv", ".rmvb", ".wmv", ".3gp", ".mov", ".m4v", ".swf", ".f4v", ".webm", ".ogg", ".ogv", ".m3u8", ".mpd", ".avi", ".mpg", ".mpeg", ".mpe", ".mpv", ".m2v", ".mxf", ".3g2", ".f4p", ".f4a", ".f4b"], 
        "share_time": "", 
        "size": 15, "type": "", 
        "exclude_user": [], 
        "adv_params": {"wechat_pwd": "", "platform": ""}
    };
    let khtml = fetch(url, {
        headers: {
            ...rule.headers,
            "Content-Type": "application/json; charset=UTF-8"
        },
        method: 'POST',
        body: rbody
    });
    let klists = rule.safeParseJSON(khtml)?.data?.list ?? [];
    let kvods = [];
    klists.forEach(it => {
        let kname = it.disk_name.replace(/<[^>]*?>/g, '') || '名称';
        let kpic = rule.panPics[it.disk_type] || '图片';
        let kremarks = `${it.disk_type}|${it.shared_time || '无分享时间'}`;
        kvods.push({
            vod_name: kname,
            vod_pic: kpic,
            vod_remarks: kremarks,
            vod_id: `${it.link}@${kname}@${kpic}@${kremarks}`
        });
    });
    return kvods;
},

author: '小可乐/v5.12.1',
title: '米盘搜',
类型: '影视',
host: 'http://misopan.fun',
headers: {'User-Agent': MOBILE_UA},
编码: 'utf-8',
timeout: 5000,

homeUrl: '/v1/search/disk',
url: '/v1/search/disk',
searchUrl: '/v1/search/disk',

limit: 9,
double: false,
class_name: '电影&国产剧&短剧',
class_url: '电影&国产剧&短剧',
pagecount: {"电影": 1, "国产剧": 1, "短剧": 1}, 

exaxt: false,//精准搜索改为true
panPics: {
    "QUARK": "https://so.slowread.net/static/img/quark.jpg",
    "BDY": "https://so.slowread.net/static/img/baidu.jpg",
    "UC": "https://so.slowread.net/static/img/uc.jpg"
},

推荐: $js.toString(() => {
    let kwd = '美剧';
    VODS = rule.getkvods(input, kwd, rule.exaxt);
}),
一级: $js.toString(() => {
    VODS = rule.getkvods(input, MY_CATE, rule.exaxt);
}),
搜索: $js.toString(() => {
    VODS = rule.getkvods(input, KEY, rule.exaxt);
}),
二级: $js.toString(() => {
    let [kid, kname, kpic, kremarks] = input.split('@');
    let [type, remark='状态'] = kremarks.split('|');
    let kurl = `合集$${kid}`;
    VOD = {
        vod_id: kid,
        vod_name: kname,
        vod_pic: kpic,
        type_name: type,
        vod_remarks: remark,
        vod_year: '1000',
        vod_area: '地区',
        vod_lang: '语言',
        vod_director: '导演',
        vod_actor: '演员',
        vod_content: `${kname}_${kid}`,
        vod_play_from: type,
        vod_play_url: kurl
    };
}),

play_parse: true,
lazy: $js.toString(() => {
    let kurl = `push://${input}`;
    input = { jx: 0, parse: 0, url: kurl };
}),
}