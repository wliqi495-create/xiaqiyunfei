let host = 'https://emby.bangumi.ca';/*"Emby服务器URL (例如 http://localhost:8096): "*/
let Token = "8b0b16aae7e8403cb3d19969b82c3902";
let Users = "80e861cbff1343bfa0bedcea78895b91";
let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": host + "/",
    "Accept-Language": "zh-CN,zh;q=0.9"
};
const init = async () => {};
const extractVideos = jsonData => {
    if (!jsonData || !jsonData.Items) return [];
    return jsonData.Items.map(it => {
        return {
            vod_id: it.Id,
            vod_name: it.Name || "",
            vod_pic: it.ImageTags?.Primary ? `${host}/emby/Items/${it.Id}/Images/Primary?maxWidth=400&tag=${it.ImageTags.Primary}&quality=90` : "",
            vod_remarks: it.ProductionYear ? it.ProductionYear.toString() : ""
        };
    });
};

const homeVod = async () => {
    const url = `${host}/emby/Users/${Users}/Views?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Android+WebView+Android&X-Emby-Device-Id=ea27caf7-9a51-4209-b1a5-374bf30c2ffd&X-Emby-Client-Version=4.9.0.31&X-Emby-Token=${Token}&X-Emby-Language=zh-cn`;
    const resp = await req(url, { headers });
    if (!resp?.content) return JSON.stringify({ list: [] });
    const json = JSON.parse(resp.content);
    return JSON.stringify({ list: extractVideos(json) });
};
const home = async () => {
    const url = `${host}/emby/Users/${Users}/Views?X-Emby-Client=Emby+Web&X-Emby-Device-Name=Android+WebView+Android&X-Emby-Device-Id=ea27caf7-9a51-4209-b1a5-374bf30c2ffd&X-Emby-Client-Version=4.9.0.31&X-Emby-Token=${Token}&X-Emby-Language=zh-cn`;
    const resp = await req(url, { headers });
    if (!resp?.content) return JSON.stringify({ class: [], filters: {}, list: [] });
    const json = JSON.parse(resp.content);
    const classList = json.Items
        .filter(it => !it.Name.includes("播放列表") && !it.Name.includes("相机"))
        .map(it => ({
            type_id: it.Id,
            type_name: it.Name
        }));
    const list = [];
    return JSON.stringify({
        class: classList,
        filters: {},
        list
    });
};
const category = async (tid, pg, _, extend) => {
    const startIndex = (pg - 1) * 30;
    const url = `${host}/emby/Users/${Users}/Items?SortBy=DateLastContentAdded%2CSortName&SortOrder=Descending&IncludeItemTypes=Movie%2CSeries&Recursive=true&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CStatus%2CCriticRating%2CEndDate%2CPath&StartIndex=${startIndex}&ParentId=${tid}&EnableImageTypes=Primary%2CBackdrop%2CThumb%2CBanner&ImageTypeLimit=1&Limit=30&EnableUserData=true&X-Emby-Token=${Token}`;
    const resp = await req(url, { headers });
    if (!resp?.content) return JSON.stringify({ list: [], page: +pg, pagecount: 1, limit: 30 });
    const json = JSON.parse(resp.content);
    const list = extractVideos(json);
    const total = json.TotalRecordCount || 0;
    const pagecount = pg * 30 < total ? +pg + 1 : +pg;
    return JSON.stringify({ list, page: +pg, pagecount, limit: 30, total });
};
const detail = async id => {
    const url = `${host}/emby/Users/${Users}/Items/${id}?X-Emby-Token=${Token}`;
    const resp = await req(url, { headers });
    if (!resp?.content) return JSON.stringify({ list: [] });
    const info = JSON.parse(resp.content);
    let playFrom = "EMBY";
    let playUrl = "";
    if (!info.IsFolder) {
        playUrl += `${info.Name.trim()}$${info.Id}#`;
    } else {
        if (info.Type === "Series") {
            const seasonsUrl = `${host}/emby/Shows/${id}/Seasons?UserId=${Users}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating&EnableImages=true&EnableUserData=true&X-Emby-Token=${Token}`;
            const seasonsResp = await req(seasonsUrl, { headers });
            if (seasonsResp?.content) {
                const seasons = JSON.parse(seasonsResp.content);
                for (const season of seasons.Items) {
                    const episodesUrl = `${host}/emby/Shows/${id}/Episodes?SeasonId=${season.Id}&Fields=BasicSyncInfo%2CCanDelete%2CCommunityRating%2CPrimaryImageAspectRatio%2CProductionYear%2COverview&UserId=${Users}&Limit=1000&X-Emby-Token=${Token}`;
                    const episodesResp = await req(episodesUrl, { headers });
                    if (episodesResp?.content) {
                        const episodes = JSON.parse(episodesResp.content);
                        for (const episode of episodes.Items) {
                            const seasonName = season.Name.replace('#', '-').replace('$', '|').trim();
                            const episodeName = episode.Name.trim();
                            playUrl += `${seasonName}|${episodeName}$${episode.Id}#`;
                        }
                    }
                }
            }
        } else {
            const itemsUrl = `${host}/emby/Users/${Users}/Items?ParentId=${id}&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CCommunityRating%2CCriticRating&ImageTypeLimit=1&StartIndex=0&EnableUserData=true&X-Emby-Token=${Token}`;
            const itemsResp = await req(itemsUrl, { headers });
            if (itemsResp?.content) {
                const items = JSON.parse(itemsResp.content);
                for (const item of items.Items) {
                    playUrl += `${item.Name.replace('#', '-').replace('$', '|').trim()}$${item.Id}#`;
                }
            }
        }
    }
    playUrl = playUrl.slice(0, -1);
    return JSON.stringify({
        list: [{
            vod_id: id,
            vod_name: info.Name || "",
            vod_pic: info.ImageTags?.Primary ? `${host}/emby/Items/${id}/Images/Primary?maxWidth=400&tag=${info.ImageTags.Primary}&quality=90` : "",
            vod_content: info.Overview ? info.Overview.replace(/\xa0/g, ' ').replace(/\n\n/g, '\n').trim() : "暂无简介",
            vod_year: info.ProductionYear ? info.ProductionYear.toString() : "",
            vod_director: "",
            vod_actor: "",
            vod_type: info.Genres ? info.Genres.join(" / ") : "",
            vod_play_from: playFrom,
            vod_play_url: playUrl
        }]
    });
};

