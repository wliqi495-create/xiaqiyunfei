/*
 * 🏃 追忆影视 (Nox) - TVBox T4 插件 [智能线路版]
 *
 * * 核心功能：
 * - 动态获取：首页推荐、分类列表、筛选配置 (API直出)
 * - 详情解析：对接 API 获取完整影片信息及分发播放源
 * - 播放解析：对接解析 API 并内置 AES-256-CBC 解密获取真实播放地址
 * - 搜索功能：支持关键词搜索和分页，精确匹配搜索结果
 *
* * 增强功能：
 * - 线路管理系统：支持排序、重命名、屏蔽
 * - 官源智能解析：腾讯/爱奇艺/优酷等使用自动解析器轮询
 * - 可自定义解析器：岁岁解析、虾米解析、芒果解析（自动轮询）
 * 
 * 修改时间：2026-03-01
 */

const CryptoJS = require("crypto-js");
const axios = require("axios");

// ==========================================
// 1. 线路管理配置中心（新增）
// ==========================================

const sourceConfig = {
  // 线路配置：以线路名称作为key
  // mode可选：direct(原代码解密逻辑)/auto(智能解析)
  // parserPriority: 解析器优先级列表
  lines: {
    // 官源线路 - 使用自动解析（带解析器轮询）
    '腾讯': { 
      displayName: '🌟腾讯视频🌟', 
      order: 201, 
      enabled: true, 
      mode: 'auto',
      parserPriority: ['岁岁解析', '虾米解析']
    },
    '芒果': { 
      displayName: '🌟芒果TV🌟', 
      order: 202, 
      enabled: true, 
      mode: 'auto',
      parserPriority: ['芒果解析', '虾米解析']
    },
    '爱奇艺': { 
      displayName: '🌟爱奇艺🌟', 
      order: 203, 
      enabled: true, 
      mode: 'auto',
      parserPriority: ['岁岁解析', '虾米解析']
    },
    '优酷': { 
      displayName: '🌟优酷视频🌟', 
      order: 204, 
      enabled: true, 
      mode: 'auto',
      parserPriority: ['虾米解析']
    },
    '哔哩哔哩': { 
      displayName: '🌟哔哩哔哩🌟', 
      order: 205, 
      enabled: true, 
      mode: 'auto',
      parserPriority: ['虾米解析']
    },
    '搜狐视频': { 
      displayName: '🌟搜狐视频🌟', 
      order: 206, 
      enabled: true, 
      mode: 'direct'
    },
    '风行视频': { 
      displayName: '🌟风行视频🌟', 
      order: 207, 
      enabled: true, 
      mode: 'direct'
    },
    '🔥蓝光🔥': { 
      displayName: '🔥蓝光🔥', 
      order: 103, 
      enabled: true,
      mode: 'direct'
    },
    '🔥蓝光二🔥': { 
      displayName: '🔥蓝光二🔥', 
      order: 104, 
      enabled: false,
      mode: 'direct'
    },
    '🔥蓝光三🔥': { 
      displayName: '🔥蓝光三🔥', 
      order: 105, 
      enabled: true,
      mode: 'direct'
    },
    '🔥蓝光4K🔥': { 
      displayName: '🔥蓝光4K🔥', 
      order: 101, 
      enabled: true,
      mode: 'direct'
    },
    '🔥蓝光2K🔥': { 
      displayName: '🔥蓝光2K🔥', 
      order: 102, 
      enabled: true,
      mode: 'direct'
    },
    '金牌蓝光': { 
      displayName: '🌷金牌蓝光🌷', 
      order: 301, 
      enabled: true,
      mode: 'direct'
    },
    '人人美剧': { 
      displayName: '🌷人人视频🌷', 
      order: 302, 
      enabled: true,
      mode: 'direct'
    },
    '旺旺蓝光': { 
      displayName: '🌷旺旺蓝光🌷', 
      order: 303, 
      enabled: true,
      mode: 'direct'
    },
    '修罗蓝光': { 
      displayName: '🌷修罗蓝光🌷', 
      order: 304, 
      enabled: true,
      mode: 'direct'
    },
    '剧圈圈蓝光': { 
      displayName: '🌷剧圈圈蓝光🌷', 
      order: 305, 
      enabled: true,
      mode: 'direct'
    }
    // 其他线路不配置，自动后置+使用原代码解密逻辑
  },

  // 解析器配置（函数名映射）
  parsers: {
    '岁岁解析': 'parse_ss',
    '虾米解析': 'parse_',
    '芒果解析': 'parse_mg'
  },

  // 全局设置
  settings: {
    defaultOrder: 999,      // 未配置线路默认排序（放最后）
    defaultMode: 'direct'   // 未配置线路默认模式（原代码逻辑）
  }
};

