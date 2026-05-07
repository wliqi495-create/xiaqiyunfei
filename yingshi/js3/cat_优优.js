import { _ } from 'assets://js/lib/cat.js';

const host = 'https://www.youku.com';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1';

async function init(cfg) {}

async function request(url) {
    const res = await req(url, {
        method: 'get',
        headers: {
            'User-Agent': UA,
            'Referer': 'https://www.youku.com/'
        }
    });
    return JSON.parse(res.content);
}

// 首页分类：修正为优酷 H5 标准频道 ID
async function home() {
    const classes = [
        { type_id: '97', type_name: '电视剧' },
        { type_id: '96', type_name: '电影' },
        { type_id: '85', type_name: '综艺' },
        { type_id: '100', type_name: '动漫' },
        { type_id: '148', type_name: '少儿' },
        { type_id: '103', type_name: '纪录片' },
        { type_id: '173', type_name: '文化' },
        { type_id: '174', type_name: '亲子' },
        { type_id: '101', type_name: '教育' },
        { type_id: '161', type_name: '搞笑' },
        { type_id: '162', type_name: '生活' },
        { type_id: '91', type_name: '体育' },
        { type_id: '105', type_name: '音乐' },
        { type_id: '104', type_name: '游戏' }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() { return JSON.stringify({ list: [] }); }

// 分类页面：使用 channelId 模式
async function category(tid, pg, filter, extend) {
    const page = parseInt(pg);
    
    // 优酷 pouch 接口：pageNo 从 0 开始
    const url = `https://p-api.youku.com/pouch/channel/data?channelId=${tid}&pageNo=${page - 1}&pageSize=15`;

    try {
        const res = await request(url);
        
        // 优酷 pouch 接口的数据结构解析
        let nodes = [];
        if (res.data && res.data.nodes) {
            nodes = res.data.nodes;
        } else if (res.model && res.model.nodes) {
            nodes = res.model.nodes;
        }

        let list = [];
        nodes.forEach(node => {
            // 过滤出包含视频数据的节点
            if (node.nodes) {
                node.nodes.forEach(subNode => {
                    if (subNode.data && subNode.data.title) {
                        const d = subNode.data;
                        let vid = "";
                        
                        // 尝试提取 showId (剧集 ID)
                        if (d.action && d.action.extra && d.action.extra.showId) {
                            vid = d.action.extra.showId;
                        } else if (d.videoLink && d.videoLink.includes("id_")) {
                            vid = d.videoLink.split("id_")[1].split(".html")[0];
                        }

                        if (vid) {
                            list.push({
                                vod_id: vid,
                                vod_name: d.title,
                                vod_pic: d.img.startsWith('//') ? 'https:' + d.img : d.img,
                                vod_remarks: d.summary || d.subTitle || d.subtitle || ""
                            });
                        }
                    }
                });
            } else if (node.data && node.data.title) {
                // 扁平结构解析
                const d = node.data;
                let vid = (d.action && d.action.extra) ? d.action.extra.showId : "";
                if (vid) {
                    list.push({
                        vod_id: vid,
                        vod_name: d.title,
                        vod_pic: d.img.startsWith('//') ? 'https:' + d.img : d.img,
                        vod_remarks: d.summary || d.subTitle || ""
                    });
                }
            }
        });

        // 如果该频道没有数据（可能是 ID 变动），尝试保底逻辑
        if (list.length === 0) {
            return await searchCategoryFallback(tid, page);
        }

        return JSON.stringify({ page: page, list: list });
    } catch (e) {
        return await searchCategoryFallback(tid, page);
    }
}

// 保底逻辑：如果频道接口失效，直接调用搜索接口查询分类名
async function searchCategoryFallback(tid, page) {
    const names = {
        '97': '电视剧', '96': '电影', '85': '综艺', '100': '动漫', 
        '148': '少儿', '103': '纪录片', '173': '文化', '174': '亲子',
        '101': '教育', '161': '搞笑', '162': '生活', '91': '体育',
        '105': '音乐', '104': '游戏'
    };
    const keyword = names[tid] || "精选";
    const url = `https://search.youku.com/api/search?pg=${page}&keyword=${encodeURIComponent(keyword)}`;
    const res = await request(url);
    const list = (res.pageComponentList || []).filter(it => it.commonData).map(it => {
        const d = it.commonData;
        return {
            vod_id: d.showId,
            vod_name: d.titleDTO.displayName,
            vod_pic: d.posterDTO.vThumbUrl,
            vod_remarks: d.stripeBottom
        };
    });
    return JSON.stringify({ page: page, list: list });
}

async function detail(id) {
    // 详情逻辑统一使用 search.youku.com 接口
    const url = `https://search.youku.com/api/search?appScene=show_episode&showIds=${id}`;
    const res = await request(url);
    const video_lists = res.serisesList || [];
    const vod = {
        vod_id: id,
        vod_name: video_lists.length > 0 ? video_lists[0].title.replace(/(\d+)/g, "") : "影片详情",
        vod_pic: video_lists.length > 0 ? video_lists[0].thumbUrl : "",
        vod_play_from: '优酷',
        vod_play_url: video_lists.map(it => {
            const ep = it.showVideoStage ? it.showVideoStage.replace("期", "集") : it.displayName || it.title;
            return `${ep}$https://v.youku.com/v_show/id_${it.videoId}.html`;
        }).join('#')
    };
    return JSON.stringify({ list: [vod] });
}

async function play(flag, id, flags) {
    const privateApi = 'https://jx.xmflv.cc/?url=';
    try {
        const res = await req(privateApi + encodeURIComponent(id), { headers: { 'User-Agent': UA } });
        const json = JSON.parse(res.content);
        if (json.url || (json.data && json.data.url)) {
            return JSON.stringify({ parse: 0, url: json.url || json.data.url });
        }
    } catch (e) {}
    return JSON.stringify({ parse: 1, jx: 1, url: id });
}

async function search(wd, quick) {
    const url = `https://search.youku.com/api/search?pg=1&keyword=${encodeURIComponent(wd)}`;
    const res = await request(url);
    const list = (res.pageComponentList || []).filter(it => it.commonData).map(it => {
        const d = it.commonData;
        return {
            vod_id: d.showId,
            vod_name: d.titleDTO.displayName,
            vod_pic: d.posterDTO.vThumbUrl,
            vod_remarks: d.stripeBottom
        };
    });
    return JSON.stringify({ list: list });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search };
}