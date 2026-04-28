const CryptoJS = createCryptoJS()
const cheerio = createCheerio()

const UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'
const SITE = 'https://www.cupfox.ai'

// ===== 工具函数 =====

function base64Decode(str) {
    if (!str) return ''
    const safeStr = str.replace(/[\r\n]/g, '')
    try {
        // const CryptoJS = createCryptoJS()
        return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(safeStr))
    } catch (e) {
        return ''
    }
}

function md5X(input) {
    // const CryptoJS = createCryptoJS()
    return CryptoJS.MD5(input).toString()
}

const Decode1 = {
    sign(encodedStr) {
        try {
            const decodedRaw = this.customStrDecode(encodedStr)
            const parts = decodedRaw.split('/')
            if (parts.length < 3) return ''
            const mapStrB = parts[0]
            const mapStrA = parts[1]
            const path = parts.slice(2).join('/')
            const cipherMap = JSON.parse(base64Decode(mapStrA))
            const plainMap = JSON.parse(base64Decode(mapStrB))
            const decodedPath = base64Decode(path)
            return this.deString(cipherMap, plainMap, decodedPath)
        } catch (e) {
            console.log(e)

            return ''
        }
    },
    customStrDecode(str) {
        const firstDecode = base64Decode(str)
        const key = md5X('test')
        const len = key.length
        let code = ''
        for (let i = 0; i < firstDecode.length; i++) {
            const k = i % len
            code += String.fromCharCode(firstDecode.charCodeAt(i) ^ key.charCodeAt(k))
        }
        return base64Decode(code)
    },
    deString(cipherList, plainList, text) {
        let result = ''
        for (let i = 0; i < text.length; i++) {
            const char = text[i]
            const isAlpha = /^[a-zA-Z]+$/.test(char)
            if (isAlpha && plainList.includes(char)) {
                const index = cipherList.indexOf(char)
                if (index !== -1 && plainList[index]) {
                    result += plainList[index]
                } else {
                    result += char
                }
            } else {
                result += char
            }
        }
        return result
    },
}

function decode2(encoded) {
    if (!encoded) return ''
    const dictStr = 'PXhw7UT1B0a9kQDKZsjIASmOezxYG4CHo5Jyfg2b8FLpEvRr3WtVnlqMidu6cN'
    const dictLen = dictStr.length
    const lookup = {}
    for (let i = 0; i < dictLen; i++) {
        lookup[dictStr[i]] = dictStr[(i + 59) % dictLen]
    }
    const raw = base64Decode(encoded)
    let res = ''
    for (let i = 1; i < raw.length; i += 3) {
        const char = raw[i]
        res += lookup[char] || char
    }
    return res
}

// ===== 防火墙过盾 =====

function createCookieJar() {
    return {}
}

function mergeSetCookie(cookieJar, setCookieHeaders = []) {
    const values = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]
    for (const item of values) {
        const raw = String(item || '')
        const first = raw.split(';')[0]
        const idx = first.indexOf('=')
        if (idx <= 0) continue
        const name = first.slice(0, idx).trim()
        const value = first.slice(idx + 1).trim()
        if (!name) continue
        cookieJar[name] = value
    }
}

function cookieHeaderStr(cookieJar) {
    return Object.entries(cookieJar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ')
}

function cupfoxFirewallEncrypt(input) {
    const staticchars = 'PXhw7UT1B0a9kQDKZsjIASmOezxYG4CHo5Jyfg2b8FLpEvRr3WtVnlqMidu6cN'
    let encodechars = ''
    const text = String(input || '')
    for (let i = 0; i < text.length; i++) {
        const current = text[i]
        const num0 = staticchars.indexOf(current)
        const code = num0 === -1 ? current : staticchars[(num0 + 3) % 62]
        const num1 = Math.floor(Math.random() * 62)
        const num2 = Math.floor(Math.random() * 62)
        encodechars += staticchars[num1] + code + staticchars[num2]
    }
    // const CryptoJS = createCryptoJS()
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encodechars))
}

