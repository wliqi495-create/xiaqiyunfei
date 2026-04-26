/**
 * 🏠 Omnibox - 聚合中心 (不夜版)
 * 
 * @module Omnibox
 * @version 1.0.0
 * @description 聚合远程 Omnibox spider-source 服务端的所有视频源，
 *              提供统一的搜索、分类、详情、播放接口，支持自动 Token 管理。
 * 
 * ────────────────────────────────────────────────────────────────────────────────
 * 📌 功能特性
 * ────────────────────────────────────────────────────────────────────────────────
 * - 自动登录Omnibox服务端，维护 Token 生命周期，
 * - 聚合Omnibox所有视频源，提供统一的搜索、分类、详情、播放接口
 * - 支持按源名称筛选需要显示的顶层分类（通过 INCLUDE_SOURCES 配置）
 * - 搜索结果自动添加源名称前缀，便于区分
 * - 详情页线路组数据完整转换，播放链接按源隔离
 * - 支持全局缓存，减少远程请求频率
 * 
 * ────────────────────────────────────────────────────────────────────────────────
 * ⚙️ 配置说明（修改前请先阅读）
 * ────────────────────────────────────────────────────────────────────────────────
 * 
 * 1️⃣ 基础配置 (SITE_CONFIG)
 *    - title       : 站点名称（展示在 影视 中）
 *    - host        : 远程服务端地址（如 http://192.168.1.1:7023）
 *    - password    : 登录密码
 *    - headers     : 请求头，通常无需修改
 * 
 * 2️⃣ 自定义源筛选 (INCLUDE_SOURCES)
 *    - 类型        : Array<string>
 *    - 说明        : 只显示名称在此数组中的源（完全匹配），留空则显示所有激活源
 *    - 示例        : ['豆瓣', '电影天堂', '茶杯狐']
 * 
 * 3️⃣ 缓存时长 (CACHE_TTL)
 *    - 默认        : 24 * 3600 * 1000 (24小时)
 *    - 作用        : 控制首页与分类配置的缓存时间（一般无变化，可增加）
 * 
 * ────────────────────────────────────────────────────────────────────────────────
 * 🔌 API 路由说明
 * ────────────────────────────────────────────────────────────────────────────────
 * 
 * 模块挂载路径: /video/omnibox
 * 
 * 请求参数：
 *   - 无参数或 ?ac=            → 返回首页配置 (class, filters)
 *   - ?ac=detail&t={源ID}      → 返回该源的分类列表 (支持 ext 传递筛选条件)
 *   - ?ac=detail&ids={ID串}    → 返回视频详情 (ID 格式: 源ID@@@真实ID)
 *   - ?wd={关键词}&pg={页码}    → 搜索
 *   - ?play={播放ID}&flag={线路} → 获取播放地址
 * 
 * 注意：
 *   - 所有 ID 均以 "源ID@@@真实ID" 的格式传递，确保全局唯一
 *   - 筛选参数 ext 为 Base64 编码的 JSON 对象，例如：{"categoryId":"xxx"}
 * 
 * ────────────────────────────────────────────────────────────────────────────────
 * 🔧 工作流程
 * ────────────────────────────────────────────────────────────────────────────────
 * 
 * 1. 启动时自动从远程服务端获取源列表
 * 2. 对每个源调用 home 方法，获取其内部分类，构建顶层 class 与 filters 映射
 * 3. 请求分类数据时，自动补全缺失的筛选参数，默认取第一个有效分类
 * 4. 详情请求解析 ID，分别向对应源获取数据，并重组播放线路
 * 5. 搜索并发请求所有可搜索的源，合并结果
 * 6. 播放请求解析 ID 后调用对应源的 play 方法，返回实际播放地址
 * 
 * ────────────────────────────────────────────────────────────────────────────────
 * 📝 注意事项
 * ────────────────────────────────────────────────────────────────────────────────
 * - 所有日志均通过 log.info 输出，便于追踪调试
 * - Token 会在过期前 1 分钟自动刷新，无需手动干预
 * - 远程服务端需支持 /api/auth/login 和 /api/spider-source 等标准接口
 * - 若某个源未返回内部分类，则其 filter 为空，但不影响顶层分类的显示
 * 
 * 更新时间: 2025-03-26
 */

const axios = require('axios');

// ==================== 自定义配置 ====================
// 要显示的源名称列表（根据 name 匹配），留空则显示所有激活源
const INCLUDE_SOURCES = ['木兮','瓜子','天堂','韩剧','独播','爱看','在线','热播','玩偶']; // 例如 ['源A', '源B']

// ==================== 全局日志 ====================
let log = () => {};

