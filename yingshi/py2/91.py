# -*- coding: utf-8 -*-
# by @嗷呜
import sys
from Crypto.Cipher import AES
from pyquery import PyQuery as pq
sys.path.append('..')
from base.spider import Spider


class Spider(Spider):

    def init(self, extend='{}'):
        pass

    def destroy(self):
        pass

    host='https://91-short.com'

    headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="141", "Google Chrome";v="141"',
        'sec-ch-ua-platform': '"Windows"',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.55 Safari/537.36',
    }

    cache={}

    def getvs(self,data):
        videos = []
        for i in data.items():
            a = i("a")
            videos.append({
                'vod_id': a.attr('href'),
                'vod_name': a.attr('title'),
                'vod_pic': self.getProxyUrl()+"&url="+i("img").attr("data-cover"),
                'vod_remark': i(".module-item-caption").text() or i(".module-item-ru").text(),
            })
        return  videos

    def homeContent(self, filter):
        resp=self.fetch(self.host,headers=self.headers)
        tab1=pq(resp.content)("#tablist > a")
        resp = self.fetch(f"{self.host}/film/home_recommend_list", headers=self.headers)
        tab2 = pq(resp.content)("#tablist > a")
        classes = []
        for k in (tab1+tab2).items():
            href=k.attr('href')
            if not href or "http" in href:
                continue
            classes.append({
                'type_name': k.text(),
                'type_id': href,
            })
        return {'class':classes}

    def categoryContent(self, tid, pg, filter, extend):
        if pg=="1":
            resp=self.fetch(self.host+tid,headers=self.headers)
            qu=".module-items > .module-item > .module-item-cover"
            doc=pq(resp.content)
            stext=doc('main').next('script').html()
            self.cache[tid]=stext.strip().split('\n',1)[0].strip().split('=',1)[-1].replace('"','').strip()
        else:
            resp=self.fetch(self.host+self.cache[tid],headers=self.headers)
            qu = ".module-item > .module-item-cover"
            doc=pq(resp.content.decode())
            self.cache[tid]=doc("script").eq(-1).text()
        result = {}
        result['list'] = self.getvs(doc(qu))
        result['page'] = pg
        result['pagecount'] = 9999
        result['limit'] = 90
        result['total'] = 999999
        return result

    def detailContent(self, ids):
        resp=self.fetch(self.host+ids[0],headers=self.headers)
        doc=pq(resp.content)
        stext=doc('.player-wrapper > script').eq(-1).html().strip()
        try:
            url=stext.split('\n')[-1].split('=')[-1].replace('"','').strip()
            p=0
        except Exception as e:
            url=self.host+ids[0]
            p=1
        vod = {
            'vod_director': '沐辰',
            'vod_play_from': '91——short',
            'vod_play_url': f'{doc(".module-item-in").text() or doc("h2.module-title").text()}${url}@@{p}'
        }
        return {'list':[vod]}

    def searchContent(self, key, quick, pg="1"):
        resp=self.fetch(f'{self.host}/search',headers=self.headers,params={'wd':key})
        qu = ".module-items > .module-item > .module-item-cover"
        data = pq(resp.content)(qu)
        return {'list':self.getvs(data),'page':pg}

    def playerContent(self, flag, id, vipFlags):
        url,p=id.split('@@')
        return  {'parse': int(p), 'url': url}

    def localProxy(self, param):
        res=self.fetch(param['url'])
        key = b'Jui7X#cdleN^3eZb'
        cipher = AES.new(key, AES.MODE_ECB)
        decrypted = cipher.decrypt(res.content)
        return [200,res.headers.get('Content-Type'),decrypted]
