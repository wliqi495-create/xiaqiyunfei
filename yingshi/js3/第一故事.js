var rule = {
author: '小可乐/v5.12.2',
title: '第一故事',
类型: '影视',
host: 'https://m.yigushi.com',
hostJs: '',
headers: {'User-Agent': MOBILE_UA},
编码: 'utf-8',
timeout: 5000,

homeUrl: '/',
url: '/fyclass/index-htm-page-fypage.html',
searchUrl: '/',
detailUrl: '',

limit: 9,
double: false,
class_parse: $js.toString(() => {
    rule.classes = pdfa(fetch(`${HOST}/channel.php`), '.list-set&&a').slice(0,5).map(it => {
        let kName = pdfh(it, 'body&&Text').slice(0,2);
        let kId = pdfh(it, 'a&&href').match(/com\/(.*?)\//)?.[1] ?? 'Id';
        return {type_name: kName, type_id: kId};
    });
    input = rule.classes;
}),

addPics: {
    "评书下载": "https://img3.jiemian.com/101/original/20180916/153710102319049900_a700x398.jpg",
    "戏曲下载": "https://img95.699pic.com/photo/50762/7523.jpg_wh860.jpg",
    "有声小说": "https://q2.itc.cn/q_70/images03/20251221/546f34ca117c43c6978cbe6a3dcdabd6.png",
    "儿童故事": "https://img.alicdn.com/bao/uploaded/i3/2617663089/O1CN01yy76Uf1Ygo9eSLT5c_!!0-item_pic.jpg",
    "相声小品": "https://gd-filems.dancf.com/gaoding/cms/mcm79j/mcm79j/59385/6a211035-3658-45ce-a476-79f6f5dc02b71172884.png?x-oss-process=image/resize,h_1308/interlace,1",
    "其它": "https://bpic.588ku.com/element_origin_min_pic/23/02/19/f13e41c70e75e82999f929072543ca7e.jpg"
},

getVodList: function(url) {
    let khtml = fetch(url);
    let klists = pdfa(khtml, 'li:has(strong)');
    let kremarks = pdfh(khtml, '.head-bar-title&&Text') || '状态';
    let item = Object.keys(rule.addPics).find(key => kremarks.includes(key)) ?? '其它';
    let kpic = rule.addPics[item] || '图片';
    let kvods = [];
    klists.forEach(it => {
        let kname = pdfh(it, 'strong&&Text') || '名称';
        kvods.push({
            vod_name: kname,
            vod_pic: kpic,
            vod_remarks: kremarks,
            vod_id: `${pdfh(it, 'a&&href')}@${kname}@${kpic}@${kremarks}`
        });
    });
    return kvods;
},

推荐: '*',
一级: $js.toString(() => {
    VODS = rule.getVodList(input);
}),
搜索: $js.toString(() => {
    VODS = [];
    rule.classes.forEach(it => {
        input = `${HOST}/${it.type_id}/search.php?kw=${KEY}&page=${MY_PAGE}`;
        let fvods = rule.getVodList(input);
        if (fvods.length) {VODS.push(...fvods);}
    });
}),
二级: $js.toString(() => {
    let [kid, kname, kpic, kremarks] = input.split('@');
    let khtml = fetch(kid);
    let [eName, eUrl] = [pdfh(khtml, '.content&&a&&Text').match(/【(.*?)】/)?.[1] ?? '无标题', pdfh(khtml, '.content&&a&&href') || 'noUrl'];
    let kurls = `${eName}$${eUrl}`;
    VOD = {
        vod_id: kid,
        vod_name: kname,
        vod_pic: kpic,
        type_name: pdfh(khtml, '.head-bar-title&&Text') || '类型',
        vod_remarks: kremarks,
        vod_year: '2025',
        vod_area: '中国',
        vod_lang: '国语',
        vod_director: '导演',
        vod_actor: '主演',
        vod_content: pdfh(khtml, '.content--span--a&&Text') || '简介',
        vod_play_from: '网盘线路',
        vod_play_url: kurls
    };
}),

play_parse: true,
lazy: $js.toString(() => {
    let kurl = `push://${input}`;
    input = {parse: 0, url: kurl, header: rule.headers};
}),

filter: {}
}