// ==================== 站点配置 ====================
const SITE_CONFIG = {
    title: '聚合中心',
    host: 'http://*.*.*.*:7023',
    password: '******',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
    }
};

// ==================== 全局状态 ====================
let API_TOKEN = "";
let TOKEN_EXPIRES = 0;

let HOME_CACHE = null;
let HOME_CACHE_TIME = 0;
const CACHE_TTL = 24 * 3600 * 1000; // 缓存1小时

// ==================== 核心工具 ====================

/**
 * 确保 Token 存活，若过期则自动登录
 */
async function ensureAuth() {
    if (API_TOKEN && Date.now() < TOKEN_EXPIRES) {
        return API_TOKEN;
    }
    log('🔐', 'Token不存在或已过期，准备发起登录请求...');
    try {
        const loginUrl = `${SITE_CONFIG.host}/api/auth/login`;
        log('🔐', `POST ${loginUrl}`);
        
        const res = await axios.post(loginUrl, { password: SITE_CONFIG.password }, {
            headers: SITE_CONFIG.headers,
            timeout: 10000
        });

        if (res.data && res.data.success && res.data.data) {
            API_TOKEN = res.data.data.token;
            const expTimeStr = res.data.data.expiresAt;
            TOKEN_EXPIRES = new Date(expTimeStr).getTime() - 60000; // 提前1分钟过期
            log('✅', '登录成功', `获取到Token，过期时间: ${expTimeStr}`);
            return API_TOKEN;
        } else {
            log('❌', '登录失败，响应数据异常', JSON.stringify(res.data));
        }
    } catch (e) {
        log('❌', '登录请求发生异常', e.message);
    }
    return null;
}

/**
 * 封装通用请求，自动带上 Authorization
 */
async function requestApi(path, body = null, method = 'POST') {
    const token = await ensureAuth();
    const url = `${SITE_CONFIG.host}${path}`;
    
    log('🌐', `发起 API 请求: [${method}] ${url}`);
    if (body) log('🌐', `请求参数: ${JSON.stringify(body)}`);
    
    try {
        const res = await axios({
            url,
            method,
            headers: {
                ...SITE_CONFIG.headers,
                'Authorization': `Bearer ${token}`
            },
            data: body,
            timeout: 15000
        });

        if (res.data && res.data.success) {
            log('✅', `请求成功 [${path}]`, `响应状态码: ${res.data.code}`);
            return res.data.data;
        } else {
            log('⚠️', `请求业务异常 [${path}]`, JSON.stringify(res.data));
            return null;
        }
    } catch (e) {
        log('❌', `请求网络异常 [${path}]`, e.message);
        return null;
    }
}

// ==================== 核心业务逻辑 ====================

/**
 * 首页与分类获取：映射多个源到顶层 Class，源内分类映射到 Filter
 */
const _home = async () => {
    log('🏠', '开始执行 _home 获取聚合首页配置...');

    if (HOME_CACHE && Date.now() < HOME_CACHE_TIME) {
        log('🏠', '命中 Home 本地缓存，直接返回');
        return HOME_CACHE;
    }

    log('🏠', '获取远程 spider-source 源列表...');
    const sources = await requestApi('/api/spider-source', null, 'GET');
    
    if (!sources || !Array.isArray(sources)) {
        log('❌', '获取源列表失败或格式错误');
        return { class: [], filters: {}, list: [] };
    }

    let activeSources = sources.filter(s => s.isActive === 1);
    
    // 根据 INCLUDE_SOURCES 过滤需要显示的源
    if (INCLUDE_SOURCES.length > 0) {
        activeSources = activeSources.filter(s => INCLUDE_SOURCES.includes(s.name));
        log('🏠', `根据自定义配置，筛选后剩余 ${activeSources.length} 个源`);
    } else {
        log('🏠', `所有激活源共 ${activeSources.length} 个`);
    }

    const classes = [];
    const filters = {};
    
    // 遵从"筛选别丢"逻辑：拉取每个源的分类并转为二级筛选菜单
    for (const src of activeSources) {
        classes.push({ type_id: src.id, type_name: src.name });
        
        log('🏠', `准备拉取源 [${src.name}](${src.id}) 的 Home 筛选配置...`);
        const homeData = await requestApi(`/api/spider-source/${src.id}/execute`, {
            method: 'home',
            params: {}
        });

        if (homeData && homeData.class && Array.isArray(homeData.class)) {
            log('🏠', `源 [${src.name}] 成功获取到 ${homeData.class.length} 个内部子分类`);
            // 将内部 class 转换为 TVBox filter 的结构
            filters[src.id] = [{
                key: 'categoryId',
                name: '所属分类',
                value: homeData.class.map(c => ({ n: c.type_name, v: c.type_id }))
            }];
        } else {
            log('⚠️', `源 [${src.name}] 未返回有效的内部子分类`);
        }
    }

    HOME_CACHE = { class: classes, filters, list: [] };
    HOME_CACHE_TIME = Date.now() + CACHE_TTL;
    
    log('🏠', '_home 执行完毕，缓存已更新');
    return HOME_CACHE;
};