// ==========================================
// 2. 线路管理器（新增）
// ==========================================

const LineManager = {
  /**
   * 获取线路配置（支持模糊匹配）
   */
  getConfig(lineName) {
    if (!lineName) return null;
    // 精确匹配
    if (sourceConfig.lines[lineName]) {
      return sourceConfig.lines[lineName];
    }
    // 模糊匹配
    for (const key of Object.keys(sourceConfig.lines)) {
      if (lineName.includes(key) || key.includes(lineName)) {
        return sourceConfig.lines[key];
      }
    }
    return null;
  },

  /**
   * 判断是否屏蔽
   */
  isBlocked(lineName) {
    const cfg = this.getConfig(lineName);
    return cfg && cfg.enabled === false;
  },

  /**
   * 获取mode（未配置默认direct，使用原代码逻辑）
   */
  getMode(lineName) {
    const cfg = this.getConfig(lineName);
    return cfg?.mode || sourceConfig.settings.defaultMode;
  },

  /**
   * 获取显示名称
   */
  getDisplayName(lineName) {
    const cfg = this.getConfig(lineName);
    return cfg?.displayName || lineName;
  },

  /**
   * 获取排序权重（未配置放最后）
   */
  getOrder(lineName) {
    const cfg = this.getConfig(lineName);
    return cfg?.order ?? sourceConfig.settings.defaultOrder;
  },

  /**
   * 获取解析器优先级列表
   */
  getParserPriority(lineName) {
    const cfg = this.getConfig(lineName);
    return cfg?.parserPriority || [];
  },

  /**
   * 获取解析器函数名
   */
  getParserFuncName(parserName) {
    return sourceConfig.parsers[parserName] || '';
  },

  /**
   * 处理线路列表：排序、过滤、重命名
   * 有配置的官源在前，未配置的第三方在后
   */
  processLines(lines) {
    if (!Array.isArray(lines)) return [];

    const processed = lines.map(line => {
      const lineName = line.lineName || line.name || '';
      const cfg = this.getConfig(lineName);

      return {
        ...line,
        displayName: this.getDisplayName(lineName),
        order: this.getOrder(lineName),
        mode: this.getMode(lineName),
        parserPriority: this.getParserPriority(lineName),
        hasConfig: !!cfg,
        originalName: lineName
      };
    }).filter(line => !this.isBlocked(line.originalName));

    // 按order排序（有配置官源在前，未配置在后）
    processed.sort((a, b) => a.order - b.order);
    return processed;
  }
};

// === 全局配置信息（原代码保持不变）===
const HOST = "http://110.42.37.69:8080";
const HEADERS = {
  "User-Agent": "Dart/3.4 (dart:io)",
  "x-device-id": "3585424312a78a95",
  "x-app-package": "com.recall.app",
  "x-app-signature": "EB:19:FD:A7:8F:67:99:CD:6C:F0:6F:A4:72:3F:7A:C7:E9:2E:95:79:6F:5B:60:EA:CD:D8:05:CF:3E:06:D9:71",
  "x-app-version-code": "20",
  "x-app-version-name": "2.0.0"
};

// 统一请求处理（原代码保持不变）
const request = async (url, options = {}) => {
  try {
    const res = await axios({
      url: url,
      method: options.method || "GET",
      headers: Object.assign({}, HEADERS, options.headers || {}),
      data: options.data || null,
      timeout: 10000,
    });
    return res.data;
  } catch (e) {
    console.error(`[追忆影视] Request error: ${url}`, e.message);
    return null;
  }
};

