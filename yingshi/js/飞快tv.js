/**
 * 飞快TV - Init.JsServer 最终调试版（通过返回JSON的debug字段记录失败原因）
 */

var HOST = 'https://feikuai.tv';

// ================= 自备 Base64 解码（纯JS实现） =================
function base64Decode(str) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    str = str.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < str.length) {
        enc1 = keyStr.indexOf(str.charAt(i++));
        enc2 = keyStr.indexOf(str.charAt(i++));
        enc3 = keyStr.indexOf(str.charAt(i++));
        enc4 = keyStr.indexOf(str.charAt(i++));
        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;
        output += String.fromCharCode(chr1);
        if (enc3 != 64) output += String.fromCharCode(chr2);
        if (enc4 != 64) output += String.fromCharCode(chr3);
    }
    return output;
}

// ================= 辅助工具函数 =================
function pd(html, sel, baseUrl) {
    var src = pdfh(html, sel);
    if (src && !src.startsWith('http')) {
        if (src.startsWith('//')) return 'https:' + src;
        if (src.startsWith('/')) return baseUrl + src;
    }
    return src;
}

function parsePosterItem(it) {
    return {
        vod_id: pd(it, 'a&&href', HOST),
        vod_name: pdfh(it, 'a&&title') || pdfh(it, '.module-poster-item-title&&Text'),
        vod_pic: pd(it, 'img&&data-original', HOST) || pd(it, 'img&&src', HOST),
        vod_remarks: pdfh(it, '.module-item-note&&Text')
    };
}

