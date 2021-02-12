const axios = require("axios");
const cheerio = require("cheerio");
const log = console.log;

const BASE_URL = "https://findpeople.posco.co.kr:4443/S35/S35020/s35050f10/";
const LOGIN_URL = BASE_URL + "s35050f000.do?event=auth&company=unitech&companyTp=S&isOutLogin=Y&comExType=&shaPw=Uni245100**&befPage=s35050f010&branch=service&service=unitech&etc=&empNo=admin&pw=VW5pMjQ1MTAwKio%3D";
const MAIN_URL = BASE_URL + "s35050f020.do?company=posco&companyTp=p&event=find&orgCode=";

const webInstance = axios.create({ baseURL: BASE_URL });
var cookie = "";

// getHtml()
// 	.then((html) => {
// 		let ulList = [];

// 		console.log(html);
// 		const $ = cheerio.load(html.data);
// 		const $bodyList = $("div.headline-list ul").children("li.section02");

// 		$bodyList.each(function (i, elem) {
// 			ulList[i] = {
// 				title: $(this).find("strong.news-tl a").text(),
// 				url: $(this).find("strong.news-tl a").attr("href"),
// 				image_url: $(this).find("p.poto a img").attr("src"),
// 				image_alt: $(this).find("p.poto a img").attr("alt"),
// 				summary: $(this).find("p.lead").text().slice(0, -11),
// 				date: $(this).find("span.p-time").text(),
// 			};
// 		});

// 		const data = ulList.filter((n) => n.title);
// 		return data;
// 	})
// 	.then((res) => log(res));

async function main() {
	// create session from LOGIN_URL
	const resp = await axios.get(LOGIN_URL);
	cookie = resp.headers["set-cookie"][0]; // get cookie from request
	webInstance.defaults.headers.Cookie = cookie; // attach cookie to axiosInstance for future requests

	let html = await webInstance.get(MAIN_URL);
	const $ = cheerio.load(html.data);
	const $bodyList = $(".cutSt");

	let plist = [];

	// 부서 리스트 가져오기
	$bodyList.each(async function (i, elem) {
		let organization = parseSearchTree($(this));
		plist[i] = organization;
	});

	// 부서 리스트 개수 만큼
	for (var organization of plist) {
		delete organization["group"];
		organization.Cookie = cookie; // attach cookie to axiosInstance for future requests
		console.log(JSON.stringify(organization)); // 10, 20, 30
		let html = await webInstance.post(BASE_URL + organization.action, {
			headers: organization,
		});
		console.log(html.data);
	}
}

function parseSearchTree(object) {
	try {
		let str = object.attr("onclick");
		let searchType = str.split("(")[0];
		let value = str.split("(")[1].split(",");
		let requestInfo = {
			group: object.text(),
		};
		if (searchType === "goSearchTree1") {
			// requestInfo.cookie = "searchBarVisibility=false";
			// requestInfo.depthYn = replaceAll(value[8], "'", "");
			requestInfo.depthYn = "N";
			requestInfo.event = "find";
			requestInfo.uid = replaceAll(value[1], "'", "");
			requestInfo.company = replaceAll(value[8], "'", "");
			requestInfo.companyTp = replaceAll(value[3], "'", "");
			requestInfo.orgCode = replaceAll(value[4], "'", "");
			requestInfo.isOrgOpen = replaceAll(value[5], "'", "");
			+"#" + replaceAll(value[6], "'", "");
			+":" + replaceAll(value[7], "'", "");
			requestInfo.actionCode = "101";
			requestInfo.action = "s35050f020.do";
		} else if (searchType === "goSearchTree2" || searchType === "goSearchTree3") {
			// requestInfo.cookie = "searchBarVisibility=false";
			// requestInfo.depthYn = replaceAll(value[7], "'", "");
			requestInfo.depthYn = "N";
			requestInfo.event = "find";
			requestInfo.uid = replaceAll(value[1], "'", "");
			requestInfo.company = replaceAll(value[2], "'", "");
			requestInfo.companyTp = replaceAll(value[3], "'", "");
			requestInfo.orgCode = replaceAll(value[4], "'", "");
			requestInfo.isOrgOpen = replaceAll(value[5], "'", "");
			+"#" + replaceAll(value[6], "'", "");
			requestInfo.actionCode = "101";
			requestInfo.action = "s35050f020.do";
		} else {
			return null;
		}
		console.log(JSON.stringify(requestInfo));
		return requestInfo;
	} catch (error) {}
}

function replaceAll(str, searchStr, replaceStr) {
	return str.split(searchStr).join(replaceStr);
}
main();