/**
 * 分类列表获取
 */
const _category = async (sourceId, page, filtersObj) => {
    log('📂', `开始执行 _category, 目标源 ID: ${sourceId}, 页码: ${page}, 筛选参数: ${JSON.stringify(filtersObj)}`);

    // 默认获取筛选参数中的 categoryId，若为空则使用第一个可用的筛选项
    let categoryId = filtersObj.categoryId || "";
    
    // 如果 categoryId 为空且存在 Home 缓存，则从该源的 filter 中取第一个值作为默认
    if (!categoryId && HOME_CACHE && HOME_CACHE.filters && HOME_CACHE.filters[sourceId]) {
        const firstFilter = HOME_CACHE.filters[sourceId][0];
        if (firstFilter && firstFilter.value && firstFilter.value.length > 0) {
            categoryId = firstFilter.value[0].v;
            log('📂', `未提供 categoryId，使用默认第一个筛选项: ${categoryId}`);
        }
    }
    
    const reqBody = {
        method: 'category',
        params: {
            categoryId: categoryId,
            page: parseInt(page || 1)
        }
    };

    const res = await requestApi(`/api/spider-source/${sourceId}/execute`, reqBody);
    if (!res || !res.list) {
        log('⚠️', '_category 请求未返回列表数据');
        return { list: [], page: parseInt(page || 1), pagecount: parseInt(page || 1) };
    }

    // 处理 vod_id 防止多个源重名冲突，我们在前面拼接上 "sourceId@@@" 
    const list = res.list.map(item => ({
        ...item,
        vod_id: `${sourceId}@@@${item.vod_id}`
    }));

    log('📂', `_category 执行完毕，成功获取 ${list.length} 条数据，总页数: ${res.pagecount}`);
    
    return {
        list,
        page: res.page || parseInt(page || 1),
        pagecount: res.pagecount || 999,
        total: res.total || list.length
    };
};

/**
 * 详情获取
 */
const _detail = async (combinedIds) => {
    log('📋', `开始执行 _detail, 请求 ID 集合: ${combinedIds}`);
    const resultList = [];
    const idsArray = combinedIds.split(',');

    for (const idStr of idsArray) {
        const [sourceId, realVodId] = idStr.split('@@@');
        if (!sourceId || !realVodId) {
            log('⚠️', `_detail 参数解析失败，跳过非标 ID: ${idStr}`);
            continue;
        }

        log('📋', `正在获取详情数据: 源=${sourceId}, 真实ID=${realVodId}`);
        const res = await requestApi(`/api/spider-source/${sourceId}/execute`, {
            method: 'detail',
            params: {
                videoId: realVodId,
                source: 'web'
            }
        });

        if (res && res.list && res.list.length > 0) {
            const detail = res.list[0];
            detail.vod_id = idStr; // 恢复聚合 ID

            const playFrom = [];
            const playUrl = [];

            if (detail.vod_play_sources && Array.isArray(detail.vod_play_sources)) {
                log('📋', `找到 ${detail.vod_play_sources.length} 条线路组数据`);
                for (const source of detail.vod_play_sources) {
                    playFrom.push(source.name);
                    
                    const eps = source.episodes.map(ep => {
                        // 组装播放链接的标识符，依然利用 "@@@" 隔离来源和真实 playId
                        return `${ep.name}$${sourceId}@@@${ep.playId}`;
                    });
                    playUrl.push(eps.join('#'));
                }
            } else {
                log('⚠️', `_detail 未找到线路组数据`);
            }

            detail.vod_play_from = playFrom.join('$$$');
            detail.vod_play_url = playUrl.join('$$$');
            resultList.push(detail);
        }
    }

    log('📋', `_detail 执行完毕, 处理完毕 ${resultList.length} 条数据`);
    return { list: resultList };
};

/**
 * 搜索聚合
 */
