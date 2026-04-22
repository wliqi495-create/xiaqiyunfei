/*
@header({
  searchable: 2,
  filterable: 0,
  quickSearch: 0,
  title: '热片网',
  '类型': '影视',
  lang: 'ds'
})
*/

var rule = {
    类型: '影视',//影视|听书|漫画|小说
    title: '热片网',
    host: 'https://www.repian.cc',
    url: '/fyclass-pagefypage.html',
    searchUrl: '/vod-search-wd-**-pagefypage.html',
    searchable: 2,
    quickSearch: 0,
    headers: {
        'Accept-Language': 'zh-CN',
        'User-Agent': 'PC_UA',
    },
    timeout: 5000,
    class_parse: 'ul.navbar-nav li[id^="nav"];a&&Text;a&&href;cc\/(.*?)-page1\.html',
    cate_exclude: '',
    play_parse: true,
    lazy: $js.toString(() => {
        input = {
            parse: 1,
            url: input,
            js: 'document.querySelector("#yunplay iframe").contentWindow.document.querySelector(".dplayer-mobile-play").click()',
        }
    }),
    //double: true,
    推荐: '.layout-box li[class*="col-sm-3"];*;*;*;*;*',
    一级: '.box-video-list&&ul&&li;a&&title;a&&data-original;.note&&Text;a&&href;.subtitle&&Text',
    二级: {
        title: 'h1--em&&Text;ul.info&&li:eq(2)&&Text',
        img: '.video-pic&&style',
        desc: 'ul.info&&li:eq(10)&&Text;ul.info&&li:eq(4)&&Text;ul.info&&li:eq(6)&&Text;ul.info&&li:eq(3)&&Text;ul.info&&li:eq(5)&&Text',
        content: '.details-content-all&&Text',
        tabs: '.dropdown-menu:eq(-1)&&li',
        lists: 'div.playlist&&ul:eq(#id)&&li',
        tab_text: 'body&&Text',
        list_text: 'body&&Text',
        list_url: 'a&&href',
        list_url_prefix: '',
    },
    搜索: '#content&&.details-info-min;*;*;ul.info&&li:eq(2)&&Text;*;.details-content-default&&Text',
}