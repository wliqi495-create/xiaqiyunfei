// =========================================================================
// 1. 全局配置与纯净内存缓存 (必须置于顶部)
// =========================================================================

const currentYear = new Date().getFullYear();
const startYear = Math.max(currentYear + 1, 2026); 
const yearOptions = [];
for (let year = startYear; year >= 1940; year--) { 
    yearOptions.push({ title: `${year}`, value: `${year}` });
}

// 🚀 全新的纯净内存缓存（仅用于动态网页刮削，彻底废弃旧版 JSON 请求）
const ScrapingCache = {
    airtime: {},
    daily: []
};

const DEFAULT_TRAKT_ID = "95b59922670c84040db3632c7aac6f33704f6ffe5cbf3113a056e37cb45cb482";

const GLOBAL_GENRE_MAP_ALL = {
    16: "动画", 10759: "动作冒险", 35: "喜剧", 18: "剧情", 14: "奇幻", 878: "科幻", 9648: "悬疑", 
    10749: "爱情", 27: "恐怖", 10765: "科幻奇幻", 80: "犯罪", 99: "纪录片", 10751: "家庭", 
    36: "历史", 10402: "音乐", 10770: "电视电影", 53: "惊悚", 10752: "战争", 37: "西部", 28: "动作", 12: "冒险",
    10762: "儿童", 10763: "新闻", 10764: "真人秀", 10766: "肥皂剧", 10767: "脱口秀", 10768: "战综"
};

function getGlobalGenreText(ids) {
    if (!ids || !Array.isArray(ids)) return "影视";
    const genres = ids.map(id => GLOBAL_GENRE_MAP_ALL[id]).filter(Boolean);
    return genres.length > 0 ? genres.slice(0, 2).join(" / ") : "影视";
}

// 统一 UI 卡片构建工厂
function buildItem({ id, tmdbId, type, title, date, poster, backdrop, rating, genreText, subTitle, desc }) {
    const baseInfo = [date, subTitle].filter(Boolean).join(" · ");
    const overview = desc ? `\n${desc}` : "\n暂无简介";

    return {
        id: String(id),
        tmdbId: parseInt(tmdbId) || parseInt(id),
        type: "tmdb",
        mediaType: type,
        title: title,
        genreTitle: genreText || (type === "tv" ? "剧集" : "电影"), 
        description: baseInfo ? (baseInfo + overview) : (desc || "暂无简介"),
        releaseDate: date,
        posterPath: poster ? `https://image.tmdb.org/t/p/w500${poster}` : "",
        backdropPath: backdrop ? `https://image.tmdb.org/t/p/w780${backdrop}` : "",
        subTitle: subTitle
    };
}