const _search = async (wd, page) => {
    log('🔎', `开始执行 _search, 关键词: "${wd}", 页码: ${page}`);
    
    // 获取缓存的源列表用来遍历可搜索的源
    let sources = [];
    if (HOME_CACHE && HOME_CACHE.class) {
        sources = HOME_CACHE.class;
    } else {
        const remoteSources = await requestApi('/api/spider-source', null, 'GET');
        if (remoteSources) sources = remoteSources.filter(s => s.isSearchable === 1 && s.isActive === 1);
    }

    const list = [];
    log('🔎', `将在 ${sources.length} 个源中并行检索...`);

    // 使用 Promise.all 提升并发检索速度
    const searchTasks = sources.map(async (src) => {
        const srcId = src.type_id || src.id;
        const srcName = src.type_name || src.name;
        
        try {
            log('🔎', `开始请求源 [${srcName}] 搜索`);
            const res = await requestApi(`/api/spider-source/${srcId}/execute`, {
                method: 'search',
                params: { wd, page: parseInt(page || 1) }
            });

            if (res && res.list && res.list.length > 0) {
                log('🔎', `源 [${srcName}] 返回了 ${res.list.length} 条搜索结果`);
                const mappedList = res.list.map(item => ({
                    ...item,
                    vod_id: `${srcId}@@@${item.vod_id}`,
                    vod_name: `[${srcName}] ${item.vod_name}` // 增加来源前缀辨识度
                }));
                return mappedList;
            }
        } catch (e) {
            log('❌', `源 [${srcName}] 搜索异常`, e.message);
        }
        return [];
    });

    const results = await Promise.all(searchTasks);
    results.forEach(arr => list.push(...arr));

    log('🔎', `_search 执行完毕, 综合匹配到 ${list.length} 条结果`);
    return { list, page: parseInt(page || 1), pagecount: 1 }; 
};

/**
 * 播放解析
 */
const _play = async (flag, combinedPlayId) => {
    log('▶️', `开始执行 _play, 线路标识: ${flag}, 请求播放 ID: ${combinedPlayId}`);
    
    const parts = combinedPlayId.split('@@@');
    if (parts.length < 2) {
        log('❌', '_play 传入 ID 格式异常，缺少隔离符');
        return { parse: 0, url: '' };
    }
    
    const sourceId = parts[0];
    const realPlayId = parts.slice(1).join('@@@');

    log('▶️', `解析到源 ID: ${sourceId}, 真实播放 ID: ${realPlayId}`);

    const res = await requestApi(`/api/spider-source/${sourceId}/execute`, {
        method: 'play',
        params: {
            playId: realPlayId,
            flag: flag,
            source: 'web'
        }
    });

    if (res && res.urls && res.urls.length > 0) {
        // 部分源会返回多个清晰度(RAW, 4k, super 等)，此处默认取第一个
        const playObj = res.urls[0];
        log('✅', `_play 获取到视频地址, 名称: ${playObj.name}, URL片段: ${playObj.url.substring(0, 50)}...`);
        
        return {
            parse: res.parse || 0,
            url: playObj.url,
            header: res.header || {}
        };
    }

    log('⚠️', '_play 接口未返回 urls 数组或为空');
    return { parse: 0, url: '' };
};

// ==================== 路由与模块导出 ====================

const meta = {
    key: 'omnibox',
    name: SITE_CONFIG.title,
    type: 4,
    api: '/video/omnibox',
    searchable: 1,
    quickSearch: 1,
    changeable: 0,
    filterable: 1, // 开启筛选能力
};

module.exports = async (app, opt) => {
    // 强制初始化并接管 log，全部指向 Fastify 的 app.log.info
    log = (...args) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        if (app && app.log && typeof app.log.info === 'function') {
            app.log.info(`[Omnibox] ${msg}`);
        }
    };

    app.get(meta.api, async (req, reply) => {
        const { t, ac, pg, ext, ids, flag, play, wd } = req.query;
        log('📥', '收到 API 请求', `Query: ${JSON.stringify(req.query)}`);

        try {
            if (play) {
                return await _play(flag || '', play);
            }
            if (wd) {
                return await _search(wd, pg);
            }
            if (!ac) {
                return await _home();
            }
            if (ac === 'detail') {
                if (t) {
                    let filtersObj = {};
                    if (ext) {
                        try {
                            filtersObj = JSON.parse(Buffer.from(ext, 'base64').toString('utf-8'));
                            log('📥', `解析 ext 成功: ${JSON.stringify(filtersObj)}`);
                        } catch (e) {
                            log('⚠️', `ext 筛选参数 Base64 解析失败: ${e.message}`);
                        }
                    }
                    return await _category(t, pg, filtersObj);
                }
                if (ids) {
                    return await _detail(ids);
                }
            }
        } catch (e) {
            log('❌', '全链路发生未捕获异常', e.message, e.stack);
            return { error: e.message, list: [] };
        }
        
        log('⚠️', 'API 命中默认底限出口，原样返回入参。');
        return req.query;
    });

    opt.sites.push(meta);
    log('🚀', `${meta.name} 模块初始化并挂载完成。`);
};