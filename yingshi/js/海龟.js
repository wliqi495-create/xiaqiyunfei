// 海龟影视 - 极致精简版
let host = 'https://www.haigui.tv';
let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": host + "/"
};

async function init(cfg) {}

function isMovie(html) {
    const movieIndicators = [/class="[^"]*vod-type[^"]*">电影</i, /类型.*?电影/i, /时长.*?\d+分钟/i, /年代.*?\d{4}/i];
    const tvIndicators = [/class="[^"]*vod-type[^"]*">电视剧</i, /集数.*?\d+/i, /连载/i, /更新至.*?\d+集/i];
    let movieScore = 0, tvScore = 0;
    movieIndicators.forEach(p => p.test(html) && movieScore++);
    tvIndicators.forEach(p => p.test(html) && tvScore++);
    const playLinks = html.match(/href="\/vodplay\/\d+-\d+-\d+\/"/g);
    if (playLinks && playLinks.length <= 3) movieScore++;
    return movieScore > tvScore;
}

function parseDetail(html, id) {
    const nameMatch = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([^<]+)<\/h1>/);
    const name = nameMatch ? nameMatch[1].trim() : "未知影片";
    const picMatch = html.match(/data-src="([^"]*?vod[^"]*?\.(?:jpg|png|webp|gif))"/);
    const pic = picMatch ? picMatch[1] : "";
    const contentMatch = html.match(/<span>([^<]+)<\/span>/);
    const content = contentMatch ? contentMatch[1].trim() : "暂无简介";
    const yearMatch = html.match(/\/(\d{4})\s*<\//);
    const year = yearMatch ? yearMatch[1] : "未知";
    const isMovieType = isMovie(html);
    let playFrom = [], playUrl = [];

    const lineNames = [];
    const lineNameRegex = /data-dropdown-value="([^"]+)"[^>]*>[\s\S]*?<small>(\d+)<\/small>/g;
    let lineNameMatch;
    while ((lineNameMatch = lineNameRegex.exec(html)) !== null) {
        lineNames[parseInt(lineNameMatch[2])] = lineNameMatch[1];
    }

    const playLinks = [];
    const playLinkRegex = /href="(\/vodplay\/(\d+)-(\d+)-(\d+)\/)"[^>]*title="[^"]*([^<]+)<\/span>/g;
    let playLinkMatch;
    while ((playLinkMatch = playLinkRegex.exec(html)) !== null) {
        playLinks.push({
            url: playLinkMatch[1],
            vodId: playLinkMatch[2],
            lineNum: playLinkMatch[3],
            episodeNum: playLinkMatch[4],
            episodeName: playLinkMatch[5] || `第${playLinkMatch[4]}集`
        });
    }

    if (playLinks.length === 0) {
        const simplePlayLinkRegex = /href="(\/vodplay\/(\d+)-(\d+)-(\d+)\/)"/g;
        let simpleMatch;
        while ((simpleMatch = simplePlayLinkRegex.exec(html)) !== null) {
            playLinks.push({
                url: simpleMatch[1],
                vodId: simpleMatch[2],
                lineNum: simpleMatch[3],
                episodeNum: simpleMatch[4],
                episodeName: isMovieType ? "正片" : `第${simpleMatch[4]}集`
            });
        }
    }

    const lineGroups = {};
    playLinks.forEach(link => {
        const lineKey = link.lineNum;
        if (!lineGroups[lineKey]) lineGroups[lineKey] = [];
        lineGroups[lineKey].push(link);
    });

    Object.keys(lineGroups).forEach(lineNum => {
        const links = lineGroups[lineNum].sort((a, b) => parseInt(a.episodeNum) - parseInt(b.episodeNum));
        const episodes = links.map(link => `${link.episodeName}$${host}${link.url}`);
        const lineName = lineNames[lineNum] || (lineNum === "1" ? "普通一线" : lineNum === "2" ? "VIP二线" : lineNum === "3" ? "VIP三线" : `线路${lineNum}`);
        playFrom.push(lineName);
        playUrl.push(episodes.join('#'));
    });

    if (playFrom.length === 0) {
        playFrom.push("默认线路");
        playUrl.push(`正片$${host}/vodplay/${id}-1-1/`);
    }

    return {
        vod_id: id,
        vod_name: name,
        vod_pic: pic.startsWith('/') ? host + pic : (pic.startsWith('http') ? pic : host + '/' + pic),
        vod_year: year,
        vod_content: content,
        vod_remarks: isMovieType ? "电影" : "电视剧",
        vod_play_from: playFrom.join("$$$"),
        vod_play_url: playUrl.join("$$$")
    };
}

