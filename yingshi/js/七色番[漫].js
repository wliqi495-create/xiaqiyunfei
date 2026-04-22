/*
@header({
  searchable: 2,
  filterable: 1,
  quickSearch: 0,
  title: '七色番[漫]',
  '类型': '影视',
  lang: 'ds'
})
*/

var rule = {
    title: "七色番[漫]",
    host: "https://www.7sefun.top",
    url: "/vodshow/fyclassfyfilter",
    searchUrl: "/vodsearch/**----------fypage---.html",
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    filter: "H4sIAAAAAAAAAO2WS08TURTHv8usWdxb+riw4/2Wh7wNC2JqJCImgkZDMAiI5SEUAlQEUTTEItaCENIH6pfpTNtv4ZQ595xTywJdsZjd/H//c2fm1860d9KQRuWdSeNB8LlRaWRP0ubeklFmjA0/DPL8dHj0SfBycMzG5qtofjZawHYwpsqAXsxkElvZzWUoKOuJ7PYvMxyCGgKuDq+Y34/0UifgutlYbn9ar3MCdoe/c+eLunMCnvPgtZlM63M6QXdW6K21FYEOAnbhvey3Nd05AbvIgZlI6M4JeC9f1uh6EHDdj7Q1p90hYPdx39yJ6c4J2L1cyoZOdOcE9Jtfz28faj8n4LqVaDY8r9c5AbvdlG2sOyfoLv/hNJMMQweB7iVsTW/hvVwG7GYXrZl3unMCdqf7+fefsptfdY0ZJxIJK7RqbST1BGZ0PV7Nxc9ogjKe4+Iou5Fm58CsJ24FJ+6NjjyDXifdeoSn3EyeCWnt6u+pCP095y2d8141FyidC1wxJ0XJnIPYnLf0/ghNDRUmnRc5F4/lotP0ImO+zotsP9X2PD3ihYBfw85P6iDwC9t3k0l/pgtjvs6FCzrMrOgTYp8M5x7iHs4lccm5IC4YlxXI7UPGFXHFeYB4gHM/cT/nPuI+zslXcl9JvpL7SvKV3FeSr+S+knwl9xXkK7ivIF/BfQX5Cu4ryFdwX0G+gvsK8hXcV5Cv4L6CfAX3FeQruK8gX0G+sqJC+14eMq6IK84DxAOc+4n7OfcR93HuJe7lvJx4Oece4h7OJXHJuSDOfRX5Ku6ryFdxX0W+ivsq8lXcV5Gv4r6KfBX3VeSruK8iX8V9Ffkq7qvI1z4s+uGJRaz4G/bDo/N1fniqAFQhqQZSjaQGSA2SWiC1SOqA1CGpB1KPpAFIA5JGII1ImoA0IWkG0oykBUgLklYgrUjagLTRX6D+80PSDqQdSQeQDiSdQDqRdAHpQnIbyG0k3UC6kfQA6UHSC6QXSR+QPiT9QPqRDAAZQDIIZBCJeKHfgcIRf1SslXUztUqPCubiR8VaXrAi5/nIGZxmYsSexv/I5YVMKmUdb0B5f2RinJe5+JwZ0tuv8buPHgcLtzBUZnhuxnbb3VL/x5b6X7fN7obM3ZC5GzJ3Q+ZuyAx3Q+ZuyG7ihmzqDw1f3+kBFQAA",
    filter_url: "--{{fl.排序}}-{{fl.类型}}-{{fl.语言}}-{{fl.字母}}---fypage---{{fl.年代}}.html",
    filter_def: "",
    headers: {
        "User-Agent": "PC_UA"
    },
    timeout: 5000,
    class_parse: ".side-menu&&a;a&&Text;a&&href;/(\\d+)\\.html",
    cate_exclude: "",
    play_parse: true,
    lazy: $js.toString(() => {
        input = {parse: 1, url: input, js: '', header: rule.headers, parse_extra: '&is_pc=1'};
    }),
    double: false,
    推荐: "*;.video-name&&Text;*;.video-time&&Text;*",
    一级: ".video.anim;.video-name&&Text;.videoimg&&src;.video-view&&Text;a&&href",
    二级: {
        title: ".video-p-name&&Text;.video-p-sub1:eq(0)&&Text",
        img: ".author-img&&src",
        desc: ";;;.video-p-sub1:eq(1)&&Text;.video-p-sub1:eq(3)&&Text",
        content: ".video-p-subtitle&&Text",
        tabs: ".chat-stream-bfqs",
        lists: ".vod-play-list-container:eq(#id) a",
        tab_text: "body&&Text",
        list_text: "body&&Text",
        list_url: "a&&href"
    },
    搜索: ".video.anim;.video-by&&Text;*;.video-time&&Text;a&&href;"
}