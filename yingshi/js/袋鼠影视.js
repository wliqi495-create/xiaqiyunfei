const host = 'https://daishuys.com';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Referer': host
};

// ========== 工具函数 ==========

// 简易 HTML 解码
function decodeHtml(html) {
    return html.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
}

// 补全 URL
function fixUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return host + (path.startsWith('/') ? '' : '/') + path;
}

// 提取单个正则匹配组
function matchOne(str, regex, group = 1) {
    const m = str.match(regex);
    return m ? m[group].trim() : '';
}

// 清理标签，只留文本
function stripTags(str) {
    return str.replace(/<[^>]+>/g, '').trim();
}

// ========== 列表解析（只修正了封面提取逻辑） ==========

function parseList(html) {
    const items = [];
    
    // 匹配每个 li.col-md-2（包含整个标签内容）
    const itemRegex = /<li[^>]*class="[^"]*col-md-2[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    
    while ((match = itemRegex.exec(html)) !== null) {
        const block = match[1];
        
        // 1. 标题：原规则 .title h5 a&&Text
        let title = '';
        const titleDiv = block.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (titleDiv) {
            const h5a = titleDiv[1].match(/<h5[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>/i);
            if (h5a) title = decodeHtml(h5a[1].trim());
        }
        if (!title) {
            // 尝试从 a 标签的 title 属性获取
            const aTitle = block.match(/<a[^>]*title="([^"]*)"[^>]*>/i);
            if (aTitle) title = decodeHtml(aTitle[1].trim());
        }
        if (!title) {
            // 再尝试从 h5 内任意 a 获取
            const h5Any = block.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
            if (h5Any) {
                const aText = h5Any[1].match(/<a[^>]*>([^<]*)<\/a>/i);
                if (aText) title = decodeHtml(aText[1].trim());
            }
        }
        
        // 2. 链接：原规则 a.videopic&&href
        let link = '';
        const videopicLink = block.match(/<a[^>]*class="[^"]*videopic[^"]*"[^>]*href="([^"]*)"[^>]*>/i);
        if (videopicLink) {
            link = videopicLink[1];
        } else {
            const anyLink = block.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
            if (anyLink) link = anyLink[1];
        }
        
        // 3. 图片：原规则 a.videopic&&data-original（修正此处，直接从 a 标签上获取 data-original）
        let pic = '';
        // 优先从 a.videopic 的 data-original 属性提取（真实HTML中 data-original 在 a 标签上）
        const videopicDataOrig = block.match(/<a[^>]*class="[^"]*videopic[^"]*"[^>]*data-original="([^"]*)"[^>]*>/i);
        if (videopicDataOrig) {
            pic = videopicDataOrig[1];
        } else {
            // 降级：找 a.videopic 内部 img 的 data-original 或 src
            const videopicBlock = block.match(/<a[^>]*class="[^"]*videopic[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
            if (videopicBlock) {
                const inner = videopicBlock[1];
                const imgDataOrig = inner.match(/<img[^>]*data-original="([^"]*)"[^>]*>/i);
                if (imgDataOrig) {
                    pic = imgDataOrig[1];
                } else {
                    const imgSrc = inner.match(/<img[^>]*src="([^"]*)"[^>]*>/i);
                    if (imgSrc) pic = imgSrc[1];
                }
            }
        }
        // 再降级：从任意位置找 data-original 或 img src
        if (!pic) {
            const anyDataOrig = block.match(/data-original="([^"]*)"/i);
            if (anyDataOrig) pic = anyDataOrig[1];
            else {
                const imgSrc = block.match(/<img[^>]*src="([^"]*)"[^>]*>/i);
                if (imgSrc) pic = imgSrc[1];
            }
        }
        
        // 4. 备注：原规则 .note&&Text
        let remarks = '';
        const noteMatch = block.match(/<span[^>]*class="[^"]*note[^"]*"[^>]*>([^<]*)<\/span>/i);
        if (noteMatch) remarks = noteMatch[1].trim();
        
        if (title && link) {
            items.push({
                vod_id: fixUrl(link),
                vod_name: title,
                vod_pic: fixUrl(pic),
                vod_remarks: remarks
            });
        }
    }
    
    return items;
}