// =========================================================================
// 2. 终极聚合版 Widget Metadata (史诗七大阵营)
// =========================================================================
var WidgetMetadata = {
    id: "super_ultime_media_hub_makka",
    title: "𝙈𝙖𝙠𝙠𝙖𝙋𝙖𝙠𝙠𝙖·终极聚合",
    description: "动漫、影剧、综艺、流行风向与平台分流一网打尽",
    author: "𝙈𝙖𝙠𝙠𝙖𝙋𝙖𝙠𝙠𝙖",
    version: "1.3.0", // 🚀 更新：彻底拔除旧废弃源，接入专属独立数据源，动态刮削纯净化
    requiredVersion: "0.0.1",
    site: "https://t.me/MakkaPakkaOvO",
    
    globalParams: [
        {
            name: "traktClientId",
            title: "Trakt Client ID",
            type: "input",
            description: "选填，不填则使用内置。Trakt 榜单专用。",
            value: ""
        }
    ],

    modules: [
        // ---------------- 大栏目 1：二次元全境聚合 ----------------
        {
            title: "🌸 动漫全境聚合",
            functionName: "routeAnimeOmni",
            type: "video",
            cacheDuration: 3600,
            params: [
                {
                    name: "anime_source", title: "选择数据源", type: "enumeration", value: "cal",
                    enumOptions: [
                        { title: "Bangumi 追番日历", value: "cal" },
                        { title: "Bilibili 热度榜单", value: "bili" },
                        { title: "Bangumi 近期热门", value: "hot" },
                        { title: "Bangumi 年季度榜", value: "rank" },
                        { title: "Bangumi 每日放送", value: "daily" },
                        { title: "TMDB 热门/新番", value: "tmdb" },
                        { title: "AniList 流行榜单", value: "anilist" },
                        { title: "MAL 权威榜单", value: "mal" }
                    ]
                },
                { name: "cal_day", title: "选择日期", type: "enumeration", value: "today", belongTo: { paramName: "anime_source", value: ["cal"] }, enumOptions: [ { title: "📅 今日更新", value: "today" }, { title: "周一 (月)", value: "1" }, { title: "周二 (火)", value: "2" }, { title: "周三 (水)", value: "3" }, { title: "周四 (木)", value: "4" }, { title: "周五 (金)", value: "5" }, { title: "周六 (土)", value: "6" }, { title: "周日 (日)", value: "7" } ] },
                { name: "bili_sort", title: "榜单分区", type: "enumeration", value: "1", belongTo: { paramName: "anime_source", value: ["bili"] }, enumOptions: [ { title: "📺 B站番剧 (日漫)", value: "1" }, { title: "🇨🇳 B站国创 (国漫)", value: "4" } ] },
                { name: "hot_cat", title: "分类", type: "enumeration", value: "anime", belongTo: { paramName: "anime_source", value: ["hot"] }, enumOptions: [ { title: "动画", value: "anime" } ] },
                { name: "rank_cat", title: "分类", type: "enumeration", value: "anime", belongTo: { paramName: "anime_source", value: ["rank"] }, enumOptions: [ { title: "动画", value: "anime" }, { title: "三次元", value: "real" } ] },
                { name: "rank_year", title: "年份", type: "enumeration", value: `${currentYear}`, belongTo: { paramName: "anime_source", value: ["rank"] }, enumOptions: yearOptions },
                { name: "rank_month", title: "月份/季度", type: "enumeration", value: "all", belongTo: { paramName: "anime_source", value: ["rank"] }, enumOptions: [ { title: "全年", value: "all" }, { title: "冬季 (1月)", value: "1" }, { title: "春季 (4月)", value: "4" }, { title: "夏季 (7月)", value: "7" }, { title: "秋季 (10月)", value: "10" } ] },
                { name: "rank_sort", title: "排序方式", type: "enumeration", value: "collects", belongTo: { paramName: "anime_source", value: ["rank"] }, enumOptions: [ { title: "排名", value: "rank" }, { title: "热度", value: "trends" }, { title: "收藏数", value: "collects" }, { title: "发售日期", value: "date" }, { title: "名称", value: "title" } ] },
                { name: "daily_filter", title: "筛选范围", type: "enumeration", value: "today", belongTo: { paramName: "anime_source", value: ["daily"] }, enumOptions: [ { title: "今日放送", value: "today" }, { title: "指定单日", value: "specific_day" }, { title: "本周一至四", value: "mon_thu" }, { title: "本周五至日", value: "fri_sun" }, { title: "整周放送", value: "all_week" } ] },
                { name: "daily_weekday", title: "指定单日星期", type: "enumeration", value: "1", belongTo: { paramName: "anime_source", value: ["daily"] }, enumOptions: [ { title: "星期一", value: "1" }, { title: "星期二", value: "2" }, { title: "星期三", value: "3" }, { title: "星期四", value: "4" }, { title: "星期五", value: "5" }, { title: "星期六", value: "6" }, { title: "星期日", value: "7" } ] },
                { name: "daily_sort", title: "排序方式", type: "enumeration", value: "popularity_rat_bgm", belongTo: { paramName: "anime_source", value: ["daily"] }, enumOptions: [ { title: "热度(评分人数)", value: "popularity_rat_bgm" }, { title: "评分", value: "score_bgm_desc" }, { title: "放送日(更新日期)", value: "airdate_desc" }, { title: "默认", value: "default" } ] },
                { name: "tmdb_sort", title: "榜单类型", type: "enumeration", value: "trending", belongTo: { paramName: "anime_source", value: ["tmdb"] }, enumOptions: [ { title: "🔥 实时流行 (Trending)", value: "trending" }, { title: "📅 最新首播 (New)", value: "new" }, { title: "👑 高分神作 (Top Rated)", value: "top" } ] },
                { name: "anilist_sort", title: "排序方式", type: "enumeration", value: "TRENDING_DESC", belongTo: { paramName: "anime_source", value: ["anilist"] }, enumOptions: [ { title: "📈 近期趋势 (Trending)", value: "TRENDING_DESC" }, { title: "💖 历史人气 (Popularity)", value: "POPULARITY_DESC" }, { title: "⭐ 评分最高 (Score)", value: "SCORE_DESC" } ] },
                { name: "mal_sort", title: "榜单类型", type: "enumeration", value: "airing", belongTo: { paramName: "anime_source", value: ["mal"] }, enumOptions: [ { title: "🔥 当前热播 Top", value: "airing" }, { title: "🏆 历史总榜 Top", value: "all" }, { title: "🎥 最佳剧场版", value: "movie" }, { title: "🔜 即将上映", value: "upcoming" } ] },
                { name: "page", title: "页码", type: "page" }
            ]
        },

        // ---------------- 大栏目 2：全球影剧类别 ----------------
        {
            title: "🏷️ 全球影剧类别",
            functionName: "loadGenreRank",
            type: "video",
            cacheDuration: 3600,
            params: [
                { name: "sort_by", title: "影视类型", type: "enumeration", value: "all", enumOptions: [ { title: "🌟 全部 (影+剧混合)", value: "all" }, { title: "🎬 电影 (Movie)", value: "movie" }, { title: "📺 电视剧 (TV)", value: "tv" } ] },
                { name: "genre", title: "题材流派", type: "enumeration", value: "all", enumOptions: [ { title: "🌟 全部题材 (All)", value: "all" }, { title: "🛸 科幻 (Sci-Fi)", value: "scifi" }, { title: "🔍 悬疑 (Mystery)", value: "mystery" }, { title: "👻 恐怖 (Horror)", value: "horror" }, { title: "🔪 犯罪 (Crime)", value: "crime" }, { title: "💥 动作 (Action)", value: "action" }, { title: "😂 喜剧 (Comedy)", value: "comedy" }, { title: "❤️ 爱情 (Romance)", value: "romance" }, { title: "🎭 剧情 (Drama)", value: "drama" }, { title: "🐉 奇幻 (Fantasy)", value: "fantasy" }, { title: "🎨 动画 (Animation)", value: "animation" }, { title: "🎥 纪录片 (Documentary)", value: "documentary" } ] },
                { name: "region", title: "国家/地区", type: "enumeration", value: "all", enumOptions: [ { title: "🌍 全球 (所有国家)", value: "all" }, { title: "🇨🇳 中国大陆", value: "cn" }, { title: "🇭🇰 中国香港", value: "hk" }, { title: "🇹🇼 中国台湾", value: "tw" }, { title: "🏮 港台 (香港+台湾)", value: "hktw" }, { title: "🇯🇵 日本", value: "jp" }, { title: "🇰🇷 韩国", value: "kr" }, { title: "🌸 日韩合集", value: "jpkr" }, { title: "🇹🇭 泰国", value: "th" }, { title: "🇸🇬 新加坡", value: "sg" }, { title: "🇲🇾 马来西亚", value: "my" }, { title: "🇮🇳 印度", value: "in" }, { title: "🌏 亚太大区", value: "apac" }, { title: "🇺🇸 美国", value: "us" }, { title: "🇬🇧 英国", value: "gb" }, { title: "🇩🇪 德国", value: "de" }, { title: "🇸🇪 瑞典", value: "se" }, { title: "🇪🇺 欧洲全境", value: "europe" }, { title: "🇪🇸 西班牙", value: "es" }, { title: "🇲🇽 墨西哥", value: "mx" }, { title: "💃 西语/拉丁美洲", value: "latin" } ] },
                { name: "order_rule", title: "排序规则", type: "enumeration", value: "popularity", enumOptions: [ { title: "🔥 热门趋势", value: "popularity" }, { title: "⭐ 评分最高", value: "rating" }, { title: "📅 最新上线", value: "time" } ] },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        },

        // ---------------- 大栏目 3：全能电影榜 ----------------
        {
            title: "🎬 全能电影榜单",
            functionName: "routeMovieOmni",
            type: "video",
            cacheDuration: 3600,
            params: [
                {
                    name: "movie_source", title: "榜单模式", type: "enumeration", value: "general",
                    enumOptions: [
                        { title: "🔥 电影综合榜", value: "general" },
                        { title: "🏆 年度最佳电影", value: "yearly" },
                        { title: "🏷️ 按类型探索", value: "genre" }
                    ]
                },
                { name: "general_sort", title: "榜单分类", type: "enumeration", value: "popular", belongTo: { paramName: "movie_source", value: ["general"] }, enumOptions: [ { title: "🔥 流行趋势 (Popular)", value: "popular" }, { title: "⭐️ 历史高分 (Top Rated)", value: "top_rated" }, { title: "💰 全球票房榜 (Box Office)", value: "box_office" }, { title: "🏆 奥斯卡佳片 (Oscar)", value: "oscar" } ] },
                { name: "yearly_sort", title: "选择年份", type: "enumeration", value: "2024", belongTo: { paramName: "movie_source", value: ["yearly"] }, enumOptions: [ { title: "2025年 最佳", value: "2025" }, { title: "2024年 最佳", value: "2024" }, { title: "2023年 最佳", value: "2023" }, { title: "2022年 最佳", value: "2022" }, { title: "2021年 最佳", value: "2021" }, { title: "2020年 最佳", value: "2020" }, { title: "2019年 最佳", value: "2019" }, { title: "2018年 最佳", value: "2018" }, { title: "2017年 最佳", value: "2017" }, { title: "2016年 最佳", value: "2016" }, { title: "2015年 最佳", value: "2015" } ] },
                { name: "genre_sort", title: "选择类型", type: "enumeration", value: "878", belongTo: { paramName: "movie_source", value: ["genre"] }, enumOptions: [ { title: "🛸 科幻 (Sci-Fi)", value: "878" }, { title: "🎭 剧情 (Drama)", value: "18" }, { title: "🤯 悬疑 (Mystery)", value: "9648" }, { title: "💥 动作 (Action)", value: "28" }, { title: "😂 喜剧 (Comedy)", value: "35" }, { title: "❤️ 爱情 (Romance)", value: "10749" }, { title: "👻 恐怖 (Horror)", value: "27" }, { title: "🔪 犯罪 (Crime)", value: "80" }, { title: "🧙‍♂️ 奇幻 (Fantasy)", value: "14" }, { title: "🦄 动画 (Animation)", value: "16" } ] },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        },

        // ---------------- 大栏目 4：全球综艺频道 ----------------
        {
            title: "📺 全球综艺频道",
            functionName: "loadVarietyShows",
            type: "video",
            cacheDuration: 3600,
            params: [
                {
                    name: "sort_by", title: "国家/地区", type: "enumeration", value: "cn",
                    enumOptions: [
                        { title: "🇨🇳 中国大陆", value: "cn" },
                        { title: "🇰🇷 韩国", value: "kr" },
                        { title: "🇯🇵 日本", value: "jp" },
                        { title: "🇹🇼 中国台湾", value: "tw" },
                        { title: "🇭🇰 中国香港", value: "hk" },
                        { title: "🇺🇸 欧美综合", value: "eu_us" },
                        { title: "🌍 全球综合", value: "all" }
                    ]
                },
                {
                    name: "list_type", title: "排播与榜单", type: "enumeration", value: "hot",
                    enumOptions: [
                        { title: "🔥 近期热播 (Hot)", value: "hot" },
                        { title: "📅 今日更新 (Today)", value: "today" },
                        { title: "🔜 明日预告 (Tomorrow)", value: "tomorrow" },
                        { title: "📈 流行趋势 (5年内热榜)", value: "trend" },
                        { title: "⭐ 高分神级 (Top Rated)", value: "top" }
                    ]
                },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        },

        // ---------------- 大栏目 5：影剧风向标 (IMDb + 烂番茄 + Trakt + 豆瓣) ----------------
        {
            title: "🧭 影剧流行风向",
            functionName: "routeTrendsHub",
            type: "video", 
            cacheDuration: 3600,
            params: [
                {
                    name: "hub_source", 
                    title: "选择平台",
                    type: "enumeration",
                    value: "imdb",
                    enumOptions: [
                        { title: "🟡 IMDb 权威榜单", value: "imdb" },
                        { title: "🍅 烂番茄风向标", value: "rt" },
                        { title: "🌍 Trakt 趋势榜", value: "trakt" },
                        { title: "🟢 豆瓣 国内风向", value: "douban" }
                    ]
                },
                {
                    name: "imdb_sort", title: "IMDb 榜单", type: "enumeration", value: "trending_week",
                    belongTo: { paramName: "hub_source", value: ["imdb"] },
                    enumOptions: [
                        { title: "📅 本周热榜 (Trending Week)", value: "trending_week" }, { title: "🔥 今日热榜 (Trending Day)", value: "trending_day" }, { title: "🌊 流行趋势 (Popular)", value: "popular" }, { title: "💎 高分神作 (Top Rated)", value: "top_rated" }, { title: "🇨🇳 国产剧热度(模拟)", value: "china_tv" }, { title: "🇨🇳 国产电影热度(模拟)", value: "china_movie" }
                    ]
                },
                {
                    name: "mediaType", title: "范围 (仅全球榜有效)", type: "enumeration", value: "all",
                    belongTo: { paramName: "imdb_sort", value: ["trending_week", "trending_day", "popular", "top_rated"] },
                    enumOptions: [ { title: "全部 (剧集+电影)", value: "all" }, { title: "电影", value: "movie" }, { title: "剧集", value: "tv" } ]
                },
                {
                    name: "rt_sort", title: "烂番茄 榜单", type: "enumeration", value: "rt_movies_home",
                    belongTo: { paramName: "hub_source", value: ["rt"] },
                    enumOptions: [
                        { title: "🎬 流媒体热映", value: "rt_movies_home" }, { title: "🍿 院线热映", value: "rt_movies_theater" }, { title: "💎 最佳流媒体", value: "rt_movies_best" }, { title: "📺 热门剧集", value: "rt_tv_popular" }, { title: "🆕 最新上线", value: "rt_tv_new" }
                    ]
                },
                {
                    name: "trakt_sort", title: "Trakt 榜单", type: "enumeration", value: "trending",
                    belongTo: { paramName: "hub_source", value: ["trakt"] },
                    enumOptions: [
                        { title: "🔥 实时热播 (Trending)", value: "trending" }, { title: "🌊 最受欢迎 (Popular)", value: "popular" }, { title: "❤️ 最受期待 (Anticipated)", value: "anticipated" }
                    ]
                },
                {
                    name: "traktType", title: "Trakt 类型", type: "enumeration", value: "all",
                    belongTo: { paramName: "hub_source", value: ["trakt"] },
                    enumOptions: [ { title: "全部 (剧集+电影)", value: "all" }, { title: "剧集", value: "shows" }, { title: "电影", value: "movies" } ]
                },
                {
                    name: "db_sort", title: "豆瓣 榜单", type: "enumeration", value: "db_tv_cn",
                    belongTo: { paramName: "hub_source", value: ["douban"] },
                    enumOptions: [
                        { title: "🇨🇳 热门国产剧", value: "db_tv_cn" }, { title: "🎤 热门综艺", value: "db_variety" }, { title: "🎬 热门电影", value: "db_movie" }, { title: "🇺🇸 热门美剧", value: "db_tv_us" }
                    ]
                },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        },

        // ---------------- 大栏目 6：平台分流片库 ----------------
        {
            title: "🔀 平台分流片库",
            functionName: "loadPlatformMatrix",
            type: "video", 
            cacheDuration: 3600,
            params: [
                {
                    name: "sort_by", title: "内容分类", type: "enumeration", value: "tv_drama",
                    enumOptions: [ 
                        { title: "📺 电视剧", value: "tv_drama" }, 
                        { title: "🎤 综艺", value: "tv_variety" }, 
                        { title: "🐲 动漫", value: "tv_anime" }, 
                        { title: "🎬 电影", value: "movie" } 
                    ]
                },
                {
                    name: "platform", title: "播出平台", type: "enumeration", value: "2007",
                    enumOptions: [
                        { title: "腾讯视频", value: "2007" }, { title: "爱奇艺", value: "1330" }, { title: "优酷", value: "1419" }, { title: "芒果TV", value: "1631" }, { title: "Bilibili", value: "1605" }, { title: "Netflix", value: "213" }, { title: "Disney+", value: "2739" }, { title: "HBO", value: "49" }, { title: "Apple TV+", value: "2552" }
                    ]
                },
                {
                    name: "sort", title: "排序", type: "enumeration", value: "popularity.desc",
                    enumOptions: [ { title: "🔥 热度最高", value: "popularity.desc" }, { title: "📅 最新首播", value: "first_air_date.desc" }, { title: "⭐ 评分最高", value: "vote_average.desc" } ]
                },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        },

        // ---------------- 大栏目 7：串流平台TOP10 (FlixPatrol) ----------------
        {
            title: "🥇 流媒体TOP10",
            functionName: "loadOfficialTop10",
            type: "video", 
            cacheDuration: 3600,
            params: [
                {
                    name: "sort_by", title: "榜单地区", type: "enumeration", value: "united-states",
                    enumOptions: [
                        { title: "🇺🇸 美国", value: "united-states" }, { title: "🇰🇷 韩国", value: "south-korea" }, { title: "🇹🇼 台湾", value: "taiwan" }, { title: "🇭🇰 香港", value: "hong-kong" }, { title: "🇯🇵 日本", value: "japan" }, { title: "🇬🇧 英国", value: "united-kingdom" }, { title: "🌍 全球", value: "world" }
                    ]
                },
                {
                    name: "platform", title: "流媒体平台", type: "enumeration", value: "netflix",
                    enumOptions: [
                        { title: "Netflix", value: "netflix" }, { title: "HBO", value: "hbo" }, { title: "Disney+", value: "disney" }, { title: "Apple TV+", value: "apple-tv" }, { title: "Amazon Prime", value: "amazon-prime" }
                    ]
                },
                {
                    name: "mediaType", title: "榜单类型", type: "enumeration", value: "tv",
                    enumOptions: [ { title: "📺 剧集 (TV Shows)", value: "tv" }, { title: "🎬 电影 (Movies)", value: "movie" } ]
                },
                { name: "page", title: "页码", type: "page", startPage: 1 }
            ]
        }
    ]
};

// =========================================================================
// 3. 路由与各分类底层
// =========================================================================

async function routeAnimeOmni(params) {
    const source = params.anime_source || "cal";
    let subParams = { page: params.page || 1 };

    if (source === "cal") { subParams.sort_by = params.cal_day || "today"; return await loadBangumiCalendar(subParams); }
    if (source === "bili") { subParams.sort_by = params.bili_sort || "1"; return await loadBilibiliRank(subParams); }
    if (source === "hot") { subParams.category = params.hot_cat || "anime"; return await fetchRecentHot(subParams); }
    if (source === "rank") {
        subParams.category = params.rank_cat || "anime"; subParams.year = params.rank_year || "2026";
        subParams.month = params.rank_month || "all"; subParams.sort = params.rank_sort || "collects";
        return await fetchAirtimeRanking(subParams);
    }
    if (source === "daily") {
        subParams.filterType = params.daily_filter || "today"; subParams.specificWeekday = params.daily_weekday || "1";
        subParams.dailySortOrder = params.daily_sort || "popularity_rat_bgm"; return await fetchDailyCalendarApi(subParams);
    }
    if (source === "tmdb") { subParams.sort_by = params.tmdb_sort || "trending"; return await loadTmdbAnimeRanking(subParams); }
    if (source === "anilist") { subParams.sort_by = params.anilist_sort || "TRENDING_DESC"; return await loadAniListRanking(subParams); }
    if (source === "mal") { subParams.sort_by = params.mal_sort || "airing"; return await loadMalRanking(subParams); }
    return [];
}

async function routeMovieOmni(params) {
    const source = params.movie_source || "general";
    let subParams = { page: params.page || 1 };

    if (source === "general") { subParams.sort_by = params.general_sort || "popular"; return await loadGeneralMovies(subParams); }
    if (source === "yearly") { subParams.sort_by = params.yearly_sort || "2024"; return await loadYearlyBestMovies(subParams); }
    if (source === "genre") { subParams.sort_by = params.genre_sort || "878"; return await loadGenreMovies(subParams); }
    return [];
}

async function routeTrendsHub(params) {
    const hubSource = params.hub_source || "imdb";
    const page = params.page || 1;

    if (hubSource === "rt") {
        const rtSort = params.rt_sort || "rt_movies_home";
        return await loadRottenTomatoesTrends(rtSort, page);
    }
    if (hubSource === "imdb") {
        const imdbSort = params.imdb_sort || "trending_week";
        const mediaType = params.mediaType || "all";
        return await loadImdbList(imdbSort, mediaType, page);
    }
    if (hubSource === "trakt") {
        const traktSort = params.trakt_sort || "trending";
        const traktType = params.traktType || "all";
        const traktClientId = params.traktClientId || DEFAULT_TRAKT_ID;
        return await handleTraktList(traktSort, traktType, traktClientId, page);
    }
    if (hubSource === "douban") {
        const dbSort = params.db_sort || "db_tv_cn";
        let tag = "热门", type = "tv";
        if (dbSort === "db_tv_cn") { tag = "国产剧"; type = "tv"; }
        else if (dbSort === "db_variety") { tag = "综艺"; type = "tv"; }
        else if (dbSort === "db_movie") { tag = "热门"; type = "movie"; }
        else if (dbSort === "db_tv_us") { tag = "美剧"; type = "tv"; }
        return await fetchDoubanAndMap(tag, type, page);
    }
    return [];
}

const MOVIE_GENRE_MAP = {
    16: "动画", 10759: "动作冒险", 35: "喜剧", 18: "剧情", 14: "奇幻", 878: "科幻", 9648: "悬疑", 
    10749: "爱情", 27: "恐怖", 10765: "科幻奇幻", 80: "犯罪", 99: "纪录片", 10751: "家庭", 
    36: "历史", 10402: "音乐", 10770: "电视电影", 53: "惊悚", 10752: "战争", 37: "西部", 28: "动作", 12: "冒险"
};
function movie_getGenreText(ids) {
    if (!ids || !Array.isArray(ids)) return "电影";
    const genres = ids.map(id => MOVIE_GENRE_MAP[id]).filter(Boolean);
    return genres.length > 0 ? genres.slice(0, 2).join(" / ") : "电影";
}
function movie_buildItem(item) {
    if (!item) return null;
    const releaseDate = item.release_date || "";
    return {
        id: String(item.id), tmdbId: parseInt(item.id), type: "tmdb", mediaType: "movie",
        title: item.title, releaseDate: releaseDate, genreTitle: movie_getGenreText(item.genre_ids),    
        subTitle: `${releaseDate.substring(0,4)}`,            
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "", 
        backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "", 
        description: `电影\n${item.overview || "暂无简介"}`
    };
}

async function loadGeneralMovies(params) {
    const sortBy = params.sort_by || "popular";
    let endpoint = "/movie/popular";
    let queryParams = { language: "zh-CN", page: params.page || 1 };
    
    if (sortBy === "top_rated") endpoint = "/movie/top_rated";
    else if (sortBy === "box_office") { endpoint = "/discover/movie"; queryParams.sort_by = "revenue.desc"; }
    else if (sortBy === "oscar") { 
        endpoint = "/discover/movie"; 
        queryParams.with_keywords = "818"; 
        queryParams.sort_by = "vote_average.desc"; 
        queryParams["vote_count.gte"] = 1000; 
    }
    try { const res = await Widget.tmdb.get(endpoint, { params: queryParams }); return (res.results || []).map(i => movie_buildItem(i)).filter(Boolean); } catch (e) { return []; }
}
async function loadYearlyBestMovies(params) {
    try {
        let queryParams = { language: "zh-CN", page: params.page || 1, primary_release_year: params.sort_by || "2024", sort_by: "vote_average.desc", "vote_count.gte": 500 };
        const res = await Widget.tmdb.get("/discover/movie", { params: queryParams }); return (res.results || []).map(i => movie_buildItem(i)).filter(Boolean);
    } catch (e) { return []; }
}
async function loadGenreMovies(params) {
    try {
        let queryParams = { language: "zh-CN", page: params.page || 1, with_genres: params.sort_by || "878", sort_by: "popularity.desc" };
        const res = await Widget.tmdb.get("/discover/movie", { params: queryParams }); return (res.results || []).map(i => movie_buildItem(i)).filter(Boolean);
    } catch (e) { return []; }
}

const ADVANCED_GENRE_MAP = {
    "all": { movie: "", tv: "" }, "scifi": { movie: "878", tv: "10765" }, "mystery": { movie: "9648", tv: "9648" }, "horror": { movie: "27", tv: "27" }, "crime": { movie: "80", tv: "80" },
    "action": { movie: "28", tv: "10759" }, "comedy": { movie: "35", tv: "35" }, "romance": { movie: "10749", tv: "10749" }, "drama": { movie: "18", tv: "18" }, "fantasy": { movie: "14", tv: "10765" }, "animation": { movie: "16", tv: "16" }, "documentary": { movie: "99", tv: "99" }
};
const REGION_MAP = { "all": "", "cn": "CN", "hk": "HK", "tw": "TW", "hktw": "HK|TW", "jp": "JP", "kr": "KR", "jpkr": "JP|KR", "th": "TH", "sg": "SG", "my": "MY", "in": "IN", "apac": "CN|HK|TW|JP|KR|TH|SG|MY|IN", "us": "US", "gb": "GB", "de": "DE", "se": "SE", "europe": "GB|DE|FR|IT|ES|SE|NO|DK|FI|NL|BE|CH|AT|IE", "es": "ES", "mx": "MX", "latin": "ES|MX|AR|CO|CL|PE|VE" };

async function fetchGenreRankData(mediaType, genre, region, sort_rule, page) {
    const genreId = ADVANCED_GENRE_MAP[genre] ? ADVANCED_GENRE_MAP[genre][mediaType] : "";
    const originCountry = REGION_MAP[region] || "";
    let tmdbSortBy = sort_rule === "rating" ? "vote_average.desc" : (sort_rule === "time" ? (mediaType === "movie" ? "primary_release_date.desc" : "first_air_date.desc") : "popularity.desc");
    const queryParams = { language: "zh-CN", page: page, sort_by: tmdbSortBy, include_adult: false, include_video: false };
    if (genreId) queryParams.with_genres = genreId;
    if (originCountry) queryParams.with_origin_country = originCountry;
    queryParams["vote_count.gte"] = sort_rule === "rating" ? 200 : 10;
    if (sort_rule === "time") {
        const today = new Date(); today.setMonth(today.getMonth() + 1); const maxDate = today.toISOString().split('T')[0];
        if (mediaType === "movie") queryParams["primary_release_date.lte"] = maxDate; else queryParams["first_air_date.lte"] = maxDate;
    }
    try {
        const res = await Widget.tmdb.get(`/discover/${mediaType}`, { params: queryParams });
        return (res.results || []).map(item => {
            const date = item.release_date || item.first_air_date || ""; 
            return {
                id: String(item.id), tmdbId: parseInt(item.id), type: "tmdb", mediaType: mediaType, title: item.title || item.name,
                genreTitle: getGlobalGenreText(item.genre_ids),
                releaseDate: date,
                subTitle: `${date ? date.substring(0, 4) : "未知"}`, 
                description: `${date}\n${item.overview || "暂无简介"}`,
                posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "", 
                backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "", 
                _popularity: item.popularity || 0,
                _date: date || "1970-01-01"
            };
        });
    } catch (e) { return []; }
}

async function loadGenreRank(params = {}) {
    const page = parseInt(params.page) || 1;
    const mediaType = params.sort_by || "all"; 
    const genre = params.genre || "all"; 
    const region = params.region || "all"; 
    const sort_rule = params.order_rule || "popularity";

    if (mediaType === "all") {
        const [movies, tvs] = await Promise.all([
            fetchGenreRankData("movie", genre, region, sort_rule, page),
            fetchGenreRankData("tv", genre, region, sort_rule, page)
        ]);
        let items = [...movies, ...tvs];
        items.sort((a, b) => { 
            if (sort_rule === "popularity") return b._popularity - a._popularity; 
            else if (sort_rule === "time") return new Date(b._date) - new Date(a._date); 
            else return b.rating - a.rating; 
        });
        items = items.slice(0, 20); 
        if (items.length === 0) return page === 1 ? [{ id: "empty", type: "text", title: "未找到符合条件" }] : [];
        return items;
    } else {
        const items = await fetchGenreRankData(mediaType, genre, region, sort_rule, page);
        if (items.length === 0) return page === 1 ? [{ id: "empty", type: "text", title: "未找到符合条件" }] : [];
        return items;
    }
}

async function loadVarietyShows(params = {}) {
    const page = parseInt(params.page) || 1;
    const region = params.sort_by || "cn";
    const list_type = params.list_type || "hot";

    const varietyGenres = "10764|10767";

    const varietyRegionMap = {
        "all": "", "cn": "CN", "kr": "KR", "jp": "JP",
        "tw": "TW", "hk": "HK", "eu_us": "US|GB|DE|FR|IT|ES|CA|AU"
    };
    const originCountry = varietyRegionMap[region] || "";

    let queryParams = { language: "zh-CN", page: page, with_genres: varietyGenres, include_adult: false };
    if (originCountry) queryParams.with_origin_country = originCountry;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
    const tomorrowStr = tmrw.toISOString().split('T')[0];
    let fiveYearsAgo = new Date(now); fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0];

    if (list_type === "today") {
        queryParams.sort_by = "popularity.desc"; queryParams["air_date.gte"] = todayStr; queryParams["air_date.lte"] = todayStr;
    } else if (list_type === "tomorrow") {
        queryParams.sort_by = "popularity.desc"; queryParams["air_date.gte"] = tomorrowStr; queryParams["air_date.lte"] = tomorrowStr;
    } else if (list_type === "hot") {
        queryParams.sort_by = "popularity.desc";
    } else if (list_type === "trend") {
        queryParams.sort_by = "popularity.desc"; queryParams["first_air_date.gte"] = fiveYearsAgoStr; 
    } else if (list_type === "top") {
        queryParams.sort_by = "vote_average.desc"; queryParams["vote_count.gte"] = 15; 
    }

    try {
        const res = await Widget.tmdb.get("/discover/tv", { params: queryParams });
        const items = res.results || [];
        if (items.length === 0) return page === 1 ? [{ id: "empty", type: "text", title: "暂无综艺数据" }] : [];
        return items.map(item => {
            const date = item.release_date || item.first_air_date || ""; 
            let genreLabel = getGlobalGenreText(item.genre_ids);
            if (genreLabel === "影视") genreLabel = "综艺";
            return {
                id: String(item.id), tmdbId: parseInt(item.id), type: "tmdb", mediaType: "tv", title: item.title || item.name,
                genreTitle: genreLabel, releaseDate: date, 
                subTitle: `${date ? date.substring(0, 4) : "未知"}`, 
                description: `${date}\n${item.overview || "暂无简介"}`,
                posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "", 
                backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : ""
            };
        });
    } catch (e) { return [{ id: "err", type: "text", title: "加载失败" }]; }
}

const RT_URLS = {
    "rt_movies_theater": "https://www.rottentomatoes.com/browse/movies_in_theaters/sort:popular?minTomato=75",
    "rt_movies_home": "https://www.rottentomatoes.com/browse/movies_at_home/sort:popular?minTomato=75",
    "rt_movies_best": "https://www.rottentomatoes.com/browse/movies_at_home/sort:critic_highest?minTomato=90",
    "rt_tv_popular": "https://www.rottentomatoes.com/browse/tv_series_browse/sort:popular?minTomato=75",
    "rt_tv_new": "https://www.rottentomatoes.com/browse/tv_series_browse/sort:newest?minTomato=75"
};

async function loadRottenTomatoesTrends(listType, page) {
    const pageSize = 15;
    const allItems = await fetchRottenTomatoesList(listType);
    if (allItems.length === 0) return page === 1 ? [{ id: "empty", type: "text", title: "无数据" }] : [];
    const start = (page - 1) * pageSize;
    const pageItems = allItems.slice(start, start + pageSize);
    const promises = pageItems.map((item, i) => searchRtTmdb(item, start + i + 1));
    return (await Promise.all(promises)).filter(Boolean);
}

async function fetchRottenTomatoesList(type) {
    const url = RT_URLS[type] || RT_URLS["rt_movies_home"];
    try {
        const res = await Widget.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const $ = Widget.html.load(res.data || "");
        const items = [];
        $('[data-qa="discovery-media-list-item"]').each((i, el) => {
            const $el = $(el);
            const title = $el.find('[data-qa="discovery-media-list-item-title"]').text().trim();
            if (!title) return;
            const scoreEl = $el.find('score-pairs');
            items.push({ title: title, tomatoScore: scoreEl.attr('critics-score') || "", popcornScore: scoreEl.attr('audiencescore') || "", mediaType: type.includes("tv") ? "tv" : "movie" });
        });
        return items;
    } catch (e) { return []; }
}

async function searchRtTmdb(rtItem, rank) {
    const cleanTitle = rtItem.title.replace(/\s\(\d{4}\)$/, "");
    try {
        const res = await Widget.tmdb.get(`/search/${rtItem.mediaType}`, { params: { query: cleanTitle, language: "zh-CN" } });
        const match = (res.results || [])[0];
        if (!match) return null;
        let scores = [];
        if (rtItem.tomatoScore) scores.push(`🍅 ${rtItem.tomatoScore}%`);
        if (rtItem.popcornScore) scores.push(`🍿 ${rtItem.popcornScore}%`);
        const customSub = scores.join("  ") || "烂番茄认证";
        const dateStr = match.first_air_date || match.release_date || "";
        
        return {
            id: String(match.id), tmdbId: match.id, type: "tmdb", mediaType: rtItem.mediaType, title: `${rank}. ${match.name || match.title}`, 
            genreTitle: getGlobalGenreText(match.genre_ids) || (rtItem.mediaType === "movie" ? "电影" : "剧集"),
            description: `${dateStr}\n原名: ${rtItem.title}`, releaseDate: dateStr, subTitle: customSub, 
            posterPath: match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : "", 
            backdropPath: match.backdrop_path ? `https://image.tmdb.org/t/p/w780${match.backdrop_path}` : ""
        };
    } catch (e) { return null; }
}

function buildImdbItem(item, forceType) {
    if (!item) return null;
    const type = forceType || item.media_type || (item.title ? "movie" : "tv");
    const fullDate = item.release_date || item.first_air_date || ""; 
    return {
        id: String(item.id), tmdbId: parseInt(item.id), type: "tmdb", mediaType: type, title: item.title || item.name,
        subTitle: fullDate || "", 
        description: fullDate ? `${fullDate}\n${item.overview || "暂无简介"}` : (item.overview || "暂无简介"),
        releaseDate: fullDate, 
        posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "", 
        backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "",
        year: fullDate.substring(0, 4), 
        genreTitle: getGlobalGenreText(item.genre_ids) || (type === "tv" ? "剧集" : "电影")
    };
}

async function loadImdbList(category, mediaType, page) {
    try {
        let items = [];
        if (category.startsWith("china_")) {
            const isTv = category === "china_tv";
            const endpoint = isTv ? "tv" : "movie";
            const res = await Widget.tmdb.get(`/discover/${endpoint}`, { params: { language: "zh-CN", page: page, sort_by: "popularity.desc", with_original_language: "zh", "vote_count.gte": 2 } });
            items = (res.results || []).map(i => buildImdbItem(i, endpoint));
            return items;
        }
        if (category.startsWith("trending_")) {
            const timeWindow = category === "trending_day" ? "day" : "week";
            const res = await Widget.tmdb.get(`/trending/${mediaType}/${timeWindow}`, { params: { language: "zh-CN", page: page } });
            items = (res.results || []).map(i => buildImdbItem(i));
        } else {
            if (mediaType === "all") {
                const [resM, resT] = await Promise.all([ Widget.tmdb.get(`/movie/${category}`, { params: { language: "zh-CN", page: page } }), Widget.tmdb.get(`/tv/${category}`, { params: { language: "zh-CN", page: page } }) ]);
                const movies = (resM.results || []).map(i => buildImdbItem(i, "movie"));
                const tvs = (resT.results || []).map(i => buildImdbItem(i, "tv"));
                items = [...movies, ...tvs].sort((a, b) => { if (category === "top_rated") return b._rating - a._rating; return 0; }).slice(0, 20);
            } else {
                const res = await Widget.tmdb.get(`/${mediaType}/${category}`, { params: { language: "zh-CN", page: page } });
                items = (res.results || []).map(i => buildImdbItem(i, mediaType));
            }
        }
        return items;
    } catch (e) { return [{ id: "err", type: "text", title: "加载异常" }]; }
}

async function fetchTraktData(type, list, id, page) {
    try {
        const res = await Widget.http.get(`https://api.trakt.tv/${type}/${list}?limit=15&page=${page}`, { headers: { "Content-Type": "application/json", "trakt-api-version": "2", "trakt-api-key": id } });
        return res.data || [];
    } catch (e) { return []; }
}

async function handleTraktList(listType, traktType, traktClientId, page) {
    let rawData = [];
    if (traktType === "all") {
        const [movies, shows] = await Promise.all([ fetchTraktData("movies", listType, traktClientId, page), fetchTraktData("shows", listType, traktClientId, page) ]);
        rawData = [...movies, ...shows].sort((a, b) => (b.watchers || b.list_count || 0) - (a.watchers || a.list_count || 0));
    } else {
        rawData = await fetchTraktData(traktType, listType, traktClientId, page);
    }
    if (!rawData || rawData.length === 0) return page === 1 ? [] : []; 
    const promises = rawData.slice(0, 20).map(async (item, index) => {
        let subject = item.show || item.movie || item;
        const mediaType = item.show ? "tv" : "movie";
        let stats = listType === "trending" ? `🔥 ${item.watchers || 0} 人在看` : (listType === "anticipated" ? `❤️ ${item.list_count || 0} 人想看` : `No. ${(page - 1) * 15 + index + 1}`); 
        if (traktType === "all") stats = `[${mediaType === "tv" ? "剧" : "影"}] ${stats}`;
        if (!subject || !subject.ids || !subject.ids.tmdb) return null;
        try {
            const d = await Widget.tmdb.get(`/${mediaType}/${subject.ids.tmdb}`, { params: { language: "zh-CN" } });
            return {
                id: String(d.id), tmdbId: d.id, type: "tmdb", mediaType: mediaType, title: d.name || d.title || subject.title,
                genreTitle: getGlobalGenreText(d.genres?.map(g => g.id)), releaseDate: d.first_air_date || d.release_date || "",
                subTitle: stats, 
                description: `${d.first_air_date || d.release_date || ""}\n${d.overview || "暂无简介"}`,
                posterPath: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : "", 
                backdropPath: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : ""
            };
        } catch (e) { return null; }
    });
    return (await Promise.all(promises)).filter(Boolean);
}

function mergeDoubanTmdb(target, source) {
    target.id = String(source.id); target.tmdbId = source.id;
    target.posterPath = source.poster_path ? `https://image.tmdb.org/t/p/w500${source.poster_path}` : target.posterPath;
    target.backdropPath = source.backdrop_path ? `https://image.tmdb.org/t/p/w780${source.backdrop_path}` : "";
    const date = source.first_air_date || source.release_date || ""; target.genreTitle = getGlobalGenreText(source.genre_ids) || (target.mediaType === "tv" ? "剧集" : "电影"); target.releaseDate = date;
    target.description = (date ? `${date} · ${target.subTitle}` : target.subTitle) + (source.overview ? `\n${source.overview}` : "\n暂无简介"); target.rating = source.vote_average ? parseFloat(source.vote_average) : 0;
}

async function searchTmdbForDouban(query, type) {
    const q = query.replace(/第[一二三四五六七八九十\d]+[季章]/g, "").trim();
    try {
        const res = await Widget.tmdb.get(`/search/${type}`, { params: { query: encodeURIComponent(q), language: "zh-CN" } });
        return (res.results || [])[0];
    } catch (e) { return null; }
}

async function fetchDoubanAndMap(tag, type, page) {
    const start = (page - 1) * 20;
    try {
        const randomBid = Math.random().toString(36).substring(2, 13);
        const res = await Widget.http.get(`https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=20&page_start=${start}`, {
            headers: { 
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
                "Referer": "https://movie.douban.com/explore",
                "Host": "movie.douban.com",
                "X-Requested-With": "XMLHttpRequest", 
                "Cookie": `bid=${randomBid};`
            }
        });

        const data = (typeof res.data === 'string') ? JSON.parse(res.data) : (res.data || {});
        const list = data.subjects || [];
        if (list.length === 0) return page === 1 ? [{ id: "empty", type: "text", title: "暂无数据" }] : [];
        
        const promises = list.map(async item => {
            let finalItem = { 
                id: `db_${item.id}`, type: "tmdb", mediaType: type, 
                title: item.title, subTitle: `豆瓣 ${item.rate}`, 
                description: `豆瓣 ${item.rate}\n暂无简介`, 
                genreTitle: type === "tv" ? "剧集" : "电影",
                posterPath: item.cover 
            };
            const tmdb = await searchTmdbForDouban(item.title, type);
            if (tmdb) mergeDoubanTmdb(finalItem, tmdb); 
            return finalItem;
        });
        return await Promise.all(promises);
    } catch (e) { 
        return [{ id: "err", type: "text", title: "豆瓣拒绝了请求", description: "网络IP被豆瓣限制，请切换流量(4G/5G)或更换节点。" }]; 
    }
}

async function loadPlatformMatrix(params = {}) {
    const category = params.sort_by || "tv_drama";
    const platformId = params.platform || "2007";
    const sort = params.sort || "popularity.desc";
    const page = params.page || 1;

    const foreignPlatforms = ["213", "2739", "49", "2552"];
    if (category === "movie" && !foreignPlatforms.includes(platformId)) return page === 1 ? [{ id: "empty", type: "text", title: "暂不支持国内平台电影", description: "请切换为剧集或国外平台" }] : [];

    const queryParams = { language: "zh-CN", sort_by: sort, page: page, include_adult: false, include_null_first_air_dates: false };
    if (category.startsWith("tv_")) {
        queryParams.with_networks = platformId;
        if (category === "tv_anime") queryParams.with_genres = "16";
        else if (category === "tv_variety") queryParams.with_genres = "10764|10767";
        else if (category === "tv_drama") queryParams.without_genres = "16,10764,10767";
        return await loadPlatformMatrixData("tv", queryParams);
    } else if (category === "movie") {
        const usMap = { "213":"8", "2739":"337", "49":"1899|15", "2552":"350" };
        queryParams.watch_region = "US"; queryParams.with_watch_providers = usMap[platformId];
        return await loadPlatformMatrixData("movie", queryParams);
    }
}

async function loadPlatformMatrixData(mediaType, params) {
    try {
        const res = await Widget.tmdb.get(`/discover/${mediaType}`, { params });
        if (!res.results || res.results.length === 0) return params.page === 1 ? [{ id: "empty", type: "text", title: "暂无流媒体数据" }] : [];
        return res.results.map(item => {
            const date = item.first_air_date || item.release_date || "";
            return {
                id: String(item.id), tmdbId: item.id, type: "tmdb", mediaType: mediaType, title: item.name || item.title, date: date, releaseDate: date,
                posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "", 
                backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "", 
                genreTitle: getGlobalGenreText(item.genre_ids),
                description: `${date}\n${item.overview || "暂无简介"}`
            };
        });
    } catch (e) { return [{ id: "err", type: "text", title: "流媒体拉取失败" }]; }
}

async function loadOfficialTop10(params = {}) {
    const region = params.sort_by || "united-states"; 
    const platform = params.platform || "netflix";
    const mediaType = params.mediaType || "tv";

    let titles = await fetchFlixPatrolData(platform, region, mediaType);

    if (titles.length === 0) {
        return await fetchTmdbFallback_Top10(platform, region, mediaType);
    }

    const searchPromises = titles.slice(0, 10).map((title, index) => 
        searchTmdbForTop10(title, mediaType, index + 1)
    );

    const results = await Promise.all(searchPromises);
    const finalItems = results.filter(r => r !== null);

    if (finalItems.length === 0) {
        return [{ id: "error", title: "匹配失败", description: "获取了榜单但TMDB无数据", type: "text" }];
    }
    return finalItems;
}

async function fetchFlixPatrolData(platform, region, mediaType) {
    const url = region === "world" ? `https://flixpatrol.com/top10/${platform}/` : `https://flixpatrol.com/top10/${platform}/${region}/`;
    try {
        const res = await Widget.http.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const html = typeof res === 'string' ? res : (res.data || "");
        if (!html) return [];
        const $ = Widget.html.load(html);
        const tables = $('.card-table tbody');
        
        let targetTable = null;
        if (tables.length >= 2) targetTable = mediaType === "movie" ? tables.eq(0) : tables.eq(1);
        else if (tables.length === 1) targetTable = tables.eq(0);
        else return [];

        const titles = [];
        targetTable.find('tr').each((i, el) => {
            if (i >= 10) return; 
            const textLink = $(el).find('a.hover\\:underline').text().trim();
            const textTd = $(el).find('td').eq(2).text().trim();
            const finalTitle = textLink || textTd;
            if (finalTitle && finalTitle.length > 1) titles.push(finalTitle.split('(')[0].trim());
        });
        return titles;
    } catch (e) { return []; }
}

async function searchTmdbForTop10(queryTitle, mediaType, rank) {
    try {
        const data = await Widget.tmdb.get(`/search/${mediaType}`, { params: { query: queryTitle.trim(), language: "zh-CN", page: 1 } });
        if (data && data.results && data.results.length > 0) {
            let item = data.results[0];
            const date = item.first_air_date || item.release_date || ""; 
            
            return {
                id: String(item.id), tmdbId: parseInt(item.id), type: "tmdb", mediaType: mediaType, title: item.name || item.title,
                releaseDate: date, year: date.substring(0, 4), genreTitle: getGlobalGenreText(item.genre_ids),
                subTitle: `TOP ${rank}`, posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
                backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "",
                description: `TOP ${rank}\n${item.overview || "暂无简介"}`
            };
        }
    } catch (e) {} return null;
}

async function fetchTmdbFallback_Top10(platform, region, mediaType) {
    const providerMap = { "netflix": "8", "disney": "337", "hbo": "1899|118", "apple-tv": "350", "amazon-prime": "119" };
    const regionMap = { "united-states": "US", "south-korea": "KR", "taiwan": "TW", "hong-kong": "HK", "japan": "JP", "united-kingdom": "GB", "world": "US" };
    try {
        const data = await Widget.tmdb.get(`/discover/${mediaType}`, { params: { watch_region: regionMap[region] || "US", with_watch_providers: providerMap[platform] || "8", sort_by: "popularity.desc", page: 1, language: "zh-CN" } });
        return (data.results || []).slice(0, 10).map((item, index) => {
            const date = item.first_air_date || item.release_date || ""; 
            return {
                id: String(item.id), tmdbId: parseInt(item.id), type: "tmdb", mediaType: mediaType, title: item.name || item.title,
                releaseDate: date, year: date.substring(0, 4), genreTitle: getGlobalGenreText(item.genre_ids), subTitle: `TOP ${index + 1}`,
                posterPath: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "", backdropPath: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : "",
                description: `TOP ${index + 1}\n${item.overview || "暂无简介"}`
            };
        });
    } catch (e) { return []; }
}

const GENRE_MAP = {
    16: "动画", 10759: "动作冒险", 35: "喜剧", 18: "剧情", 14: "奇幻", 
    878: "科幻", 9648: "悬疑", 10749: "爱情", 27: "恐怖", 10765: "科幻奇幻"
};

function getGenreText(ids) {
    if (!ids || !Array.isArray(ids)) return "动画";
    const genres = ids.filter(id => id !== 16).map(id => GENRE_MAP[id]).filter(Boolean);
    return genres.length > 0 ? genres.slice(0, 2).join(" / ") : "动画";
}

function parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    let match = dateStr.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
    match = dateStr.match(/^(\d{4})年(\d{1,2})月/);
    if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-01`;
    match = dateStr.match(/^(\d{4})$/);
    if (match) return `${match[1]}-01-01`;
    return dateStr;
}

async function searchTmdbAnimeStrict(title1, title2, year) {
    async function doSearch(query) {
        if (!query || typeof query !== 'string') return null;
        const cleanQuery = query.replace(/第[一二三四五六七八九十\d]+[季章]/g, "").replace(/Season \d+/i, "").trim();
        
        try {
            let params = { query: cleanQuery, language: "zh-CN", include_adult: false };
            if (year) params.first_air_date_year = year;
            
            let res = await Widget.tmdb.get("/search/tv", { params });
            let candidates = res.results || [];
            
            if (candidates.length === 0 && year) {
                delete params.first_air_date_year;
                res = await Widget.tmdb.get("/search/tv", { params });
                candidates = res.results || [];
            }
            
            let animeTvs = candidates.filter(r => r.genre_ids?.includes(16));
            if (animeTvs.length > 0) return animeTvs.find(r => r.poster_path) || animeTvs[0];

            let mParams = { query: cleanQuery, language: "zh-CN", include_adult: false };
            if (year) mParams.primary_release_year = year;
            res = await Widget.tmdb.get("/search/movie", { params: mParams });
            candidates = res.results || [];

            if (candidates.length === 0 && year) {
                delete mParams.primary_release_year;
                res = await Widget.tmdb.get("/search/movie", { params: mParams });
                candidates = res.results || [];
            }
            
            let animeMovies = candidates.filter(r => r.genre_ids?.includes(16));
            if (animeMovies.length > 0) return animeMovies.find(r => r.poster_path) || animeMovies[0];

        } catch (e) {}
        return null;
    }

    let match = await doSearch(title1);
    if (!match && title2 && title1 !== title2) {
        match = await doSearch(title2);
    }
    return match;
}

async function sanitizeAndEnsureTmdb(items) {
    if (!items || !Array.isArray(items)) return [];
    const promises = items.map(async (item) => {
        const title = item.name_cn || item.title || item.name;
        const subTitle = item.title !== title ? item.title : null; 
        const rawDate = item.releaseDate || item.description || item.air_date || item.info || "";
        const yearMatch = rawDate.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : null;

        const tmdbMatch = await searchTmdbAnimeStrict(title, subTitle, year);
        
        if (tmdbMatch) {
            return {
                id: String(tmdbMatch.id),
                tmdbId: parseInt(tmdbMatch.id),
                type: "tmdb",
                mediaType: tmdbMatch.title ? "movie" : "tv",
                title: tmdbMatch.name || tmdbMatch.title || title,
                genreTitle: getGenreText(tmdbMatch.genre_ids),
                description: tmdbMatch.first_air_date || tmdbMatch.release_date || parseDate(rawDate) || "即将播出",
                releaseDate: tmdbMatch.first_air_date || tmdbMatch.release_date || parseDate(rawDate),
                posterPath: tmdbMatch.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMatch.poster_path}` : "",
                backdropPath: tmdbMatch.backdrop_path ? `https://image.tmdb.org/t/p/w780${tmdbMatch.backdrop_path}` : "",
                rating: tmdbMatch.vote_average ? tmdbMatch.vote_average.toFixed(1) : (item.rating || "0.0")
            };
        }
        return null; 
    });
    
    const results = await Promise.all(promises);
    return results.filter(Boolean);
}

