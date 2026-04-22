/*
@header({
  searchable: 2,
  filterable: 0,
  quickSearch: 1,
  title: '文才2[资]',
  '类型': '影视',
  lang: 'ds'
})
*/

var rule = {
   模板: '采集1',
   title: '文才2[资]',
   host: 'https://api.zeqaht.com',
   homeTid: '75',
   url: '/index.php/ajax/data?mid=1&tid=fyfilter&page=fypage&limit=20',
   searchUrl: '/index.php/ajax/suggest?mid=1&wd=**&limit=100',
   detailUrl: 'https://www.cfkj86.com/detail/fyid',
   filter_url: '{{fl.分类}}',
   filter: 'H4sIAAAAAAAAA7WSwU6DQBCG7z4F2TOHFihUX8V46IGT2psmpmliS6jAQa0xqLWJpwaqTWovRqHt08CuvIWFVIbZ7rWEA/D9uzvfMJ0DaXuROjmSjjsSOTWvNk8kdQZsERNZIu3WuVl8cQNq2fmXy9bZhbmNtwtkh5kVFih/JVJXlkrmjzcrS6YomHphshoDVRFlwTD9iUuq1jB1Fv8FFWt1RGl/xvwhUAOfO7mp7tzkKKgW52JKe/f02geKz2XenK3egTZ4X/ZYMcK+1PJofwRUw9R5TiIXjLidBw/ZyxTW1nFVvXU2WoMvpqn9lcRgpOVVnWxuGcZD2dd4vK6SKKhOSJ2zngVsfYsCWJx+z9O7TxTgJuFpkr1NqwFdEeijQHO3A+peO8Di5a8bQQGHAkcuY9QEmnxGETSTz6iCbvAZbbch2n5Hwgvp8gMKaIj+KZfRRZPDZYytSOHR/QP/scWLAQUAAA==',
   filter_def: {
     1: { 分类: '1' },2: { 分类: '2' },3: { 分类: '3' },4: { 分类: '4' }
    },
   headers: {
      'User-Agent': 'PC_UA',
      'Referer': 'https://www.cfkj86.com/'
   },
   搜索: 'json:list;name;pic;;id',
   图片替换: 'https://api.zeqaht.com=>https://obs.gduamoe.com',
   二级: {
      title: '.title&&Text;',
      img: '',
      desc: ';;;;',
      content: '.wrapper_more_text&&Text',
      tabs: '.player_name',
      lists: '.listitem a',
   },
   lazy: $js.toString(() => {
      let url_id = input.split('/')[5];
      let jishu_id = input.split('/')[7];
      let t = new Date().getTime();
      eval(getCryptoJS);
      let signkey = 'id=' + url_id + '&nid=' + jishu_id + '&key=cb808529bae6b6be45ecfab29a4889bc&t=' + t;
      let key = CryptoJS.SHA1(CryptoJS.MD5(signkey).toString()).toString();
      let json_data = JSON.parse(request('https://www.cfkj86.com/api/mw-movie/anonymous/video/episode/url?id=' + url_id + '&nid=' + jishu_id, {
         headers: {
            'User-Agent': PC_UA,
            'deviceid': '58a80c52-138c-48fd-8edb-138fd74d12c8',
            'sign': key,
            't': t
         }
      }));
      let url = json_data.data;
      log(url);
      if (url) {
         input = {
            parse: 0,
            url: url,
            header: rule.headers
         };
      }

   }),
   class_name: '电影&电视&综艺&动漫',
   class_url: '1&2&3&4',
   class_parse: ''
}