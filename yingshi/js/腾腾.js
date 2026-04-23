var rule = {
    title: '小心儿悠悠',
    host: 'https://v.qq.com',
    homeUrl: '/x/bu/pagesheet/list?_all=1&append=1&channel=cartoon&listpage=1&offset=0&pagesize=21&iarea=-1&sort=18',
    detailUrl: 'https://node.video.qq.com/x/api/float_vinfo2?cid=fyid',
    searchUrl: '**',
    searchable: 1,
    filterable: 1,
    multi: 1,
    url: '/x/bu/pagesheet/list?_all=1&append=1&channel=fyclass&listpage=1&offset=((fypage-1)*21)&pagesize=21&iarea=-1',
    filter_url: 'sort={{fl.sort or 75}}&iyear={{fl.iyear}}&year={{fl.year}}&itype={{fl.type}}&ifeature={{fl.feature}}&iarea={{fl.area}}&itrailer={{fl.itrailer}}&gender={{fl.sex}}',
    filter: 'H4sIAAAAAAAAA+1YW08TWxR+92fMMySdFlrwEY3RnOT4YnzQ8DDBOaERqamVHGJIWksvXFIoYvEcSuViDxVpKYpYprb+mdl7Zv6Fe9rurrXdqE2OlRd4mvnW7L3u31r0mTIxGQpO6MrV+8+Uh/qsclV5EgpHlAFlWnvEUIVm1oixwt5ntKmn7c+mXTgfteJlF2YvgWFlbqCL01y1g4/4ujgpNuyjeY6ryty4K2krDM7qWhg0krMTs74naSSJkhMvdW4YZDcMXGkLvB6vvwO3HrFgGARgI3sZAnwI4z7AfRj3Au7FuAq4inEP4B6Eq6NdnD0ifATwEYwHAA9gHBxW/RgHf9kji/H4gBKZ6UtuA6Pn59a1B+X2L12LPA3roNM6rpPCUg/ZbeNW+pjGE/xuULnyxt7jMGSEPj+0ctkODAl04g1Se96BId+kckoM7ie4SXJ5srDfgSG65udtUkxx70Fl+T+zuc0LGy5JbtINbiCEim7F7eoSdwdKw9l6S7INjiP3M1VSKXAcebS1Rl8VOQ4uWcsZMFIFn6z9LDmroxRx/F2BLkY5HkB659H3I/1t18tuhW59FJoJXigZR2Yf/49uXTyyGgdyoy0eky8bUrcKjaZ62B8q5HjZ3okimR+0CF3eOgfZEfnClX2vCZhIRcwRW6XRHJZ5kPkla104h0KcfmUaC1gfZFjgl9Y5qArmuGgnqlTWwd/YCXcKdNOSIVLMJMnKe3wnyOxozFpI4XNQDnbxC2QTwZUqabwUT7n9gYrlkgn6xwQzWjioR2b7wgVukC4Z/ffkcUILR0Kh6YvkdC2sayi9+SpZNnrmdJJMsBPSBkY3ijR/KG9gh/tWMyNxCUmcmnVOr0O/cODgPQVNAcz0UGAieSLrkmvOP28loxm30xwfWygDqwXrMCsHJLbEho+0HzrldTDlO4sXqlFxtgVwuEmtJi92dHuHbHZnDLo//9o0DLTA8e8zJWs1KS+O4uxAkayvkETtx/l0x+glm/wmNpkMTj3ozz90aHHBXPLNyH+i/430RfdJ+l3vVFL8QMq8z1ATr38C2Nsn5vLhVjqPucSS/klFO815WvnYsyWeQR95H5McHxr0AwyWBAZHAQa7VQ9DzXrRrC3KG3aiJFjVpqBWxTwITYT6UzAijwcjYS04peM4pQzyIkZzZz3HaWzsmhQkstlwF+l8FXgL/L45dpvHSUV2/nnzDzm/LYZzdrNO7IXE0rfu3OX3DPsQG2d2rZNd4QzTA+rvXb8BMPSPnWjalSM7dUDSpzJlk9W02cjTvEELvMf851fh8K8blMwYa/5Uih+b1c7e6+6CD/ibpvn5X6kE2UihuZRstDA8UP9tmsaSlAg2nGH0AT/aJ7ts2MiTieUAhjP+SaNxQHfSUibFXzTQYrKRoDBAW/09PvcVk1nUEv4UAAA=',
    headers: {
        'User-Agent': 'PC_UA'
    },
    timeout: 5000,
    cate_exclude: '会员|游戏|全部',
    class_name: '电影&电视剧&综艺&动漫&少儿&纪录片',
    class_url: 'movie&tv&variety&cartoon&child&doco',
    limit: 20,
    play_parse: true,
    lazy: $js.toString(() => {
        let d = [];
        let url1 = JSON.parse(request("" + input)).url;

        function isEncrypted(url) {
            return url.includes('baidu.con/') && url.length > 16;
        }

        let url;
        if (isEncrypted(url1)) {
            console.log("");
            var withoutDomain = url1.replace(/^https:\/\/baidu\.con\//, '');
            var first16Chars = withoutDomain.substring(0, 16);
            var remainingString = withoutDomain.substring(16);
            var key = CryptoJS.enc.Utf8.parse(first16Chars);
            var iv = key;

            function AES_Decrypt(word) {
                var srcs = word;
                var decrypt = CryptoJS.AES.decrypt(srcs, key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });
                return decrypt.toString(CryptoJS.enc.Utf8);
            };

            url = AES_Decrypt(remainingString);
        } else {
            console.log("");
            url = url1;
        }

        input = {
            url: url,
            parse: 0,
            header: rule.headers
        }
        setResult(d);
    }),

    推荐: '.list_item;img&&alt;img&&src;a&&Text;a&&data-float',
    一级: '.list_item;img&&alt;img&&src;a&&Text;a&&data-float',
    二级: $js.toString(() => {
        VOD = {};
        let d = [];
        let video_list = [];
        let video_lists = [];
        let QZOutputJson;
        let html = fetch(input, fetch_params);
        let sourceId = /get_playsource/.test(input) ? input.match(/id=(\d*?)&/)[1] : input.split("cid=")[1];
        let cid = sourceId;
        let detailUrl = "https://v.qq.com/detail/m/" + cid + ".html";
        try {
            let json = JSON.parse(html);
            VOD = {
                vod_url: input,
                vod_name: json.c.title,
                type_name: json.typ.join(","),
                vod_actor: json.nam.join(","),
                vod_year: json.c.year,
                vod_content: json.c.description,
                vod_remarks: json.rec,
                vod_pic: urljoin2(input, json.c.pic)
            }
        } catch (e) {}
        if (/get_playsource/.test(input)) {
            eval(html);
            let indexList = QZOutputJson.PlaylistItem.indexList;
            indexList.forEach(function(it) {
                let dataUrl = "https://s.video.qq.com/get_playsource?id=" + sourceId + "&plat=2&type=4&data_type=3&range=" + it + "&video_type=10&plname=qq&otype=json";
                eval(fetch(dataUrl, fetch_params));
                let vdata = QZOutputJson.PlaylistItem.videoPlayList;
                vdata.forEach(function(item) {
                    d.push({
                        title: item.title,
                        pic_url: item.pic,
                        url: item.playUrl
                    })
                });
                video_lists = video_lists.concat(vdata)
            })
        } else {
            let json = JSON.parse(html);
            video_lists = json.c.video_ids;
            let url = "https://v.qq.com/x/cover/" + sourceId + ".html";
            if (video_lists.length === 1) {
                let vid = video_lists[0];
                let o_url = "https://union.video.qq.com/fcgi-bin/data?otype=json&tid=1804&appid=20001238&appkey=6c03bbe9658448a4&union_platform=1&idlist=" + vid;
                let o_html = fetch(o_url, fetch_params);
                eval(o_html);
                if (QZOutputJson.results && QZOutputJson.results.length > 0) {
                    let it1 = QZOutputJson.results[0].fields;
                    url = "https://v.qq.com/x/cover/" + cid + "/" + vid + ".html";
                    d.push({
                        title: it1.title,
                        url: url
                    })
                } else {
                    url = "https://v.qq.com/x/cover/" + cid + "/" + vid + ".html";
                    d.push({
                        title: "正片播放",
                        url: url
                    })
                }
            } else if (video_lists.length > 1) {
                for (let i = 0; i < video_lists.length; i += 30) {
                    video_list.push(video_lists.slice(i, i + 30))
                }
                video_list.forEach(function(it, idex) {
                    let o_url = "https://union.video.qq.com/fcgi-bin/data?otype=json&tid=1804&appid=20001238&appkey=6c03bbe9658448a4&union_platform=1&idlist=" + it.join(",");
                    let o_html = fetch(o_url, fetch_params);
                    eval(o_html);
                    QZOutputJson.results.forEach(function(it1) {
                        it1 = it1.fields;
                        let url = "https://v.qq.com/x/cover/" + cid + "/" + it1.vid + ".html";
                        d.push({
                            title: it1.title,
                            pic_url: it1.pic160x90.replace("/160", ""),
                            desc: it1.video_checkup_time,
                            url: url,
                            type: it1.category_map && it1.category_map.length > 1 ? it1.category_map[1] : ""
                        })
                    })
                })
            }
        }

        let playFrom = [];
        let playUrl = [];

        let ygKeywords = ["预告", "花絮", "片花", "特辑", "幕后", "采访", "制作", "MV", "主题曲"];

        let yg = d.filter(function(it) {
            return it.type && ygKeywords.some(keyword => it.type.includes(keyword));
        });
        let zp = d.filter(function(it) {
            return !(it.type && ygKeywords.some(keyword => it.type.includes(keyword)));
        });

        if (zp.length > 0) {
            playFrom.push("正片");
            playUrl.push(zp.map(it => it.title + "$" + it.url).join("#"));
        }

        if (yg.length > 0) {
            let 预告 = yg.filter(it => it.type && it.type.includes("预告"));
            let 花絮片花 = yg.filter(it => it.type && (it.type.includes("花絮") || it.type.includes("片花")));
            let 特辑 = yg.filter(it => it.type && (it.type.includes("特辑") || it.type.includes("幕后")));

            if (预告.length > 0) {
                playFrom.push("预告");
                playUrl.push(预告.map(it => it.title + "$" + it.url).join("#"));
            }
            if (花絮片花.length > 0) {
                playFrom.push("花絮片花");
                playUrl.push(花絮片花.map(it => it.title + "$" + it.url).join("#"));
            }
            if (特辑.length > 0) {
                playFrom.push("特辑");
                playUrl.push(特辑.map(it => it.title + "$" + it.url).join("#"));
            }
        }

        VOD.vod_play_from = playFrom.join("$$$");
        VOD.vod_play_url = playUrl.join("$$$");
    }),
    搜索: $js.toString(() => {
        let d = [],
            keyword = input.split("/")[3];
        let seenIds = new Set();

        function vodSearch(keyword, page = 0) {
            return request('https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.MultiTerminalSearch/MbSearch?vplatform=2', {
                body: JSON.stringify({
                    version: "25042201",
                    clientType: 1,
                    filterValue: "",
                    uuid: "B1E50847-D25F-4C4B-BBA0-36F0093487F6",
                    retry: 0,
                    query: keyword,
                    pagenum: page,
                    isPrefetch: true,
                    pagesize: 30,
                    queryFrom: 0,
                    isneedQc: true,
                    extraInfo: {
                        isNewMarkLabel: "1",
                        multi_terminal_pc: "1",
                        themeType: "1"
                    }
                }),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.139 Safari/537.36',
                    'Content-Type': 'application/json',
                    'Origin': 'https://v.qq.com',
                    'Referer': 'https://v.qq.com/'
                },
                method: 'POST'
            });
        }

        const nonMainContentKeywords = [
            '：', '#', '特辑', '“', '剪辑', '片花', '独家', '专访', '纯享',
            '制作', '幕后', '宣传', '看点', '主题曲', '插曲', '彩蛋',
            '精彩', '集锦', '盘点', '回顾', '解说', '评测', '反应', 'reaction'
        ];

        function isMainContent(title) {
            if (!title) return false;
            if (title.includes('<em>') || title.includes('</em>')) return false;
            return !nonMainContentKeywords.some(keyword => title.includes(keyword));
        }

        try {
            let html = vodSearch(keyword, 0);
            let json = JSON.parse(html);

            function processItemList(itemList) {
                if (!itemList) return;

                itemList.forEach(it => {
                    if (it.doc && it.doc.id && it.videoInfo && isMainContent(it.videoInfo.title)) {
                        const itemId = it.doc.id;
                        if (!seenIds.has(itemId)) {
                            seenIds.add(itemId);
                            d.push({
                                title: it.videoInfo.title,
                                img: it.videoInfo.imgUrl || "",
                                url: itemId,
                                desc: it.videoInfo.secondLine || ""
                            });
                        }
                    }
                });
            }

            if (json.data && json.data.normalList) {
                processItemList(json.data.normalList.itemList);
            }

            if (json.data && json.data.areaBoxList) {
                json.data.areaBoxList.forEach(box => {
                    processItemList(box.itemList);
                });
            }

        } catch (e) {
            log("搜索出错: " + e.message);
        }

        setResult(d);
    })
};