async function loadBangumiCalendar(params = {}) {
    const { sort_by = "today", page = 1 } = params;
    let targetDayId = parseInt(sort_by);
    if (sort_by === "today") {
        const jsDay = new Date().getDay();
        targetDayId = jsDay === 0 ? 7 : jsDay;
    }
    
    try {
        const res = await Widget.http.get("https://api.bgm.tv/calendar");
        const dayData = (res.data || []).find(d => d.weekday && d.weekday.id === targetDayId);
        if (!dayData) return [];
        
        const pageSize = 20;
        const pageItems = dayData.items.slice((page - 1) * pageSize, page * pageSize);

        const promises = pageItems.map(async (item) => {
            const cleanTitle = (item.name_cn || item.name).replace(/第[一二三四五六七八九十\d]+[季章]/g, "").trim();
            const year = item.air_date ? item.air_date.substring(0, 4) : null;
            const tmdbItem = await searchTmdbAnimeStrict(cleanTitle, item.name, year);
            if (!tmdbItem) return null;

            return buildItem({
                id: tmdbItem.id,
                tmdbId: tmdbItem.id,
                type: "tv",
                title: tmdbItem.name || tmdbItem.title || item.name_cn || item.name,
                date: tmdbItem.first_air_date || item.air_date,
                poster: tmdbItem.poster_path,
                backdrop: tmdbItem.backdrop_path,
                rating: tmdbItem.vote_average || item.rating?.score,
                genreText: getGenreText(tmdbItem.genre_ids),
                desc: tmdbItem.overview || item.summary || "暂无简介"
            });
        });
        
        const results = await Promise.all(promises);
        return results.filter(Boolean);
    } catch (e) { return []; }
}

