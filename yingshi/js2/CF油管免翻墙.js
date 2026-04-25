// 获取 YouTube M3U8 URL
async function getPlayUrl(rid, proxyUrl) {
	const url = "aHR0cHM6Ly95b3V0dWJlaS5nb29nbGVhcGlzLmNvbS95b3V0dWJlaS92MS9wbGF5ZXI/a2V5PUFJemFTeUFPX0ZKMlNscVU4UTRTVEVITEdDaWx3X1k5XzExcWNXOA==";
	const body = JSON.stringify({
		"videoId": rid,
		"context": {
			"client": {
				"hl": "en",
				"gl": "US",
				"clientName": "ANDROID_TESTSUITE",
				"clientVersion": "1.9",
				"androidSdkVersion": 31
			}
		}
	});
	const headers = {
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36",
	};

	const response = await fetch(atob(url), {
		method: "POST",
		headers: headers,
		body: body,
		cf: {
			timeout: 30000
		}
	});

	const data = await response.json();
	// console.log(data); // 打印返回的 JSON 数据
	if (data.streamingData) {
		// 处理M3U8
		let m3u8Url; // 确保 m3u8Url 在函数作用域内声明
		if (data.streamingData.hlsManifestUrl) {
			if (typeof data.streamingData.hlsManifestUrl === 'string') {
				m3u8Url = data.streamingData.hlsManifestUrl;
			} else if (Array.isArray(data.streamingData.hlsManifestUrl)) {
				m3u8Url = data.streamingData.hlsManifestUrl[0];
			} else {
				return "404-未找到播放地址";
			}
			const m3u8Content = await getM3U8(m3u8Url, proxyUrl);
			return m3u8Content;
		}
		// 处理DASH
		else if ('adaptiveFormats' in data.streamingData) {
			const mpdContent = await getMPD(rid, proxyUrl, data);
			return mpdContent;
		} else {
			return "404-未找到播放地址";
		}
	} else {
		return "404-未找到播放地址";
	}
}

// 获取 M3U8 内容
async function getM3U8(url, proxyUrl) {
	const response = await fetch(url);
	const lines = await response.text();
	let m3u8Str = "";
	const linesArray = lines.split("\n");
	for (let line of linesArray) {
		if (line.length > 0 && !line.startsWith("#")) {
			if (!line.startsWith('http')) {
				if (line.startsWith('/')) {
					line = url.substring(0, url.indexOf('/', 8)) + line;
				} else {
					line = url.substring(0, url.lastIndexOf('/') + 1) + line;
				}
			}
			if (line.includes('.m3u8') && !line.includes('.ts')) {
				m3u8Str += proxyUrl + "/proxyM3u8?url=" + btoa(line) + "\n";
			} else {
				m3u8Str += proxyUrl + "/proxyMedia?url=" + btoa(line) + "\n";
			}
		} else {
			if (line.includes('URI=')) {
				const uriMatch = line.match(/URI="(.*?)"/);
				if (uriMatch) {
					let URI = uriMatch[1];
					let fullURI;
					if (URI.startsWith('/')) {
						fullURI = url.substring(0, url.indexOf('/', 8)) + URI;
					} else {
						fullURI = url.substring(0, url.lastIndexOf('/') + 1) + URI;
					}
					if (fullURI.includes('.m3u8') && !fullURI.includes('.ts')) {
						fullURI = proxyUrl + "/proxyM3u8?url=" + btoa(fullURI);
					} else {
						fullURI = proxyUrl + "/proxyMedia?url=" + btoa(fullURI);
					}
					line = line.replace(URI, fullURI);
				}
			}
			m3u8Str += line + "\n";
		}
	}
	return "m3u-" + m3u8Str.trim();
}

