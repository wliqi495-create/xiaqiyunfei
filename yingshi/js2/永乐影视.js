const host = 'https://www.ylys.tv';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': host
};

// ========== 工具函数 ==========
function fixUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return host + (path.startsWith('/') ? '' : '/') + path;
}

function stripTags(str) {
    return str.replace(/<[^>]+>/g, '').trim();
}

// 解析列表页（通用：推荐、分类、搜索）
function parseList(html) {
    const videos = [];
    // 原规则 parseList 中的正则：匹配 a href="/voddetail/数字/" ... data-original="图片"
    const itemRegex = /<a[^>]*href="\/voddetail\/(\d+)\/"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*module-item-note[^"]*"[^>]*>([^<]*)<\/div>[\s\S]*?data-original="([^"]+)"/gi;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
        videos.push({
            vod_id: '/voddetail/' + match[1] + '/',
            vod_name: match[2].trim(),
            vod_pic: fixUrl(match[4]),
            vod_remarks: match[3].trim()
        });
    }
    return videos;
}

// 提取分页总页数（永乐视频使用类似 page-link 的分页）
function extractPageCount(html) {
    let max = 1;
    // 匹配分页链接中的页码
    const pageRegex = /<a[^>]*href="[^"]*-(\d+)---[^"]*"[^>]*>(\d+)<\/a>/gi;
    let match;
    while ((match = pageRegex.exec(html)) !== null) {
        const num = parseInt(match[1] || match[2]);
        if (!isNaN(num) && num > max) max = num;
    }
    // 若没匹配到，尝试匹配 /page/数字
    if (max === 1) {
        const altRegex = /<a[^>]*href="[^"]*\/page\/(\d+)[^"]*"/gi;
        let altMatch;
        while ((altMatch = altRegex.exec(html)) !== null) {
            const num = parseInt(altMatch[1]);
            if (!isNaN(num) && num > max) max = num;
        }
    }
    return max;
}

// ========== 接口实现 ==========
async function init(cfg) {
    return JSON.stringify({});
}