// --- 首页与分类配置 ---
const _home = async ({ filter }) => {
  let classes = [];
  let filters = {};
  let list = [];

  // 1. 获取分类和动态筛选条件
  const catRes = await request(`${HOST}/api/categories`);
  if (catRes && catRes.code === 0 && catRes.data) {
    const filterNames = { classes: "类型", years: "年份", areas: "地区", sort: "排序" };
    for (let item of catRes.data) {
      // 去除推荐和公告分类
      const excludeTypes = ['推荐', '公告', '首页推荐', '系统公告', '通知'];
      if (excludeTypes.some(type => item.type_name.includes(type))) {
        continue;
      }
      
      classes.push({ type_id: item.type_id, type_name: item.type_name });
      
      if (item.filters) {
        let typeFilters = [];
        for (let key of Object.keys(item.filters)) {
          let options = item.filters[key];
          if (Array.isArray(options) && options.length > 0) {
            let values = [{ n: "全部", v: "" }];
            for (let opt of options) values.push({ n: opt, v: opt });
            typeFilters.push({ 
              key: key, 
              name: filterNames[key] || key, 
              init: "", 
              value: values 
            });
          }
        }
        if (typeFilters.length > 0) {
          filters[item.type_id] = typeFilters;
        }
      }
    }
  }

  // 2. 获取首页推荐视频
  const homeRes = await request(`${HOST}/api/renren/homepage`);
  let idMap = {};
  if (homeRes && homeRes.code === 0 && homeRes.data) {
    // 轮播图
    if (homeRes.data.banners) {
      for (let b of homeRes.data.banners) {
        if (!idMap[b.id]) {
          idMap[b.id] = true;
          list.push({ 
            vod_id: b.id, 
            vod_name: b.name, 
            vod_pic: b.banner_url, 
            vod_remarks: String(b.score || b.year || "") 
          });
        }
      }
    }
    // 推荐模块
    if (homeRes.data.modules) {
      for (let m of homeRes.data.modules) {
        if (m.visible && m.data && m.data.content) {
          for (let c of m.data.content) {
            if (!idMap[c.id]) {
              idMap[c.id] = true;
              list.push({ 
                vod_id: c.id, 
                vod_name: c.name, 
                vod_pic: c.banner_url, 
                vod_remarks: String(c.score || c.year || "") 
              });
            }
          }
        }
      }
    }
  }

  return {
    class: classes,
    filters: filters,
    list: list,
  };
};

// --- 分类列表页（原代码保持不变）---
const _category = async ({ id, page, filter, filters }) => {
  let pg = parseInt(page) || 1;
  let url = `${HOST}/api/category?type=${id}&page=${pg}&limit=20`;

  // 附加筛选参数
  if (filters) {
    for (let key in filters) {
      if (filters[key]) {
        url += `&${key}=${encodeURIComponent(filters[key])}`;
      }
    }
  }

  const res = await request(url);
  let list = [];
  let total = 0;
  let pageCount = 1;

  if (res && res.code === 0 && res.data) {
    for (let item of res.data.list) {
      list.push({ 
        vod_id: item.vod_id, 
        vod_name: item.vod_name, 
        vod_pic: item.image_url, 
        vod_remarks: String(item.vod_remarks || item.score || item.vod_year || "") 
      });
    }
    total = res.data.total || 0;
    pageCount = Math.ceil(total / 20) || 1;
  }

  return {
    list,
    page: pg,
    pagecount: pageCount,
    limit: 20,
    total: total
  };
};

