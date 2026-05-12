var rule = {
    title: '奇珍异兽[官]',
    host: 'https://www.iqiyi.com',
    homeUrl: '',
    detailUrl: 'https://pcw-api.iqiyi.com/video/video/videoinfowithuser/fyid?agent_type=1&authcookie=&subkey=fyid&subscribe=1',
    searchUrl: 'https://search.video.iqiyi.com/o?if=html5&key=**&pageNum=fypage&pos=1&pageSize=24&site=iqiyi',
    searchable: 2,
    multi: 1,
    filterable: 1,
    filter: 'H4sIAAAAAAAAA+1Z7U7bSBR9F/9mJY+/zausqihqrRZtC6u0XQlVSEBICGFJAO2Gj6ShLB+hNIHQUkqchr6MZ+y8RSd4fO8syw9UUSmL8ieKzz25vj5zfeaO8kYhyvivb5TfvGllXHkx9cRTxpTJ9AuPX4Xdr3S1wErr1C9z9I/089feNXmSB2nuqJ89GsD8QpkZi9Ew22LrLXZYiwOEJAF60ItOFyDgJDirtIPLYuh/i3Fj5tEgElfz6lnG81KP06+8p1OZ6dTEE6m0sy6tL9+xKFqp0aXGjRuHhTOWzcWgBcziUdD7T+1svhlW1mJUc1zI0FijnW4MA8jmVtlsRWRQgVo8DXvHIoOLiQubgb8Uw7ZUQ/iXSEs01G8RbkY0x4AU9WOeReA6Zs4W2fw20BO4/3adbR4kbCiPnlxQvyXKs3XTklch4z2dmJpE6WmtTf/07yr9Sik6FZmhuP7hFrs8xTzXqrogQHhVotWeCMADNRvs/GMM6pBo5z0wUZGNA1ZrCqaKjfapDVxCiIkVtql/iGXAStLcBT3JxgFTFmTaS2ckOa6fm3bOg27vjqJoqmaJG/JvEmoCakqoAaghoTqguoRqgGoSSgAlEqoCqiJK3AQlroQ6gDoSagNqS6j1C/8Qtxxck9QAlJ6eqJyhqsBQ1QFDBYarXsu5JwjEddUU/3CB4NwkOAOCgwRWPWcb7yFsGTxs87C0ihMvU7+/zjx+ln7p3VzM6PNCdN65a4fnVgRZGQcdg6/bdG3zRtsH3U1garyUR2OK9vC9t7wf7Qmbxf6NjmbBfLH7+tkevZxPuKqFr7RkwDpaQuswuHon6PASyF5GLBNyyJsA0eH9ki1Ys12CW0G+yjZykAd+ELVXwHA1Fy107oJmy4nr3Oq3lglF8s2A7RYEbqDllPK0LEwOX1W51zV0SWn30fEppW1Csx0Hkyw1UHGuLeqVr7G3yeaGlZx8oN0viVoI/53H3cZQ72+byOc4X+QFqYPLFrdsWm6zzhUY963bBHelkUGPDPr+DVp/8AYd+D6rLIoZFO1MciIb3SVfDfxlgUL/RovH4cKFcCLd1aHdWemf/pZYZBu9b/+Kqy9QIr3N/b0dSIJzG/c5VpxN5jPCm/7eTId7Sx42IV3aQnhgv4IBY2QuI3P5CeZiPHhz4UVFu7PJVKRJs9tqPWyuYQC0Y3PL/GQOAUOaU9bBTHjAgp5j73ZptYW/uPV8PgiY9+YcYjDZb/S38iI/liMfP1HsZoM7nEBvPWL+e5oauczwusyw2Yj18G2ktsPHlLCRjAGadJJcOKPlPQwRbB62tQ2DhuZCr/Z3PgWd1WTSIHgSigr1qFOAAA444Yc6jCDcSGznJ517yMgBRg7wQ6cUc2gt4P/SxsO2pGR4l3Qo9NHtodVn1PI/uKTD+0/kEOgz8x1+Ib/uqh0AAA==',
    url: 'https://pcw-api.iqiyi.com/search/recommend/list?channel_id=fyclass&data_type=1&page_id=fypage&ret_num=24',
    filter_url: 'is_purchase={{fl.is_purchase}}&mode={{fl.mode}}&three_category_id={{fl.three_category_id}}&market_release_date_level={{fl.year}}&region={{fl.region}}',
    headers: {
        'User-Agent': 'MOBILE_UA'
    },
    timeout: 5000,
    class_name: '电视剧&短剧&电影&综艺&少儿&动漫&漫剧&纪录片&知识',
    class_url: '2&35&1&6&15&4&37&3&31',
    limit: 20,
    play_parse: true,
    lazy: $js.toString(() => {
        try {
            let api = "" + input.split("?")[0];
            console.log(api);
            let response = fetch(api, {
                method: 'get',
                headers: {
                    'User-Agent': 'okhttp/3.14.9',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            let bata = JSON.parse(response);
            if (bata.url.includes("qiyi")) {
                input = {
                    parse: 0,
                    url: bata.url,
                    jx: 0,
                    danmaku: "http://127.0.0.1:9978/proxy?do=danmu&site=js&url=" + input.split("?")[0]
                };
            } else {
                input = {
                    parse: 0,
                    url: input.split("?")[0],
                    jx: 1,
                    danmaku: "http://127.0.0.1:9978/proxy?do=danmu&site=js&url=" + input.split("?")[0]
                };
            }
        } catch {
            input = {
                parse: 0,
                url: input.split("?")[0],
                jx: 1,
                danmaku: "http://127.0.0.1:9978/proxy?do=danmu&site=js&url=" + input.split("?")[0]
            };
        }
    }),
    推荐: '',
    一级: 'js:let d=[];var rm=input.match(/&region=([^&]+)/);if(rm&&rm[1]){input=input.replace(/three_category_id=[^&]*/,"three_category_id="+rm[1])}input=input.replace(/&region=[^&]*/g,"");if(MY_CATE==="1"||MY_CATE==="4"){input=input.replace("search/recommend/list","search/video/videolists").replace("page_id=","pageNum=").replace("ret_num=24","pageSize=24")}let html=request(input);let json=JSON.parse(html);if(json.code==="A00003"){fetch_params.headers["user-agent"]=PC_UA;json=JSON.parse(fetch(input,fetch_params))}json.data.list.forEach(function(data){var vid=data.albumId||data.tvId;if(data.channelId===1){desc=data.score?data.score+"分\\t":"";if(data.duration)desc+=data.duration}else if(data.channelId===2||data.channelId===4||data.channelId===35||data.channelId===15||data.channelId===37){if(data.latestOrder===data.videoCount){desc=(data.score?data.score+"分\\t":"")+data.latestOrder+"集全"}else{if(data.videoCount){desc=(data.score?data.score+"分\\t":"")+data.latestOrder+"/"+data.videoCount+"集"}else if(data.latestOrder){desc="更新至 "+data.latestOrder+"集"}else{desc=data.focus||""}}}else if(data.channelId===6){desc=data.period+"期"}else{if(data.latestOrder){desc="更新至 第"+data.latestOrder+"期"}else if(data.period){desc=data.period}else{desc=data.focus||""}}url=MY_CATE+"$"+vid;d.push({url:url,title:data.name,desc:desc,pic_url:data.imageUrl.replace(".jpg","_390_520.jpg?caplist=jpg,webp")})});setResult(d);',
    二级: 'js:let d=[];let html=request(input);let json=JSON.parse(html).data;VOD={vod_id:"",vod_url:input,vod_name:"",type_name:"",vod_actor:"",vod_year:"",vod_director:"",vod_area:"",vod_content:"",vod_remarks:"",vod_pic:""};VOD.vod_name=json.name;try{if(json.latestOrder){VOD.vod_remarks="类型: "+(json.categories[0].name||"")+"\\t"+(json.categories[1].name||"")+"\\t"+(json.categories[2].name||"")+"\\t"+"评分："+(json.score||"")+"\\n更新至：第"+json.latestOrder+"集(期)/共"+json.videoCount+"集(期)"}else{VOD.vod_remarks="类型: "+(json.categories[0].name||"")+"\\t"+(json.categories[1].name||"")+"\\t"+(json.categories[2].name||"")+"\\t"+"评分："+(json.score||"")+json.period}}catch(e){VOD.vod_remarks=json.subtitle}VOD.vod_area=(json.focus||"")+"\\n资费："+(json.payMark===1?"VIP":"免费")+"\\n地区："+(json.areas||"");let vsize="579_772";try{vsize=json.imageSize[12]}catch(e){}VOD.vod_pic=json.imageUrl.replace(".jpg","_"+vsize+".jpg?caplist=jpg,webp");VOD.type_name=json.categories.map(function(it){return it.name}).join(",");if(json.people.main_charactor){let vod_actors=[];json.people.main_charactor.forEach(function(it){vod_actors.push(it.name)});VOD.vod_actor=vod_actors.join(",")}VOD.vod_content=json.description;let playlists=[];if(json.channelId===1){playlists=[{playUrl:json.playUrl,imageUrl:json.imageUrl,shortTitle:json.shortTitle,focus:json.focus,period:json.period}]}else{if(json.channelId===6){let qs=json.period.split("-")[0];let listUrl="https://pcw-api.iqiyi.com/album/source/svlistinfo?cid=6&sourceid="+json.albumId+"&timelist="+qs;let playData=JSON.parse(request(listUrl)).data[qs];playData.forEach(function(it){playlists.push({playUrl:it.playUrl,imageUrl:it.imageUrl,shortTitle:it.shortTitle,focus:it.focus,period:it.period})})}else{let listUrl="https://pcw-api.iqiyi.com/albums/album/avlistinfo?aid="+json.albumId+"&size=200&page=1";let data=JSON.parse(request(listUrl)).data;let total=data.total;playlists=data.epsodelist;if(total>200){for(let i=2;i<total/200+1;i++){let listUrl="https://pcw-api.iqiyi.com/albums/album/avlistinfo?aid="+json.albumId+"&size=200&page="+i;let data=JSON.parse(request(listUrl)).data;playlists=playlists.concat(data.epsodelist)}}}}playlists.forEach(function(it){d.push({title:it.shortTitle||"第"+it.order+"集",desc:it.subtitle||it.focus||it.period,img:it.imageUrl.replace(".jpg","_480_270.jpg?caplist=jpg,webp"),url:it.playUrl})});VOD.vod_play_from="qiyi";VOD.vod_play_url=d.map(function(it){return it.title+"$"+it.url}).join("#");',
    搜索: 'json:.data.docinfos;.albumDocInfo.albumTitle;.albumDocInfo.albumVImage;.albumDocInfo.channel;.albumDocInfo.albumId;.albumDocInfo.tvFocus',
}