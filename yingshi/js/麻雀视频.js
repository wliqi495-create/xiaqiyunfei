import 'assets://js/lib/crypto-js.js';

const [HOST, KEY, USER_AGENT] = [
    "https://www.mqtv.cc",
    "Mcxos@mucho!nmme",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
];

const main_headers = {
    'User-Agent': USER_AGENT,
    'accept-language': 'zh-CN,zh;q=0.9',
    'x-requested-with': 'XMLHttpRequest'
};

/** --- 手工实现 Base64 编解码 (不依赖 CryptoJS) --- **/
const Base64Helper = {
    _chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    encode: function(input) {
        let output = "";
        let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        let i = 0;
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) enc3 = enc4 = 64;
            else if (isNaN(chr3)) enc4 = 64;
            output = output + this._chars.charAt(enc1) + this._chars.charAt(enc2) +
                     (enc3 === 64 ? "=" : this._chars.charAt(enc3)) +
                     (enc4 === 64 ? "=" : this._chars.charAt(enc4));
        }
        return output;
    },
    decode: function(input) {
        let output = "";
        let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        let i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (i < input.length) {
            enc1 = this._chars.indexOf(input.charAt(i++));
            enc2 = this._chars.indexOf(input.charAt(i++));
            enc3 = this._chars.indexOf(input.charAt(i++));
            enc4 = this._chars.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output += String.fromCharCode(chr1);
            if (enc3 !== 64) output += String.fromCharCode(chr2);
            if (enc4 !== 64) output += String.fromCharCode(chr3);
        }
        return output;
    }
};