// --- 详情页（修改：增加线路管理）---
const _detail = async ({ id }) => {
  let result = { list: [] };

  for (const id_ of id) {
    const res = await request(`${HOST}/api/videos/${id_}`);

    if (res && res.code === 0 && res.data) {
      let d = res.data;
      let vod = {
        vod_id: d.vod_id, 
        vod_name: d.vod_name, 
        vod_pic: d.vod_pic, 
        type_name: d.type_name,
        vod_year: d.vod_year, 
        vod_area: d.vod_area, 
        vod_remarks: d.vod_remarks,
        vod_actor: d.vod_actor, 
        vod_director: d.vod_director, 
        vod_content: d.vod_blurb
      };

      // 收集原始线路信息
      let rawLines = [];

      if (d.play_sources) {
        for (let source of d.play_sources) {
          if (source.is_disabled === 1) continue;

          let lineName = source.source_name;
          let epList = [];

          for (let ep of source.episodes) {
            // 新格式：线路名称@@source_code@@mode@@url
            // 用于在播放阶段判断使用哪种解析方式
            const mode = LineManager.getMode(lineName);
            epList.push(`${ep.name}$${lineName}@@${source.source_code}@@${mode}@@${ep.url}`);
          }

          if (epList.length > 0) {
            rawLines.push({
              lineName: lineName,
              sourceCode: source.source_code,
              urls: epList.join("#"),
              mode: LineManager.getMode(lineName)
            });
          }
        }
      }

      // 应用线路管理（排序、过滤、重命名）
      const processedLines = LineManager.processLines(rawLines);

      if (processedLines.length === 0) {
        result.list.push(vod);
        continue;
      }

      // 构建最终线路
      let froms = [];
      let urls = [];

      for (let line of processedLines) {
        froms.push(line.displayName);
        urls.push(line.urls);
      }

      vod.vod_play_from = froms.join("$$$");
      vod.vod_play_url = urls.join("$$$");
      result.list.push(vod);
    }
  }

  return result;
};

// --- 搜索功能 ---
const _search = async ({ page, quick, wd }) => {
  let pg = parseInt(page) || 1;
  let url = `${HOST}/api/search?keyword=${encodeURIComponent(wd)}&page=${pg}&limit=20`;

  const res = await request(url);
  let list = [];
  let total = 0;
  let pageCount = 1;

  if (res && res.code === 0 && res.data) {
    // 精准匹配：只保留包含关键词的结果
    const searchTerm = wd.toLowerCase().trim();
    
    for (let item of res.data.list) {
      const vodName = (item.vod_name || '').toLowerCase();
      const typeName = (item.type_name || '').toLowerCase();
      const actor = (item.vod_actor || '').toLowerCase();
      const director = (item.vod_director || '').toLowerCase();
      const remarks = (item.vod_remarks || '').toLowerCase();
      
      // 检查是否在名称、类型、演员、导演、备注中包含关键词
      const isMatch = vodName.includes(searchTerm) || 
                      typeName.includes(searchTerm) || 
                      actor.includes(searchTerm) || 
                      director.includes(searchTerm) || 
                      remarks.includes(searchTerm);
      
      if (isMatch) {
        list.push({ 
          vod_id: item.vod_id, 
          vod_name: item.vod_name, 
          vod_pic: item.image_url, 
          vod_remarks: item.vod_remarks || "", 
          type_name: item.type_name || "" 
        });
      }
    }
    
    // 重新计算总数和页数
    total = list.length;
    pageCount = Math.ceil(total / 20) || 1;
  }

  return {
    list,
    page: pg,
    pagecount: pageCount,
    limit: 20,
    total: total
  };
};