// =========================================================================
// 🚀🚀🚀 全新：接入专属 JSON 抓取源 (Bangumi 近期热门)
// =========================================================================
async function fetchRecentHot(params = {}) {
    const url = "https://raw.githubusercontent.com/MakkaPakka518/List/refs/heads/main/data/bangumi-hot.json";
    
    try {
        const res = await Widget.http.get(url);
        const data = res.data || {};
        const hotList = data.hot_anime || [];

        if (hotList.length === 0) {
            return [{ id: "empty", type: "text", title: "暂无数据", description: "获取到的热门列表为空" }];
        }

        // 分页支持
        const page = parseInt(params.page || "1", 10);
        const pageSize = 20;
        const start = (page - 1) * pageSize;
        const pageItems = hotList.slice(start, start + pageSize);

        return pageItems.map((item, index) => {
            // 智能过滤简介：去除原数据自带的第一行（年份·评分·国家），防止和原生排版重复
            const descLines = (item.description || "").split('\n');
            const pureDesc = descLines.length > 1 ? descLines.slice(1).join('\n') : item.description;

            return buildItem({
                id: item.id,
                tmdbId: item.tmdbId,
                type: item.mediaType || "tv",
                title: item.title,
                date: item.releaseDate || "",
                poster: item.posterPath,
                backdrop: item.backdropPath,
                genreText: item.genreTitle,
                subTitle: `🔥 热度 TOP ${start + index + 1}`,
                desc: pureDesc || "暂无简介"
            });
        });
        
    } catch (error) {
        return [{ id: "error", type: "text", title: "网络异常", description: "获取热门列表失败" }];
    }
}