/** --- 核心：使用原生 JS 重新实现 encodeToken --- **/
const encodeToken = (data) => {
    try {
        let jsonStr = JSON.stringify(data);
        // 1. 第一步：Base64 编码
        let b64_1 = Base64Helper.encode(jsonStr);
        
        // 2. 第二步：XOR 混淆
        let xor = "";
        for (let i = 0; i < b64_1.length; i++) {
            xor += String.fromCharCode(b64_1.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
        }
        
        // 3. 第三步：再次 Base64 编码并 URL 编码
        return encodeURIComponent(Base64Helper.encode(xor));
    } catch (e) {
        return "";
    }
};

const decodeData = (encodedStr) => {
    try {
        let b64_1 = Base64Helper.decode(decodeURIComponent(encodedStr));
        let xor = "";
        for (let i = 0; i < b64_1.length; i++) {
            xor += String.fromCharCode(b64_1.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
        }
        return JSON.parse(Base64Helper.decode(xor));
    } catch (e) {
        return {};
    }
};

/** --- 只有播放时的解密才使用 CryptoJS (届时库应该已经加载完毕) --- **/
const decryptUrl = (enc, viewportId, charsetId) => {
    if (typeof CryptoJS === 'undefined') return "";
    let list = [];
    for (let i = 0; i < charsetId.length; i++) {
        list.push({ id: parseInt(charsetId[i]), text: viewportId[i] || '' });
    }
    list.sort((a, b) => a.id - b.id);
    let seed = list.map(it => it.text).join('') + "lemon";
    let md5 = CryptoJS.MD5(seed).toString();
    let key = CryptoJS.enc.Utf8.parse(md5.substring(16));
    let iv = CryptoJS.enc.Utf8.parse(md5.substring(0, 16));
    return CryptoJS.AES.decrypt(enc, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString(CryptoJS.enc.Utf8);
};

/** --- 业务接口 --- **/

async function getAccessToken(path, ref = '') {
    const h = { ...main_headers };
    if (ref) h['referer'] = HOST + ref;
    const res = await req(HOST + path, { headers: h });
    const pageId = (res.content.match(/window\.pageid\s?=\s?'(.*?)';/i) || [])[1];
    return pageId ? encodeToken(pageId) : "";
}

async function init() { return true; }

async function home() {
    const classes = [
        { type_id: '/type/movie', type_name: '电影' },
        { type_id: '/type/tv', type_name: '电视剧' },
        { type_id: '/type/va', type_name: '综艺' },
        { type_id: '/type/ct', type_name: '动漫' }
    ];
    return JSON.stringify({ class: classes });
}

async function homeVod() {
    try {
        const token = await getAccessToken('/');
        const res = await req(`${HOST}/libs/VodList.api.php?home=index&token=${token}`, { 
            headers: { ...main_headers, referer: HOST + '/' } 
        });
        const json = JSON.parse(res.content);
        let list = [];
        (json.data.movie || []).forEach(i => {
            (i.show || []).forEach(v => list.push({ vod_id: v.url, vod_name: v.title, vod_pic: v.img, vod_remarks: v.remark }));
        });
        return JSON.stringify({ list });
    } catch (e) { return JSON.stringify({ list: [] }); }
}

async function category(tid, pg) {
    const token = await getAccessToken(tid, '/');
    const typeId = tid.split('/')[2];
    const url = `${HOST}/libs/VodList.api.php?type=${typeId}&rank=rankhot&cat=&year=&area=&page=${pg}&token=${token}`;
    const res = await req(url, { headers: { ...main_headers, referer: HOST + tid } });
    const json = JSON.parse(res.content);
    const list = (json.data || []).map(v => ({ vod_id: v.url, vod_name: v.title, vod_pic: v.img, vod_remarks: v.remark }));
    return JSON.stringify({ list, page: +pg });
}

async function detail(id) {
    const token = await getAccessToken(id, '/');
    const vid = id.split('/')[3];
    const url = `${HOST}/libs/VodInfo.api.php?type=ct&id=${vid}&token=${token}`;
    const res = await req(url, { headers: { ...main_headers, referer: HOST + id } });
    const data = JSON.parse(res.content).data;
    const parses = (data.playapi || []).map(i => i.url.startsWith('//') ? 'https:' + i.url : i.url).join(',');
    let playFrom = [], playUrl = [];
    (data.playinfo || []).forEach(j => {
        playFrom.push(j.cnsite);
        playUrl.push((j.player || []).map(k => `${k.no}$${k.url}@${parses}`).join('#'));
    });
    return JSON.stringify({
        list: [{
            vod_id: id, vod_name: data.title, vod_pic: data.img, vod_remarks: data.remark,
            vod_year: data.year, vod_area: data.area, vod_actor: data.actor,
            vod_director: data.director, vod_play_from: playFrom.join('$$$'), vod_play_url: playUrl.join('$$$')
        }]
    });
}

async function search(wd) {
    const path = `/search/${encodeURIComponent(wd)}`;
    const token = await getAccessToken(path, '/');
    const res = await req(`${HOST}/libs/VodList.api.php?search=${encodeURIComponent(wd)}&token=${token}`, { 
        headers: { ...main_headers, referer: HOST + path } 
    });
    const json = JSON.parse(res.content);
    const data = decodeData(json.data);
    let list = [];
    (data.vod_all || []).forEach(i => {
        (i.show || []).forEach(v => list.push({ vod_id: v.url, vod_name: v.title, vod_pic: v.img, vod_remarks: v.remark }));
    });
    return JSON.stringify({ list });
}

async function play(_, id) {
    const [rawUrl, parsesStr] = id.split('@');
    const parses = (parsesStr || "").split(',');
    let finalUrl = "", sniff = 0;
    for (const p of parses) {
        if (!p) continue;
        try {
            const r = await req(p + rawUrl, { headers: main_headers, timeout: 5000 });
            const html = r.content;
            const cId = (html.match(/meta\s+charset="UTF-8"\s+id\s*=\s*"now_(.*?)"/i) || [])[1];
            const vId = (html.match(/meta\s+name\s*=\s*"viewport".*?id\s*=\s*"now_(.*?)"/i) || [])[1];
            const encUrl = (html.match(/"url"\s*:\s*"(.*?)",/i) || [])[1];
            if (encUrl && cId && vId) {
                const dec = decryptUrl(encUrl, vId, cId);
                if (dec.startsWith('http')) { finalUrl = dec; break; }
            }
        } catch (e) {}
    }
    if (!finalUrl) {
        finalUrl = rawUrl.startsWith('http') ? rawUrl : (parses[0] + rawUrl);
        sniff = 1;
    }
    return JSON.stringify({ parse: sniff, url: finalUrl, header: { 'User-Agent': USER_AGENT } });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search };
}
