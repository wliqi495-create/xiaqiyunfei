/**
 * @config
 * timeout: 30
 * blockImages: true
 * ua: mobile
 * header: {"Referer":"https://a123tv.com"}
 * blockList: *.ico*|*google*|*analytics*
 * keyword: Checking your browser|Just a moment|请稍候
 */

const BASE_URL = 'https://a123tv.com';

// 工具函数
function safeText(el) {
    if (!el) return '';
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
}

function getCover(el) {
    var figure = el.querySelector('.w4-item-cover');
    var img = figure ? figure.querySelector('img') : el.querySelector('img');
    if (!img) return '';
    var pic = img.getAttribute('data-src') || img.getAttribute('src') || '';
    if (pic.indexOf('//') === 0) pic = 'https:' + pic;
    return pic;
}

function extractList(doc) {
    var items = doc.querySelectorAll('a.w4-item');
    var list = [];
    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var link = el.getAttribute('href') || '';
        list.push({
            vod_id: link,
            vod_name: safeText(el.querySelector('.w4-item-info .t')),
            vod_pic: getCover(el),
            vod_remarks: safeText(el.querySelector('.w4-item-cover .r')) || safeText(el.querySelector('.w4-item-cover .s'))
        });
    }
    return list;
}

// ========== 首页分类（从导航栏提取顶级分类，并抓取每个分类的子筛选） ==========
async function homeContent(filter) {
    // 1. 先拿首页，提取顶级分类
    var res = await fetch(BASE_URL + '/', { returnType: 'dom' });
    if (res.error || !res.doc) return Result.error(res.error || '请求失败');

    var navLinks = res.doc.querySelectorAll('.w4-nav a');
    var cats = [];
    for (var i = 0; i < navLinks.length; i++) {
        var a = navLinks[i];
        var href = a.getAttribute('href') || '';
        // 排除首页
        if (href === '/' || href === '') continue;
        var match = href.match(/\/t\/(\d+)\.html/);
        if (match) {
            cats.push({ type_id: match[1], type_name: safeText(a) });
        }
    }

    // 2. 为每个顶级分类抓取子分类，构造筛选器
    var filters = {};
    for (var k = 0; k < cats.length; k++) {
        var typeId = cats[k].type_id;
        var subRes = await fetch(BASE_URL + '/t/' + typeId + '.html', { returnType: 'dom' });
        if (subRes.error || !subRes.doc) {
            filters[typeId] = []; // 失败则空筛选
            continue;
        }

        var metaLinks = subRes.doc.querySelectorAll('.w4-meta a');
        var options = [{ n: '全部', v: '' }];  // 默认"全部"
        for (var m = 0; m < metaLinks.length; m++) {
            var ma = metaLinks[m];
            var mHref = ma.getAttribute('href') || '';
            var subMatch = mHref.match(/\/t\/(\d+)\.html/);
            if (subMatch) {
                options.push({ n: safeText(ma), v: subMatch[1] });
            }
        }
        // 用 "subtype" 作为筛选 key（名字随意，但要与 categoryContent 中对应）
        filters[typeId] = [{ key: 'subtype', name: '分类', value: options }];
    }

    return { class: cats, filters: filters };
}

// ========== 首页推荐 ==========
async function homeVideoContent() {
    var res = await fetch(BASE_URL + '/', { returnType: 'dom' });
    if (res.error || !res.doc) return Result.error(res.error || '请求失败');
    return { list: extractList(res.doc) };
}

// ========== 分类分页（支持筛选 + 修正翻页） ==========
async function categoryContent(tid, pg, filter, extend) {
    var ext = extend || {};
    var p = parseInt(pg) || 1;

    // 根据筛选决定实际请求的子分类 ID
    var subtype = ext.subtype || '';
    var base = subtype ? (BASE_URL + '/t/' + subtype + '.html') : (BASE_URL + '/t/' + tid + '.html');

    var url = base;
    if (p > 1) {
        // 分页形式：/t/xxx/p2.html
        // 先找到 .html 的位置，插入 /px
        var pos = url.lastIndexOf('.html');
        if (pos !== -1) {
            url = url.substring(0, pos) + '/p' + p + url.substring(pos);
        }
    }

    var res = await fetch(url, { returnType: 'dom' });
    if (res.error || !res.doc) return Result.error(res.error || '请求失败');

    var list = extractList(res.doc);

    // 翻页（修复为 .w4-page .pager a）
    var pageLinks = res.doc.querySelectorAll('.w4-page .pager a');
    var pagecount = 1;
    for (var i = 0; i < pageLinks.length; i++) {
        var num = parseInt(safeText(pageLinks[i]));
        if (num > pagecount) pagecount = num;
    }

    return { page: p, pagecount: pagecount, list: list, total: 0 };
}