// =========================================================================
// 🌐 纯净刮削引擎 (彻底抛弃老旧 GitHub 数据请求)
// =========================================================================
async function fetchAirtimeRanking(params = {}) {
    const category = params.category || "anime";
    const year = params.year || `${new Date().getFullYear()}`;
    const month = params.month || "all";
    const sort = params.sort || "collects";
    const page = parseInt(params.page || "1", 10);

    const cacheKey = `airtime-${category}-${year}-${month}-${sort}-${page}`;
    if (ScrapingCache.airtime[cacheKey]) {
        return await sanitizeAndEnsureTmdb(ScrapingCache.airtime[cacheKey]);
    }
    
    let url = `https://bgm.tv/${category}/browser/airtime/${year}/${month}?sort=${sort}&page=${page}`;
    const results = await DynamicDataProcessor.processBangumiPage(url, category);
    ScrapingCache.airtime[cacheKey] = results;
    return await sanitizeAndEnsureTmdb(results);
}

async function fetchDailyCalendarApi(params = {}) {
    if (!ScrapingCache.daily || ScrapingCache.daily.length === 0) {
        ScrapingCache.daily = await DynamicDataProcessor.processDailyCalendar();
    }
    let items = ScrapingCache.daily || [];
    
    const { filterType = "today", specificWeekday = "1", dailySortOrder = "popularity_rat_bgm" } = params;
    const JS_DAY_TO_BGM_API_ID = { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
    
    let filteredByDay = [];
    if (filterType === "all_week") {
        filteredByDay = items;
    } else {
        const today = new Date();
        const currentJsDay = today.getDay();
        const targetBgmIds = new Set();
        switch (filterType) {
            case "today": targetBgmIds.add(JS_DAY_TO_BGM_API_ID[currentJsDay]); break;
            case "specific_day": targetBgmIds.add(parseInt(specificWeekday, 10)); break;
            case "mon_thu": [1, 2, 3, 4].forEach(id => targetBgmIds.add(id)); break;
            case "fri_sun": [5, 6, 7].forEach(id => targetBgmIds.add(id)); break;
        }
        filteredByDay = items.filter(item => item.bgm_weekday_id && targetBgmIds.has(item.bgm_weekday_id));
    }

    let sortedResults = [...filteredByDay];
    if (dailySortOrder !== "default") {
        sortedResults.sort((a, b) => {
            if (dailySortOrder === "popularity_rat_bgm") return (b.bgm_rating_total || 0) - (a.bgm_rating_total || 0);
            if (dailySortOrder === "score_bgm_desc") return (b.bgm_score || 0) - (a.bgm_score || 0);
            if (dailySortOrder === "airdate_desc") {
                const dateA = a.air_date || 0;
                const dateB = b.air_date || 0;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            }
            return 0;
        });
    }
    return await sanitizeAndEnsureTmdb(sortedResults);
}

async function loadBilibiliRank(params = {}) {
    const { sort_by = "1", page = 1 } = params; 
    const url = `https://api.bilibili.com/pgc/web/rank/list?day=3&season_type=${sort_by}`; 
    try {
        const res = await Widget.http.get(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.bilibili.com/" } });
        const data = res.data || {};
        const fullList = data.result?.list || data.data?.list || [];
        const pageSize = 20;
        const slicedList = fullList.slice((page - 1) * pageSize, page * pageSize);

        const promises = slicedList.map(async (item) => {
            const cleanTitle = item.title.replace(/第[一二三四五六七八九十\d]+[季章]/g, "").trim();
            const tmdbItem = await searchTmdbAnimeStrict(cleanTitle, item.title, null);
            if (!tmdbItem) return null; 
            return buildItem({
                id: tmdbItem.id, tmdbId: tmdbItem.id, type: "tv", title: tmdbItem.name || tmdbItem.title,
                date: tmdbItem.first_air_date, poster: tmdbItem.poster_path, backdrop: tmdbItem.backdrop_path, rating: tmdbItem.vote_average?.toFixed(1),
                genreText: getGlobalGenreText(tmdbItem.genre_ids), desc: tmdbItem.overview, subTitle: item.new_ep?.index_show || "热播中"
            });
        });
        const results = await Promise.all(promises);
        return results.filter(Boolean); 
    } catch (e) { return []; }
}

async function loadTmdbAnimeRanking(params = {}) {
    const { sort_by = "trending", page = 1 } = params; 
    let queryParams = { language: "zh-CN", page: page, with_genres: "16", with_original_language: "ja" };
    
    if (sort_by === "trending") queryParams.sort_by = "popularity.desc"; 
    else if (sort_by === "new") queryParams.sort_by = "first_air_date.desc"; 
    else if (sort_by === "top") queryParams.sort_by = "vote_average.desc"; 

    try {
        const res = await Widget.tmdb.get("/discover/tv", { params: queryParams });
        return (res.results || []).map(item => buildItem({
            id: item.id, tmdbId: item.id, type: "tv", title: item.name || item.title, date: item.first_air_date, poster: item.poster_path, backdrop: item.backdrop_path, rating: item.vote_average?.toFixed(1), genreText: getGlobalGenreText(item.genre_ids), desc: item.overview
        }));
    } catch (e) { return []; }
}

async function loadAniListRanking(params = {}) {
    const { sort_by = "TRENDING_DESC", page = 1 } = params; 
    const query = `query ($page: Int, $perPage: Int) { Page (page: $page, perPage: $perPage) { media (sort: ${sort_by}, type: ANIME) { title { native romaji english } averageScore seasonYear } } }`; 
    try {
        const res = await Widget.http.post("https://graphql.anilist.co", { query, variables: { page, perPage: 20 } });
        const data = res.data?.data?.Page?.media || [];
        const promises = data.map(async (media) => {
            const tmdbItem = await searchTmdbAnimeStrict(media.title.native || media.title.romaji, media.title.english, media.seasonYear);
            if (!tmdbItem) return null; 
            return buildItem({ id: tmdbItem.id, tmdbId: tmdbItem.id, type: "tv", title: tmdbItem.name || tmdbItem.title, date: tmdbItem.first_air_date, poster: tmdbItem.poster_path, backdrop: tmdbItem.backdrop_path, rating: tmdbItem.vote_average?.toFixed(1), genreText: getGlobalGenreText(tmdbItem.genre_ids), desc: tmdbItem.overview });
        });
        const results = await Promise.all(promises);
        return results.filter(Boolean);
    } catch (e) { return []; }
}

async function loadMalRanking(params = {}) {
    const { sort_by = "airing", page = 1 } = params; 
    let apiParams = { page: page };
    if (sort_by === "airing") apiParams.filter = "airing"; 
    else if (sort_by === "upcoming") apiParams.filter = "upcoming"; 

    try {
        const res = await Widget.http.get("https://api.jikan.moe/v4/top/anime", { params: apiParams });
        const data = res.data?.data || [];
        const promises = data.map(async (item) => {
            const tmdbItem = await searchTmdbAnimeStrict(item.title_japanese || item.title, item.title_english, null);
            if (!tmdbItem) return null; 
            return buildItem({ id: tmdbItem.id, tmdbId: tmdbItem.id, type: "tv", title: tmdbItem.name || tmdbItem.title, date: tmdbItem.first_air_date, poster: tmdbItem.poster_path, backdrop: tmdbItem.backdrop_path, rating: tmdbItem.vote_average?.toFixed(1), genreText: getGlobalGenreText(tmdbItem.genre_ids), desc: tmdbItem.overview });
        });
        const results = await Promise.all(promises);
        return results.filter(Boolean);
    } catch (e) { return []; }
}

const DynamicDataProcessor = (() => {
    function parseBangumiListItems(htmlContent) {
        const $ = Widget.html.load(htmlContent);
        const items = [];
        $('ul#browserItemList li.item').each((_, element) => {
            const $item = $(element);
            const id = $item.attr('id')?.substring(5);
            if (!id) return;
            const title = $item.find('h3 a.l').text().trim();
            const info = $item.find('p.info.tip').text().trim();
            const rating = $item.find('small.fade').text().trim();
            items.push({ id, title, info, rating });
        });
        return items;
    }

    async function processBangumiPage(url, category) {
        try {
            const listHtmlResp = await Widget.http.get(url);
            return parseBangumiListItems(listHtmlResp.data);
        } catch (error) { return []; }
    }

    async function processDailyCalendar() {
        try {
            const apiResponse = await Widget.http.get("https://api.bgm.tv/calendar");
            const allItems = [];
            if (apiResponse && Array.isArray(apiResponse.data)) {
                apiResponse.data.forEach(dayData => {
                    if (dayData && Array.isArray(dayData.items)) {
                        dayData.items.forEach(item => {
                            item.bgm_weekday_id = dayData.weekday?.id;
                            allItems.push(item);
                        });
                    }
                });
            }
            return allItems;
        } catch (error) { return []; }
    }
    return { processBangumiPage, processDailyCalendar };
})();