function extractFirewallToken(htmlText) {
    const html = String(htmlText || '')
    const match = html.match(/var\s+token\s*=\s*encrypt\("([^"]+)"\)/i)
    return match ? match[1] : ''
}

async function requestText(url) {
    // const cheerio = createCheerio()
    const headers = {
        'User-Agent': UA,
        Referer: SITE + '/',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    const resp = await $fetch.get(url, { headers, timeout: 20000 })
    let text = resp.data || ''

    // 检查是否命中防火墙
    if (!/人机验证|verifyBox/.test(text)) {
        return text
    }

    // 提取token并过盾
    const tokenRaw = extractFirewallToken(text)
    if (!tokenRaw) return text

    const cookieJar = createCookieJar()
    mergeSetCookie(cookieJar, resp.headers ? resp.headers['set-cookie'] || resp.headers['Set-Cookie'] : [])

    const value = cupfoxFirewallEncrypt(url)
    const token = cupfoxFirewallEncrypt(tokenRaw)
    const verifyBody = `value=${encodeURIComponent(value)}&token=${encodeURIComponent(token)}`
    const cookie = cookieHeaderStr(cookieJar)

    const verifyResp = await $fetch.post(`${SITE}/robot.php`, verifyBody, {
        headers: {
            Referer: url,
            Origin: SITE,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            ...(cookie ? { Cookie: cookie } : {}),
        },
    })

    mergeSetCookie(cookieJar, verifyResp.respHeaders ? verifyResp.respHeaders['set-cookie'] || [] : [])

    // 二次请求
    const solvedCookie = cookieHeaderStr(cookieJar)
    const secondResp = await $fetch.get(url, {
        headers: {
            ...headers,
            ...(solvedCookie ? { Cookie: solvedCookie } : {}),
        },
    })
    return secondResp.data || ''
}

async function getConfig() {
    try {
        const html = await requestText(SITE)
        const $ = cheerio.load(html)

        const tabs = []
        $('nav.bm-item-list a').each((index, element) => {
            const $a = $(element)
            const name = $a.text().trim()
            const href = $a.attr('href') || ''
            const match = href.match(/\/type\/(\d+)\.html/)
            if (match && match[1]) {
                tabs.push({
                    name: name,
                    ext: { id: match[1] },
                })
            }
        })

        // 如果没有解析到分类，提供默认分类
        if (tabs.length === 0) {
            tabs.push({ name: '全部', ext: { id: 'all' } })
        }

        return jsonify({
            ver: 1,
            title: '茶杯狐',
            site: SITE,
            tabs: tabs,
        })
    } catch (error) {
        console.error('getConfig error:', error.message || error)
        return jsonify({
            ver: 1,
            title: '茶杯狐',
            site: SITE,
            tabs: [{ name: '全部', ext: { id: 'all' } }],
        })
    }
}

async function getCards(ext) {
    ext = argsify(ext)
    const { id, page = 1 } = ext
    // const cheerio = createCheerio()
    const list = []

    try {
        let url
        if (page === 1 && (!id || id === 'all')) {
            // 首页推荐
            url = SITE
        } else {
            url = `${SITE}/type/${id}-${page}.html`
        }

        const html = await requestText(url)
        // console.log(html)

        const $ = cheerio.load(html)

        $('.movie-list-item').each((_, element) => {
            const $item = $(element)
            const $a = $item.find('a').first()
            const $img = $item.find('.Lazy')
            const $note = $item.find('.movie-item-note')
            const $score = $item.find('.movie-item-score')

            const name = $a.attr('title') || $a.text().trim()
            const href = $a.attr('href') || ''
            let pic = $img.attr('data-original') || $img.attr('src') || ''

            if (pic && !pic.startsWith('http')) {
                pic = SITE + pic
            }

            let remarks = $note.text().trim()
            if (!remarks) {
                remarks = $score.text().trim()
            }

            if (name && href) {
                list.push({
                    vod_id: href,
                    vod_name: name,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    ext: { url: href },
                })
            }
        })

        // 首页时也尝试解析首页推荐
        if (page === 1 && list.length === 0) {
            $('.mobile-main .panel').each((i, panel) => {
                const $panel = $(panel)
                $panel.find('.movie-list-item').each((_, element) => {
                    const $item = $(element)
                    const $a = $item.find('a').first()
                    const $img = $item.find('.Lazy')
                    const $note = $item.find('.movie-item-note')
                    const $score = $item.find('.movie-item-score')

                    const name = $a.attr('title') || ''
                    const href = $a.attr('href') || ''
                    let pic = $img.attr('data-original') || ''

                    if (pic && !pic.startsWith('http')) {
                        pic = SITE + pic
                    }

                    let remarks = $note.text().trim()
                    if (!remarks) remarks = $score.text().trim()

                    if (name && href) {
                        list.push({
                            vod_id: href,
                            vod_name: name,
                            vod_pic: pic,
                            vod_remarks: remarks,
                            ext: { url: href },
                        })
                    }
                })
            })
        }
    } catch (error) {
        console.error('getCards error:', error.message || error)
    }

    return jsonify({ list, page })
}

async function getTracks(ext) {
    ext = argsify(ext)
    const { url } = ext
    // const cheerio = createCheerio()

    if (!url) {
        return jsonify({ list: [], info: {} })
    }

    try {
        const detailUrl = url.startsWith('http') ? url : SITE + url
        const html = await requestText(detailUrl)
        const $ = cheerio.load(html)

        // 基本信息
        const info = {
            vod_pic: '',
            vod_desc: '',
        }

        // 封面 - 优先用 og:image
        const ogImage = $('meta[property="og:image"]').attr('content') || ''
        if (ogImage) {
            info.vod_pic = ogImage
        } else {
            let pic = $('.poster img').attr('src') || ''
            if (pic && !pic.startsWith('http')) pic = SITE + pic
            info.vod_pic = pic
        }

        // 简介
        info.vod_desc =
            $('.summary').clone().find('.ectogg').remove().end().text().trim() ||
            $('meta[name="description"]').attr('content') ||
            ''

        // 播放线路
        const lines = []
        const playFrom = []
        const playUrlArr = []

        $('.play_source_tab .swiper-slide').each((i, el) => {
            let name = $(el).clone().children().remove().end().text().trim()
            playFrom.push(name || `线路${i + 1}`)
        })

        $('.play_list_box').each((i, el) => {
            const urls = []
            $(el)
                .find('.content_playlist li a')
                .each((j, item) => {
                    const name = $(item).text().trim()
                    const link = $(item).attr('href') || ''
                    if (name && link) {
                        urls.push({ name, link })
                    }
                })
            playUrlArr.push(urls)
        })

        // 构建线路列表
        const maxLines = Math.max(playFrom.length, playUrlArr.length)
        for (let i = 0; i < maxLines; i++) {
            const lineName = playFrom[i] || `线路${i + 1}`
            const episodes = playUrlArr[i] || []
            const tracks = episodes.map((ep) => ({
                name: ep.name,
                ext: { url: ep.link.startsWith('http') ? ep.link : SITE + ep.link },
            }))
            if (tracks.length > 0) {
                lines.push({ title: lineName, tracks })
            }
        }

        // 如果没有解析到播放列表，返回空
        if (lines.length === 0) {
            return jsonify({ list: [], info })
        }

        return jsonify({ list: lines, info })
    } catch (error) {
        console.error('getTracks error:', error.message || error)
        return jsonify({ list: [], info: {} })
    }
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const { url } = ext
    // console.log(url)

    // const cheerio = createCheerio()

    if (!url) {
        return jsonify({ urls: [], headers: [] })
    }

    try {
        const playUrl = url.startsWith('http') ? url : SITE + url
        const html = await requestText(playUrl)
        const $ = cheerio.load(html)

        let vid = ''

        // 从 script 中提取 player_aaaa（括号计数法）
        const htmlStr = html || ''
        const idx = htmlStr.indexOf('player_aaaa')
        if (idx > -1) {
            const braceStart = htmlStr.indexOf('{', idx)
            if (braceStart > -1) {
                let depth = 0
                let braceEnd = -1
                for (let i = braceStart; i < htmlStr.length && i < braceStart + 5000; i++) {
                    if (htmlStr[i] === '{') depth++
                    if (htmlStr[i] === '}') depth--
                    if (depth === 0) {
                        braceEnd = i
                        break
                    }
                }
                if (braceEnd > braceStart) {
                    try {
                        const playerData = JSON.parse(htmlStr.substring(braceStart, braceEnd + 1))
                        if (playerData && playerData.url) vid = playerData.url
                    } catch (e) {}
                }
            }
        }

        if (!vid) {
            console.warn('getPlayinfo: 未找到视频ID')
            return jsonify({ urls: [], headers: [] })
        }

        const encodedVid = encodeURIComponent(vid)

        // 请求API获取播放地址
        const apiResp = await $fetch.post(`${SITE}/foxplay/api.php`, `vid=${encodedVid}`, {
            headers: {
                'User-Agent': UA,
                Referer: `${SITE}/foxplay/muiplayer.php?vid=${encodedVid}`,
                Origin: SITE,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })

        const json = typeof apiResp.data === 'string' ? JSON.parse(apiResp.data) : apiResp.data

        if (json && json.code === 200 && json.data) {
            const encryptedUrl = json.data.url
            const urlMode = json.data.urlmode
            let realUrl = encryptedUrl

            if (urlMode === 1) {
                realUrl = Decode1.sign(encryptedUrl)
            } else if (urlMode === 2) {
                realUrl = decode2(encryptedUrl)
            }

            if (realUrl) {
                return jsonify({
                    urls: [realUrl],
                    headers: [
                        {
                            'User-Agent': UA,
                            Referer: `${SITE}/foxplay/muiplayer.php?vid=${encodedVid}`,
                        },
                    ],
                })
            }
        }

        return jsonify({ urls: [], headers: [] })
    } catch (error) {
        console.error('getPlayinfo error:', error.message || error)
        return jsonify({ urls: [], headers: [] })
    }
}

async function search(ext) {
    ext = argsify(ext)
    const { text, wd, page = 1 } = ext
    const keyword = text || wd || ''
    // const cheerio = createCheerio()
    const list = []

    if (!keyword) {
        return jsonify({ list, page })
    }

    try {
        const url = `${SITE}/search/${encodeURIComponent(keyword)}----------${page}---.html`
        const html = await requestText(url)
        const $ = cheerio.load(html)

        $('.vod-search-list .box').each((i, el) => {
            const $item = $(el)
            const $link = $item.find('a.cover-link')
            const $img = $item.find('.Lazy')

            const name = $item.find('.movie-title').text().trim()
            const id = $link.attr('href') || ''
            let pic = $img.attr('data-original') || $img.attr('src') || ''

            if (pic && !pic.startsWith('http')) {
                pic = SITE + pic
            }

            let remarks = $item.find('.movie-item-note').text().trim()
            if (!remarks) {
                remarks = $item.find('.meta.getop').text().trim()
            }

            if (name && id) {
                list.push({
                    vod_id: id,
                    vod_name: name,
                    vod_pic: pic,
                    vod_remarks: remarks,
                    ext: { url: id },
                })
            }
        })
    } catch (error) {
        console.error('search error:', error.message || error)
    }

    return jsonify({ list, page })
}
