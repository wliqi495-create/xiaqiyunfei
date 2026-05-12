/*
title: 'HDmoli', author: '小可乐/v6.1.1'
说明：可以不写ext，也可以写ext，ext支持的参数和格式参数如下
"ext": {
    "host": "xxxx", //站点网址
    "timeout": 6000  //请求超时，单位毫秒
}
*/
var HOST;
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36';
const DefHeader = {'User-Agent': MOBILE_UA};
const KParams = {
    headers: {'User-Agent': MOBILE_UA},
    timeout: 5000
};

async function init(cfg) {
    try {
        let host = cfg.ext?.host?.trim() || 'https://www.hdmoli.org';
        HOST = host.replace(/\/$/, '');
        KParams.headers['Referer'] = HOST;
        let parseTimeout = parseInt(cfg.ext?.timeout?.trim(), 10);
        KParams.timeout = parseTimeout > 0 ? parseTimeout : 5000;
        KParams.resHtml = await request(HOST);
    } catch (e) {
        console.error('初始化参数失败：', e.message);
    }
}

async function home(filter) {
    try {
        let resHtml = KParams.resHtml;
        let classes = pdfa(resHtml, '.nav-list&&a').slice(1,-1).map(it => {
            let cName = _pdfh(it, 'Text', '分类名');
            let cId = _pdfh(it, 'a&&href').match(/(\d+)/)?.[1] ?? '分类值';
            return {type_name: cName, type_id: cId};
        });
        let filters = {
            "1":[
                {"key":"cateId","name":"类型","value":[{"n":"全部","v":"1"},{"n":"动作","v":"6"},{"n":"喜剧","v":"7"},{"n":"爱情","v":"8"},{"n":"科幻","v":"9"},{"n":"恐怖","v":"10"},{"n":"剧情","v":"11"},{"n":"战争","v":"12"}]},
                {"key":"class","name":"剧情","value":[{"n":"全部","v":""},{"n":"爱情","v":"爱情"},{"n":"奇幻","v":"奇幻"},{"n":"喜剧","v":"喜剧"},{"n":"动作","v":"动作"},{"n":"科幻","v":"科幻"},{"n":"武侠","v":"武侠"},{"n":"冒险","v":"冒险"},{"n":"惊悚","v":"惊悚"},{"n":"恐怖","v":"恐怖"},{"n":"犯罪","v":"犯罪"},{"n":"动画","v":"动画"},{"n":"剧情","v":"剧情"},{"n":"悬疑","v":"悬疑"},{"n":"战争","v":"战争"},{"n":"家庭","v":"家庭"},{"n":"运动","v":"运动"},{"n":"灾难","v":"灾难"},{"n":"传记","v":"传记"},{"n":"历史","v":"历史"},{"n":"短片","v":"短片"},{"n":"西部","v":"西部"},{"n":"纪录片","v":"纪录片"},{"n":"歌舞","v":"歌舞"},{"n":"古装","v":"古装"},{"n":"音乐","v":"音乐"},{"n":"剧情片","v":"剧情片"},{"n":"儿童","v":"儿童"},{"n":"真人秀","v":"真人秀"}]},
                {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"大陆","v":"大陆"},{"n":"香港","v":"香港"},{"n":"台湾","v":"台湾"},{"n":"日本","v":"日本"},{"n":"美国","v":"美国"},{"n":"英国","v":"英国"},{"n":"韩国","v":"韩国"},{"n":"西班牙","v":"西班牙"},{"n":"泰国","v":"泰国"},{"n":"法国","v":"法国"},{"n":"丹麦","v":"丹麦"},{"n":"智利","v":"智利"},{"n":"土耳其","v":"土耳其"},{"n":"德国","v":"德国"},{"n":"瑞典","v":"瑞典"},{"n":"印度","v":"印度"},{"n":"新西兰","v":"新西兰"},{"n":"爱尔兰","v":"爱尔兰"},{"n":"比利时","v":"比利时"},{"n":"希腊","v":"希腊"},{"n":"澳大利亚","v":"澳大利亚"},{"n":"芬兰","v":"芬兰"},{"n":"巴西","v":"巴西"},{"n":"俄罗斯","v":"俄罗斯"},{"n":"加拿大","v":"加拿大"},{"n":"意大利","v":"意大利"},{"n":"其它","v":"其它"}]},
                {"key":"lang","name":"语言","value":[{"n":"全部","v":""},{"n":"国语","v":"国语"},{"n":"粤语","v":"粤语"},{"n":"日语","v":"日语"},{"n":"英语","v":"英语"},{"n":"韩语","v":"韩语"},{"n":"夏威夷语","v":"夏威夷语"},{"n":"法语","v":"法语"},{"n":"德语","v":"德语"},{"n":"丹麦语","v":"丹麦语"},{"n":"西班牙语","v":"西班牙语"},{"n":"耳其语","v":"耳其语"},{"n":"印地语","v":"印地语"},{"n":"芬兰语","v":"芬兰语"},{"n":"四川乐山话","v":"四川乐山话"},{"n":"俄语","v":"俄语"},{"n":"意大利语","v":"意大利语"},{"n":"汉语普通话","v":"汉语普通话"},{"n":"闽南语","v":"闽南语"},{"n":"其它","v":"其它"}]},
                {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"}]},
                {"key":"letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"B","v":"B"},{"n":"C","v":"C"},{"n":"D","v":"D"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"},{"n":"0-9","v":"0-9"}]},
                {"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}
            ],
            "2":[
                {"key":"cateId","name":"类型","value":[{"n":"全部","v":"2"},{"n":"国产剧","v":"13"},{"n":"港台剧","v":"14"},{"n":"日韩剧","v":"15"},{"n":"海外剧","v":"16"}]},
                {"key":"class","name":"剧情","value":[{"n":"全部","v":""},{"n":"喜剧","v":"喜剧"},{"n":"科幻","v":"科幻"},{"n":"悬疑","v":"悬疑"},{"n":"欧美","v":"欧美"},{"n":"剧情","v":"剧情"},{"n":"奇幻","v":"奇幻"},{"n":"古装","v":"古装"},{"n":"动作","v":"动作"},{"n":"犯罪","v":"犯罪"},{"n":"冒险","v":"冒险"},{"n":"惊悚","v":"惊悚"},{"n":"恐怖","v":"恐怖"},{"n":"历史","v":"历史"},{"n":"爱情","v":"爱情"},{"n":"音乐","v":"音乐"},{"n":"家庭","v":"家庭"},{"n":"国产","v":"国产"},{"n":"运动","v":"运动"},{"n":"动画","v":"动画"},{"n":"西部","v":"西部"},{"n":"战争","v":"战争"},{"n":"传记","v":"传记"},{"n":"灾难","v":"灾难"},{"n":"纪录片","v":"纪录片"},{"n":"短片","v":"短片"},{"n":"海外","v":"海外"},{"n":"真人秀","v":"真人秀"}]},
                {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"美国","v":"美国"},{"n":"韩国","v":"韩国"},{"n":"英国","v":"英国"},{"n":"日本","v":"日本"},{"n":"大陆","v":"大陆"},{"n":"台湾","v":"台湾"},{"n":"德国","v":"德国"},{"n":"哥伦比亚","v":"哥伦比亚"},{"n":"意大利","v":"意大利"},{"n":"西班牙","v":"西班牙"},{"n":"丹麦","v":"丹麦"},{"n":"挪威","v":"挪威"},{"n":"法国","v":"法国"},{"n":"香港","v":"香港"},{"n":"泰国","v":"泰国"},{"n":"其它","v":"其它"}]},
                {"key":"lang","name":"语言","value":[{"n":"全部","v":""},{"n":"英语","v":"英语"},{"n":"韩语","v":"韩语"},{"n":"日语","v":"日语"},{"n":"国语","v":"国语"},{"n":"德语","v":"德语"},{"n":"西班牙语","v":"西班牙语"},{"n":"意大利语","v":"意大利语"},{"n":"那不勒","v":"那不勒"},{"n":"挪威语","v":"挪威语"},{"n":"其它","v":"其它"}]},
                {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"}]},
                {"key":"letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"B","v":"B"},{"n":"C","v":"C"},{"n":"D","v":"D"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"},{"n":"0-9","v":"0-9"}]},
                {"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}
            ],
            "4":[
                {"key":"cateId","name":"类型","value":[{"n":"全部","v":"4"},{"n":"国产动漫","v":"24"},{"n":"日韩动漫","v":"25"},{"n":"港台动漫","v":"26"},{"n":"欧美动漫","v":"27"}]},
                {"key":"class","name":"剧情","value":[{"n":"全部","v":""},{"n":"动画","v":"动画"},{"n":"日韩动漫","v":"日韩动漫"},{"n":"喜剧","v":"喜剧"},{"n":"剧情","v":"剧情"},{"n":"科幻","v":"科幻"},{"n":"家庭","v":"家庭"},{"n":"奇幻","v":"奇幻"},{"n":"冒险","v":"冒险"},{"n":"欧美动漫","v":"欧美动漫"},{"n":"动作","v":"动作"},{"n":"悬疑","v":"悬疑"},{"n":"犯罪","v":"犯罪"},{"n":"爱情","v":"爱情"},{"n":"惊悚","v":"惊悚"},{"n":"灾难","v":"灾难"},{"n":"音乐","v":"音乐"},{"n":"恐怖","v":"恐怖"},{"n":"战争","v":"战争"},{"n":"运动","v":"运动"},{"n":"歌舞","v":"歌舞"},{"n":"古装","v":"古装"},{"n":"历史","v":"历史"},{"n":"短片","v":"短片"},{"n":"国产动漫","v":"国产动漫"},{"n":"战斗","v":"战斗"}]},
                {"key":"area","name":"地区","value":[{"n":"全部","v":""},{"n":"大陆","v":"大陆"},{"n":"日本","v":"日本"},{"n":"美国","v":"美国"},{"n":"韩国","v":"韩国"},{"n":"西班牙","v":"西班牙"},{"n":"其它","v":"其它"}]},
                {"key":"lang","name":"语言","value":[{"n":"全部","v":""},{"n":"日语","v":"日语"},{"n":"英语","v":"英语"},{"n":"国语","v":"国语"},{"n":"韩语","v":"韩语"},{"n":"其它","v":"其它"}]},
                {"key":"year","name":"年份","value":[{"n":"全部","v":""},{"n":"2026","v":"2026"},{"n":"2025","v":"2025"},{"n":"2024","v":"2024"},{"n":"2023","v":"2023"},{"n":"2022","v":"2022"},{"n":"2021","v":"2021"},{"n":"2020","v":"2020"},{"n":"2019","v":"2019"},{"n":"2018","v":"2018"},{"n":"2017","v":"2017"},{"n":"2016","v":"2016"},{"n":"2015","v":"2015"},{"n":"2014","v":"2014"},{"n":"2013","v":"2013"},{"n":"2012","v":"2012"},{"n":"2011","v":"2011"}]},
                {"key":"letter","name":"字母","value":[{"n":"全部","v":""},{"n":"A","v":"A"},{"n":"B","v":"B"},{"n":"C","v":"C"},{"n":"D","v":"D"},{"n":"E","v":"E"},{"n":"F","v":"F"},{"n":"G","v":"G"},{"n":"H","v":"H"},{"n":"I","v":"I"},{"n":"J","v":"J"},{"n":"K","v":"K"},{"n":"L","v":"L"},{"n":"M","v":"M"},{"n":"N","v":"N"},{"n":"O","v":"O"},{"n":"P","v":"P"},{"n":"Q","v":"Q"},{"n":"R","v":"R"},{"n":"S","v":"S"},{"n":"T","v":"T"},{"n":"U","v":"U"},{"n":"V","v":"V"},{"n":"W","v":"W"},{"n":"X","v":"X"},{"n":"Y","v":"Y"},{"n":"Z","v":"Z"},{"n":"0-9","v":"0-9"}]},
                {"key":"by","name":"排序","value":[{"n":"时间","v":"time"},{"n":"人气","v":"hits"},{"n":"评分","v":"score"}]}
            ]
        };
        return JSON.stringify({class: classes, filters: filters});
    } catch (e) {
        console.error('获取分类失败：', e.message);
        return JSON.stringify({class: [], filters: {}});
    }
}

