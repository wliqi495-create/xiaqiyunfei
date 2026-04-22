//Original Author:nibiru
WidgetMetadata = {
  id: "jable_int",
  title: "Jable",
  description: "修复声音&恢复大量分类",
  author: "nibiru｜MakkaPakka｜蝴蝶",
  site: "https://widgets-xd.vercel.app",
  version: "1.3.0",
  requiredVersion: "0.0.2",
  detailCacheDuration: 60,
  modules: [
    // \u641c\u7d22\u6a21\u5757
    {
      title: "\u641c\u7d22",
      description: "\u641c\u7d22",
      requiresWebView: false,
      functionName: "search",
      cacheDuration: 3600,
      params: [
        {
          name: "keyword",
          title: "\u5173\u952e\u8bcd",
          type: "input",
          description: "\u5173\u952e\u8bcd",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u8fd1\u671f\u6700\u4f73", value: "post_date_and_popularity" },
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u70ed\u95e8\u6a21\u5757
    {
      title: "\u70ed\u95e8",
      description: "\u70ed\u95e8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u5217\u8868\u5730\u5740",
          type: "constant",
          description: "\u5217\u8868\u5730\u5740",
          value: "https://jable.tv/hot/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u4eca\u65e5\u70ed\u95e8", value: "video_viewed_today" },
            { title: "\u672c\u5468\u70ed\u95e8", value: "video_viewed_week" },
            { title: "\u672c\u6708\u70ed\u95e8", value: "video_viewed_month" },
            { title: "\u6240\u6709\u65f6\u95f4", value: "video_viewed" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u6700\u65b0\u6a21\u5757
    {
      title: "\u6700\u65b0",
      description: "\u6700\u65b0\u4e0a\u5e02\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u5217\u8868\u5730\u5740",
          type: "constant",
          description: "\u5217\u8868\u5730\u5740",
          value: "https://jable.tv/new-release/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u65b0\u53d1\u5e03", value: "latest-updates" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },

    // \u4e2d\u6587\u6a21\u5757
    {
      title: "\u4e2d\u6587",
      description: "\u4e2d\u6587\u5b57\u5e55\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u5217\u8868\u5730\u5740",
          type: "constant",
          description: "\u5217\u8868\u5730\u5740",
          value: "https://jable.tv/categories/chinese-subtitle/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u5973\u4f18\u6a21\u5757
    {
      title: "\u5973\u4f18",
      description: "\u6309\u5973\u4f18\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u5973\u4f18",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u4e09\u4e0a\u60a0\u4e9a", 
              value: "https://jable.tv/s1/models/yua-mikami/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u696a\u53ef\u601c", 
              value: "https://jable.tv/models/86b2f23f95cc485af79fe847c5b9de8d/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5c0f\u91ce\u5915\u5b50", 
              value: "https://jable.tv/models/2958338aa4f78c0afb071e2b8a6b5f1b/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5927\u69fb\u54cd", 
              value: "https://jable.tv/models/hibiki-otsuki/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u85e4\u68ee\u91cc\u7a57", 
              value: "https://jable.tv/models/riho-fujimori/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "JULIA", 
              value: "https://jable.tv/models/julia/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u660e\u91cc\u4337", 
              value: "https://jable.tv/models/tsumugi-akari/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6843\u4e43\u6728\u9999\u5948", 
              value: "https://jable.tv/models/momonogi-kana/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6c34\u6237\u9999\u5948", 
              value: "https://jable.tv/models/kana-mito/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7be0\u7530\u3086\u3046", 
              value: "https://jable.tv/s1/models/shinoda-yuu/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u67ab\u53ef\u601c", 
              value: "https://jable.tv/models/kaede-karen/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5409\u6ca2\u660e\u6b69", 
              value: "https://jable.tv/models/akiho-yoshizawa/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7fbd\u6708\u5e0c", 
              value: "https://jable.tv/models/21e145d3f4d7c8c818fc7eae19342a7a/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7f8e\u8c37\u6731\u91cc", 
              value: "https://jable.tv/s1/models/mitani-akari/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5c71\u5cb8\u9022\u82b1", 
              value: "https://jable.tv/models/yamagishi-aika/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4f50\u4f50\u6728\u660e\u5e0c", 
              value: "https://jable.tv/models/sasaki-aki/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u795e\u6728\u9e97", 
              value: "https://jable.tv/models/ef9b1ab9a21b58d6ee4d7d97ab883288/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e03\u6cfd\u7f8e\u4e9a", 
              value: "https://jable.tv/models/nanasawa-mia/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u702c\u6238\u74b0\u5948", 
              value: "https://jable.tv/models/1a71be5a068c6f9e00fac285b31019f9/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7027\u672c\u96eb\u8449", 
              value: "https://jable.tv/models/7ffb432871f53eda0b4d80be34fff86a/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u3055\u304f\u3089\u308f\u304b\u306a", 
              value: "https://jable.tv/models/0b96db26c8b192b0a54e24d878380765/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5f69\u6708\u4e03\u7dd2", 
              value: "https://jable.tv/models/e82b22cd3275fd0e569147d82fa1999d/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u9234\u4e43\u30a6\u30c8", 
              value: "https://jable.tv/models/559904d22cbf03091f790258aa4e9b8c/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e09\u7530\u771f\u9234", 
              value: "https://jable.tv/models/7749dd641e0426f55342972d920513a7/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e03\u30c4\u68ee\u308a\u308a", 
              value: "https://jable.tv/models/9ed214792a2144520430dd494c93f651/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e03\u5d8b\u821e", 
              value: "https://jable.tv/models/6ab2e738a33eafc3db27cab0b83cf5cd/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u516b\u639b\u3046\u307f", 
              value: "https://jable.tv/models/83397477054d35cd07e2c48685335a86/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u516b\u6728\u5948\u3005", 
              value: "https://jable.tv/models/3610067a1d725dab8ee8cd3ffe828850/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5bae\u4e0b\u73b2\u5948", 
              value: "https://jable.tv/models/b435825a4941964079157dd2fc0a8e5a/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5c0f\u6e4a\u3088\u3064\u8449", 
              value: "https://jable.tv/models/ff8ce98f2419126e00a90bc1f3385824/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5c0f\u91ce\u516d\u82b1", 
              value: "https://jable.tv/models/0478c4db9858c4e6c60af7fbf828009a/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5de5\u85e4\u3086\u3089", 
              value: "https://jable.tv/models/e7ba849893aa7ce8afcc3003a4075c20/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u672c\u5e84\u9234", 
              value: "https://jable.tv/models/honjou-suzu/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u685c\u7a7a\u3082\u3082", 
              value: "https://jable.tv/models/sakura-momo/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6953\u3075\u3046\u3042", 
              value: "https://jable.tv/models/f88e49c4c1adb0fd1bae71ac122d6b82/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6cb3\u5317\u5f69\u4f3d", 
              value: "https://jable.tv/models/saika-kawakita2/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u77e2\u57dc\u611b\u8309", 
              value: "https://jable.tv/models/0903b1921df6c616c29041be11c3d2e8/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u77f3\u5ddd\u6faa", 
              value: "https://jable.tv/models/a855133fa44ca5e7679cac0a0ab7d1cb/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7f8e\u30ce\u5d8b\u3081\u3050\u308a", 
              value: "https://jable.tv/models/d1ebb3d61ee367652e6b1f35b469f2b6/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u91ce\u3005\u6d66\u6696", 
              value: "https://jable.tv/models/6b0ce5c4944edce04ab48d4bb608fd4c/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u9752\u7a7a\u3072\u304b\u308a", 
              value: "https://jable.tv/models/4c7a2cfa27b343e3e07659650400f61d/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u9999\u6f84\u308a\u3053", 
              value: "https://jable.tv/models/6c2e861e04b9327701a80ca77a088814/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u65b0\u3042\u308a\u306a", 
              value: "https://jable.tv/models/e763382dc86aa703456d964ca25d0e8b/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u672a\u6b69\u306a\u306a", 
              value: "https://jable.tv/models/c9535c2f157202cd0e934d62ef582e2e/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u51ea\u3072\u304b\u308b", 
              value: "https://jable.tv/models/91fca8d824e07075d09de0282f6e9076/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e09\u5bae\u3064\u3070\u304d", 
              value: "https://jable.tv/models/f0e279c00b2a7e1aca2ef4d31d611020/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u85cd\u82bd\u307f\u305a\u304d", 
              value: "https://jable.tv/models/679c69a5488daa35a5544749b75556c6/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u3064\u3070\u3055\u821e", 
              value: "https://jable.tv/models/0d7709a62cc199f923107c120d30893b/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u671d\u65e5\u308a\u304a", 
              value: "https://jable.tv/models/ad0935cfa1449ab126dde2b0c0929ad0/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u65e5\u4e0b\u90e8\u52a0\u5948", 
              value: "https://jable.tv/models/dfea76fd68bc52e0888a78e0fedce073/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5f13\u4e43\u308a\u3080", 
              value: "https://jable.tv/models/06c22ca98d8ec82963046ad17e0fad4a/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u590f\u5e0c\u307e\u308d\u3093", 
              value: "https://jable.tv/models/1c0f1b4475962e88b541f9f0db1584fe/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6c34\u5ddd\u30b9\u30df\u30ec", 
              value: "https://jable.tv/models/7415fde573b12a4e87e83ef33ea354d5/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5b9f\u6d5c\u307f\u304d", 
              value: "https://jable.tv/models/299c2d256b9c509f80302d261ea0b5a9/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5f25\u751f\u307f\u3065\u304d", 
              value: "https://jable.tv/s1/models/mizuki-yayoi/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5929\u5ddd\u305d\u3089", 
              value: "https://jable.tv/models/3e69d39a117c2d25a407dfd57e204e48/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u65b0\u540d\u3042\u307f\u3093", 
              value: "https://jable.tv/models/0dba31ccef2f1fca3563c56dbcf3fa7d/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5c0f\u6cfd\u83dc\u7a57", 
              value: "https://jable.tv/models/2ec30dc8e35906a29fe5c8f5b97e6c89/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e09\u539f\u307b\u306e\u304b", 
              value: "https://jable.tv/models/mihara-honoka/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6dbc\u68ee\u308c\u3080", 
              value: "https://jable.tv/models/7cadf3e484f607dc7d0f1c0e7a83b007/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u68ee\u65e5\u5411\u5b50", 
              value: "https://jable.tv/models/1a7543f89b125421e489d98de472ebf4/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u91d1\u677e\u5b63\u6b69", 
              value: "https://jable.tv/models/48ace5552227a2a4f867af73efa18f2d/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/s1/models/yua-mikami/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },

    // \u8863\u7740\u6a21\u5757
    {
      title: "\u8863\u7740",
      description: "\u6309\u8863\u7740\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u8863\u7740",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u9ed1\u4e1d", 
              value: "https://jable.tv/tags/black-pantyhose/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8089\u4e1d", 
              value: "https://jable.tv/tags/flesh-toned-pantyhose/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e1d\u889c", 
              value: "https://jable.tv/tags/pantyhose/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u517d\u8033", 
              value: "https://jable.tv/tags/kemonomimi/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6e14\u7f51", 
              value: "https://jable.tv/tags/fishnets/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6c34\u7740", 
              value: "https://jable.tv/tags/swimsuit/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6821\u670d", 
              value: "https://jable.tv/tags/school-uniform/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u65d7\u888d", 
              value: "https://jable.tv/tags/cheongsam/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5a5a\u7eb1", 
              value: "https://jable.tv/tags/wedding-dress/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5973\u50d5", 
              value: "https://jable.tv/tags/maid/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u548c\u670d", 
              value: "https://jable.tv/tags/kimono/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u773c\u955c\u5a18", 
              value: "https://jable.tv/tags/glasses/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8fc7\u819d\u889c", 
              value: "https://jable.tv/tags/knee-socks/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8fd0\u52a8\u88c5", 
              value: "https://jable.tv/tags/sportswear/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5154\u5973\u90ce", 
              value: "https://jable.tv/tags/bunny-girl/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "Cosplay", 
              value: "https://jable.tv/tags/Cosplay/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/black-pantyhose/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u5267\u60c5\u6a21\u5757
    {
      title: "\u5267\u60c5",
      description: "\u6309\u5267\u60c5\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u5267\u60c5",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u51fa\u8f68", 
              value: "https://jable.tv/tags/affair/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u9189\u7537", 
              value: "https://jable.tv/tags/ugly-man/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4eb2\u5c5e", 
              value: "https://jable.tv/tags/kinship/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7ae5\u8d1e", 
              value: "https://jable.tv/tags/virginity/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u590d\u4ec7", 
              value: "https://jable.tv/tags/avenge/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5de8\u6c49", 
              value: "https://jable.tv/tags/giant/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5a9a\u836f", 
              value: "https://jable.tv/tags/love-potion/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u50ac\u7720", 
              value: "https://jable.tv/tags/hypnosis//?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5077\u62cd", 
              value: "https://jable.tv/tags/private-cam/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "NTR", 
              value: "https://jable.tv/tags/ntr/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5e74\u9f84\u5dee", 
              value: "https://jable.tv/tags/age-difference/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e0b\u96e8\u5929", 
              value: "https://jable.tv/tags/rainy-day/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u65f6\u95f4\u505c\u6b62", 
              value: "https://jable.tv/tags/time-stop/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/affair/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u5730\u70b9\u6a21\u5757
    {
      title: "\u5730\u70b9",
      description: "\u6309\u5730\u70b9\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u5730\u70b9",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u7535\u8f66", 
              value: "https://jable.tv/tags/tram/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5904\u5973", 
              value: "https://jable.tv/tags/first-night/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u76d1\u72f1", 
              value: "https://jable.tv/tags/prison/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6e29\u6cc9", 
              value: "https://jable.tv/tags/hot-spring/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6cf3\u6c60", 
              value: "https://jable.tv/tags/swimming-pool/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6c7d\u8f66", 
              value: "https://jable.tv/tags/car/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5395\u6240", 
              value: "https://jable.tv/tags/toilet/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5b66\u6821", 
              value: "https://jable.tv/tags/school/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u9b54\u955c\u53f7", 
              value: "https://jable.tv/tags/magic-mirror/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6d17\u6d74\u573a", 
              value: "https://jable.tv/tags/bathing-place/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u56fe\u4e66\u9986", 
              value: "https://jable.tv/tags/library/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5065\u8eab\u623f", 
              value: "https://jable.tv/tags/gym-room/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4fbf\u5229\u5e97", 
              value: "https://jable.tv/tags/store/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/tram/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u8eab\u6750\u6a21\u5757
    {
      title: "\u8eab\u6750",
      description: "\u6309\u8eab\u6750\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u8eab\u6750",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u957f\u8eab", 
              value: "https://jable.tv/tags/tall/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8f6f\u4f53", 
              value: "https://jable.tv/tags/flexible-body/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8d2b\u4e73", 
              value: "https://jable.tv/tags/small-tits/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7f8e\u817f", 
              value: "https://jable.tv/tags/beautiful-leg/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7f8e\u5c3b", 
              value: "https://jable.tv/tags/beautiful-butt/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7eb9\u8eab", 
              value: "https://jable.tv/tags/tattoo/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u77ed\u53d1", 
              value: "https://jable.tv/tags/short-hair/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u767d\u864e", 
              value: "https://jable.tv/tags/hairless-pussy/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u719f\u5973", 
              value: "https://jable.tv/tags/mature-woman/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5de8\u4e73", 
              value: "https://jable.tv/tags/big-tits/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5c11\u5973", 
              value: "https://jable.tv/tags/girl/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5a07\u5c0f", 
              value: "https://jable.tv/tags/dainty/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/tall/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },    
    // \u89d2\u8272\u6a21\u5757
    {
      title: "\u89d2\u8272",
      description: "\u6309\u89d2\u8272\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u89d2\u8272",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u4eba\u59bb", 
              value: "https://jable.tv/tags/wife/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u533b\u751f", 
              value: "https://jable.tv/tags/doctor/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u62a4\u58eb", 
              value: "https://jable.tv/tags/nurse/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8001\u5e08", 
              value: "https://jable.tv/tags/teacher/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7a7a\u59d0", 
              value: "https://jable.tv/tags/flight-attendant/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u9003\u72af", 
              value: "https://jable.tv/tags/fugitive/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u60c5\u4fa3", 
              value: "https://jable.tv/tags/couple/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e3b\u64ad", 
              value: "https://jable.tv/tags/female-anchor/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u98ce\u4fd7\u5a18", 
              value: "https://jable.tv/tags/club-hostess-and-sex-worker/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5bb6\u653f\u5987", 
              value: "https://jable.tv/tags/housewife/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u641c\u67e5\u5b98", 
              value: "https://jable.tv/tags/detective/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u672a\u4ea1\u4eba", 
              value: "https://jable.tv/tags/widow/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5bb6\u5ead\u6559\u5e08", 
              value: "https://jable.tv/tags/private-teacher/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7403\u961f\u7ecf\u7406", 
              value: "https://jable.tv/tags/team-manager/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/wife/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u4ea4\u5408\u6a21\u5757
    {
      title: "\u4ea4\u5408",
      description: "\u6309\u4ea4\u5408\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u4ea4\u5408",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u989c\u5c04", 
              value: "https://jable.tv/tags/facial/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8db3\u4ea4", 
              value: "https://jable.tv/tags/footjob/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u75c9\u631b", 
              value: "https://jable.tv/tags/spasms/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6f6e\u5439", 
              value: "https://jable.tv/tags/squirting/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6df1\u5589", 
              value: "https://jable.tv/tags/deep-throat/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u63a5\u543b", 
              value: "https://jable.tv/tags/kiss/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u53e3\u7206", 
              value: "https://jable.tv/tags/cum-in-mouth/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u53e3\u4ea4", 
              value: "https://jable.tv/tags/blowjob/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e73\u4ea4", 
              value: "https://jable.tv/tags/tit-wank/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e2d\u51fa", 
              value: "https://jable.tv/tags/creampie/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/facial/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u73a9\u6cd5\u6a21\u5757
    {
      title: "\u73a9\u6cd5",
      description: "\u6309\u73a9\u6cd5\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u73a9\u6cd5",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u9732\u51fa", 
              value: "https://jable.tv/tags/outdoor/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4fb5\u72af", 
              value: "https://jable.tv/tags/intrusion/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8c03\u6559", 
              value: "https://jable.tv/tags/tune/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6346\u7ed1", 
              value: "https://jable.tv/tags/bondage/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u75f4\u6c49", 
              value: "https://jable.tv/tags/chikan/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u75f4\u5973", 
              value: "https://jable.tv/tags/chizyo/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7537M", 
              value: "https://jable.tv/tags/masochism-guy/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6ce5\u9189", 
              value: "https://jable.tv/tags/crapulence/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6ce1\u59ec", 
              value: "https://jable.tv/tags/soapland/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6bcd\u4e73", 
              value: "https://jable.tv/tags/breast-milk/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u653e\u5c3f", 
              value: "https://jable.tv/tags/piss/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u6309\u6469", 
              value: "https://jable.tv/tags/massage/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u591aP", 
              value: "https://jable.tv/tags/groupsex/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u77ac\u95f4\u63d2\u5165", 
              value: "https://jable.tv/tags/quickie/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u96c6\u56e2\u4fb5\u72af", 
              value: "https://jable.tv/tags/gang-intrusion/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/outdoor/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },    
    // \u4e3b\u9898\u6a21\u5757
    {
      title: "\u4e3b\u9898",
      description: "\u6309\u4e3b\u9898\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u4e3b\u9898",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u89d2\u8272\u5267\u60c5", 
              value: "https://jable.tv/categories/roleplay/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5236\u670d\u8bf1\u60d1", 
              value: "https://jable.tv/categories/uniform/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u76f4\u63a5\u5f00\u556a", 
              value: "https://jable.tv/categories/sex-only/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e1d\u889c\u7f8e\u817f", 
              value: "https://jable.tv/categories/pantyhose/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u4e3b\u5974\u8c03\u6559", 
              value: "https://jable.tv/categories/bdsm/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u591aP\u7fa4\u4ea4", 
              value: "https://jable.tv/categories/groupsex/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7537\u53cb\u89c6\u89d2", 
              value: "https://jable.tv/categories/pov/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u51cc\u8fb1\u5feb\u611f", 
              value: "https://jable.tv/categories/insult/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u76d7\u6444\u5077\u62cd", 
              value: "https://jable.tv/categories/private-cam/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u65e0\u7801\u89e3\u653e", 
              value: "https://jable.tv/categories/uncensored/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5973\u540c\u6b22\u6109", 
              value: "https://jable.tv/categories/lesbian/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/categories/roleplay/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
    // \u6742\u9879\u6a21\u5757
    {
      title: "\u6742\u9879",
      description: "\u6309\u6742\u9879\u5206\u7c7b\u6d4f\u89c8\u5f71\u7247",
      requiresWebView: false,
      functionName: "loadPage",
      cacheDuration: 3600,
      params: [
        {
          name: "url",
          title: "\u9009\u62e9\u6742\u9879",
          type: "enumeration",
          belongTo: {
            paramName: "sort_by",
            value: ["post_date","video_viewed","most_favourited"],
            },
          enumOptions: [
            { 
              title: "\u5f55\u50cf", 
              value: "https://jable.tv/tags/video-recording/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u7efc\u827a", 
              value: "https://jable.tv/tags/variety-show/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u611f\u8c22\u796d", 
              value: "https://jable.tv/tags/thanksgiving/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u8282\u65e5\u4e3b\u9898", 
              value: "https://jable.tv/tags/festival/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u56db\u5c0f\u65f6\u4ee5\u4e0a", 
              value: "https://jable.tv/tags/more-than-4-hours/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            },
            { 
              title: "\u5904\u5973\u4f5c/\u9690\u9000\u4f5c", 
              value: "https://jable.tv/tags/debut-retires/?mode=async&function=get_block&block_id=list_videos_common_videos_list"
            }
          ],
          value: "https://jable.tv/tags/video-recording/?mode=async&function=get_block&block_id=list_videos_common_videos_list",
        },
        {
          name: "sort_by",
          title: "\u6392\u5e8f",
          type: "enumeration",
          description: "\u6392\u5e8f",
          enumOptions: [
            { title: "\u6700\u8fd1\u66f4\u65b0", value: "post_date" },
            { title: "\u6700\u591a\u89c2\u770b", value: "video_viewed" },
            { title: "\u6700\u591a\u6536\u85cf", value: "most_favourited" },
          ],
        },
        { name: "from", title: "\u9875\u7801", type: "page", description: "\u9875\u7801", value: "1" },
      ],
    },
  ],
};


async function search(params = {}) {
  const keyword = encodeURIComponent(params.keyword || "");
  
  let url = `https://jable.tv/search/${keyword}/?mode=async&function=get_block&block_id=list_videos_videos_list_search_result&q=${keyword}`;
  
  if (params.sort_by) {
    url += `&sort_by=${params.sort_by}`;
  }
  
  if (params.from) {
    url += `&from=${params.from}`;
  }
  
  return await loadPage({ ...params, url });
}

async function loadPage(params = {}) {
  const sections = await loadPageSections(params);
  const items = sections.flatMap((section) => section.childItems);
  return items;
}

async function loadPageSections(params = {}) {
  try {
    let url = params.url;
    if (!url) {
      throw new Error("\u5730\u5740\u4e0d\u80fd\u4e3a\u7a7a");
    }
    if (params["sort_by"]) {
      url += `&sort_by=${params.sort_by}`;
    }
    if (params["from"]) {
      url += `&from=${params.from}`;
    }
    const response = await Widget.http.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!response || !response.data || typeof response.data !== "string") {
      throw new Error("\u65e0\u6cd5\u83b7\u53d6\u6709\u6548\u7684HTML\u5185\u5bb9");
    }

    const htmlContent = response.data;

    return parseHtml(htmlContent);
  } catch (error) {
    console.error("\u6d4b\u8bd5\u8fc7\u7a0b\u51fa\u9519:", error.message);
    throw error;
  }
}

async function parseHtml(htmlContent) {
  const $ = Widget.html.load(htmlContent);
  const sectionSelector = ".site-content .py-3,.pb-e-lg-40";
  const itemSelector = ".video-img-box";
  const coverSelector = "img";
  const durationSelector = ".absolute-bottom-right .label";
  const titleSelector = ".title a";

  let sections = [];
  const sectionElements = $(sectionSelector).toArray();
  
  for (const sectionElement of sectionElements) {
    const $sectionElement = $(sectionElement);
    var items = [];
    const sectionTitle = $sectionElement.find(".title-box .h3-md").first();
    const sectionTitleText = sectionTitle.text();
    const itemElements = $sectionElement.find(itemSelector).toArray();
    
    if (itemElements && itemElements.length > 0) {
      for (const itemElement of itemElements) {
        const $itemElement = $(itemElement);
        const titleId = $itemElement.find(titleSelector).first();
        const url = titleId.attr("href") || "";
        
        if (url && url.includes("jable.tv")) {
          const durationId = $itemElement.find(durationSelector).first();
          const coverId = $itemElement.find(coverSelector).first();
          const cover = coverId.attr("data-src");
          const video = coverId.attr("data-preview");
          const title = titleId.text();
          const duration = durationId.text().trim();
          
          const item = {
            id: url,
            type: "url",
            title: title,
            backdropPath: cover,
            previewUrl: video,
            link: url,
            mediaType: "movie",
            description: "",
            releaseDate: duration,
            playerType: "system"
          };
          items.push(item);
        }
      }
    }
    
    if (items.length > 0) {
      sections.push({
        title: sectionTitleText,
        childItems: items
      });
    }
  }
  
  return sections;
}

async function loadDetail(link) {
  const response = await Widget.http.get(link, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Referer": "https://jable.tv/"
    },
  });
  
  // 优化了正则匹配，防止报错
  let hlsUrl = "";
  const match = response.data.match(/var\s+hlsUrl\s*=\s*['"](.*?)['"]/i);
  if (match && match[1]) {
    hlsUrl = match[1];
  }

  if (!hlsUrl) {
    throw new Error("无法获取有效的播放地址，可能需要代理验证");
  }
  
  const $ = Widget.html.load(response.data);
  let videoDuration = null;
  const durationElements = $('.absolute-bottom-right .label, .duration, [class*="duration"]');
  if (durationElements.length > 0) {
    videoDuration = durationElements.first().text().trim();
  }
  
  const item = {
    id: link,
    type: "detail",
    videoUrl: hlsUrl,
    // 👉 核心修复：强制使用 ijk 播放器解决无声问题
    playerType: "ijk", 
    // 👉 核心修复：添加防盗链头部
    customHeaders: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Referer": link,
      "Origin": "https://jable.tv"
    }
  };
  
  return item;
}
