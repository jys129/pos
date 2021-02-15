const axios = require("axios");
const URL_PARAM = require("url");
const cheerio = require("cheerio");

const fs = require("fs");

// 회사 코드
const COMPANY_CODE = "poscoenergy";
// posco, 포스코
// poscoenc, 포스코건설
// poscoict, 포스코ICT
// poscochem, 포스코케미칼
// poscoplantec, 포스코플랜텍
// poscoenergy, 포스코에너지

// URL 정보
const BASE_URL = "https://findpeople.posco.co.kr:4443/S35/S35020/s35050f10/";
const LOGIN_URL = BASE_URL + "s35050f000.do?event=auth&company=unitech&companyTp=S&isOutLogin=Y&comExType=&shaPw=Uni245100**&befPage=s35050f010&branch=service&service=unitech&etc=&empNo=admin&pw=VW5pMjQ1MTAwKio%3D";
const MAIN_URL = BASE_URL + "s35050f020.do?company=" + COMPANY_CODE + "&companyTp=p&event=find&orgCode=";

// 세션
const webInstance = axios.create({ baseURL: BASE_URL });

const ORGANIZATION_FILENAME = "organizationList_" + COMPANY_CODE + ".json";

async function initWebInstance() {
	let resp = await axios.get(LOGIN_URL);
	let cookie = resp.headers["set-cookie"][0]; // get cookie from request
	webInstance.defaults.headers.Cookie = cookie; // attach cookie to axiosInstance for future requests
}

async function getOrganizationListFrom(url) {
	let organizationList = []; // 부서 목록

	let html = await webInstance.post(url, {
		method: "post",
	});
	const $ = cheerio.load(html.data);
	const $bodyList = $(".cutSt");

	// 부서 리스트 가져오기
	$bodyList.each(async function (i, elem) {
		let organization = parseSearchTree($(this));
		organizationList[i] = organization;
	});
	return organizationList;
}

async function main() {
	await initWebInstance();

	let organizationList = []; // 부서 목록

	// 첫 페이지에서 부서 리스트 가져오기
	organizationList = await getOrganizationListFrom(MAIN_URL);

	// 부서 목록 출력
	console.log("부서 목록 출력");
	for (var organization of organizationList) {
		console.log(JSON.stringify(organization));
	}

	console.log("부서 리스트 개수 만큼 돌면서 하위 부서 목록 추출");
	// 부서 리스트 개수 만큼 돌면서 하위 부서 목록 추출
	for (var organization of organizationList) {
		console.log(organization.groupName);
		const params = new URL_PARAM.URLSearchParams(organization);
		let newOrganizationList = await getOrganizationListFrom(BASE_URL + organization.action + "?" + params);

		for (var organization2 of newOrganizationList) {
			let tmp = organizationList.find((el) => el.orgCode === organization2.orgCode);
			if (!tmp) {
				organization2.groupName = organization.groupName + " " + organization2.groupName;
				console.log(organization.group + " : " + JSON.stringify(organization2));
				organizationList.push(organization2);
			}
		}
	}

	// 부서 정보를 파일로 저장
	fs.writeFileSync(ORGANIZATION_FILENAME, JSON.stringify(organizationList));
	console.log("finished!!!");
}

function parseSearchTree(object) {
	try {
		let str = object.attr("onclick");
		let searchType = str.split("(")[0];
		let value = str.split("(")[1].split(",");
		let requestInfo = {
			group: object.text().trim(),
			groupName: object.text().trim(),
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
		return requestInfo;
	} catch (error) {}
}

function replaceAll(str, searchStr, replaceStr) {
	return str.split(searchStr).join(replaceStr);
}
main();