// ========== 详情页（多线路 + 选集） ==========
async function detailContent(ids) {
    var id = Array.isArray(ids) ? ids[0] : ids;
    if (id.indexOf('http') !== 0) id = BASE_URL + id;

    var res = await fetch(id, { returnType: 'dom' });
    if (res.error || !res.doc) return Result.error(res.error || '请求失败');
    var doc = res.doc;

    var lines = doc.querySelectorAll('.w4-line-item');
    var playFrom = [];
    var playUrlArr = [];

    if (lines.length > 0) {
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var lineHref = line.getAttribute('href') || '';
            if (lineHref) {
                try { lineHref = res.doc.fixUrl(lineHref); } catch(e) {}
            }
            var lineTitle = line.getAttribute('title') || safeText(line.querySelector('.w4-line-info .r')) || ('线路' + (i + 1));
            var epTitle = safeText(line.querySelector('.w4-line-cover .r .t')) || safeText(line.querySelector('.w4-line-cover .r h3')) || '';

            if (lineHref) {
                playFrom.push(lineTitle);
                var epLinks = doc.querySelectorAll('.w4-episode-list .w a');
                if (epLinks.length > 0) {
                    var eps = [];
                    for (var j = 0; j < epLinks.length; j++) {
                        var a = epLinks[j];
                        var epHref = a.getAttribute('href') || '';
                        if (epHref) {
                            try { epHref = res.doc.fixUrl(epHref); } catch(e) {}
                        }
                        var epName = a.getAttribute('title') || safeText(a);
                        if (epName && epHref) eps.push(epName + '$' + epHref);
                    }
                    playUrlArr.push(eps.join('#'));
                } else {
                    var label = epTitle || '完整版';
                    playUrlArr.push(label + '$' + lineHref);
                }
            }
        }
    }

    if (playFrom.length === 0) {
        var epLinks = doc.querySelectorAll('.w4-episode-list .w a');
        if (epLinks.length > 0) {
            playFrom.push('默认线路');
            var eps = [];
            for (var j = 0; j < epLinks.length; j++) {
                var a = epLinks[j];
                var epHref = a.getAttribute('href') || '';
                if (epHref) {
                    try { epHref = res.doc.fixUrl(epHref); } catch(e) {}
                }
                var epName = a.getAttribute('title') || safeText(a);
                if (epName && epHref) eps.push(epName + '$' + epHref);
            }
            playUrlArr.push(eps.join('#'));
        }
    }

    var playUrl = playUrlArr.join('$$$');
    var playFromStr = playFrom.join('$$$');

    if (!playUrl) {
        playUrl = '完整版$' + id;
        playFromStr = '官方源';
    }

    var title = safeText(doc.querySelector('h1, .w4-bread .on h1, .w4-video .w4-player [data-title]'));
    if (!title) title = safeText(doc.querySelector('title'));
    var pic = '';
    var coverEl = doc.querySelector('.w4-cover img, .w4-player [data-poster]');
    if (coverEl) {
        pic = coverEl.getAttribute('data-poster') || coverEl.getAttribute('data-src') || coverEl.src || '';
    }
    if (pic.indexOf('//') === 0) pic = 'https:' + pic;
    var desc = safeText(doc.querySelector('.w4-desc, .desc, [itemprop="description"], meta[name="description"]'));

    return {
        list: [{
            vod_id: id,
            vod_name: title,
            vod_pic: pic,
            vod_content: desc,
            vod_play_from: playFromStr,
            vod_play_url: playUrl
        }]
    };
}

// ========== 搜索 ==========
async function searchContent(key, quick, pg) {
    var p = parseInt(pg) || 1;
    var url = BASE_URL + '/s/?wd=' + encodeURIComponent(key);
    if (p > 1) url = BASE_URL + '/s/?wd=' + encodeURIComponent(key) + '&page=' + p;

    var res = await fetch(url, { returnType: 'dom' });
    if (res.error || !res.doc) return Result.error(res.error || '请求失败');

    var list = extractList(res.doc);
    var pageLinks = res.doc.querySelectorAll('.w4-page .pager a');
    var pagecount = 1;
    for (var i = 0; i < pageLinks.length; i++) {
        var num = parseInt(safeText(pageLinks[i]));
        if (num > pagecount) pagecount = num;
    }

    return { page: p, pagecount: pagecount, list: list, total: 0 };
}

// ========== 播放（嗅探） ==========
async function playerContent(flag, id, vipFlags) {
    if (id.indexOf('http') !== 0) id = BASE_URL + id;
    return {
        type: 'sniff',
        url: id,
        keyword: '.m3u8|.mp4|.ts|.flv',
        timeout: 20
    };
}

var routes = {
    homeVideoContent: function () { return false; },
    categoryContent: function () { return false; },
    detailContent: function () { return false; },
    searchContent: function () { return false; }
};