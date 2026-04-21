/*
 * 🐈‍⬛ 黑猫APP - TVBox T4 接口插件
 *
 * 站点地址：动态获取
 *
 * 核心功能：
 *   - 首页分类：电影 / 电视剧 / 综艺 / 动漫等
 *   - 分类筛选：类型 / 地区 / 年份 / 字母 / 排序
 *   - 详情解析: 标题、海报、简介、多播放源
 *   - 播放解析: 自动提取直链或vodParse二次解析
 *   - 搜索功能: 支持关键词搜索，优化匹配结果
 *   - 加密通信: 适配 AES-CBC 加密通信
 *
 * 功能增强：
 *   - 支持线路排序 / 重命名 / 屏蔽
 *   - 支持分类排序 / 重命名 / 屏蔽
 *   - 大陆地区融合（大陆/中国大陆/内地 合并显示）
 *   - 年份自动补充（支持自动补全至当前年份）
 * 
 * 修改时间：2026-03-01
 */

const axios = require("axios");
const http = require("http");
const https = require("https");
const CryptoJS = require("crypto-js");

let log = console;

/* ===============================
   源配置 - 黑猫专用
=============================== */

const SOURCE_CONFIG = {
  // 站点配置
  name: "【APP】黑猫APP",
  url: "http://app1-0-0.87333.cc",
  api: "1",
  dataKey: "VwsHxkCViDXEExWa",
  dataIv: "VwsHxkCViDXEExWa",
  init: "",
  search: "",
  version: "",
  ua: "okhttp/3.10.0",
  
  // headers配置 - 黑猫不需要特殊headers
  headers: {
    "User-Agent": "okhttp/3.10.0",
    "Accept-Encoding": "gzip"
  },

  // 分类管理配置
  categories: {
    blockedNames: ["伦理"],   // 屏蔽分类名称
    renameMap: {},            // 重命名
    forceOrder: ["电影","连续剧","综艺","动漫","短剧","直播"]
  },

  // 地区融合配置
  areaMerge: {
    enabled: true,
    displayName: "大陆",
    mergeList: ["中国大陆", "大陆", "内地"]
  },

  // OCR验证码配置
  ocr: {
    enabled: false,
    api: "http://154.222.22.188:9898/ocr/b64/text"
  }
};

/* ===============================
   线路管理（可根据黑猫实际线路调整）
=============================== */
const LineManager = {
  lines: {
    '高清线路1': { displayName: '🐈‍⬛高清线路', order: 301, mode: 'direct', enabled: true },
    '标清线路2': { displayName: '🐈‍⬛标清线路1', order: 302, mode: 'direct', enabled: true },
    '标清线路3': { displayName: '🐈‍⬛标清线路2', order: 303, mode: 'direct', enabled: true  }
  },

  getConfig(name) {
    for (let key in this.lines) {
      if (name.includes(key)) return this.lines[key];
    }
    return null;
  },
  
  isBlocked(name) {
    const cfg = this.getConfig(name);
    return cfg && cfg.enabled === false;
  },
  
  getMode(name) {
    return this.getConfig(name)?.mode || 'direct';
  },
  
  getDisplay(name) {
    return this.getConfig(name)?.displayName || name;
  },
  
  getOrder(name) {
    return this.getConfig(name)?.order || 999;
  }
};

/* ===============================
   运行时变量
=============================== */

let API_HOST = "";
let API_PATH = "";
let AES_KEY = "";
let AES_IV = "";
let INIT_API = "";
let USER_AGENT = "";
let SEARCH_API = "";
let API_VERSION = "";
let IS_INITED = false;
let CATEGORY_CONFIG = {};
let AREA_MERGE_CONFIG = {};
let OCR_CONFIG = {};
let SEARCH_VERIFY = false;

/* ===============================
   HTTP
=============================== */

const _http = axios.create({
  timeout: 15000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  httpAgent: new http.Agent({ keepAlive: true })
});

/* ===============================
   初始化
=============================== */

