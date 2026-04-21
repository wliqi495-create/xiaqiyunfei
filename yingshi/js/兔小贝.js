const host = 'https://www.tuxiaobei.com';
const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    'Referer': host + '/'
};

async function init(cfg) {}

async function home(filter) {
    const classes = [
        { type_id: '2', type_name: '儿歌' },
        { type_id: '3', type_name: '故事' },
        { type_id: '4', type_name: '国学' },
        { type_id: '25', type_name: '启蒙' }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    return await category('2', '1');
}

async function category(tid, pg, filter, extend = {}) {
    let p = parseInt(pg || 1);
    // 原始 url: /list/mip-data?typeId=fyclass&page=fypage&callback=
    const url = `${host}/list/mip-data?typeId=${tid}&page=${p}&callback=`;
    const r = await req(url, { headers });
    let content = r.content.trim();
    if (content.indexOf('(') !== -1) {
        content = content.substring(content.indexOf('(') + 1, content.lastIndexOf(')'));
    }
    const res = JSON.parse(content);
    const list = (res.data?.items || []).map(it => ({
        vod_id: it.video_id.toString(),
        vod_name: it.name,
        vod_pic: it.image,
        vod_remarks: it.duration_string
    }));
    return JSON.stringify({
        page: p,
        pagecount: list.length > 0 ? p + 1 : p,
        list: list
    });
}

// --- 深度模拟原始 二级:* 逻辑 ---
async function detail(id) {
    // 原始 detailUrl: /play/fyid
    const url = `${host}/play/${id}`;
    const r = await req(url, { headers });
    const html = r.content;

    // 原始规则中没有定义具体的二级解析，所以壳子会尝试匹配标准字段
    // 我们必须手动从 HTML 中提取这些关键信息，否则 list 会为空
    const vod = {
        vod_id: id,
        // 尝试匹配标题，兔小贝播放页标题通常在 h1 或 .video-title
        vod_name: pdfh(html, "h1&&Text") || pdfh(html, ".video-title&&Text") || "兔小贝视频",
        vod_pic: pdfh(html, ".pic-box img&&src") || "",
        type_name: "少儿",
        vod_content: pdfh(html, ".desc&&Text") || "暂无简介",
        vod_play_from: "兔小贝",
        // 关键：模仿原始逻辑，将播放页地址作为播放链接
        vod_play_url: `正片$${url}`
    };

    return JSON.stringify({ list: [vod] });
}

async function search(wd, quick, pg = 1) {
    // 原始 searchUrl: /search/index?key=**
    const url = `${host}/search/index?key=${encodeURIComponent(wd)}`;
    const r = await req(url, { headers });
    const html = r.content;
    const items = pdfa(html, ".list-con .items");
    const list = items.map(it => {
        const href = pdfh(it, "a&&href");
        return {
            vod_id: href.split('/').pop(),
            vod_name: pdfh(it, ".text&&Text"),
            vod_pic: pdfh(it, "mip-img&&src"),
            vod_remarks: pdfh(it, ".time&&Text")
        };
    });
    return JSON.stringify({ list: list });
}

async function play(flag, id, flags) {
    // id 是 detail 传过来的播放页 URL
    // 原始 lazy 逻辑: pdfh(html, "body&&#videoWrap&&video-src")
    const r = await req(id, { headers });
    const html = r.content;
    
    // 完全模拟原始 pdfh 路径
    let src = pdfh(html, "body #videoWrap&&video-src");

    return JSON.stringify({
        parse: 0,
        url: src || "",
        header: headers
    });
}

export default { init, home, homeVod, category, detail, search, play };
