/**
 * 锦鲤短剧 - 解决“非法访问”修复版
 */

const baseUrl = 'https://api.jinlidj.com';
const UA = 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36';

async function init(cfg) { return ""; }

async function home() {
    return JSON.stringify({
        class: [
            { type_id: "1", type_name: "情感关系" },
            { type_id: "2", type_name: "成长逆袭" },
            { type_id: "3", type_name: "奇幻异能" },
            { type_id: "4", type_name: "战斗热血" },
            { type_id: "5", type_name: "伦理现实" },
            { type_id: "6", type_name: "时空穿越" },
            { type_id: "7", type_name: "权谋身份" }
        ]
    });
}

async function category(tid, pg, filter, extend) {
    const url = baseUrl + '/api/search';
    const response = await req(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ page: pg, limit: 24, type_id: tid })
    });
    const resData = typeof response.content === 'string' ? JSON.parse(response.content) : response.content;
    return JSON.stringify({ page: parseInt(pg) || 1, list: resData.data.list || [] });
}

async function detail(id) {
    const vodId = Array.isArray(id) ? id[0] : id;
    const url = baseUrl + '/api/detail/' + vodId;
    
    // 增加 Referer 模拟，有些短剧接口根据 Referer 下发不同的 Token
    const response = await req(url, {
        headers: { 
            'User-Agent': UA,
            'Referer': 'https://www.jinlidj.com/' 
        }
    });
    
    const resData = typeof response.content === 'string' ? JSON.parse(response.content) : response.content;
    const data = resData.data;
    
    const player = data.player || {};
    const playUrlParts = [];

    for (const key in player) {
        // 关键点：保持 &auto=1，这是原始脚本里有的，可能参与了 URL 校验
        playUrlParts.push(key.replace(/\$|#/g, ' ') + '$' + player[key] + '&auto=1');
    }
    
    return JSON.stringify({
        list: [{
            "vod_id": data.vod_id,
            "vod_name": data.vod_name,
            "vod_pic": data.vod_pic,
            "vod_play_from": "锦鲤短剧",
            "vod_play_url": playUrlParts.join('#')
        }]
    });
}

async function play(flag, id, flags) {
    // 如果浏览器提示非法访问，通常是因为缺少了 X-Requested-With 
    // 这个字段会让服务器认为你是在 App 的 WebView 里打开的
    return JSON.stringify({
        parse: 1,
        url: id,
        header: {
            'User-Agent': UA,
            'X-Requested-With': 'com.jinlidj.app', // 必须伪装成 App 包名
            'Referer': 'https://www.jinlidj.com/',
            'Origin': 'https://player.jinlidj.com'
        }
    });
}

async function search(wd, quick, pg) {
    const url = baseUrl + '/api/search';
    const response = await req(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
        body: JSON.stringify({ page: pg, limit: 24, keyword: wd })
    });
    const resData = typeof response.content === 'string' ? JSON.parse(response.content) : response.content;
    return JSON.stringify({ page: parseInt(pg) || 1, list: resData.data.list || [] });
}

export default { home, category, detail, search, play };
