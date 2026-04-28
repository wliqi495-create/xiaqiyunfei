const CryptoJS = createCryptoJS()
const cheerio = createCheerio()

// 會員數據來源: baby
let deviceId = '4E292B5D-FE99-4860-8054-5B0A11CC27AF'
let vipToken = 'rrtv-bb3643e9bc9d62ebea4c30b20e7c313d5f57ab8a'

let appConfig = {
    ver: 20251202,
    title: '人人',
    site: 'https://api.rrmj.plus',
    tabs: [
        {
            id: '1',
            name: '電影',
            ext: {
                dramaType: 'MOVIE',
                area: '',
            },
        },
        {
            id: '1',
            name: '電視劇',
            ext: {
                dramaType: 'TV',
                area: '',
            },
        },
        {
            id: '1',
            name: '綜藝',
            ext: {
                dramaType: 'VARIETY',
                area: '',
            },
        },
        {
            id: '1',
            name: '紀錄片',
            ext: {
                dramaType: 'DOCUMENTARY',
                area: '',
            },
        },
        {
            id: '1',
            name: '動漫',
            ext: {
                dramaType: 'COMIC',
                area: '',
            },
        },
        {
            id: '1',
            name: '美劇',
            ext: {
                dramaType: 'TV',
                area: '美国',
            },
        },
        {
            id: '1',
            name: '韓劇',
            ext: {
                dramaType: 'TV',
                area: '韩国',
            },
        },
        {
            id: '1',
            name: '泰劇',
            ext: {
                dramaType: 'TV',
                area: '泰国',
            },
        },
        {
            id: '1',
            name: '日劇',
            ext: {
                dramaType: 'TV',
                area: '日本',
            },
        },
        {
            id: '1',
            name: '英劇',
            ext: {
                dramaType: 'TV',
                area: '英国',
            },
        },
    ],
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { dramaType, area = '', page = 1 } = ext

    try {
        const url = appConfig.site + `/m-station/drama/drama_filter_search`
        const body = {
            area: area,
            sort: 'new',
            year: '',
            dramaType: dramaType,
            plotType: '',
            contentLabel: '',
            page: page,
            rows: 30,
        }
        const headers = buildSignedHeaders({
            method: 'POST',
            url,
            deviceId,
        })
        headers['Content-Type'] = 'application/json'

        const { data } = await $fetch.post(url, body, {
            headers,
        })

        const decryptedData = decrypt(data)

        argsify(decryptedData).data.forEach((e) => {
            cards.push({
                vod_id: `${e.dramaId}`,
                vod_name: e.title,
                vod_pic: e.coverUrl,
                vod_remarks: e.subtitle || '',
                vod_duration: e.cornerMark || '',
                ext: {
                    id: `${e.dramaId}`,
                },
            })
        })

        return jsonify({
            list: cards,
        })
    } catch (error) {
        $print(error)
    }
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let id = ext.id
    let url = appConfig.site + `/m-station/drama/page`
    let params = {
        hsdrOpen: 0,
        isAgeLimit: 0,
        dramaId: id,
        quality: 'AI4K',
        hevcOpen: 1,
        tria4k: 1,
    }
    let headers = buildSignedHeaders({
        method: 'GET',
        url,
        params,
        deviceId,
    })

    const { data } = await $fetch.get(`${url}?${sortedQueryString(params)}`, {
        headers,
    })
    const decryptedData = decrypt(data)
    const quality = argsify(decryptedData).data.watchInfo.sortedItems[0].qualityCode

    argsify(decryptedData).data.episodeList.forEach((e) => {
        tracks.push({
            name: `${e.episodeNo}`,
            pan: '',
            ext: {
                dramaId: id,
                episodeSid: e.sid,
                quality,
            },
        })
    })

    return jsonify({
        list: [
            {
                title: '默认分组',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    await getLatestToken()
    ext = argsify(ext)
    let { dramaId, episodeSid, quality } = ext
    let url = appConfig.site + `/m-station/drama/play`
    try {
        let params = {
            hsdrOpen: 0,
            dramaId: dramaId,
            episodeSid: episodeSid,
            quality: quality,
            hevcOpen: 1,
            tria4k: 1,
        }

        let headers = buildSignedHeaders({
            method: 'GET',
            url,
            params,
            deviceId,
            token: vipToken,
        })

        const { data } = await $fetch.get(`${url}?${sortedQueryString(params)}`, {
            headers,
        })
        const decryptedData = decrypt(data)
        let encryptedurl = argsify(decryptedData).data.m3u8.url
        let newSign = argsify(decryptedData).data.newSign

        function decryptUrl(url, newSign) {
            var key = CryptoJS.enc.Utf8.parse(newSign.substring(4, 20))
            var iv = CryptoJS.enc.Utf8.parse('b1da7878016e4e2b')
            return CryptoJS.AES.decrypt(url, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            }).toString(CryptoJS.enc.Utf8)
        }
        let playUrl = decryptUrl(encryptedurl, newSign)

        return jsonify({ urls: [playUrl] })
    } catch (error) {
        $print(error)
    }
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    if (page > 1) return
    const url = `${appConfig.site}/m-station/search/drama`
    const params = {
        keywords: text,
        size: 20,
        order: 'match',
        search_after: '',
        isExecuteVipActivity: true,
    }
    const headers = buildSignedHeaders({
        method: 'GET',
        url,
        params,
        deviceId,
    })

    const { data } = await $fetch.get(`${url}?${sortedQueryString(params)}`, {
        headers,
    })
    const decryptedData = decrypt(data)

    argsify(decryptedData).data.searchDramaList.forEach((e) => {
        cards.push({
            vod_id: `${e.id}`,
            vod_name: e.title,
            vod_pic: e.cover,
            vod_remarks: e.subtitle || '',
            vod_duration: e.cornerMark || '',
            ext: {
                id: `${e.id}`,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getLatestToken() {
    let postUrl = 'https://t.me/Jsforbaby/219'

    try {
        const { data } = await $fetch.get(postUrl)

        const $ = cheerio.load(data)
        let text = $('meta[property="og:description"]').attr('content')
        let umid = text.match(
            /umid:\s+([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})/
        )[1]
        let token = text.match(/token:\s+(rrtv-[0-9a-fA-F]+)/)[1]

        if (umid && token) {
            deviceId = umid
            vipToken = token
        }
    } catch (error) {
        return
    }
}

function sortedQueryString(params = {}) {
    const normalized = {}
    for (const [k, v] of Object.entries(params)) {
        if (typeof v === 'boolean') normalized[k] = v ? 'true' : 'false'
        else if (v == null) normalized[k] = ''
        else normalized[k] = String(v)
    }

    const keys = []
    for (const key in normalized) {
        if (Object.prototype.hasOwnProperty.call(normalized, key)) {
            keys.push(key)
        }
    }
    keys.sort()

    const pairs = []
    for (const key of keys) {
        const encodedKey = encodeURIComponent(key)
        const encodedValue = encodeURIComponent(normalized[key])
        pairs.push(`${encodedKey}=${encodedValue}`)
    }

    return pairs.join('&')
}

function getPathname(url) {
    let pathnameStart = url.indexOf('//') + 2
    if (pathnameStart === 1) pathnameStart = 0
    const pathStart = url.indexOf('/', pathnameStart)
    if (pathStart === -1) return '/'
    const queryStart = url.indexOf('?', pathStart)
    const hashStart = url.indexOf('#', pathStart)

    let pathEnd = queryStart !== -1 ? queryStart : hashStart !== -1 ? hashStart : url.length
    const pathname = url.substring(pathStart, pathEnd)
    return pathname || '/'
}

function buildSignedHeaders({ method, url, params = {}, deviceId, token }) {
    const ClientProfile = {
        client_type: 'web_pc',
        client_version: '1.0.0',
        user_agent: 'Mozilla/5.0',
        origin: 'https://rrsp.com.cn/',
        referer: 'https://rrsp.com.cn/',
    }
    const pathname = getPathname(url)
    const qs = sortedQueryString(params)
    const nowMs = Date.now()
    const SIGN_SECRET = 'ES513W0B1CsdUrR13Qk5EgDAKPeeKZY'
    const xCaSign = generateSignature(
        method,
        deviceId,
        ClientProfile.client_type,
        ClientProfile.client_version,
        nowMs,
        pathname,
        qs,
        SIGN_SECRET
    )
    return {
        clientVersion: ClientProfile.client_version,
        deviceId,
        clientType: ClientProfile.client_type,
        t: String(nowMs),
        aliId: deviceId,
        umid: deviceId,
        token: token || '',
        cv: ClientProfile.client_version,
        ct: ClientProfile.client_type,
        uet: '9',
        'x-ca-sign': xCaSign,
        Accept: 'application/json',
        'User-Agent': ClientProfile.user_agent,
        Origin: ClientProfile.origin,
        Referer: ClientProfile.referer,
    }
}

function generateSignature(method, aliId, ct, cv, timestamp, path, sortedQuery, secret) {
    const signStr = `${method.toUpperCase()}\naliId:${aliId}\nct:${ct}\ncv:${cv}\nt:${timestamp}\n${path}?${sortedQuery}`
    const signature = CryptoJS.HmacSHA256(signStr, secret)
    return CryptoJS.enc.Base64.stringify(signature)
}

function decrypt(str) {
    const AES_KEY = '3b744389882a4067'
    let raw = CryptoJS.enc.Base64.parse(str)
    let key = CryptoJS.enc.Utf8.parse(AES_KEY)

    let decrypted = CryptoJS.AES.decrypt(CryptoJS.lib.CipherParams.create({ ciphertext: raw }), key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
    })

    return decrypted.toString(CryptoJS.enc.Utf8)
}
