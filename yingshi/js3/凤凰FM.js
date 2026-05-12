globalThis.h_ost = 'https://s.fm.renbenai.com';
var rule = {
    title: '凤凰FM',
    host: h_ost,
    url: '/fm/read/fmd/android/600/getProgramList.html&cid=fyclass&pagenum=fypage',
    homeUrl: '/fm/read/fmd/static/categoryTvGet_100.html',
    detailUrl: '/fm/read/fmd/android/getProgramAudioList_620.html&pid=fyid',
    searchUrl: '/fm/read/fmd/public/search_720.html&keyWord=**&searchType=1&pageNum=fypage',
    searchable: 2,
    quickSearch: 1,
    filterable: 0,
    headers: {
        'User-Agent': 'okhttp/3.12.11',
        'Cookie': 'KLBRSID=9b9dd35888924d7c870dd3474e89cab6|1753290568|1753290499'
    },
    play_parse: true,
    search_match: true,
    class_parse: $js.toString(() => {
        let html = request(input);
        let classes = [];
        let data = JSON.parse(html).data.list[0].channelContent;
        data.forEach((it) => {
            let typeName = it.nodeName;
            let typeId = it.id;
            classes.push({
                type_name: typeName,
                type_id: typeId,
            });
        });
        input = classes;
    }),
    一级: $js.toString(() => {
        let d = [];
        let html = request(input);
        let data = JSON.parse(html).data.hotList;
        data.forEach(item => {
            let title = item.programName;
            if (!/名称|排除/.test(title)) {
                d.push({
                    title: title,
                    desc: item.resourceTitle,
                    img: item.img640_640,
                    url: item.id,
                });
            }
        });
        setResult(d);
    }),
    二级: $js.toString(() => {
        let html = request(input);
        let list = JSON.parse(html).data.list;
        VOD = {
            vod_name: list[0]['title'] || '暂无名称',
            type_name: list[0]['vod_class'] || '暂无类型',
            vod_pic: list[0]['img370_370'] || '暂无图片',
            vod_remarks: list[0]['tags'] || '暂无备注',
            vod_content: list[0]['programDetails'] || '暂无剧情介绍'
        };
        let playlist = list[0]['audiolist'];
        let playForm = [];
        let playUrls = [];
        list.forEach(item => {
            const title = item.title;
            const firstUrl = item.audiolist && item.audiolist[0] ? item.audiolist[0].filePath : '';
            playUrls.push(`${title}$${firstUrl}`);
        });
        VOD.vod_play_from = '凤凰FM';
        VOD.vod_play_url = playUrls.join('#');
    }),
    搜索: $js.toString(() => {
        let d = [];
        let html = request(input);
        let data = JSON.parse(html).data.program;
        if (rule.search_match) {
            data = data.filter(it => {
                let title = it.programName;
                return title && new RegExp(KEY, "i").test(title);
            });
        }
        data.forEach(item => {
            let title = item.programName;
            if (!/名称|排除/.test(title)) {
                d.push({
                    title: title,
                    desc: item.programName,
                    img: item.img640_640,
                    url: item.id,
                });
            }
        });
        setResult(d);
    }),
    lazy: $js.toString(() => {
        input = {
            parse: 0,
            url: input
        };
    }),
}