// 提取分页总页数（修复：增强正则兼容性，确保正确识别页码）
function extractPageCount(html) {
    let max = 1;
    // 匹配所有可能的页码链接：支持 page=数字 或 直接以数字结尾的链接
    const pageRegex = /<a[^>]*href="[^"]*[?&]page=(\d+)[^"]*"[^>]*>(\d+)<\/a>/gi;
    let match;
    while ((match = pageRegex.exec(html)) !== null) {
        const pageNum = parseInt(match[1] || match[2]);
        if (!isNaN(pageNum) && pageNum > max) max = pageNum;
    }
    // 如果没匹配到，尝试匹配 .pagination 内的最后一个数字链接（如尾页）
    if (max === 1) {
        const lastPageMatch = html.match(/<a[^>]*href="[^"]*page=(\d+)[^"]*"[^>]*>尾页<\/a>/i) ||
                              html.match(/<a[^>]*href="[^"]*page=(\d+)[^"]*"[^>]*>末页<\/a>/i);
        if (lastPageMatch) max = parseInt(lastPageMatch[1]);
    }
    return max;
}

// ========== 壳子接口实现 ==========

async function init(cfg) {
    return JSON.stringify({});
}

async function home(filter) {
    try {
        const classes = [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '电视剧' },
            { type_id: '3', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' }
        ];
        const filters = {
            '1': [
                { key: 'tid', name: '类型', value: [
                    { n: '全部', v: '1' }, { n: '动作片', v: '5' }, { n: '喜剧片', v: '10' },
                    { n: '爱情片', v: '6' }, { n: '科幻片', v: '7' }, { n: '恐怖片', v: '8' },
                    { n: '战争片', v: '9' }, { n: '剧情片', v: '12' }, { n: '动画片', v: '41' },
                    { n: '纪录片', v: '11' }
                ]},
                { key: 'area', name: '地区', value: [
                    { n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '香港', v: '香港' },
                    { n: '台湾', v: '台湾' }, { n: '日本', v: '日本' }, { n: '韩国', v: '韩国' },
                    { n: '美国', v: '美国' }, { n: '英国', v: '英国' }, { n: '印度', v: '印度' },
                    { n: '法国', v: '法国' }, { n: '泰国', v: '泰国' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' },
                    { n: '2024', v: '2024' }, { n: '2023', v: '2023' }, { n: '2022', v: '2022' },
                    { n: '2021', v: '2021' }, { n: '2020', v: '2020' }
                ]}
            ],
            '2': [
                { key: 'tid', name: '类型', value: [
                    { n: '全部', v: '2' }, { n: '国产剧', v: '13' }, { n: '港台剧', v: '14' },
                    { n: '欧美剧', v: '15' }, { n: '日韩剧', v: '16' }
                ]},
                { key: 'area', name: '地区', value: [
                    { n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '香港', v: '香港' },
                    { n: '台湾', v: '台湾' }, { n: '日本', v: '日本' }, { n: '韩国', v: '韩国' },
                    { n: '美国', v: '美国' }, { n: '英国', v: '英国' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' },
                    { n: '2024', v: '2024' }, { n: '2023', v: '2023' }, { n: '2022', v: '2022' }
                ]}
            ],
            '3': [
                { key: 'area', name: '地区', value: [
                    { n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '日本', v: '日本' },
                    { n: '韩国', v: '韩国' }, { n: '美国', v: '美国' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' },
                    { n: '2024', v: '2024' }
                ]}
            ],
            '4': [
                { key: 'area', name: '地区', value: [
                    { n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '日本', v: '日本' },
                    { n: '韩国', v: '韩国' }, { n: '美国', v: '美国' }
                ]},
                { key: 'year', name: '年份', value: [
                    { n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' },
                    { n: '2024', v: '2024' }
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
        return JSON.stringify({ list: list });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function category(tid, pg, filter, extend = {}) {
    try {
        let page = parseInt(pg) || 1;
        let url = `${host}/search.php?searchtype=5&tid=${tid}&page=${page}`;
        if (extend && Object.keys(extend).length > 0) {
            const params = [];
            params.push('searchtype=5');
            params.push(`tid=${extend.tid || tid}`);
            params.push(`page=${page}`);
            if (extend.area) params.push(`area=${encodeURIComponent(extend.area)}`);
            if (extend.year) params.push(`year=${extend.year}`);
            url = `${host}/search.php?${params.join('&')}`;
        }
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
        
        // 标题：h1
        const title = matchOne(html, /<h1[^>]*>([^<]*)<\/h1>/i) || '未知标题';
        
        // 封面：a.videopic img src
        let pic = matchOne(html, /<a[^>]*class="[^"]*videopic[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"/i);
        if (!pic) pic = matchOne(html, /<img[^>]*src="([^"]*)"[^>]*>/i);
        
        // 简介：.plot
        let content = '';
        const plotMatch = html.match(/<div[^>]*class="[^"]*plot[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        if (plotMatch) content = stripTags(plotMatch[1]);
        
        // 备注：.note
        const remarks = matchOne(html, /<span[^>]*class="[^"]*note[^"]*"[^>]*>([^<]*)<\/span>/i);
        
        // 详细信息
        let actor = '', director = '', year = '', area = '';
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let liMatch;
        while ((liMatch = liRegex.exec(html)) !== null) {
            const liText = stripTags(liMatch[1]);
            if (liText.includes('主演')) {
                const aMatches = liMatch[1].match(/<a[^>]*>([^<]*)<\/a>/g);
                if (aMatches) {
                    const actors = aMatches.map(a => stripTags(a));
                    actor = actors.join(',');
                }
            } else if (liText.includes('导演')) {
                const aMatches = liMatch[1].match(/<a[^>]*>([^<]*)<\/a>/g);
                if (aMatches) {
                    const dirs = aMatches.map(a => stripTags(a));
                    director = dirs.join(',');
                }
            } else if (liText.includes('年份')) {
                year = liText.replace('年份：', '').trim();
            } else if (liText.includes('地区')) {
                area = liText.replace('地区：', '').trim();
            }
        }
        
        // 播放线路与集数
        const tabNames = [];
        const tabUrls = [];
        
        // 线路标签 a.option
        const tabRegex = /<a[^>]*class="[^"]*option[^"]*"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        let tabMatch;
        while ((tabMatch = tabRegex.exec(html)) !== null) {
            let name = tabMatch[1] || stripTags(tabMatch[2]).split(' ')[0];
            tabNames.push(name);
        }
        
        // 播放列表区块 .playlist ul
        const ulRegex = /<ul[^>]*class="[^"]*playlist[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
        const uls = [];
        let ulMatch;
        while ((ulMatch = ulRegex.exec(html)) !== null) {
            uls.push(ulMatch[1]);
        }
        
        for (let i = 0; i < tabNames.length; i++) {
            const urls = [];
            if (i < uls.length) {
                const aRegex = /<a[^>]*href="([^"]*)"[^>]*(?:title="([^"]*)")?[^>]*>([^<]*)<\/a>/gi;
                let aMatch;
                while ((aMatch = aRegex.exec(uls[i])) !== null) {
                    const name = aMatch[2] || aMatch[3].trim();
                    const link = aMatch[1];
                    if (name && link) {
                        urls.push(`${name}$${fixUrl(link)}`);
                    }
                }
            }
            tabUrls.push(urls.join('#'));
        }
        
        const vodInfo = {
            vod_id: id,
            vod_name: decodeHtml(title),
            vod_pic: fixUrl(pic),
            vod_content: content,
            vod_actor: actor,
            vod_director: director,
            vod_year: year,
            vod_area: area,
            vod_remarks: remarks,
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
        const r = await req(host + '/search.php', {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: `searchword=${encodeURIComponent(wd)}`
        });
        const list = parseList(r.content);
        const pagecount = extractPageCount(r.content) || 1;
        return JSON.stringify({
            page: page,
            pagecount: pagecount,
            list: list
        });
    } catch (e) {
        return JSON.stringify({ page: pg, list: [] });
    }
}

async function play(flag, id, flags) {
    try {
        const url = id.startsWith('http') ? id : host + id;
        const r = await req(url, { headers });
        const html = r.content;
        const match = html.match(/var now="([^"]+)"/);
        if (match && match[1]) {
            return JSON.stringify({
                parse: 0,
                url: match[1],
                header: headers
            });
        }
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