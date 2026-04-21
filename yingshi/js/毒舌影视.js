/**
 * 毒舌影视 - 2026/01/22 源码定点适配版 (移除console.log)
 * 适配路径: /dsshiyidt/
 * 适配图片: data-original
 */

const host = 'https://www.xnhrsb.com';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': host + '/'
};

async function init(cfg) {}

const m = (s, r, i = 1) => (s.match(r) || [])[i] || "";
const fixPic = p => p && p.startsWith('/') ? host + p : p;

/**
 * 核心解析：针对 <li> 结构进行精准提取
 */
function getList(html) {
    let list = [];
    // 源码特征：<li class="..."><a href="/dsshiyidt/ID.html">...<img data-original="PIC" alt="NAME">...</h3>
    // 使用 pdfa 提取所有 li 元素
    const items = pdfa(html, ".bt_img ul li");
    
    items.forEach(it => {
        // 提取 ID (匹配 dsshiyidt 或 dsshiyixq 或 dsshiyipy 以防万一)
        let id = m(it, /href="\/dsshiyi(?:dt|xq|py)\/(.*?)\.html"/);
        if (!id) return;

        // 提取图片：源码明确使用 data-original
        let pic = m(it, /data-original="([^"]+)"/) || m(it, /src="([^"]+)"/);
        
        // 提取标题：源码在 alt 属性里，也在 dytit 类的 a 标签里
        let name = m(it, /alt="([^"]+)"/) || m(it, /class="dytit"[\s\S]*?>(.*?)<\/a>/);
        name = name ? name.replace(/<.*?>/g, "").trim() : "";

        // 提取备注：源码在 hdinfo 类里
        let remarks = m(it, /class="hdinfo">[\s\S]*?<span>(.*?)<\/span>/);

        if (id && name) {
            list.push({
                vod_id: id,
                vod_name: name,
                vod_pic: fixPic(pic),
                vod_remarks: remarks.trim()
            });
        }
    });

    return list;
}

async function home(filter) {
    return JSON.stringify({
        class: [
            { type_id: "1", type_name: "电影" },
            { type_id: "2", type_name: "电视剧" },
            { type_id: "3", type_name: "综艺" },
            { type_id: "4", type_name: "动漫" },
            { type_id: "5", type_name: "短剧" }
        ]
    });
}

async function homeVod() {
    const r = await req(host, { headers });
    return JSON.stringify({ list: getList(r.content) });
}

async function category(tid, pg, filter, extend = {}) {
    let p = pg || 1;
    // 适配源码中的 11 横杠分页逻辑
    // 第一页: /dsshiyisw/1-----------.html
    // 第二页: /dsshiyisw/1--------2---.html
    let url = `${host}/dsshiyisw/${tid}-----------.html`;
    if (p > 1) {
        url = `${host}/dsshiyisw/${tid}--------${p}---.html`;
    }
    
    const r = await req(url, { headers });
    const list = getList(r.content);
    
    // 已移除 console.log
    return JSON.stringify({ page: p, list: list });
}

async function detail(id) {
    // 详情页路径统一尝试 dt (源码中新发现的路径)
    const r = await req(`${host}/dsshiyidt/${id}.html`, { headers });
    const h = r.content;

    // 详情页解析：标题在 h1，图片在 dyimg 类的 img 里
    const name = m(h, /<h1[^>]*>(.*?)<\/h1>/);
    const pic = fixPic(m(h, /class="dyimg"[\s\S]*?src="(.*?)"/));
    const content = m(h, /id="p_content"[\s\S]*?>(.*?)<\/div>/s).replace(/<.*?>/g, "").trim();

    // 播放源解析
    const playFrom = pdfa(h, ".mi_paly_box .ypxingq_t").map(it => it.replace(/<.*?>/g, "").trim()).join("$$$") || "播放源";
    const playUrl = pdfa(h, ".paly_list_btn").map(l =>
        pdfa(l, "a").map(it => {
            let aName = it.replace(/<.*?>/g, "").trim();
            let aId = m(it, /href="\/dsshiyipy\/(.*?)\.html"/);
            if (!aId || aName.includes('立即播放')) return null;
            return `${aName}$${aId}`;
        }).filter(Boolean).join("#")
    ).join("$$$");

    return JSON.stringify({
        list: [{
            vod_id: id,
            vod_name: name,
            vod_pic: pic,
            vod_content: content || "暂无简介",
            vod_play_from: playFrom,
            vod_play_url: playUrl
        }]
    });
}

async function search(wd, quick, pg = 1) {
    let url = `${host}/dsshiyisc/${encodeURIComponent(wd)}----------${pg}---.html`;
    const r = await req(url, { headers });
    return JSON.stringify({ list: getList(r.content) });
}

async function play(flag, id, flags) {
    const r = await req(`${host}/dsshiyipy/${id}.html`, { headers });
    const html = r.content;
    // 提取播放器配置中的 m3u8 地址
    let u = m(html, /"url"\s*:\s*"([^"]+\.m3u8[^"]*)"/);
    if (u) return JSON.stringify({ parse: 0, url: u.replace(/\\/g, ""), header: headers });
    // 如果没有直链，调用 webview 解析
    return JSON.stringify({ parse: 1, url: `${host}/dsshiyipy/${id}.html` });
}

export default { init, home, homeVod, category, detail, search, play };