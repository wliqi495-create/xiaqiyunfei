//小心儿悠悠//
var rule = {
    title: '优酷视频',
    host: 'https://www.%79%6f%75%6b%75.com',
    homeUrl: '',
    searchUrl: 'https://search.%79%6f%75%6b%75.com/api/search?pg=fypage&keyword=**',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    multi: 1,
    url: '/category/data?optionRefresh=1&pageNo=fypage&params=fyfilter',
    filter_url: '{{fl}}',
    filter: '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',
    headers: {
        'User-Agent': 'PC_UA',
        'Cookie': 'cna=VvNvGX3e0ywCAavVEXlnA2bg; __ysuid=1626676228345Rl1; __ayft=1652434048647; __arycid=dm-1-00; __arcms=dm-1-00; __ayvstp=85; __arpvid=1667204023100cWWdgM-1667204023112; __ayscnt=10; __aypstp=60; isg=BBwcqxvvk3BxkWQGugbLpUSf7TrOlcC_U7GAj_YdfYfvQbzLHqYGT4Hgp6m5TvgX; tfstk=c3JOByYUH20ilVucLOhh0pCtE40lZfGc-PjLHLLfuX7SWNyAiQvkeMBsIw7PWDC..; l=eBQguS-PjdJFGJT-BOfwourza77OSIRA_uPzaNbMiOCPOb1B5UxfW6yHp4T6C3GVhsGJR3rp2umHBeYBqQd-nxvOF8qmSVDmn',
        'Referer': 'https://www.youku.com',
    },
    timeout: 5000,
    class_name: '电视剧&电影&综艺&动漫&少儿&纪录片&文化&亲子&教育&搞笑&生活&体育&音乐&游戏',
    class_url: '电视剧&电影&综艺&动漫&少儿&纪录片&文化&亲子&教育&搞笑&生活&体育&音乐&游戏',
    limit: 20,
    play_parse: true,
    lazy: `js:
const blockedLinks = [
    ''
];

if (/\.m3u8$/.test(input)) {
    input = { jx: 0, parse: 0, url: input };
} else if (/\.mp4$/.test(input)) {
    input = blockedLinks.includes(input) ? null : { jx: 0, parse: 0, url: input };
} else if (/qq|iqiyi|youku|mgtv|NBY/.test(input)) {
    let kurl ='' + encodeURIComponent(input);
    kurl = JSON.parse(request(kurl)).url;
    input = blockedLinks.includes(kurl) ? null : { jx: 0, parse: 0, url: kurl };
} else {
    input = { jx: 0, parse: 1, url: input };
}`,
    一级: `js:
let d = [];
MY_FL.type = MY_CATE;
let fl = stringify(MY_FL);
fl = encodeUrl(fl);
input = input.split("{")[0] + fl;
if (MY_PAGE > 1) {
    let old_session = getItem("yk_session_" + MY_CATE, "{}");
    input = input.replace("optionRefresh=1", "session=" + encodeUrl(old_session));
}
let html = fetch(input, fetch_params);
try {
    html = JSON.parse(html);
    let lists = html.data.filterData.listData;
    let session = html.data.filterData.session;
    session = stringify(session);
    if (session !== getItem("yk_session_" + MY_CATE, "{}")) {
        setItem("yk_session_" + MY_CATE, session);
    }
    lists.forEach(function(it) {
        let vid = it.videoLink.includes("id_") ? it.videoLink.split("id_")[1].split(".html")[0] : "msearch:";
        d.push({
            title: it.title,
            img: it.img,
            desc: it.summary,
            url: "https://search.youku.com/api/search?appScene=show_episode&showIds=" + vid,
            content: it.subTitle
        });
    });
} catch (e) {
    log("一级列表解析发生错误:" + e.message);
}
setResult(d);`,
    二级: `js:
var d = [];
VOD = {};
let html = request(input);
let json = JSON.parse(html);
if (/keyword/.test(input)) {
    input = "https://search.youku.com/api/search?appScene=show_episode&showIds=" + json.pageComponentList[0].commonData.showId;
    json = JSON.parse(fetch(MY_URL, fetch_params));
}
let video_lists = json.serisesList;
var name = json.sourceName;
if (/优酷/.test(name) && video_lists.length > 0) {
    let ourl = "https://v.youku.com/v_show/id_" + video_lists[0].videoId + ".html";
    let _img = video_lists[0].thumbUrl;
    
    let detailInfo = null;
    try {
        let detailUrl = "https://v.youku.com/v_getvideo_info/?showId=" + json.showId;
        detailInfo = JSON.parse(fetch(detailUrl, {
            headers: {
                Referer: "https://v.youku.com/",
                "User-Agent": PC_UA
            }
        }));
    } catch (e) {
        log("详情接口请求失败：" + e.message);
    }
    
    if (detailInfo && detailInfo.data) {
        let v = detailInfo.data;
        VOD.vod_type = v.showVideotype;
        VOD.vod_year = v.lastUpdate;
        VOD.vod_remarks = v.rc_title;
        VOD.vod_actor = v._personNameStr;
        VOD.vod_content = v.showdesc;
        VOD.vod_pic = v.showLogo || _img;
        VOD.vod_name = v.showTitle;
    } else {
        let html = fetch(ourl, {
            headers: {
                Referer: "https://v.youku.com/",
                "User-Agent": PC_UA
            }
        });
        let jsonData = /__INITIAL_DATA__/.test(html) ? html.split("window.__INITIAL_DATA__ =")[1].split(";")[0] : "{}";
        if (jsonData === "{}") {
            VOD.vod_remarks = ourl;
            VOD.vod_pic = _img;
            VOD.vod_name = video_lists[0].title.replace(/(\d+)/g, "");
            VOD.vod_content = "触发了优酷人机验证,本次未获取详情,但不影响播放(" + ourl + ")";
        } else {
            try {
                jsonData = JSON.parse(jsonData);
                let data = jsonData.data.data;
                let data_extra = data.data.extra;
                let img = data_extra.showImgV;
                let model = jsonData.data.model;
                let m = model.detail.data.nodes[0].nodes[0].nodes[0].data;
                VOD.vod_pic = img;
                VOD.vod_name = m.introTitle;
                VOD.vod_type = m.showGenre;
                VOD.vod_remarks = m.updateInfo || m.subtitle;
                VOD.vod_content = m.desc;
            } catch (e) {
                VOD.vod_remarks = name;
            }
        }
    }
} else if (!/优酷/.test(name)) {
    VOD.vod_content = "非自家播放源,暂无视频简介及海报";
    VOD.vod_remarks = name;
}

play_url = play_url.replace("&play_url=", "&type=json&play_url=");
video_lists.forEach(function(it) {
    let url = "https://v.youku.com/v_show/id_" + it.videoId + ".html";
    if (it.thumbUrl) {
        d.push({
            desc: it.showVideoStage ? it.showVideoStage.replace("期", "集") : it.displayName,
            pic_url: it.thumbUrl,
            title: it.title,
            url: play_url + urlencode(url)
        });
    } else if (name !== "优酷") {
        d.push({
            title: it.displayName ? it.displayName : it.title,
            url: play_url + urlencode(it.url)
        });
    }
});
VOD.vod_play_from = name;
VOD.vod_play_url = d.map(function(it) {
    return it.title + "$" + it.url;
}).join("#");`,
    搜索: `js:
var d = [];
let html = request(input);
let json = JSON.parse(html);
json.pageComponentList.forEach(function(it) {
    if (it.hasOwnProperty("commonData")) {
        it = it.commonData;
        d.push({
            title: it.titleDTO.displayName,
            img: it.posterDTO.vThumbUrl,
            desc: it.stripeBottom,
            content: it.updateNotice + " " + it.feature,
            url: "https://search.youku.com/api/search?appScene=show_episode&showIds=" + it.showId + "&appCaller=h5"
        });
    }
});
setResult(d);`
};