async function initSource() {
  if (IS_INITED) return;
  
  const cfg = SOURCE_CONFIG;
  
  // 加密配置
  AES_KEY = cfg.dataKey;
  AES_IV = cfg.dataIv || cfg.dataKey;
  INIT_API = cfg.init || "initV119";
  USER_AGENT = cfg.ua || "okhttp/3.10.0";
  API_VERSION = cfg.version || "";
  
  // 分类配置
  CATEGORY_CONFIG = cfg.categories || {
    blockedNames: [],
    renameMap: {},
    forceOrder: []
  };

  // 地区融合配置
  AREA_MERGE_CONFIG = cfg.areaMerge || {
    enabled: false,
    displayName: "内地",
    mergeList: ["中国大陆", "大陆", "内地"]
  };

  // OCR配置
  OCR_CONFIG = cfg.ocr || {
    enabled: false,
    api: "http://154.222.22.188:9898/ocr/b64/text"
  };
  
  // API路径
  const apiVer = cfg.api || "1";
  API_PATH = apiVer === "2" ? "/api.php/qijiappapi" : "/api.php/getappapi";
  
  // 搜索端点
  SEARCH_API = cfg.search || "searchList";
  
  // 处理host
  if (cfg.site) {
    try {
      const siteRes = await _http.get(cfg.site, {
        headers: { "User-Agent": USER_AGENT },
        timeout: 10000
      });
      let host = siteRes.data.trim();
      host = host.replace(/\/$/, "");
      if (!host.startsWith("http")) host = "http://" + host;
      API_HOST = host;
      log.info(`[${cfg.name}] 从site获取: ${API_HOST}`);
    } catch (e) {
      log.error(`[${cfg.name}] 从site获取host失败:`, e.message);
      throw new Error(`无法从site获取host: ${e.message}`);
    }
  } else if (cfg.url) {
    API_HOST = cfg.url.trim().replace(/\/$/, "");
    log.info(`[${cfg.name}] 使用url: ${API_HOST}`);
  } else {
    throw new Error("必须配置 url 或 site");
  }

  // 获取初始化数据，检查是否需要搜索验证
  try {
    const initData = await apiPost(INIT_API);
    if (initData?.config?.system_search_verify_status) {
      SEARCH_VERIFY = true;
      log.info(`[${cfg.name}] 搜索需要验证码验证`);
    }
  } catch (e) {
    log.warn(`[${cfg.name}] 获取初始化配置失败:`, e.message);
  }
  
  IS_INITED = true;
}

/* ===============================
   AES加解密
=============================== */

function aesDecrypt(data) {
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);
  const iv = CryptoJS.enc.Utf8.parse(AES_IV);
  const bytes = CryptoJS.AES.decrypt(
    { ciphertext: CryptoJS.enc.Base64.parse(data) },
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );
  return CryptoJS.enc.Utf8.stringify(bytes);
}

