const cheerio = createCheerio()

const UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'

let appConfig = {
    ver: 20260224,
    title: '农民影视',
    site: 'https://vip.wwgz.cn:5200',
    tabs: [
        {
            name: '电影',
            ext: {
                id: '1',
            },
        },
        {
            name: '连续剧',
            ext: {
                id: '2',
            },
        },
        {
            name: '综艺',
            ext: {
                id: '3',
            },
        },
        {
            name: '动漫',
            ext: {
                id: '4',
            },
        },
        {
            name: '短剧',
            ext: {
                id: '26',
            },
        },
    ],
}

const filterList = {
    1: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '1' },
                { n: '动作片', v: '5' },
                { n: '喜剧片', v: '6' },
                { n: '爱情片', v: '7' },
                { n: '科幻片', v: '8' },
                { n: '恐怖片', v: '9' },
                { n: '剧情片', v: '10' },
                { n: '战争片', v: '11' },
                { n: '惊悚片', v: '12' },
                { n: '奇幻片', v: '13' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
                { n: '2009~2000', v: '2009~2000' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
    2: [
        {
            key: 'type',
            name: '类型',
            value: [
                { n: '全部', v: '2' },
                { n: '国产剧', v: '12' },
                { n: '港台泰', v: '13' },
                { n: '日韩剧', v: '14' },
                { n: '欧美剧', v: '15' },
            ],
        },
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
    3: [
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
    4: [
        {
            key: 'area',
            name: '地区',
            value: [
                { n: '全部', v: '' },
                { n: '大陆', v: '大陆' },
                { n: '香港', v: '香港' },
                { n: '台湾', v: '台湾' },
                { n: '美国', v: '美国' },
                { n: '日本', v: '日本' },
                { n: '韩国', v: '韩国' },
                { n: '印度', v: '印度' },
                { n: '泰国', v: '泰国' },
                { n: '英国', v: '英国' },
                { n: '法国', v: '法国' },
                { n: '加拿大', v: '加拿大' },
                { n: '西班牙', v: '西班牙' },
                { n: '俄罗斯', v: '俄罗斯' },
                { n: '其他', v: '其他' },
            ],
        },
        {
            key: 'year',
            name: '年份',
            value: [
                { n: '全部', v: '' },
                { n: '2026', v: '2026' },
                { n: '2025', v: '2025' },
                { n: '2024', v: '2024' },
                { n: '2023', v: '2023' },
                { n: '2022', v: '2022' },
                { n: '2021', v: '2021' },
                { n: '2020', v: '2020' },
                { n: '2019', v: '2019' },
                { n: '2018', v: '2018' },
                { n: '2017', v: '2017' },
                { n: '2016', v: '2016' },
                { n: '2015', v: '2015' },
                { n: '2014', v: '2014' },
                { n: '2013', v: '2013' },
                { n: '2012', v: '2012' },
                { n: '2011', v: '2011' },
                { n: '2010', v: '2010' },
            ],
        },
        {
            key: 'sort',
            name: '排序',
            value: [
                { n: '时间', v: 'time' },
                { n: '人气', v: 'hits' },
                { n: '评分', v: 'score' },
            ],
        },
    ],
}

async function getConfig() {
    let config = appConfig
    return jsonify(config)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, id } = ext

    let url = `${appConfig.site}/vod-list-id-${ext?.filters?.type || id}-pg-${page}-order--by-${ext?.filters?.sort || 'time'}-class-0-year-${ext?.filters?.year || 0}-letter--area-${ext?.filters?.area || ''}-lang-.html`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    $('.globalPicList > ul li').each((_, element) => {
        const href = $(element).find('a').attr('href')
        const title = $(element).find('a').attr('title')
        const cover = $(element).find('img').attr('src')
        const subTitle = $(element).find('.sDes').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
        filter: filterList[id] || [],
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let lists = []
    const url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    // 從第一集取出 track list
    const href = $('.numList').first().find('li').first().find('a').attr('href')
    const firstEpUrl = appConfig.site + href

    const { data: epData } = await $fetch.get(firstEpUrl, {
        headers: {
            'User-Agent': UA,
        },
    })

    const mac_from = epData?.match(/mac_from\s*=\s*'([^']*)'/)[1]
    const mac_url = epData?.match(/mac_url\s*=\s*'([^']+)'/)[1]

    const from = mac_from.split('$$$')
    const urls = mac_url.split('$$$')

    for (let i = 0; i < from.length; i++) {
        let temp = {
            title: from[i],
            tracks: [],
        }
        let eps = urls[i].split('#')
        for (let j = 0; j < eps.length; j++) {
            let ep = eps[j].split('$')
            temp.tracks.push({
                name: from.length == 1 ? `${from[i]}-${ep[0]}` : ep[0],
                pan: '',
                ext: {
                    url: ep[1],
                },
            })
        }
        lists.push(temp)
    }

    return jsonify({
        list: lists,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = `https://api.nmvod.me:520/player/?url=${ext.url}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            Referer: appConfig.site + '/',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-dest': 'iframe',
        },
    })

    const match = data.match(/var\s+config\s*=\s*(\{[\s\S]*?\})/)
    const configString = match?.[1]
    const playUrl = configString.match(/url":\s*"(.+)"/)?.[1]

    return jsonify({ urls: [playUrl], headers: [{ 'User-Agent': UA }] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1
    let url = `${appConfig.site}/index.php?m=vod-search`
    if (page > 1) return jsonify({ list: [] })
    let body = `wd=${text}`

    const { data } = await $fetch.post(url, body, {
        headers: {
            'User-Agent': UA,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const $ = cheerio.load(data)

    $('#search_main ul li').each((_, element) => {
        const href = $(element).find('.pic a').attr('href')
        const title = $(element).find('.sTit').text()
        const cover = $(element).find('img').attr('data-src')
        const subTitle = $(element).find('.sStyle').text()
        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle || '',
            ext: {
                url: appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}