// ================= 主逻辑 =================
var spider = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': HOST + '/'
    },

    init: async function(cfg) { return true; },

    home: async function(filter) {
        return JSON.stringify({ class: [
            { type_id: '1', type_name: '电影' },
            { type_id: '2', type_name: '剧集' },
            { type_id: '3', type_name: '综艺' },
            { type_id: '4', type_name: '动漫' }
        ]});
    },

    homeVod: async function() {
        try {
            var r = await req(HOST, { headers: this.headers });
            var html = r.content || "";
            var items = pdfa(html, '.module-poster-items-base .module-poster-item');
            var list = items.map(it => parsePosterItem(it));
            return JSON.stringify({ list: list });
        } catch (e) {
            return JSON.stringify({ list: [] });
        }
    },

    category: async function(tid, pg, filter, extend) {
        var p = pg || 1;
        var url = HOST + '/vodshow/' + tid + '--------' + p + '---.html';
        var r = await req(url, { headers: this.headers });
        var html = r.content || "";
        var items = pdfa(html, '.module-poster-items-base .module-poster-item');
        var list = items.map(it => parsePosterItem(it)).filter(it => it.vod_name);
        return JSON.stringify({ page: parseInt(p), list: list });
    },

    detail: async function(id) {
        var url = id.startsWith('http') ? id : (HOST + id);
        var videoId = (url.match(/\/(\d+)\.html/) || [])[1];
        var r = await req(url, { headers: this.headers });
        var html = r.content || "";
        
        var vod = {
            vod_id: id,
            vod_name: pdfh(html, '.module-info-heading h1&&Text'),
            vod_pic: pd(html, '.lazyload&&data-original', url),
            type_name: pdfh(html, '.module-info-tag-link a:eq(2)&&Text'),
            vod_year: pdfh(html, '.module-info-tag-link a:eq(0)&&Text'),
            vod_area: pdfh(html, '.module-info-tag-link a:eq(1)&&Text'),
            vod_actor: pdfh(html, '.module-info-item:contains("主演：") .module-info-item-content&&Text'),
            vod_director: pdfh(html, '.module-info-item:contains("导演：") .module-info-item-content&&Text'),
            vod_content: pdfh(html, '.module-info-introduction-content p&&Text'),
            vod_remarks: pdfh(html, '.module-info-item:contains("片长：") .module-info-item-content&&Text')
        };

        var tabs = pdfa(html, '#y-playList .module-tab-item.tab-item');
        var playFrom = [];
        var playUrls = [];

        tabs.forEach((tab, i) => {
            var fromName = pdfh(tab, 'span&&Text').trim() || ("线路" + (i + 1));
            playFrom.push(fromName);
            
            var eps = pdfa(html, '.module-play-list:eq(' + i + ') a');
            var urls = eps.map((ep, j) => {
                var name = pdfh(ep, '&&Text') || pdfh(ep, 'a&&Text') || pdfh(ep, 'span&&Text') || '';
                name = name.trim();
                if (!name) {
                    name = pdfh(ep, 'a&&title') || pdfh(ep, 'span&&title') || '';
                    name = name.trim();
                }
                if (!name) name = '第' + (j + 1) + '集';
                return name + '$' + videoId + '|' + i + '|' + j;
            });
            if (urls.length === 0) {
                urls.push('播放$' + videoId + '|' + i + '|0');
            }
            playUrls.push(urls.join('#'));
        });

        vod.vod_play_from = playFrom.join('$$$');
        vod.vod_play_url = playUrls.join('$$$');

        return JSON.stringify({ list: [vod] });
    },

    search: async function(wd) {
        var url = HOST + '/vodsearch/-------------.html?wd=' + encodeURIComponent(wd);
        var r = await req(url, { headers: this.headers });
        var html = r.content || "";
        var items = pdfa(html, '#resultList .module-card-item');
        var list = items.map(it => ({
            vod_id: pd(it, '.module-card-item-poster&&href', HOST),
            vod_name: pdfh(it, '.module-card-item-title&&Text'),
            vod_pic: pd(it, 'img&&data-original', HOST),
            vod_remarks: pdfh(it, '.module-info-item-content&&Text')
        }));
        return JSON.stringify({ list: list });
    },

    // ================= 带调试信息的 play 函数 =================
    play: async function(flag, id) {
        var parts = id.split('|');
        if (parts.length < 3) {
            return JSON.stringify({ parse: 0, url: id, debug: 'id format error' });
        }

        var videoId = parts[0];
        var lineIndex = parseInt(parts[1]) + 1;
        var epIndex = parseInt(parts[2]) + 1;
        var playUrl = HOST + '/vodplay/' + videoId + '-' + lineIndex + '-' + epIndex + '.html';

        var r = await req(playUrl, { headers: this.headers });
        var html = r.content || "";

        // 尝试匹配 player_xxx = {...} 对象
        var match = html.match(/player_[a-z0-9_]+\s*=\s*(\{[\s\S]*?\});/i);
        if (!match) {
            // 没有匹配，返回parse:1，并附带调试信息
            return JSON.stringify({ 
                parse: 1, 
                url: playUrl, 
                header: { 'User-Agent': this.headers['User-Agent'], 'Referer': playUrl },
                debug: 'player config not found' 
            });
        }

        try {
            var config = JSON.parse(match[1]);
            var url = config.url;
            if (!url) {
                return JSON.stringify({ 
                    parse: 1, 
                    url: playUrl, 
                    header: this.headers,
                    debug: 'url empty in config' 
                });
            }

            // 根据 encrypt 解密
            if (config.encrypt == '1') {
                url = unescape(url);
            } else if (config.encrypt == '2') {
                // 根据页面实际情况：先 URL 解码，再 Base64 解码
                url = decodeURIComponent(url);
                url = base64Decode(url);
            }

            if (!url) {
                return JSON.stringify({ 
                    parse: 1, 
                    url: playUrl, 
                    header: this.headers,
                    debug: 'decoded url empty' 
                });
            }

            // 补全相对路径
            if (!url.startsWith('http')) {
                if (url.startsWith('//')) {
                    url = 'https:' + url;
                } else if (url.startsWith('/')) {
                    url = HOST + url;
                }
            }

            return JSON.stringify({
                parse: 0,
                url: url,
                header: { 'User-Agent': this.headers['User-Agent'], 'Referer': playUrl }
            });
        } catch (e) {
            return JSON.stringify({ 
                parse: 1, 
                url: playUrl, 
                header: this.headers,
                debug: 'exception: ' + e.message 
            });
        }
    }
};

export default spider;