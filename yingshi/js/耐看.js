/*
@header({
  searchable: 2,
  filterable: 0,
  quickSearch: 0,
  title: '耐看',
  '类型': '影视',
  lang: 'ds'
})
*/

var rule = {
  title: '耐看',
  host: 'https://nkvod.com',
  url: '/show/fyclass--------fypage---.html',
  searchUrl: '/index.php/rss/index.xml?wd=**',
  searchable: 2,
  quickSearch: 0,
  filterable: 0,
  filter: '',
  filter_url: '',
  filter_def: {},
  headers: {
    'User-Agent': 'MOBILE_UA',
  },
  timeout: 5000,
  class_parse: '.flex.around&&li;a&&Text;a&&href;.*/(.*?).html',
  cate_exclude: '',
  play_parse: true,
  lazy: "js:\n  input = { parse: 1, url: input, js: '' };",
  double: true,
  推荐: '*',
  一级: 'body&&.public-list-box;a&&title;img&&data-src;.public-list-subtitle&&Text;a&&href',
  二级: {
    title: 'h3&&Text;.hl-ma0&&Text',
    img: '.mask-1&&data-src',
    desc: '.detail-info .slide-info:eq(1)--strong&&Text;.deployment.none.cor5&&span&&Text;.deployment.none.cor5&&span:eq(2)&&Text;.detail-info .slide-info:eq(3)--strong&&Text;.detail-info .slide-info:eq(2)--strong&&Text',
    content: '#height_limit&&Text',
    tabs: '.anthology-tab a',
    lists: '.anthology-list-play:eq(#id)&&li',
    tab_text: 'body&&Text',
    list_text: 'body&&Text',
    list_url: 'a&&href',
  },
   搜索: $js.toString(() => {
        let html = request(input);
        let items = pdfa(html, 'rss&&item');
        // log(items);
        let d = [];
        items.forEach(it => {
            it = it.replace(/title|link|author|pubdate|description/g, 'p');
            let url = pdfh(it, 'p:eq(1)&&Text');
            d.push({
                title: pdfh(it, 'p&&Text'),
                url: url,
                desc: pdfh(it, 'p:eq(3)&&Text'),
                content: pdfh(it, 'p:eq(2)&&Text'),
                pic_url: "",
            });
        });
        setResult(d);
    }),
}