function aesEncrypt(data) {
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);
  const iv = CryptoJS.enc.Utf8.parse(AES_IV);
  const encrypted = CryptoJS.AES.encrypt(
    data,
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

async function apiPost(endpoint, payload = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_HOST}${API_PATH}.index${normalizedEndpoint}`;
  
  if (API_VERSION && !payload.version) {
    payload.version = API_VERSION;
  }

  // 使用简化headers，不需要特殊headers
  const headers = {
    "User-Agent": USER_AGENT,
    "Accept-Encoding": "gzip"
  };

  const res = await _http.post(url, payload, {
    headers: headers,
    timeout: 15000
  });
  
  if (!res.data?.data) return null;
  
  try {
    return JSON.parse(aesDecrypt(res.data.data));
  } catch (e) {
    log.error("JSON解析失败:", e.message);
    return null;
  }
}

/* ===============================
   验证码验证（OCR）
=============================== */

function replaceCode(text) {
  const replacements = {
    'y': '9', '口': '0', 'q': '0', 'u': '0', 'o': '0', 
    '>': '1', 'd': '0', 'b': '8', '已': '2', 'D': '0', '五': '5'
  };
  
  if (text.length === 3) {
    text = text.replace('566', '5066').replace('066', '1666');
  }
  
  return text.split('').map(c => replacements[c] || c).join('');
}

async function getVerificationCode() {
  try {
    const uuid = crypto.randomUUID();
    const verifyUrl = `${API_HOST}${API_PATH}.index/verify/create?key=${uuid}`;
    
    const res = await _http.get(verifyUrl, {
      headers: { "User-Agent": USER_AGENT },
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    const base64Img = Buffer.from(res.data).toString('base64');
    
    const ocrRes = await _http.post(OCR_CONFIG.api, base64Img, {
      headers: { 
        "User-Agent": USER_AGENT,
        "Content-Type": "text/plain"
      },
      timeout: 10000
    });
    
    let code = ocrRes.data;
    if (!code) return null;
    
    code = replaceCode(code);
    
    if (!/^\d{4}$/.test(code)) {
      log.warn(`验证码识别失败: ${code}`);
      return null;
    }
    
    return { uuid, code };
  } catch (e) {
    log.error("验证码获取失败:", e.message);
    return null;
  }
}

/* ===============================
   分类管理
=============================== */

const CategoryManager = {
  processClasses(typeList) {
    const { blockedNames = [], renameMap = {}, forceOrder = [] } = CATEGORY_CONFIG;
    
    let classes = typeList
      .filter(t => !blockedNames.includes(t.type_name))
      .map(t => ({
        type_id: t.type_id,
        type_name: renameMap[t.type_name] || t.type_name
      }));

    if (forceOrder.length > 0) {
      const orderMap = {};
      forceOrder.forEach((name, index) => {
        orderMap[name] = index;
      });

      classes.sort((a, b) => {
        const orderA = orderMap[a.type_name];
        const orderB = orderMap[b.type_name];
        
        if (orderA !== undefined && orderB !== undefined) {
          return orderA - orderB;
        }
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;
        return 0;
      });
    }

    return classes;
  }
};

/* ===============================
   地区融合管理
=============================== */

const AreaMergeManager = {
  isMergeEnabled() {
    return AREA_MERGE_CONFIG.enabled === true;
  },

  getConfig() {
    return AREA_MERGE_CONFIG;
  },

  processAreaFilter(areaList) {
    if (!this.isMergeEnabled() || !areaList || areaList.length === 0) {
      return areaList;
    }

    const { displayName, mergeList } = AREA_MERGE_CONFIG;
    const mergeSet = new Set(mergeList);

    const filtered = areaList.filter(area => !mergeSet.has(area));
    const hasMergeItem = areaList.some(area => mergeSet.has(area));
    
    if (hasMergeItem) {
      const allIndex = filtered.indexOf("全部");
      
      if (allIndex !== -1) {
        filtered.splice(allIndex + 1, 0, displayName);
      } else {
        filtered.unshift(displayName);
      }
    }

    return filtered;
  },

  isMergedValue(selectedValue) {
    if (!this.isMergeEnabled()) {
      return false;
    }
    return selectedValue === AREA_MERGE_CONFIG.displayName;
  },

  getMergeValues() {
    if (!this.isMergeEnabled()) {
      return [];
    }
    return AREA_MERGE_CONFIG.mergeList;
  }
};

/* ===============================
   业务方法
=============================== */

function convertFilters(typeList) {
  const nameMapping = {
    'class': '类型',
    'area': '地区',
    'lang': '语言',
    'year': '年份',
    'sort': '排序'
  };

  const filters = {};
  for (let type of typeList) {
    if (!type.filter_type_list) continue;
    const arr = [];
    for (let f of type.filter_type_list) {
      const filterName = f.name;
      const displayName = nameMapping[filterName] || filterName;
      const key = filterName === 'sort' ? 'by' : filterName;
      
      let valueList = f.list || [];
      
      if (filterName === 'area') {
        valueList = AreaMergeManager.processAreaFilter(valueList);
      }
      if (filterName === 'year') {
        const currentYear = new Date().getFullYear().toString();
        if (!valueList.includes(currentYear)) {
          const allIndex = valueList.indexOf('全部');
          if (allIndex !== -1) {
            valueList.splice(allIndex + 1, 0, currentYear);
          } else {
            valueList.unshift(currentYear);
          }
        }
      }
      arr.push({
        key: key,
        name: displayName,
        value: valueList.map(v => ({ n: v, v: v }))
      });
    }
    filters[type.type_id] = arr;
  }
  return filters;
}

async function mergeAreaSearch(typeId, page, baseFilters, mergeValues) {
  const allResults = [];
  const seenIds = new Set();

  for (const areaValue of mergeValues) {
    try {
      const payload = {
        type_id: typeId,
        page: page,
        ...baseFilters,
        area: areaValue
      };

      const res = await apiPost("typeFilterVodList", payload);
      const list = res?.recommend_list || [];

      for (const item of list) {
        if (!seenIds.has(item.vod_id)) {
          seenIds.add(item.vod_id);
          allResults.push(item);
        }
      }
    } catch (e) {
      log.error(`聚合搜索地区[${areaValue}]失败:`, e.message);
    }
  }

  return allResults;
}

async function searchContent(keyword, page = 1) {
  const payload = {
    keywords: keyword,
    type_id: "0",
    page: String(page)
  };

  if (SEARCH_VERIFY) {
    const verify = await getVerificationCode();
    if (!verify) {
      log.error("获取验证码失败");
      return { list: [], msg: "验证码获取失败" };
    }
    payload.code = verify.code;
    payload.key = verify.uuid;
  }

  const res = await apiPost(SEARCH_API, payload);
  
  if (!res) {
    return { list: [], msg: "搜索失败" };
  }

  const rawList = res.search_list || [];
  
  // 屏蔽"伦理"分类内容
  const filteredByCategory = rawList.filter(item => {
    const vodClass = (item.vod_class || '').toLowerCase();
    return !vodClass.includes('伦理');
  });

  const searchLower = (keyword || '').trim().toLowerCase();
  const filtered = searchLower 
    ? filteredByCategory.filter(item => {
        const text = [
          item.vod_name || '',
          item.vod_remarks || '',
          item.vod_class || ''
        ].join(' ').toLowerCase();
        return text.includes(searchLower);
      })
    : filteredByCategory;

  const list = filtered.map(i => ({
    vod_id: i.vod_id,
    vod_name: i.vod_name,
    vod_pic: i.vod_pic,
    vod_remarks: `${i.vod_year || ''} ${i.vod_class || ''}`.trim()
  }));

  return { 
    list, 
    page, 
    pagecount: 9999, 
    limit: 90, 
    total: 999999 
  };
}

async function getDetail(id) {
  const endpoints = ['vodDetail', 'vodDetail2'];
  let data = null;
  
  for (const endpoint of endpoints) {
    try {
      data = await apiPost(endpoint, { vod_id: id });
      if (data) break;
    } catch (e) {
      log.warn(`详情端点[${endpoint}]失败:`, e.message);
    }
  }
  
  if (!data) return null;

  let lines = [];
  let lineid = 1;
  const nameCount = {};

  for (let line of data.vod_play_list) {
    let name = line.player_info.show;
    
    const keywords = ['防走丢', '群', '防失群', '官网'];
    if (keywords.some(k => name.includes(k))) {
      name = `${lineid}线`;
      line.player_info.show = name;
    }
    
    const count = (nameCount[name] || 0) + 1;
    nameCount[name] = count;
    if (count > 1) {
      name = `${name}${count}`;
      line.player_info.show = name;
    }

    if (LineManager.isBlocked(name)) {
      log.info(`线路已屏蔽: ${name}`);
      lineid++;
      continue;
    }

    let mode = LineManager.getMode(name);
    let list = [];

    for (let vod of line.urls) {
      const payload = [
        line.player_info.parse,
        vod.url,
        'token+' + vod.token,
        line.player_info.player_parse_type,
        line.player_info.parse_type
      ].join(",");
      list.push(`${vod.name}$${name}@@${mode}@@${payload}`);
    }

    if (list.length === 0) {
      lineid++;
      continue;
    }

    lines.push({
      display: LineManager.getDisplay(name),
      urls: list.join("#"),
      order: LineManager.getOrder(name)
    });
    lineid++;
  }

  lines.sort((a, b) => a.order - b.order);

  return {
    vod_id: id,
    vod_name: data.vod.vod_name,
    vod_pic: data.vod.vod_pic,
    vod_remarks: data.vod.vod_remarks,
    vod_content: data.vod.vod_content,
    vod_actor: (data.vod.vod_actor || '').replace('演员', ''),
    vod_director: (data.vod.vod_director || '').replace('导演', ''),
    vod_year: data.vod.vod_year ? data.vod.vod_year + '年' : '',
    vod_area: data.vod.vod_area,
    vod_play_from: lines.map(l => l.display).join("$$$"),
    vod_play_url: lines.map(l => l.urls).join("$$$")
  };
}

async function getPlay(playStr, app) {

  const [lineName, mode, payload] = playStr.split("@@");

  if (LineManager.isBlocked(lineName)) {
    return "";
  }

  if (mode === "auto") {
    const parserList = LineManager.getConfig(lineName)?.parserPriority || [];

    for (let parser of parserList) {
      if (app[parser]) {
        const res = await app[parser]({ id: payload });
        if (res?.url) {
          return res.url;
        }
      }
    }
  }

  const arr = payload.split(",");

  const parse_api = arr[0];
  let kurl = arr[1];
  const token = arr[2]?.replace("token+", "");
  const player_parse_type = arr[3];
  const parse_type = arr[4];

  try {
    kurl = decodeURIComponent(kurl);
  } catch (e) {}

  if (parse_type === '0') {
    const result = {
      parse: 0,
      url: kurl,
      header: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; Android 14)',
      }
    };
    return result;
  }

  if (parse_type === '2') {
    const finalUrl = parse_api + kurl;

    const result = {
      parse: 1,
      url: finalUrl,
      header: {
        'User-Agent': 'Dalvik/2.1.0 (Linux; Android 14)',
      }
    };
    return result;
  }

  if (player_parse_type === '2') {
    try {
      const res = await _http.get(`${parse_api}${kurl}`, {
        headers: { "User-Agent": USER_AGENT },
        timeout: 10000
      });

      if (res.data?.url) {
        const result = {
          parse: 0,
          url: res.data.url
        };
        return result;
      }

    } catch (e) {}
  }

  const encrypted = aesEncrypt(kurl);

  const res = await apiPost("vodParse", {
    parse_api,
    url: encrypted,
    player_parse_type,
    token
  });

  if (!res?.json) {
    return {
      parse: 0,
      url: ""
    };
  }

  const inner = JSON.parse(res.json);

  const result = {
    parse: 0,
    url: inner.url
  };

  return result;
}

/* ===============================
   T4 导出
=============================== */

const META = {
  key: "heimao_app",
  name: SOURCE_CONFIG.name,
  type: 4,
  api: "/video/heimao_app",
  searchable: 1,
  quickSearch: 1,
  filterable: 1
};

module.exports = async (app, opt) => {
  log = app.log;

  app.get(META.api, async (req) => {
    try {
      await initSource();
      
      const { ids, play, wd, t, pg, ext } = req.query;
      const page = parseInt(pg) || 1;

      if (play) {
        const result = await getPlay(play, app);
        if (typeof result === 'string') {
          return { parse: 0, url: result };
        }
        return result;
      }
      
      if (ids) {
        return { list: [await getDetail(ids)] };
      }

      if (wd) {
        return await searchContent(wd, page);
      }

      if (t) {
        let filters = {};
        if (ext) {
          try {
            filters = JSON.parse(Buffer.from(ext, 'base64').toString());
          } catch {}
        }

        const selectedArea = filters.area;
        if (AreaMergeManager.isMergedValue(selectedArea)) {
          const mergeValues = AreaMergeManager.getMergeValues();
          const baseFilters = { ...filters };
          delete baseFilters.area;
          
          const mergedList = await mergeAreaSearch(t, page, baseFilters, mergeValues);
          return { 
            list: mergedList, 
            page: pg, 
            pagecount: 9999, 
            limit: 90, 
            total: 999999 
          };
        }

        const res = await apiPost("typeFilterVodList", {
          type_id: t,
          page,
          area: filters.area || '全部',
          year: filters.year || '全部',
          sort: filters.by || '最新',
          lang: filters.lang || '全部',
          class: filters.class || '全部'
        });

        return { 
          list: res?.recommend_list || [],
          page: pg,
          pagecount: 9999,
          limit: 90,
          total: 999999
        };
      }

      const initData = await apiPost(INIT_API);
      
      const classes = CategoryManager.processClasses(initData.type_list);
      const filterObj = convertFilters(initData.type_list);

      return {
        class: classes,
        filters: filterObj,
        list: initData.type_list.flatMap(t => t.recommend_list || [])
      };
      
    } catch (e) {
      log.error("请求错误:", e.message);
      return { error: e.message };
    }
  });

  opt.sites.push(META);
};

module.exports.META = META;