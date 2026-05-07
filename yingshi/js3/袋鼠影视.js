/*
* @File     : 袋鼠影视
* @Author   : drpy-node
* @Date     : 2025
* @Comments : 袋鼠影视 daishuys.com
@header({
  searchable: 2,
  filterable: 1,
  quickSearch: 0,
  title: '袋鼠影视',
  类型: '影视',
  lang: 'ds',
})
*/

var rule = {
    title: '袋鼠影视',
    host: 'https://daishuys.com',
    url: '/search.php?searchtype=5&tid=fyclass&page=fypage',
    searchUrl: '/search.php',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    headers: {
        'User-Agent': 'MOBILE_UA'
    },
    class_name: '电影&电视剧&综艺&动漫',
    class_url: '1&2&3&4',
    filter_url: '{{fl.tid}}',
    filter: {
        '1': [
            { key: 'tid', name: '类型', value: [{ n: '全部', v: '1' }, { n: '动作片', v: '5' }, { n: '喜剧片', v: '10' }, { n: '爱情片', v: '6' }, { n: '科幻片', v: '7' }, { n: '恐怖片', v: '8' }, { n: '战争片', v: '9' }, { n: '剧情片', v: '12' }, { n: '动画片', v: '41' }, { n: '纪录片', v: '11' }] },
            { key: 'area', name: '地区', value: [{ n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '香港', v: '香港' }, { n: '台湾', v: '台湾' }, { n: '日本', v: '日本' }, { n: '韩国', v: '韩国' }, { n: '美国', v: '美国' }, { n: '英国', v: '英国' }, { n: '印度', v: '印度' }, { n: '法国', v: '法国' }, { n: '泰国', v: '泰国' }] },
            { key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }, { n: '2023', v: '2023' }, { n: '2022', v: '2022' }, { n: '2021', v: '2021' }, { n: '2020', v: '2020' }] }
        ],
        '2': [
            { key: 'tid', name: '类型', value: [{ n: '全部', v: '2' }, { n: '国产剧', v: '13' }, { n: '港台剧', v: '14' }, { n: '欧美剧', v: '15' }, { n: '日韩剧', v: '16' }] },
            { key: 'area', name: '地区', value: [{ n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '香港', v: '香港' }, { n: '台湾', v: '台湾' }, { n: '日本', v: '日本' }, { n: '韩国', v: '韩国' }, { n: '美国', v: '美国' }, { n: '英国', v: '英国' }] },
            { key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }, { n: '2023', v: '2023' }, { n: '2022', v: '2022' }] }
        ],
        '3': [
            { key: 'area', name: '地区', value: [{ n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '日本', v: '日本' }, { n: '韩国', v: '韩国' }, { n: '美国', v: '美国' }] },
            { key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }] }
        ],
        '4': [
            { key: 'area', name: '地区', value: [{ n: '全部', v: '' }, { n: '大陆', v: '大陆' }, { n: '日本', v: '日本' }, { n: '韩国', v: '韩国' }, { n: '美国', v: '美国' }] },
            { key: 'year', name: '年份', value: [{ n: '全部', v: '' }, { n: '2026', v: '2026' }, { n: '2025', v: '2025' }, { n: '2024', v: '2024' }] }
        ]
    },
    filter_def: {
        1: { tid: '1' },
        2: { tid: '2' },
        3: { tid: '3' },
        4: { tid: '4' }
    },
    play_parse: true,
    limit: 6,
    double: true,
    推荐: '.hy-video-list;.item;.title h5 a&&Text;a.videopic&&data-original;.note&&Text;a.videopic&&href',
    一级: '.hy-video-list li.col-md-2;.title h5 a&&Text;a.videopic&&data-original;.note&&Text;a.videopic&&href',
    二级: async function() {
        let { input, pdfa, pdfh, pd, HOST } = this;
        let html = await request(input);
        if (typeof html !== 'string') html = html.content || JSON.stringify(html);

        let title = pdfh(html, 'h1&&Text');
        let pic = pd(html, 'a.videopic&&img&&src', HOST);
        let content = pdfh(html, '.plot&&Text');

        // 提取详细信息
        let desc = '';
        let actor = '';
        let director = '';
        let year = '';
        let area = '';
        let vod_remarks = pdfh(html, '.note&&Text');

        // 从 dd 中的 li 提取信息
        let liList = pdfa(html, '.content ul li');
        for (let i = 0; i < liList.length; i++) {
            let liText = pdfh(liList[i], 'li&&Text');
            if (liText.indexOf('主演') > -1) {
                let actorLinks = pdfa(liList[i], 'a');
                let actors = [];
                for (let j = 0; j < actorLinks.length; j++) {
                    actors.push(pdfh(actorLinks[j], 'a&&Text'));
                }
                actor = actors.join(',');
            } else if (liText.indexOf('导演') > -1) {
                let dirLinks = pdfa(liList[i], 'a');
                let dirs = [];
                for (let j = 0; j < dirLinks.length; j++) {
                    dirs.push(pdfh(dirLinks[j], 'a&&Text'));
                }
                director = dirs.join(',');
            } else if (liText.indexOf('年份') > -1) {
                year = liText.replace('年份：', '').trim();
            } else if (liText.indexOf('地区') > -1) {
                area = liText.replace('地区：', '').trim();
            }
        }

        // 提取播放线路和集数
        let tabs = pdfa(html, 'a.option');
        let lists = pdfa(html, '.playlist ul');
        let tabNames = [];
        let tabList = [];

        for (let i = 0; i < tabs.length; i++) {
            // 从title属性获取线路名
            let tabName = pdfh(tabs[i], 'a&&title');
            if (!tabName) {
                tabName = pdfh(tabs[i], 'Text').split(' ')[0];
            }
            tabNames.push(tabName);

            let urls = [];
            if (i < lists.length) {
                let alist = pdfa(lists[i], 'a');
                for (let j = 0; j < alist.length; j++) {
                    let name = pdfh(alist[j], 'a&&title');
                    if (!name) name = pdfh(alist[j], 'a&&Text');
                    let link = pd(alist[j], 'a&&href', HOST);
                    urls.push(name + '$' + link);
                }
            }
            tabList.push(urls.join('#'));
        }

        let vod = {
            vod_name: title,
            vod_pic: pic,
            vod_content: content,
            vod_actor: actor,
            vod_director: director,
            vod_year: year,
            vod_area: area,
            vod_remarks: vod_remarks,
            vod_play_from: tabNames.join('$$$'),
            vod_play_url: tabList.join('$$$')
        };

        return vod;
    },
    搜索: async function() {
        let { input, pdfa, pdfh, pd, HOST } = this;
        let searchword = input;
        if (input.indexOf('searchword=') > -1) {
            searchword = input.replace(/.*searchword=/, '').replace(/&.*/, '');
        }
        try { searchword = decodeURIComponent(searchword); } catch(e) {}
        let html = await req(HOST + '/search.php', {
            method: 'POST',
            data: 'searchword=' + encodeURIComponent(searchword),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': MOBILE_UA }
        });
        let content = html.content || html;
        if (typeof content !== 'string') content = JSON.stringify(content);
        let list = pdfa(content, '.hy-video-list li');
        if (list.length === 0) list = pdfa(content, 'li.col-md-2');
        if (list.length === 0) list = pdfa(content, '.videopic');
        let d = [];
        for (let i = 0; i < list.length; i++) {
            let item = list[i];
            d.push({
                vod_name: pdfh(item, 'h5 a&&Text') || pdfh(item, 'a&&title'),
                vod_pic: pd(item, 'a.videopic&&data-original', HOST) || pd(item, 'a&&data-original', HOST),
                vod_remarks: pdfh(item, '.note&&Text') || '',
                vod_id: pd(item, 'a.videopic&&href', HOST) || pd(item, 'a&&href', HOST)
            });
        }
        return d;
    },
    lazy: async function() {
        let { input } = this;
        let html = await request(input);
        if (typeof html !== 'string') html = html.content || JSON.stringify(html);
        let match = html.match(/var now="([^"]+)"/);
        if (match) {
            return { parse: 0, url: match[1], jx: 0 };
        }
        return { parse: 1, url: input };
    },
};