async function homeVod() {
    try {
        let resHtml = KParams.resHtml;
        let VODS = getVodList(resHtml);
        return JSON.stringify({list: VODS});
    } catch (e) {
        console.error('推荐页获取失败：', e.message);
        return JSON.stringify({list: []});
    }
}

async function category(tid, pg, filter, extend) {
    try {
        pg = parseInt(pg, 10);
        pg = pg > 0 ? pg : 1;
        let cateUrl = `${HOST}/show/${extend?.cateId || tid}-${extend?.area ?? ''}-${extend?.by ?? ''}-${extend?.class ?? ''}-${extend?.lang ?? ''}-${extend?.letter ?? ''}---${pg}---${extend?.year ?? ''}.html`;
        let resHtml = await request(cateUrl);
        let VODS = getVodList(resHtml);
        let pagecount = 999;
        return JSON.stringify({list: VODS, page: pg, pagecount: pagecount, limit: 30, total: 30*pagecount});
    } catch (e) {
        console.error('类别页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

async function search(wd, quick, pg) {
    try {
        pg = parseInt(pg, 10);
        pg = pg > 0 ? pg : 1;
        let searchUrl = `${HOST}/search/${wd}----------${pg}---.html`;
        let resHtml = await request(searchUrl);
        let VODS = getVodList(resHtml);
        return JSON.stringify({list: VODS, page: pg, pagecount: 10, limit: 30, total: 300});
    } catch (e) {
        console.error('搜索页获取失败：', e.message);
        return JSON.stringify({list: [], page: 1, pagecount: 0, limit: 30, total: 0});
    }
}

function getVodList(khtml) {
    try {
        let kvods = [];
        let listArr = pdfa(khtml, '.lazyload');
        for (let it of listArr) {
            let kname = _pdfh(it, 'a&&title', '名称');
            let kpic = _pdfh(it, 'a&&data-original', '图片');
            let kremarks = `${_pdfh(it, '.pic-text&&Text', '状态')}|${_pdfh(it, '.pic-tag &&Text', '无评分')}`;
            kvods.push({
                vod_name: kname,
                vod_pic: kpic,
                vod_remarks: kremarks,
                vod_id: `${_pdfh(it, 'a&&href')}@${kname}@${kpic}@${kremarks}`,
            });
        }
        return kvods;
    } catch (e) {
        console.error(`生成视频列表失败：`, e.message);
        return [];
    }
}

async function detail(ids) {
    try {
        let [id, kname, kpic, kremarks] = ids.split('@');
        let detailUrl = !/^http/.test(id) ? `${HOST}${id}` : id;
        let resHtml = await request(detailUrl);
        let intros = pdfh(resHtml, '.myui-content__detail');
        let ktabs = pdfa(resHtml, '.nav-tabs :has(a)&&a').map((it,idx) => _pdfh(it, 'Text', `线-${idx+1}`));
        let kurls = pdfa(resHtml, '.sort-list').map(item => {
            let kurl = pdfa(item, 'a').map(it => { return _pdfh(it, 'Text', 'noEpi')  + '$' + _pdfh(it, 'a&&href', 'noUrl'); });
            return kurl.join('#');
        });      
        let VOD = {
            vod_id: detailUrl,
            vod_name: kname,
            vod_pic: kpic,
            type_name: cutStrm(intros, '分类：', '<span', '类型'),
            vod_remarks: kremarks,
            vod_year: cutStrm(intros, '年份：', '</a>', '1000'),
            vod_area: cutStrm(intros, '地区：', '<span', '地区'),
            vod_lang: cutStrm(intros, '语言：', '<span', '语言'),
            vod_director: cutStrm(intros, '导演：', '</p>', '导演'),
            vod_actor: cutStrm(intros, '演员：', '</p>', '主演'),
            vod_content: _pdfh(resHtml, '.col-pd:has(span)&&Text', '简介').split('，').slice(1).join('，'),
            vod_play_from: ktabs.join('$$$'),
            vod_play_url: kurls.join('$$$')
        };
        return JSON.stringify({list: [VOD]});
    } catch (e) {
        console.error('详情页获取失败：', e.message);
        return JSON.stringify({list: []});
    }
}

async function play(flag, ids, flags) {
    try {
        let playUrl = !/^http/.test(ids) ? `${HOST}${ids}` : ids;
        let kp = 1;
        let resHtml = await request(playUrl);
        let kcode = safeParseJSON(resHtml.match(/var player_.*?=([^]*?)</)?.[1] ?? '');
        let kurl = kcode?.url ?? '';
        if (kurl && /网盘/.test(flag)) {
            kurl = `push://${kurl}`; 
            kp = 0;
        } else {
            kurl = kurl ? `${HOST}/static/player/artplayer/?url=${kurl}` : playUrl;
        }
        return JSON.stringify({jx: 0, parse: kp, url: kurl, header: DefHeader});
    } catch (e) {
        console.error('播放失败：', e.message);
        return JSON.stringify({jx: 0, parse: 0, url: '', header: {}});
    }
}

function _pdfh(dom, selector, defaultValue='') {
    if (typeof dom !== 'string' || typeof selector !== 'string' || !dom.trim() || !selector.trim()) {return defaultValue;}
    return (pdfh(dom, selector) || '').replace(/\s+/g, ' ').trim() || defaultValue;
}

function cutStrm(str, prefix = '', suffix = '', defaultVal = '截取失败') {
    if (!str || typeof str !== 'string') return defaultVal;
    const esc = s => String(s).replace(/[.*+?${}()|[\]\\/^]/g, '\\$&');
    let [pre, end] = [esc(prefix), esc(suffix)];
    let regex = new RegExp(`${pre ? pre : '^'}([^]*?)${end ? end : '$'}`);
    let result = str.match(regex)?.[1].replace(/<[^>]*?>/g, ' ').replaceAll('&nbsp;', ' ').trim().replace(/\s+/g, '/') ?? defaultVal;
    return result;
}

function safeParseJSON(jStr){
    try {return JSON.parse(jStr);} catch(e) {return null;}
}

async function request(reqUrl, options = {}) {
    try {
        if (typeof reqUrl !== 'string' || !reqUrl.trim()) { throw new Error('reqUrl需为字符串且非空'); }
        if (typeof options !== 'object' || Array.isArray(options) || !options) { throw new Error('options类型需为非null对象'); }
        options.method = options.method?.toLowerCase() || 'get';
        if (['get', 'head'].includes(options.method)) {
            delete options.data;
            delete options.postType;
        } else {
            options.data = options.data ?? '';
            options.postType = options.postType?.toLowerCase() || 'form';
        }        
        let {headers, timeout, charset, toBase64 = false, ...restOpts } = options;
        const optObj = {
            headers: (typeof headers === 'object' && !Array.isArray(headers) && headers) ? headers : KParams.headers,
            timeout: parseInt(timeout, 10) > 0 ? parseInt(timeout, 10) : KParams.timeout,
            charset: charset?.toLowerCase() || 'utf-8',
            buffer: toBase64 ? 2 : 0,
            ...restOpts
        };
        const res = await req(reqUrl, optObj);
        if (options.withHeaders) {
            const resHeaders = typeof res.headers === 'object' && !Array.isArray(res.headers) && res.headers ? res.headers : {};
            const resWithHeaders = { ...resHeaders, body: res?.content ?? '' };
            return JSON.stringify(resWithHeaders);
        }
        return res?.content ?? '';
    } catch (e) {
        console.error(`${reqUrl}→请求失败：`, e.message);
        return options?.withHeaders ? JSON.stringify({ body: '' }) : '';
    }
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        search: search,
        detail: detail,
        play: play,
        proxy: null
    };
}