const search = async (wd, _, pg = 1) => {
    const url = `${host}/emby/Users/${Users}/Items?SortBy=SortName&SortOrder=Ascending&Fields=BasicSyncInfo%2CCanDelete%2CContainer%2CPrimaryImageAspectRatio%2CProductionYear%2CStatus%2CEndDate&StartIndex=0&EnableImageTypes=Primary%2CBackdrop%2CThumb&ImageTypeLimit=1&Recursive=true&SearchTerm=${encodeURIComponent(wd)}&GroupProgramsBySeries=true&Limit=50&X-Emby-Token=${Token}`;
    const resp = await req(url, { headers });
    if (!resp?.content) return JSON.stringify({ list: [] });
    const json = JSON.parse(resp.content);
    return JSON.stringify({ list: extractVideos(json) });
};

const play = async (_, id) => {
    const playbackUrl = `${host}/emby/Items/${id}/PlaybackInfo?UserId=${Users}&IsPlayback=false&AutoOpenLiveStream=false&StartTimeTicks=0&MaxStreamingBitrate=7000000&X-Emby-Token=${Token}`;
    const resp = await req(playbackUrl, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "DeviceProfile": {
                "DirectPlayProfiles": [{"Container": "mp4,m4v,mkv,hls,webm", "Type": "Video"}],
                "TranscodingProfiles": [{"Container": "ts", "Type": "Video", "Protocol": "hls"}]
            }
        })
    });
    if (!resp?.content) return JSON.stringify({ parse: 1, url: playbackUrl, header: headers });
    const json = JSON.parse(resp.content);
    const mediaSources = json.MediaSources;
    if (!mediaSources || mediaSources.length === 0) {
        return JSON.stringify({ parse: 1, url: playbackUrl, header: headers });
    }
    const mediaSource = mediaSources[0];
    if (mediaSource.DirectStreamUrl) {
        return JSON.stringify({ parse: 0, url: host + mediaSource.DirectStreamUrl, header: headers });
    } else if (mediaSource.Protocol === "Http") {
        return JSON.stringify({ parse: 0, url: mediaSource.Path, header: headers });
    }
    return JSON.stringify({ parse: 1, url: playbackUrl, header: headers });
};
export default { init, home, homeVod, category, detail, search, play };