function detectVipPage(html) {
    const vipKeywords = ['vip.mp4', 'ad.mp4', 'advert.mp4', '广告.mp4', 'preview.mp4', '请观看广告', 'VIP专属', '会员专享', 'vip二线', 'vip三线'];
    for (const keyword of vipKeywords) {
        if (html.includes(keyword)) return true;
    }
    return false;
}

function tryExtractPlayUrl(html) {
    const iframeMatches = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/gi) || [];
    for (const iframeTag of iframeMatches) {
        const srcMatch = iframeTag.match(/src="([^"]+)"/i);
        if (srcMatch) {
            const iframeSrc = srcMatch[1];
            if (iframeSrc.includes('player') || iframeSrc.includes('play')) {
                return iframeSrc.startsWith('http') ? iframeSrc : host + iframeSrc;
            }
        }
    }

    const videoPatterns = [
        /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/gi,
        /src\s*=\s*['"]([^'"]+\.(?:m3u8|mp4|flv))['"]/gi,
        /url\s*:\s*['"]([^'"]+\.(?:m3u8|mp4|flv))['"]/gi,
        /file\s*:\s*['"]([^'"]+\.(?:m3u8|mp4|flv))['"]/gi
    ];

    for (const pattern of videoPatterns) {
        const matches = html.match(pattern) || [];
        for (const match of matches) {
            const urlMatch = match.match(/(https?:\/\/[^\s"']+)/i);
            if (urlMatch) {
                const url = urlMatch[0];
                if (!url.includes('vip.mp4') && !url.includes('ad.mp4') && !url.includes('preview.mp4')) {
                    return url;
                }
            }
        }
    }
    return null;
}

async function getPlayPageWithRetry(url) {
    try {
        const response = await req(url, { headers: headers });
        if (!response || !response.content) return null;
        
        let html = response.content;
        if (detectVipPage(html)) {
            await new Promise(resolve => setTimeout(resolve, 8000));
            const secondResponse = await req(url, { headers: headers });
            if (secondResponse && secondResponse.content) html = secondResponse.content;
        }
        return html;
    } catch (error) {
        return null;
    }
}

function getList(html) {
    let videos = [];
    let items = pdfa(html, ".module-item");
    items.forEach(it => {
        let idMatch = it.match(/\/voddetail\/(\d+)\//);
        let nameMatch = it.match(/title="([^"]+)"/);
        let picMatch = it.match(/data-src="([^"]+)"/);
        if (idMatch && nameMatch) {
            let pic = picMatch ? picMatch[1] : "";
            let remarks = (it.match(/<div class="module-item-note">(.*?)<\/div>/) || ["",""])[1];
            videos.push({
                "vod_id": idMatch[1],
                "vod_name": nameMatch[1],
                "vod_pic": pic.startsWith('/') ? host + pic : (pic.startsWith('http') ? pic : host + '/' + pic),
                "vod_remarks": remarks || "HD"
            });
        }
    });
    return videos;
}

async function home(filter) {
    return JSON.stringify({
        "class": [
            {"type_id":"dianying","type_name":"电影"},
            {"type_id":"dianshiju","type_name":"电视剧"},
            {"type_id":"zongyi","type_name":"综艺"},
            {"type_id":"dongman","type_name":"动漫"},
            {"type_id":"duanju","type_name":"短剧"},
            {"type_id":"jilupian","type_name":"纪录片"}                        
        ]
    });
}

async function homeVod() {
    let resp = await req(host, { headers: headers });
    if (!resp || !resp.content) return JSON.stringify({ list: [] });
    let list = getList(resp.content);
    const uniqueList = [], seenIds = new Set();
    for (const item of list) {
        if (!seenIds.has(item.vod_id) && uniqueList.length < 20) {
            seenIds.add(item.vod_id);
            uniqueList.push(item);
        }
    }
    return JSON.stringify({ list: uniqueList });
}

async function category(tid, pg, filter, extend) {
    let p = pg || 1;
    let url = host + "/vodshow/" + tid + "--------" + p + "---/";
    let resp = await req(url, { headers: headers });
    if (!resp || !resp.content) return JSON.stringify({ page: p, pagecount: 0, list: [] });
    let list = getList(resp.content);
    const uniqueList = [], seenIds = new Set();
    for (const item of list) {
        if (!seenIds.has(item.vod_id)) {
            seenIds.add(item.vod_id);
            uniqueList.push(item);
        }
    }
    return JSON.stringify({ page: parseInt(p), pagecount: 999, list: uniqueList });
}

async function detail(id) {
    let url = host + '/voddetail/' + id + '/';
    let resp = await req(url, { headers: headers });
    if (!resp || !resp.content) return JSON.stringify({ list: [] });
    let detailInfo = parseDetail(resp.content, id);
    return JSON.stringify({ list: [detailInfo] });
}

async function search(wd, quick, pg) {
    let p = pg || 1;
    let url = host + "/search/" + encodeURIComponent(wd) + "/" + (parseInt(p) > 1 ? p + "/" : "");
    let resp = await req(url, { headers: headers });
    if (!resp || !resp.content) return JSON.stringify({ page: p, list: [] });
    let list = getList(resp.content);
    const uniqueList = [], seenIds = new Set();
    for (const item of list) {
        if (!seenIds.has(item.vod_id)) {
            seenIds.add(item.vod_id);
            uniqueList.push(item);
        }
    }
    return JSON.stringify({ page: parseInt(p), list: uniqueList });
}

async function play(flag, id, flags) {
    try {
        let playUrl = "";
        
        if (typeof id === 'string') {
            if (id.includes("https://www.haigui.tv/vodplay/")) {
                playUrl = id;
            } 
            else if (id.includes("$")) {
                const parts = id.split("$");
                if (parts.length >= 2) playUrl = parts[1];
            }
            else if (id.match(/^\d+-\d+-\d+$/)) {
                playUrl = `${host}/vodplay/${id}/`;
            }
            else {
                playUrl = `${host}/vodplay/${id}-1-1/`;
            }
        }
        
        const html = await getPlayPageWithRetry(playUrl);
        
        if (html) {
            const realUrl = tryExtractPlayUrl(html);
            if (realUrl) {
                return JSON.stringify({ 
                    parse: 0,
                    url: realUrl, 
                    header: {
                        "User-Agent": headers["User-Agent"],
                        "Referer": playUrl,
                        "Origin": host
                    }
                });
            }
        }
        
        const isVipLine = playUrl.includes('-2-') || playUrl.includes('-3-');
        return JSON.stringify({ 
            parse: 1,
            jx: "0",
            url: playUrl, 
            header: {
                "User-Agent": headers["User-Agent"],
                "Referer": host + "/",
                "Origin": host
            },
            extra: {
                waitTime: isVipLine ? 12000 : 8000,
                loadJs: 1,
                webView: 1,
                adSkip: 1,
                playType: isVipLine ? "vip" : "normal"
            }
        });
        
    } catch (error) {
        return JSON.stringify({ 
            parse: 1, 
            jx: "0",
            url: `${host}/vodplay/${id}-1-1/`, 
            header: headers
        });
    }
}

export default { init, home, homeVod, category, detail, search, play };