import { load, _ } from 'assets://js/lib/cat.js';
import 'assets://js/lib/crypto-js.js';

const host = 'https://v.qq.com';
const apihost = 'https://pbaccess.video.qq.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0';

let danmakuAPI = '';

async function init(cfg) {
    danmakuAPI = cfg.ext;
}

async function request(baseUrl, apiPath, params = {}, method = 'get') {
    const url = apiPath.startsWith('http') ? apiPath : `${baseUrl}/${apiPath}`;
    let reqOptions = {
        method: method,
        headers: {
            'User-Agent': UA,
            'Referer': host,
            'Origin': host
        }
    };

    if (method.toLowerCase() === 'get') {
        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        reqOptions.url = queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url;
    } else if (method.toLowerCase() === 'post') {
        reqOptions.body = JSON.stringify(params);
        reqOptions.headers['Content-Type'] = 'application/json';
    }

    const res = await req(reqOptions.url || url, reqOptions);
    return JSON.parse(res.content);
}

async function home() {
    const classes = [
        { type_id: '100113', type_name: '电视剧' },
        { type_id: '100173', type_name: '电影' },
        { type_id: '100109', type_name: '综艺' },
        { type_id: '100105', type_name: '纪录片' },
        { type_id: '100119', type_name: '动漫' },
        { type_id: '100150', type_name: '少儿' },
        { type_id: '110755', type_name: '短剧' }
    ];
    const sort_hot = { "n": "最热", "v": "75" };
    const sort_new = { "n": "最新", "v": "79" };
    const years = [{"n":"全部","v":"-1"},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"}];

    const filters = {
        "100113": [
            { "key": "sort", "name": "排序", "value": [sort_hot, { "n": "最新", "v": "79" }, { "n": "好评", "v": "16" }] },
            { "key": "itype", "name": "类型", "value": [{"n":"全部","v":"-1"},{"n":"爱情","v":"1"},{"n":"古装","v":"2"},{"n":"悬疑","v":"3"},{"n":"都市","v":"4"},{"n":"家庭","v":"5"},{"n":"喜剧","v":"6"},{"n":"武侠","v":"8"},{"n":"军旅","v":"9"},{"n":"科幻","v":"16"},{"n":"玄幻","v":"18"}] },
            { "key": "iyear", "name": "年代", "value": years }
        ],
        "100173": [
            { "key": "sort", "name": "排序", "value": [sort_hot, { "n": "最新", "v": "83" }, { "n": "好评", "v": "81" }] },
            { "key": "itype", "name": "类型", "value": [{"n":"全部","v":"-1"},{"n":"犯罪","v":"4"},{"n":"剧情","v":"100022"},{"n":"喜剧","v":"100004"},{"n":"悬疑","v":"100009"},{"n":"爱情","v":"100005"},{"n":"科幻","v":"100012"},{"n":"奇幻","v":"100016"},{"n":"武侠","v":"100011"}] },
            { "key": "iyear", "name": "年代", "value": years }
        ],
        "100109": [
            { "key": "sort", "name": "排序", "value": [sort_hot, { "n": "最新", "v": "23" }] },
            { "key": "iyear", "name": "年代", "value": years }
        ],
        "100119": [
            { "key": "sort", "name": "排序", "value": [sort_hot, { "n": "最新", "v": "83" }, { "n": "好评", "v": "81" }] },
            { "key": "iarea", "name": "地区", "value": [{"n":"全部","v":"-1"},{"n":"内地","v":"1"},{"n":"日本","v":"2"},{"n":"欧美","v":"3"}] },
            { "key": "itype", "name": "类型", "value": [{"n":"全部","v":"-1"},{"n":"玄幻","v":"9"},{"n":"科幻","v":"4"},{"n":"武侠","v":"13"},{"n":"冒险","v":"3"},{"n":"搞笑","v":"1"},{"n":"竞技","v":"20"}] },
            { "key": "iyear", "name": "年代", "value": years }
        ],
        "100150": [
            { "key": "sort", "name": "排序", "value": [sort_hot, { "n": "最新", "v": "76" }] },
            { "key": "iarea", "name": "地区", "value": [{"n":"全部","v":"-1"},{"n":"内地","v":"3"},{"n":"日本","v":"2"},{"n":"其他","v":"1"}] },
            { "key": "iyear", "name": "年龄段", "value": [{"n":"全部","v":"-1"},{"n":"0-3岁","v":"1"},{"n":"4-6岁","v":"2"},{"n":"7-9岁","v":"3"},{"n":"10岁以上","v":"4"}] }
        ],
        "100105": [
            { "key": "sort", "name": "排序", "value": [sort_hot, { "n": "最新", "v": "74" }] },
            { "key": "itype", "name": "类型", "value": [{"n":"全部","v":"-1"},{"n":"自然","v":"4"},{"n":"美食","v":"10"},{"n":"历史","v":"1"},{"n":"军事","v":"2"},{"n":"科技","v":"8"}] }
        ],
        // 👇 短剧筛选（已添加）
        "110755": [
            { "key": "sort", "name": "排序", "value": [sort_hot, { "n": "最新", "v": "79" }, { "n": "好评", "v": "16" }] },
            { "key": "itype", "name": "类型", "value": [{"n":"全部","v":"-1"},{"n":"爱情","v":"1"},{"n":"古装","v":"2"},{"n":"悬疑","v":"3"},{"n":"都市","v":"4"},{"n":"家庭","v":"5"},{"n":"喜剧","v":"6"},{"n":"玄幻","v":"18"}] },
            { "key": "iyear", "name": "年代", "value": years }
        ]
    };
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() { return JSON.stringify({ list: [] }); }

async function category(tid, pg, filter, extend) {
    // 👇 处理筛选参数
    const sort = extend.sort || "75";
    const itype = extend.itype || "-1";
    const iyear = extend.iyear || "-1";
    const filter_params = `sort=${sort}&itype=${itype}&ipay=-1&iarea=-1&iyear=${iyear}&producer=-1&characteristic=-1`;

    const url = `trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=1000005&vplatform=2&vversion_name=8.9.10&new_mark_label_enabled=1`;
    const sdk_page_ctx = { "page_offset": pg, "page_size": 1, "used_module_num": Number(pg) + 1 };

    const res = await request(apihost, url, {
        "page_params": {
            "channel_id": tid,
            "filter_params": filter_params,
            "page_type": "channel_operation",
            "page_id": "channel_list_second_page"
        },
        "page_context": { "sdk_page_ctx": JSON.stringify(sdk_page_ctx), "page_index": pg }
    }, "POST");

    let result = res.data.module_list_datas[0].module_datas[0].item_data_lists.item_datas.filter(item => item.item_type === "2");

    return JSON.stringify({
        page: parseInt(pg),
        list: (result || []).map(i => ({
            vod_id: i.item_params.cid + "&&&" + i.item_params.title + "&&&" + (i.item_params.second_title || ""),
            vod_name: i.item_params.title,
            vod_pic: i.item_params.new_pic_vt || i.item_params.pic_vt,
            vod_year: i.item_params.year,
            vod_remarks: i.item_params.second_title
        }))
    });
}

async function detail(id) {
    let [cid, title, second_title] = id.split("&&&");
    let next_page_context = ""; 
    const url = "trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2&vversion_name=8.2.96";
    const allData = [];

    // 1. 获取剧集列表
    try {
        while (true) {
            const res = await request(apihost, url, {
                "page_params": {
                    "req_from": "web_vsite", "page_id": "vsite_episode_list", "page_type": "detail_operation",
                    "cid": cid, "page_context": next_page_context, "detail_page_type": "1"
                }
            }, "POST");
            const currentPageData = res.data.module_list_datas[0].module_datas[0].item_data_lists.item_datas;
            allData.push(...currentPageData);
            next_page_context = res.data.module_list_datas[0].module_datas[0].module_params.next_page_context;
            if (!next_page_context) break;
        }

        const playUrl = allData.filter(item => item.item_params && item.item_params.play_title && !item.item_params.play_title.includes("预"))
            .map(item => `${item.item_params.title}$${host}/x/cover/${cid}/${item.item_id}.html`).join('#');

        // 2. 获取详情信息（简介、演员、年份、地区）
        let detailInfo = {};
        try {
            const detailRes = await request(apihost, "trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData?video_appid=3000010&vplatform=2&vversion_name=8.2.96", {
                "page_params": {
                    "req_from": "web_vsite", "page_id": "vsite_detail", "page_type": "detail_operation",
                    "cid": cid, "detail_page_type": "1"
                }
            }, "POST");

            const modules = detailRes.data.module_list_datas || [];
            for (let mod of modules) {
                const items = mod.module_datas[0]?.item_data_lists?.item_datas || [];
                for (let item of items) {
                    const p = item.item_params || {};
                    if (p.title) detailInfo.vod_name = p.title;
                    if (p.year) detailInfo.vod_year = p.year;
                    if (p.area) detailInfo.vod_area = p.area;
                    if (p.desc) detailInfo.vod_content = p.desc;
                    if (p.actors) detailInfo.vod_actor = p.actors;
                    if (p.director) detailInfo.vod_director = p.director;
                    if (p.pic_vt) detailInfo.vod_pic = p.pic_vt;
                }
            }
        } catch (e) {}

        return JSON.stringify({
            list: [{
                vod_id: cid,
                vod_name: detailInfo.vod_name || title || "视频详情",
                vod_year: detailInfo.vod_year || "",
                vod_area: detailInfo.vod_area || "",
                vod_actor: detailInfo.vod_actor || "",
                vod_director: detailInfo.vod_director || "",
                vod_content: detailInfo.vod_content || second_title || "",
                vod_pic: detailInfo.vod_pic || "",
                vod_play_from: '腾讯',
                vod_play_url: playUrl
            }]
        });
    } catch (e) { return JSON.stringify({ list: [] }); }
}

// 播放解析 - 已内置接口
async function play(flag, id, flags) {
    const parseApi = 'https://jx.xmflv.cc/?url=';
    try {
        const res = await request('', parseApi + encodeURIComponent(id), {}, "GET");
        // 尝试获取解析后的视频流地址
        const finalUrl = res.url || (res.data && res.data.url);
        if (finalUrl) {
            return JSON.stringify({
                parse: 0,
                url: finalUrl,
                danmaku: danmakuAPI + id
            });
        }
    } catch (e) {}
    
    // 如果解析口失效，回退给软件外壳解析
    return JSON.stringify({
        jx: 1,
        url: id,
        danmaku: danmakuAPI + id
    });
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0, v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

async function search(wd, quick) {
    let url = "trpc.videosearch.mobile_search.MultiTerminalSearch/MbSearch?vplatform=2";
    const uuid = uuidv4().toUpperCase();
    const res = await request(apihost, url, {
        "version": "25031901", "clientType": 1, "uuid": uuid, "query": wd, "pagenum": 0, "pagesize": 30, "extraInfo": { "isNewMarkLabel": "1" }
    }, "POST");

    let result = [...(res.data.normalList.itemList || [])];
    if (Array.isArray(res.data.areaBoxList)) {
        result = res.data.areaBoxList.reduce((acc, box) => acc.concat(box.itemList || []), result);
    }

    let vod = result.filter(i => i.doc && i.doc.dataType === 2).map(i => ({
        vod_id: i.doc.id + "&&&" + i.videoInfo.title + "&&&" + (i.videoInfo.descrip || ""),
        vod_name: i.videoInfo.title,
        vod_pic: i.videoInfo.imgUrl,
        vod_remarks: i.videoInfo.descrip
    }));
    return JSON.stringify({ list: vod });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search };
}
