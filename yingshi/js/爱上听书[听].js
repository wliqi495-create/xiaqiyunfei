/*
@header({
  searchable: 2,
  filterable: 0,
  quickSearch: 0,
  title: '爱上你听书网',
  '类型': '影视',
  lang: 'dr2'
})
*/

var rule = {
    title: '爱上你听书网',
    host: 'https://www.230ts.net',
    url: '/sort/fyclass/fypage.html',
    searchUrl: '/search.html?searchtype=name&searchword=**&page=fypage',
    searchable: 2,
    quickSearch: 0,
    headers: {
        'User-Agent': 'PC_UA'
    },
    timeout: 5000,
    class_parse: '.nav-ol&&li:gt(0):lt(6);a&&Text;a&&href;.*/(\\w+).html',
    play_parse: true,
    lazy: $js.toString(() => {
        let html = request(input);
        let src = pd(html, 'iframe#play&&src', input);
        log('src:' + src);
        html = request(src);
        const regex = /mp3\s*:\s*'([^']+)'/;
        const match = html.match(regex);
        if (match && match[1].includes('auth_key')) {
            // 替换变量部分为 .mp3.
            src = match[1].replace(/'([^']*)'\s*\+\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\+\s*'([^']*)'/, '$1.mp3.$2');
            log('match src:' + src);
        }
        input = src
    }),
    limit: 6,
    推荐: '#myTab_Content1&&li;.tab-book-title&&Text;*;.tab-book-author&&Text;*',
    一级: 'ul.list-works&&li;.list-book-dt--span&&Text;.lazy&&data-original;.book-author:eq(2)&&a&&Text;a&&href',
    二级: {
        title: '.book-cover&&alt;.book-info&&dd--span:eq(1)&&Text',
        img: '.book-cover&&src',
        desc: '.book-info&&dd:eq(4)&&Text;;;.book-info&&dd--span:eq(3)&&Text;.book-info&&dd--span:eq(2)&&Text',
        content: '.book-des&&Text',
        tabs: '.playlist-top&&h2',
        lists: '#playlist:eq(#id)&&li',
    },
    搜索: '*',
}