// --- 播放解析（修改：增加智能解析器轮询）---
const _play = async ({ flag, flags, id, app }) => {
  // 解析新格式 id：线路名称@@source_code@@mode@@url
  // 兼容旧格式：source_code,url
  let lineName, sourceCode, mode, playUrlRaw;

  if (id.includes("@@")) {
    // 新格式
    const parts = id.split("@@");
    lineName = parts[0];
    sourceCode = parts[1];
    mode = parts[2];
    playUrlRaw = parts[3];
  } else {
    // 旧格式（兼容）
    const parts = id.split(",");
    sourceCode = parts[0];
    playUrlRaw = parts.slice(1).join(",");
    lineName = sourceCode;
    mode = LineManager.getMode(lineName);
  }

  if (!sourceCode || !playUrlRaw) {
    return { parse: 0, url: id, header: {} };
  }

  console.log(`[追忆影视] 播放: ${lineName}, mode=${mode}`);

  // ========== auto模式：智能解析（轮询解析器）==========
  if (mode === 'auto') {
    console.log(`[追忆影视] 自动解析模式: ${lineName}`);

    // 获取解析器优先级列表
    const parserList = LineManager.getParserPriority(lineName);
    console.log(`[追忆影视] 解析器列表: ${parserList.join(', ') || '无配置'}`);

    // 轮询解析器
    if (parserList.length > 0 && app) {
      for (const parserName of parserList) {
        const funcName = LineManager.getParserFuncName(parserName);
        console.log(`[追忆影视] 尝试解析器: ${parserName} -> ${funcName}`);

        if (funcName && app[funcName]) {
          try {
            const res = await app[funcName]({ flag: lineName, id: playUrlRaw });
            if (res && res.url) {
              console.log(`[追忆影视] ✅ 解析成功 [${parserName}]: ${res.url}`);
              return { 
                parse: 0, 
                url: res.url, 
                header: res.header || { "User-Agent": "ExoPlayer" }
              };
            }
          } catch (e) {
            console.error(`[追忆影视] ❌ 解析器 ${parserName} 失败:`, e.message);
          }
        } else {
          console.log(`[追忆影视] ⚠️ 解析器函数未找到: ${funcName}`);
        }
      }
      console.log('[追忆影视] 所有解析器失败，回退到原代码逻辑');
    }
    // 解析器都失败，继续走原代码的解密逻辑
  }

  // ========== direct模式 或 auto模式回退：使用原代码AES解密逻辑 ==========
  try {
    const res = await request(`${HOST}/api/videos/parse-url`, {
      method: "POST",
      data: { url: playUrlRaw, source_code: sourceCode }
    });

    if (res && res.code === 0 && res.data) {
      let resultStr = res.data.result;

      // AES 解密处理（原代码逻辑）
      if (res.data.encrypted && resultStr.startsWith("enc:")) {
        let cipherText = resultStr.replace("enc:", "");

        let key = CryptoJS.enc.Hex.parse("54e88af0876c0a378c6ad0c426380c0c6c9c5743b51c684c1c45f7d213b16bb4");
        let iv = CryptoJS.enc.Hex.parse("2961e94261178e295a36c6ae873b8d2a");

        resultStr = CryptoJS.AES.decrypt(cipherText, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);
      }

      let parsed = JSON.parse(resultStr);
      if (parsed.parsed_url && parsed.parsed_url.indexOf("http") > -1) {
        return { 
          parse: 0, 
          url: parsed.parsed_url, 
          header: parsed.headers || { "User-Agent": "ExoPlayer" } 
        };
      }
    }
  } catch (e) {
    console.error("[追忆影视] Play extraction error:", e.message);
  }

  // 若解析失败，提供默认返回兜底（原代码逻辑）
  return {
    parse: 0,
    url: playUrlRaw,
    header: { "User-Agent": "ExoPlayer" }
  };
};

const _proxy = async (req, reply) => {
  return Object.assign({}, req.query, req.params);
};

// --- 插件注册元信息 ---
const meta = {
  key: "zhuiyi_app",
  name: "【APP】追忆APP",
  type: 4,
  api: "/video/zhuiyi_app",
  searchable: 1,
  quickSearch: 1,
  changeable: 0,
};

module.exports = async (app, opt) => {
  app.get(meta.api, async (req, reply) => {
    const { extend, filter, t, ac, pg, ext, ids, flag, play, wd, quick } = req.query;

    if (play) {
      return await _play({ flag: flag || "", flags: [], id: play, app });
    } else if (wd) {
      return await _search({
        page: parseInt(pg || "1"),
        quick: quick || false,
        wd,
      });
    } else if (!ac) {
      return await _home({ filter: filter ?? false });
    } else if (ac === "detail") {
      if (t) {
        const body = {
          id: t,
          page: parseInt(pg || "1"),
          filter: filter || false,
          filters: {},
        };
        // 解码筛选参数
        if (ext) {
          try {
            body.filters = JSON.parse(
              CryptoJS.enc.Base64.parse(ext).toString(CryptoJS.enc.Utf8)
            );
          } catch {}
        }
        return await _category(body);
      } else if (ids) {
        return await _detail({
          id: ids.split(",").map((_id) => _id.trim()).filter(Boolean),
        });
      }
    }

    return req.query;
  });

  app.get(`${meta.api}/proxy`, _proxy);
  opt.sites.push(meta);

  console.log(`[追忆影视] 智能线路版已加载`);
  console.log(`[追忆影视] 配置线路: ${Object.keys(sourceConfig.lines).join(', ')}`);
};