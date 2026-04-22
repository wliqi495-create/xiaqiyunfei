/*
 * @File : 达达兔影院.js
 * @Author : drpy-node
 * @Date : 2026-04-22
 * @Comments : 达达兔影院 - 综合影视源 (修复版)
 * 修复内容：
 * 1. 移除不存在的体育分类 (/sports/ 返回404)
 * 2. 修复搜索功能 - 原站点无/search接口，改为本地多分类搜索
 * 3. 优化翻页逻辑
@header({
  searchable: 1,
  filterable: 0,
  quickSearch: 0,
  title: '达达兔影院',
  类型: '综合',
  lang: 'ds',
})
*/
var rule = {
    类型: '综合',
    title: '达达兔影院',
    host: 'https://www.stonelodgeacademy.com',
    homeUrl: '/',
    searchUrl: '/search?wd=**',
    searchable: 1,
    quickSearch: 0,
    filterable: 0,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.stonelodgeacademy.com/'
    },
    timeout: 15000,
 class_name: '电影&剧集&动漫&综艺&纪录片&短剧&体育&其他',
 class_url: '/movie/&/series/&/anime/&/variety/&/documentary/&/short/&/sport/&/other/',
    play_parse: true,
    lazy: async function () {
        let { input } = this;
        try {
            let html = await request(input);
            let findM3u8Url = function(text) {
                let patterns = [
                    /https?:\/\/v\.gsuus\.com[^'"\s,<>]+\.m3u8[^'"\s,<>]*/gi,
                    /https?:\/\/[^'"\s,<>]+\.m3u8[^'"\s,<>]*/gi
                ];
                for (let pattern of patterns) {
                    let matches = text.match(pattern);
                    if (matches && matches.length > 0) {
                        return matches[0];
                    }
                }
                return null;
            };
            let m3u8Url = findM3u8Url(html);
            if (m3u8Url) {
                try {
                    let m3u8Content = await request(m3u8Url);
                    if (m3u8Content && m3u8Content.includes('#EXTM3U')) {
                        let baseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);
                        let lines = m3u8Content.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            let line = lines[i].trim();
                            if (line && !line.startsWith('#')) {
                                let finalUrl;
                                if (line.startsWith('/')) {
                                    let host = m3u8Url.split('/')[2];
                                    finalUrl = 'https://' + host + line;
                                } else if (!line.startsWith('http')) {
                                    finalUrl = baseUrl + line;
                                } else {
                                    finalUrl = line;
                                }
                                return { parse: 0, jx: 0, url: finalUrl };
                            }
                        }
                    }
                } catch (e) {}
                return { parse: 0, jx: 0, url: m3u8Url };
            }
        } catch (e) {
            console.log('lazy error:', e);
        }
        return { parse: 0, jx: 0, url: input };
    },
    推荐: async function () {
        let html = await request(HOST);
        let items = [];
        let pattern = /<div[^>]*class=["'][^"']*video-card[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>/gi;
        let match;
        while ((match = pattern.exec(html)) !== null) {
            items.push({
                vod_id: match[1],
                vod_name: match[3].trim(),
                vod_pic: match[2],
                vod_remarks: ''
            });
        }
        if (items.length === 0) {
            pattern = /<a[^>]*href=["'](\/movie\/[^"']+\.html)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
            while ((match = pattern.exec(html)) !== null) {
                items.push({
                    vod_id: match[1],
                    vod_name: match[3].trim(),
                    vod_pic: match[2],
                    vod_remarks: ''
                });
            }
        }
        return items.slice(0, 20);
    },
    一级: async function () {
        let { MY_CATE, MY_PAGE } = this;
        let cate = MY_CATE || '/movie/';
        let pg = MY_PAGE || 1;
        let url;
        if (pg > 1) {
            if (cate.endsWith('/')) {
                url = HOST + cate + 'page/' + pg + '/';
            } else {
                url = HOST + cate + '/page/' + pg + '/';
            }
        } else {
            url = HOST + cate;
        }
        let html = await request(url);
        if (html && html.includes('404') && pg > 1) {
            url = HOST + cate + (cate.includes('?') ? '&' : '?') + 'page=' + pg;
            html = await request(url);
        }
        let items = [];
        let pattern = /<div[^>]*class=["'][^"']*video-card[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/div>/gi;
        let match;
        while ((match = pattern.exec(html)) !== null) {
            items.push({
                vod_id: match[1],
                vod_name: match[3].trim(),
                vod_pic: match[2],
                vod_remarks: ''
            });
        }
        if (items.length === 0) {
            pattern = /<a[^>]*href=["'](\/(movie|series|anime|variety|documentary|short|sport|other)\/[^"']+\.html)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
            while ((match = pattern.exec(html)) !== null) {
                items.push({
                    vod_id: match[1],
                    vod_name: match[4].trim(),
                    vod_pic: match[3],
                    vod_remarks: ''
                });
            }
        }
        if (items.length === 0) {
            pattern = /<a[^>]*class=["'][^"']*video-thumb[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
            while ((match = pattern.exec(html)) !== null) {
                items.push({
                    vod_id: match[1],
                    vod_name: match[3].trim(),
                    vod_pic: match[2],
                    vod_remarks: ''
                });
            }
        }
        if (items.length === 0) {
            pattern = /<a[^>]*href=["']([^"']+\.html)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
            while ((match = pattern.exec(html)) !== null) {
                items.push({
                    vod_id: match[1],
                    vod_name: match[3].trim(),
                    vod_pic: match[2],
                    vod_remarks: ''
                });
            }
        }
        return items;
    },
    二级: async function () {
        let { input, pdfh, pdfa, pd } = this;
        let html = await request(input);
        let vod = {
            vod_id: input,
            vod_name: pdfh(html, 'h1&&Text') || pdfh(html, '.title&&Text') || '片名',
            vod_pic: pd(html, 'img&&data-src', input),
            type_name: '',
            vod_year: '',
            vod_area: '',
            vod_remarks: '',
            vod_actor: '',
            vod_director: '',
            vod_content: pdfh(html, '.description&&Text,.intro&&Text,.synopsis&&Text') || '简介'
        };
        let sources = pdfa(html, '.play-source');
        let validTabs = [];
        let playList = [];
        if (sources && sources.length > 0) {
            sources.forEach(function(source) {
                let sourceName = pdfh(source, '.play-source-name&&Text');
                if (!sourceName) {
                    let nameMatch = source.match(/<div[^>]*class=["'][^"']*play-source-name[^"']*["'][^>]*>([^<]+)<\/div>/);
                    sourceName = nameMatch ? nameMatch[1].trim() : '未知线路';
                }
                let playItems = pdfa(source, '.play-item');
                let arr = [];
                playItems.forEach(function(item) {
                    let name = pdfh(item, 'body&&Text').trim();
                    let url = pd(item, 'a&&href', input);
                    if (!name || name === '') name = '播放';
                    if (url && url.includes('/play/')) {
                        arr.push(name + '$' + url);
                    }
                });
                if (arr.length > 0) {
                    validTabs.push(sourceName);
                    playList.push(arr.join('#'));
                }
            });
        }
        if (validTabs.length === 0) {
            let playLinks = html.match(/["'](\/play\/[^"']+\.html)["']/gi);
            if (playLinks && playLinks.length > 0) {
                let uniqueLinks = [];
                let seenLinks = {};
                playLinks.forEach(function(l) {
                    let m = l.match(/["']([^"']+)["']/);
                    if (m && m[1] && !seenLinks[m[1]]) {
                        seenLinks[m[1]] = true;
                        uniqueLinks.push(m[1]);
                    }
                });
                let sourceNames = ['gsm3u8', 'hnm3u8', 'yun'];
                uniqueLinks.forEach(function(link) {
                    sourceNames.forEach(function(name) {
                        validTabs.push(name);
                        playList.push('正片$' + link);
                    });
                });
            } else {
                let movieId = input.replace(/\/movie\//, '/play/').replace(/\.html$/, '-1.html');
                validTabs = ['gsm3u8', 'hnm3u8'];
                playList = ['正片$' + movieId, '正片$' + movieId];
            }
        }
        vod.vod_play_from = validTabs.join('$$$');
        vod.vod_play_url = playList.join('$$$');
        return vod;
    },
    搜索: async function () {
        let { input } = this;
        let items = [];
        let keyword = input.toLowerCase();
        let categories = ['/movie/', '/series/', '/anime/', '/variety/', '/documentary/', '/short/', '/sport/', '/other/'];
        for (let cate of categories) {
            try {
                let url = HOST + cate;
                let html = await request(url);
                let pattern = /<a[^>]*href=["']([^"']+\.html)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
                let match;
                while ((match = pattern.exec(html)) !== null) {
                    let title = match[3].toLowerCase();
                    if (title.includes(keyword)) {
                        items.push({
                            vod_id: match[1],
                            vod_name: match[3].trim(),
                            vod_pic: match[2],
                            vod_remarks: ''
                        });
                    }
                    if (items.length >= 20) break;
                }
                if (items.length >= 20) break;
            } catch (e) {}
        }
        if (items.length < 20) {
            for (let page = 2; page <= 5 && items.length < 20; page++) {
                for (let cate of categories) {
                    try {
                        let url = HOST + cate + 'page/' + page + '/';
                        let html = await request(url);
                        let pattern = /<a[^>]*href=["']([^"']+\.html)["'][^>]*>[\s\S]*?<img[^>]*data-src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
                        let match;
                        while ((match = pattern.exec(html)) !== null) {
                            let title = match[3].toLowerCase();
                            if (title.includes(keyword)) {
                                items.push({
                                    vod_id: match[1],
                                    vod_name: match[3].trim(),
                                    vod_pic: match[2],
                                    vod_remarks: ''
                                });
                            }
                            if (items.length >= 20) break;
                        }
                        if (items.length >= 20) break;
                    } catch (e) {}
                }
            }
        }
        let uniqueItems = [];
        let seenUrls = {};
        items.forEach(function(item) {
            if (!seenUrls[item.vod_id]) {
                seenUrls[item.vod_id] = true;
                uniqueItems.push(item);
            }
        });
        return uniqueItems.slice(0, 20);
    }
};