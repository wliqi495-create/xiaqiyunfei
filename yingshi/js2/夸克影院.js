let host = 'https://www.qkmov.cc';
let headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; M2102J2SC Build/TKQ1.221114.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/143.0.7499.3 Mobile Safari/537.36"
};
async function init(cfg) {}

function getList(html) {
    let videos = [];
    let items = pdfa(html, ".stui-vodlist__box,.clearfix li");
    items.forEach(it => {
        let idMatch = it.match(/href="([\s\S]*?)"/);
        let nameMatch = it.match(/title="([\s\S]*?)"/);
        let picMatch = it.match(/data-original="([\s\S]*?)"/);
        let remarksMatch = it.match(/text-right">([\s\S]*?)</);
        if (idMatch && nameMatch) {
            let pic = picMatch ? (picMatch[1] || picMatch[2]) : "";
            videos.push({
                vod_id: idMatch[1],
                vod_name: nameMatch[1],
                vod_pic: pic.startsWith('/') ? host + pic : pic,
                vod_remarks: (remarksMatch || ["", ""])[1].replace(/<.*?>/g, "")
            });
        }
    });
    return videos;
}
async function home(filter) {
    return JSON.stringify({
        "class": [{
            "type_id": "20",
            "type_name": "电影"
        }, {
            "type_id": "21",
            "type_name": "剧集"
        }, {
            "type_id": "23",
            "type_name": "综艺"
        }, {
            "type_id": "22",
            "type_name": "动漫"
        }]
    });
}
async function homeVod() {
    let resp = await req(host, {
        headers
    });
    return JSON.stringify({
        list: getList(resp.content)
    });
}
async function category(tid, pg, filter, extend) {
    let p = pg || 1;
    let targetId = (extend && extend.class) ? extend.class : tid;
    let url = `${host}/type/${tid}-${p}.html`;
    let resp = await req(url, {
        headers
    });
    return JSON.stringify({
        list: getList(resp.content),
        page: parseInt(p)
    });
}
async function detail(id) {
    const dUrl = host + id;
    const dResp = await req(dUrl, {
        headers
    });
    const dhtml = dResp.content;
    const playPageUrl = pdfh(dhtml, '.picture.v-thumb&&href');
    if (!playPageUrl) {
        return JSON.stringify({
            list: []
        });
    }
    const pResp = await req(host + playPageUrl, {
        headers
    });
    const phtml = pResp.content;
    const blockList = [];
    const tabs = pdfa(phtml, '.play-source-tabs');
    const lists = pdfa(phtml, '.play-source-content');
    const playPairs = tabs
        .map((tab, idx) => {
            const name = (tab.match(/"kua">([\s\S]*?)<\/div>/) || ['', '线路'])[1].trim();
            const urlArr = pdfa(lists[idx] || '', 'a').map(a => {
                const n = (a.match(/">([\s\S]*?)<\/a>/) || ['', '播放'])[1];
                const v = a.match(/data-url="([\s\S]*?)"/);
                return n + '$' + (v ? v[1] : '');
            }).join('#');
            return {
                name,
                url: urlArr
            };
        })
        .filter(item => !blockList.includes(item.name));
    const playFrom = playPairs.map(p => p.name).join('$$$');
    const playUrl = playPairs.map(p => p.url).join('$$$');
    return JSON.stringify({
        list: [{
            vod_id: id,
            vod_name: (dhtml.match(/<h1[\s\S]*?>([\s\S]*?)<font/) || ['', ''])[1],
            vod_pic: (dhtml.match(/detail-thumb iGrajr">[\s\S]*?src="([\s\S]*?)"/) || ["", ""])[1],
            vod_year: (dhtml.match(/href="\/search\/-------------[\s\S]*?.html" target="_blank">([\s\S]*?)<\/a>/) || ['', ''])[1],
            vod_area: (dhtml.match(/href="\/search\/--[\s\S]*?-----------.html" target="_blank">([\s\S]*?)<\/a>/) || ['', ''])[1],
            vod_remarks: (dhtml.match(/更新：<\/span>([\s\S]*?)<\/p>/) || ['', ''])[1],
            type_name: (dhtml.match(/href="\/search\/----[\s\S]*?---------.html" target="_blank">([\s\S]*?)<\/a>/) || ['', ''])[1],
            vod_actor: Array.from(
                dhtml.match(/主演：<\/span>([\s\S]*?)<\/p>/)?.[1]?.matchAll(/<a [^>]*>([^<]+)<\/a>/g) || []).map(m => m[1]).join(' / ') || '',
            vod_director: Array.from(
                dhtml.match(/导演：<\/span>([\s\S]*?)<\/p>/)?.[1]?.matchAll(/<a [^>]*>([^<]+)<\/a>/g) || []).map(m => m[1]).join(' / ') || '',
            vod_content: (dhtml.match(/<p class="col-pd">([\s\S]*?)<\/p>/) || ['', ''])[1].replace(/<.*?>/g, ''),
            vod_play_from: playFrom,
            vod_play_url: playUrl
        }]
    });
}

async function search(wd, quick, pg) {
    let p = pg || 1;
    let url = `${host}/search/${wd}----------${p}---.html`;
    let resp = await req(url, {
        headers
    });
    return JSON.stringify({
        list: getList(resp.content)
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function play(flag, id, flags) {
    const playUrl = /^http/.test(id) ? id : `${host}${id}`;
    await sleep(5000);
    return JSON.stringify({
        jx: 0,
        parse: 0,
        url: 'push://' + playUrl,
        header: headers
    });
}
export default {
    init,
    home,
    homeVod,
    category,
    detail,
    search,
    play
};