// 获取 MPD 内容
async function getMPD(rid, proxyUrl, data) {
	let instructions;

	const dashList = data.streamingData.adaptiveFormats;
	let duration = 0;
	let audioinfo = '';
	let videoinfo = '';

	for (const item of dashList) {
		// 获取 mpd 所需参数
		if (duration === 0) {
			duration = Math.floor(parseInt(item.approxDurationMs) / 1000);
		}
		const typeinfo = item.mimeType.split(';');
		const mimeType = typeinfo[0];
		const codecs = typeinfo[1].split('=')[1].trim()
			.replace(/"/g, '');
		const bandwidth = item.averageBitrate;
		const avid = item.itag;
		let baseUrl;

		try {
			baseUrl = proxyUrl + "/proxyMedia?url=" + btoa(item.url.replace(/%0C/g, ''));
		} catch (error) {
			const sigSrc = decodeURIComponent(item.signatureCipher.match(/s=(.*?)&sp=sig/)[1]);
			if (typeof instructions === 'undefined') {
				const response = await fetch(atob("aHR0cHM6Ly93d3cueW91dHViZS5jb20vd2F0Y2g/dj0=") + rid);
				const lines = await response.text();
				const scriptUrlMatch = lines.match(/<script\s*src="([^"]+player[^"]+js)"/);
				if (scriptUrlMatch && scriptUrlMatch[1]) {
					const newResponse = await fetch(atob("aHR0cHM6Ly93d3cueW91dHViZS5jb20v") + scriptUrlMatch[1]);
					const newLines = await newResponse.text();
					let funcName;
					try {
						funcName = newLines.match(/,\s*encodeURIComponent\((\w{2})/i)[1];
					} catch {
						try {
							funcName = newLines.match(/(?:\b|[^a-zA-Z0-9$])([a-zA-Z0-9$]{2,3})\s*=\s*function\(\s*a\s*\)\s*{\s*a\s*=\s*a\.split\(\s*""\s*\)/i)[1];
						} catch (error) {
							console.error('Regex error:', error);
							return "404-未找到匹配的脚本";
						}
					}
					instructions = await getFunctionCode(funcName, newLines)
					baseUrl = proxyUrl + "/proxyMedia?url=" + btoa(`${decodeURIComponent(item.signatureCipher.match(/(http.*)/)[1])}&sig=${decodeSignature(sigSrc, instructions)}`);
				} else {
					return "404-未找到匹配的脚本";
				}

			} else if (instructions === null) {
				return "404-未找到匹配的脚本";
			} else {
				baseUrl = proxyUrl + "/proxyMedia?url=" + btoa(`${decodeURIComponent(item.signatureCipher.match(/(http.*)/)[1])}&sig=${decodeSignature(sigSrc, instructions)}`);
			}
		}

		if (mimeType.startsWith('video')) {
			const frameRate = item.fps;
			const height = item.height;
			const width = item.width;
			videoinfo += `      <Representation id="${avid}" bandwidth="${bandwidth}" codecs="${codecs}" mimeType="${mimeType}" height="${height}" width="${width}" frameRate="${frameRate}" maxPlayoutRate="1" startWithSAP="1">
        <BaseURL>${baseUrl}</BaseURL>
        <SegmentBase indexRange="${item.indexRange.start}-${item.indexRange.end}">
            <Initialization range="${item.initRange.start}-${item.initRange.end}"/>
        </SegmentBase>
        </Representation>\n`;
		} else {
			const audioSamplingRate = item.audioSampleRate;
			audioinfo += `      <Representation id="${avid}" bandwidth="${bandwidth}" codecs="${codecs}" mimeType="${mimeType}" subsegmentAlignment="true" audioSamplingRate="${audioSamplingRate}">
        <BaseURL>${baseUrl}</BaseURL>
        <SegmentBase indexRange="${item.indexRange.start}-${item.indexRange.end}">
            <Initialization range="${item.initRange.start}-${item.initRange.end}"/>
        </SegmentBase>
        </Representation>\n`;
		}
	}

	const videoAdaptationSet = videoinfo ? `<AdaptationSet lang="chi">
      <ContentComponent contentType="video"/>
      ${videoinfo.trim()}
    </AdaptationSet>` : '';

	const audioAdaptationSet = audioinfo ? `<AdaptationSet lang="chi">
      <ContentComponent contentType="audio"/>
      ${audioinfo.trim()}
    </AdaptationSet>` : '';

	const mpdContent = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="urn:mpeg:dash:schema:mpd:2011" xsi:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" type="static" mediaPresentationDuration="PT${duration}S" minBufferTime="PT1.500S" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
  <Period duration="PT${duration}S" start="PT0S">
      ${videoAdaptationSet}
      ${audioAdaptationSet}
  </Period>
</MPD>`;
	return "mpd-" + mpdContent.trim()
		.replace(/&/g, '&amp;');
}

// 获取 JS 解密命令
async function getFunctionCode(funcName, src) {
	// 使用正则表达式匹配函数代码
	const funcRegex = new RegExp(`${funcName}=function\\([a-z]+\\){(.*?)}`, 's');
	const funcMatch = src.match(funcRegex);

	if (funcMatch) {
		const jsCode = funcMatch[1];

		// 匹配并提取 JavaScript 中的函数调用
		const callRegex = /([a-z0-9$]{2})\.([a-z0-9]{2})\([^,]+,(\d+)\)/gi;
		const matches = Array.from(jsCode.matchAll(callRegex));

		if (matches.length > 0) {
			const funcList = matches.map(m => m[2]);
			const funcPattern = new RegExp(`(${funcList.map(f => f.replace(/[$]/g, '\\$')).join('|')}):function(.*?)\\}`, 'gs');
			const newMatches = Array.from(src.matchAll(funcPattern));

			const functions = {};
			for (const m of newMatches) {
				if (m[2].includes('splice')) {
					functions[m[1]] = 'splice';
				} else if (m[2].includes('a.length')) {
					functions[m[1]] = 'swap';
				} else if (m[2].includes('reverse')) {
					functions[m[1]] = 'reverse';
				}
			}

			const instructions = [];
			for (const m of matches) {
				const name = m[2];
				const arg = m[3];
				if (functions[name]) {
					instructions.push([functions[name], arg]);
				}
			}
			return instructions;
		}
	}
	return null;
}

// 解密 Signature
async function decodeSignature(signature, instructions) {
	signature = signature.split(''); // 将字符串转换为数组，以便进行交换操作
	for (const opt of instructions) {
		const command = opt[0];
		const value = parseInt(opt[1]);
		if (command === 'swap') {
			// 执行 swap 操作
			const temp = signature[0];
			signature[0] = signature[value % signature.length];
			signature[value % signature.length] = temp;
		} else if (command === 'splice') {
			// 执行 splice 操作
			signature = signature.slice(value);
		} else if (command === 'reverse') {
			// 执行 reverse 操作
			signature.reverse();
		}
	}
	return signature.join('')
		.trim();
}

// 处理请求
addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	const localUrl = new URL(request.url);
	const parsedLocalUrl = new URL(localUrl.href);
	const proxyUrl = parsedLocalUrl.protocol + "//" + parsedLocalUrl.host
	const path = localUrl.pathname;
	const params = localUrl.searchParams;
	const urlStr = params.get("url");

	// 获取 YouTube 内容
	if (path === "/live") {
		let rid = "";
		let url = new URL(urlStr);
		if (urlStr.includes('v=')) {
			rid = url.searchParams.get('v');
		} else {
			let pathParts = url.pathname.split('/')
				.filter(part => part.length > 0);
			rid = pathParts[pathParts.length - 1];
		}
		let content = await getPlayUrl(rid, proxyUrl);
		if (content.startsWith('404-') || content === "") {
			let errorMessage = content;
			if (content === "") {
				errorMessage = "404-Not Found";
			}
			return new Response(errorMessage.slice(4), {
				status: 404
			});
		} else if (content.startsWith('mpd-')) {
			return new Response(content.slice(4), {
				headers: {
					"Content-Type": "application/dash+xml",
					"Content-Disposition": "attachment; filename=youtube.mpd",
				},
			});
		} else if (content.startsWith('m3u-')) {
			return new Response(content.slice(4), {
				headers: {
					"Content-Type": "application/vnd.apple.mpegurl",
					"Content-Disposition": "attachment; filename=youtube.m3u8",
				},
			});
		} else {
			return new Response(content, {
				status: 404
			});
		}
	}

	// 代理 YouTube M3U8
	else if (path === "/proxyM3u8") {
		const url = atob(urlStr);
		const content = await getM3U8(url, proxyUrl);
		if (content.startsWith('404-') || content === "") {
			let errorMessage = content;
			if (content === "") {
				errorMessage = "404-Not Found";
			}
			return new Response(errorMessage.slice(4), {
				status: 404
			});
		}
		return new Response(content.slice(4), {
			headers: {
				"Content-Type": "application/vnd.apple.mpegurl",
				"Content-Disposition": "attachment; filename=youtube.m3u8",
			},
		});
	}

	// 代理 YouTube 切片
	else if (path === "/proxyMedia") {
		const url = atob(urlStr);
		const selfHeaders = Object.fromEntries(request.headers);
		const responseHeaders = new Headers();

		for (const [key, value] of Object.entries(selfHeaders)) {
			if (key.toLowerCase() === "user-agent" || key.toLowerCase() === "host") {
				continue;
			}
			responseHeaders.set(key, value);
		}

		const response = await fetch(url, {
			headers: responseHeaders
		});
		const contentType = response.headers.get("content-type");
		const statusCode = response.status;

		for (const [key, value] of response.headers) {
			if (key.toLowerCase() === "connection" || key.toLowerCase() === "transfer-encoding") {
				continue;
			}
			if (contentType.toLowerCase() === "application/vnd.apple.mpegurl" || contentType.toLowerCase() === "application/x-mpegurl") {
				if (key.toLowerCase() === "content-length" || key.toLowerCase() === "content-range" || key.toLowerCase() === "accept-ranges") {
					continue;
				}
			}
			responseHeaders.set(key, value);
		}

		const readableStream = new ReadableStream({
			start(controller) {
				const reader = response.body.getReader();

				function read() {
					reader.read()
						.then(({
							done,
							value
						}) => {
							if (done) {
								controller.close();
								return;
							}
							controller.enqueue(value);
							read();
						});
				}

				read();
			},
		});

		return new Response(readableStream, {
			status: statusCode,
			headers: responseHeaders,
		});
	} else {
		return new Response(html, {
			headers: {
				'Content-Type': 'text/html'
			}
		});
	}
}
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"><title>404</title><style>body,html{background:#28254c;font-family:Ubuntu}*{box-sizing:border-box}.box{width:350px;height:100%;max-height:600px;min-height:450px;background:#332f63;border-radius:20px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:30px 50px}.box .box__ghost{padding:15px 25px 25px;position:absolute;left:50%;top:30%;transform:translate(-50%,-30%)}.box .box__ghost .symbol:nth-child(1){opacity:.2;animation:shine 4s ease-in-out 3s infinite}.box .box__ghost .symbol:nth-child(1):after,.box .box__ghost .symbol:nth-child(1):before{content:'';width:12px;height:4px;background:#fff;position:absolute;border-radius:5px;bottom:65px;left:0}.box .box__ghost .symbol:nth-child(1):before{transform:rotate(45deg)}.box .box__ghost .symbol:nth-child(1):after{transform:rotate(-45deg)}.box .box__ghost .symbol:nth-child(2){position:absolute;left:-5px;top:30px;height:18px;width:18px;border:4px solid;border-radius:50%;border-color:#fff;opacity:.2;animation:shine 4s ease-in-out 1.3s infinite}.box .box__ghost .symbol:nth-child(3){opacity:.2;animation:shine 3s ease-in-out .5s infinite}.box .box__ghost .symbol:nth-child(3):after,.box .box__ghost .symbol:nth-child(3):before{content:'';width:12px;height:4px;background:#fff;position:absolute;border-radius:5px;top:5px;left:40px}.box .box__ghost .symbol:nth-child(3):before{transform:rotate(90deg)}.box .box__ghost .symbol:nth-child(3):after{transform:rotate(180deg)}.box .box__ghost .symbol:nth-child(4){opacity:.2;animation:shine 6s ease-in-out 1.6s infinite}.box .box__ghost .symbol:nth-child(4):after,.box .box__ghost .symbol:nth-child(4):before{content:'';width:15px;height:4px;background:#fff;position:absolute;border-radius:5px;top:10px;right:30px}.box .box__ghost .symbol:nth-child(4):before{transform:rotate(45deg)}.box .box__ghost .symbol:nth-child(4):after{transform:rotate(-45deg)}.box .box__ghost .symbol:nth-child(5){position:absolute;right:5px;top:40px;height:12px;width:12px;border:3px solid;border-radius:50%;border-color:#fff;opacity:.2;animation:shine 1.7s ease-in-out 7s infinite}.box .box__ghost .symbol:nth-child(6){opacity:.2;animation:shine 2s ease-in-out 6s infinite}.box .box__ghost .symbol:nth-child(6):after,.box .box__ghost .symbol:nth-child(6):before{content:'';width:15px;height:4px;background:#fff;position:absolute;border-radius:5px;bottom:65px;right:-5px}.box .box__ghost .symbol:nth-child(6):before{transform:rotate(90deg)}.box .box__ghost .symbol:nth-child(6):after{transform:rotate(180deg)}.box .box__ghost .box__ghost-container{background:#fff;width:100px;height:100px;border-radius:100px 100px 0 0;position:relative;margin:0 auto;animation:upndown 3s ease-in-out infinite}.box .box__ghost .box__ghost-container .box__ghost-eyes{position:absolute;left:50%;top:45%;height:12px;width:70px}.box .box__ghost .box__ghost-container .box__ghost-eyes .box__eye-left{width:12px;height:12px;background:#332f63;border-radius:50%;margin:0 10px;position:absolute;left:0}.box .box__ghost .box__ghost-container .box__ghost-eyes .box__eye-right{width:12px;height:12px;background:#332f63;border-radius:50%;margin:0 10px;position:absolute;right:0}.box .box__ghost .box__ghost-container .box__ghost-bottom{display:flex;position:absolute;top:100%;left:0;right:0}.box .box__ghost .box__ghost-container .box__ghost-bottom div{flex-grow:1;position:relative;top:-10px;height:20px;border-radius:100%;background-color:#fff}.box .box__ghost .box__ghost-container .box__ghost-bottom div:nth-child(2n){top:-12px;margin:0 0;border-top:15px solid #332f63;background:0 0}.box .box__ghost .box__ghost-shadow{height:20px;box-shadow:0 50px 15px 5px #3b3769;border-radius:50%;margin:0 auto;animation:smallnbig 3s ease-in-out infinite}.box .box__description{position:absolute;bottom:30px;left:50%;transform:translateX(-50%)}.box .box__description .box__description-container{color:#fff;text-align:center;width:200px;font-size:16px;margin:0 auto}.box .box__description .box__description-container .box__description-title{font-size:24px;letter-spacing:.5px}.box .box__description .box__description-container .box__description-text{color:#8c8aa7;line-height:20px;margin-top:20px}.box .box__description .box__button{display:block;position:relative;background:#ff5e65;border:1px solid transparent;border-radius:50px;height:50px;text-align:center;text-decoration:none;color:#fff;line-height:50px;font-size:18px;padding:0 70px;white-space:nowrap;margin-top:25px;transition:background .5s ease;overflow:hidden}.box .box__description .box__button:before{content:'';position:absolute;width:20px;height:100px;background:#fff;bottom:-25px;left:0;border:2px solid #fff;transform:translateX(-50px) rotate(45deg);transition:transform .5s ease}.box .box__description .box__button:hover{background:0 0;border-color:#fff}.box .box__description .box__button:hover:before{transform:translateX(250px) rotate(45deg)}@keyframes upndown{0%{transform:translateY(5px)}50%{transform:translateY(15px)}100%{transform:translateY(5px)}}@keyframes smallnbig{0%{width:90px}50%{width:100px}100%{width:90px}}@keyframes shine{0%{opacity:.2}25%{opacity:.1}50%{opacity:.2}100%{opacity:.2}}</style></head><body><div class="box"><div class="box__ghost"><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="symbol"></div><div class="box__ghost-container"><div class="box__ghost-eyes"><div class="box__eye-left"></div><div class="box__eye-right"></div></div><div class="box__ghost-bottom"><div></div><div></div><div></div><div></div><div></div></div></div><div class="box__ghost-shadow"></div></div><div class="box__description"><div class="box__description-container"><div class="box__description-title">404错误！</div><div class="box__description-text">404错误！</div></div><a href="#" class="box__button">返回</a></div></div><script>var pageX=$(document).width(),pageY=$(document).height(),mouseY=0,mouseX=0;$(document).mousemove(function(e){mouseY=e.pageY,yAxis=(pageY/2-mouseY)/pageY*300,mouseX=e.pageX/-pageX,xAxis=100*-mouseX-100,$(".box__ghost-eyes").css({transform:"translate("+xAxis+"%,-"+yAxis+"%)"})})</script></body></html>`