var rule = {
  title: '爱看资源网',
  host: 'https://aikanzy.com/',
  url: '/fyclass-fypage.html',
  searchUrl: '/search?word=**&molds=article',
  searchable: 2,
  quickSearch: 0,
  filterable: 0,
  class_parse: '.top-bar-menu&&li;a&&Text;a&&href;.*/(.*?).html',
  tab_rename: {'KUAKE1': '夸克1', 'KUAKE11': '夸克2', 'YOUSEE1': 'UC1', 'YOUSEE11': 'UC2',},
  图片来源: '@Referer=https://aikanzy.com@User-Agent=Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
  play_parse: true,
  lazy: $js.toString(() => {
        //推送阿里播放  支持影视壳
        let url = input.startsWith('push://') ? input : 'push://' + input;
        input = {parse: 0, url: url};
    }),
  limit: 6,
  double: true,
  推荐: '#content;.post-list;a&&title;.lazyload&&data-src;.entry-meta&&Text;a&&href',
  一级: '#content .post-list;a&&title;.lazyload&&data-src;.entry-meta&&Text;a&&href',
  二级: {
    title: 'h1&&Text;#content&&li:eq(2)&&Text',
    img: '.shadimg img&&src',
    desc: '#content&&li:eq(2)&&Text;#content&&li:eq(3)&&Text;#content&&li:eq(4)&&Text;#content&&li:eq(0)&&Text;#content&&li:eq(1)&&Text',
    content: '#content&&p:eq(2)&&Text',
    tabs: "js:TABS=['网盘']",
    lists: '.con_ad-top&&p:eq(-1)',
    list_text: '.icon&&Text',
    list_url: 'a&&href',
  },
  搜索: '#content .post-list;.entry-title&&Text;.block-fea&&style;.entry-meta&&Text;a&&href',
}