async function home(filter) {
    try {
        const classes = [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '剧集' },
            { type_id: '3', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' }
        ];
        // 筛选器定义（与 drpy 规则保持一致）
        const filters = {
            '1': [
                { key: 'class', name: '类型', value: [
                    { n: '全部', v: '' }, { n: '动作片', v: '6' }, { n: '喜剧片', v: '7' },
                    { n: '爱情片', v: '8' }, { n: '科幻片', v: '9' }, { n: '恐怖片', v: '11' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' },
                    ...Array.from({ length: 15 }, (_, i) => ({ n: `${2025 - i}`, v: `${2025 - i}` }))
                ]}
            ],
            '2': [
                { key: 'class', name: '类型', value: [
                    { n: '全部', v: '' }, { n: '国产剧', v: '13' }, { n: '港台剧', v: '14' },
                    { n: '日剧', v: '15' }, { n: '韩剧', v: '33' }, { n: '欧美剧', v: '16' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' },
                    ...Array.from({ length: 15 }, (_, i) => ({ n: `${2025 - i}`, v: `${2025 - i}` }))
                ]}
            ],
            '3': [
                { key: 'class', name: '类型', value: [
                    { n: '全部', v: '' }, { n: '内地综艺', v: '27' }, { n: '港台综艺', v: '28' },
                    { n: '日本综艺', v: '29' }, { n: '韩国综艺', v: '36' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' },
                    ...Array.from({ length: 15 }, (_, i) => ({ n: `${2025 - i}`, v: `${2025 - i}` }))
                ]}
            ],
            '4': [
                { key: 'class', name: '类型', value: [
                    { n: '全部', v: '' }, { n: '国产动漫', v: '31' }, { n: '日本动漫', v: '32' },
                    { n: '欧美动漫', v: '42' }, { n: '其他动漫', v: '43' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' },
                    ...Array.from({ length: 15 }, (_, i) => ({ n: `${2025 - i}`, v: `${2025 - i}` }))
                ]}
            ]
        };
        return JSON.stringify({ class: classes, filters: filters });
    } catch (e) {
        return JSON.stringify({ class: [] });
    }
}

async function homeVod() {
    try {
        const r = await req(host, { headers });
        const list = parseList(r.content);
        return JSON.stringify({ list });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, extend = {}) {
    try {
        let page = parseInt(pg) || 1;
        // 构建 URL：/vodshow/分类--------页码---年份/
        const classId = extend.class || tid;
        const year = extend.year || '';
        let url = `${host}/vodshow/${classId}--------${page}---${year}/`;
        if (!year) url = url.replace(/---$/, '---'); // 保持格式

        const r = await req(url, { headers });
        const list = parseList(r.content);
        const pagecount = extractPageCount(r.content);

        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            limit: list.length,
            total: list.length,
            list: list
        });
    } catch (e) {
        return JSON.stringify({ page: pg || 1, pagecount: 0, list: [] });
    }
}

async function detail(id) {
    try {
        const url = id.startsWith('http') ? id : host + id;
        const r = await req(url, { headers });
        const html = r.content;

        // 标题
        const titleMatch = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
        const vod_name = titleMatch ? titleMatch[1].trim() : '未知标题';

        // 封面
        let vod_pic = '';
        const picMatch = html.match(/data-original="([^"]+)"/i);
        if (picMatch) vod_pic = fixUrl(picMatch[1]);
        else {
            const imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
            if (imgMatch) vod_pic = fixUrl(imgMatch[1]);
        }

        // 简介
        let vod_content = '';
        const introMatch = html.match(/introduction-content"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
        if (introMatch) vod_content = stripTags(introMatch[1]);
        if (!vod_content) vod_content = '暂无简介';

        // 年份
        let vod_year = '';
        const yearMatch = html.match(/href="\/vodshow\/\d+-----------(\d{4})\//);
        if (yearMatch) vod_year = yearMatch[1];

        // 导演
        let vod_director = '';
        const dirMatch = html.match(/导演：.*?<a[^>]*>([^<]+)<\/a>/i);
        if (dirMatch) vod_director = dirMatch[1].trim();

        // 主演
        const actorMatches = [...html.matchAll(/主演：.*?<a[^>]*>([^<]+)<\/a>/gi)];
        const vod_actor = actorMatches.map(m => m[1].trim()).join(' / ');

        // 播放线路与地址
        const tabNames = [];
        const tabUrls = [];

        // 线路名：.module-tab-item span
        const tabRegex = /<div[^>]*class="[^"]*module-tab-item[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/gi;
        let tabMatch;
        while ((tabMatch = tabRegex.exec(html)) !== null) {
            tabNames.push(tabMatch[1].trim());
        }

        // 播放列表：.module-play-list-content
        const listRegex = /<div[^>]*class="[^"]*module-play-list-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>)?/gi;
        const playLists = [];
        let listMatch;
        while ((listMatch = listRegex.exec(html)) !== null) {
            playLists.push(listMatch[1]);
        }

        for (let i = 0; i < tabNames.length; i++) {
            const urls = [];
            if (i < playLists.length) {
                const aRegex = /<a[^>]*href="\/play\/([^\/]+)\/"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/gi;
                let aMatch;
                while ((aMatch = aRegex.exec(playLists[i])) !== null) {
                    const name = aMatch[2].trim();
                    const vid = aMatch[1];
                    if (name && vid) urls.push(`${name}$${vid}`);
                }
            }
            tabUrls.push(urls.join('#'));
        }

        const vodInfo = {
            vod_id: id,
            vod_name: vod_name,
            vod_pic: vod_pic,
            vod_content: vod_content,
            vod_year: vod_year,
            vod_director: vod_director,
            vod_actor: vod_actor,
            vod_remarks: '',
            vod_play_from: tabNames.join('$$$'),
            vod_play_url: tabUrls.join('$$$'),
            type_name: ''
        };

        return JSON.stringify({ list: [vodInfo] });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function search(wd, quick, pg = 1) {
    try {
        const page = parseInt(pg) || 1;
        const url = `${host}/vodsearch/${encodeURIComponent(wd)}----------${page}---/`;
        const r = await req(url, { headers });
        const html = r.content;

        // 搜索页使用 .module-card-item.module-item
        const items = [];
        const itemRegex = /<div[^>]*class="[^"]*module-card-item[^"]*module-item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
        let match;
        while ((match = itemRegex.exec(html)) !== null) {
            const block = match[1];
            // 标题
            let title = '';
            const titleMatch = block.match(/<a[^>]*class="[^"]*module-card-item-title[^"]*"[^>]*>([^<]*)<\/a>/i);
            if (titleMatch) title = titleMatch[1].trim();
            // 链接
            let link = '';
            const hrefMatch = block.match(/<a[^>]*href="(\/voddetail\/\d+\/)"/i);
            if (hrefMatch) link = hrefMatch[1];
            // 图片
            let pic = '';
            const picMatch = block.match(/data-original="([^"]+)"/i) || block.match(/<img[^>]*src="([^"]+)"/i);
            if (picMatch) pic = fixUrl(picMatch[1]);
            // 备注
            let remarks = '';
            const noteMatch = block.match(/<div[^>]*class="[^"]*module-item-note[^"]*"[^>]*>([^<]*)<\/div>/i);
            if (noteMatch) remarks = noteMatch[1].trim();

            if (title && link) {
                items.push({
                    vod_id: link,
                    vod_name: title,
                    vod_pic: pic,
                    vod_remarks: remarks
                });
            }
        }

        const pagecount = extractPageCount(html) || 1;
        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            list: items
        });
    } catch (e) {
        return JSON.stringify({ page: pg, list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const vid = id; // 这里的 id 是集数的 vid，形如数字或字符串
        const url = `${host}/play/${vid}/`;
        const r = await req(url, { headers });
        const html = r.content;

        // 从页面中提取 m3u8 地址
        const m3u8Match = html.match(/"url":"([^"]+\.m3u8)"/);
        if (m3u8Match && m3u8Match[1]) {
            const m3u8 = m3u8Match[1].replace(/\\/g, '');
            return JSON.stringify({
                parse: 0,
                url: m3u8,
                header: headers
            });
        }

        // 如果未找到 m3u8，则返回页面 URL 让壳子自行解析
        return JSON.stringify({
            parse: 1,
            url: url,
            header: headers
        });
    } catch (e) {
        return JSON.stringify({ parse: 0, url: id });
    }
}

export default {
    init: init,
    home: home,
    homeVod: homeVod,
    category: category,
    detail: detail,
    search: search,
    play: play
};