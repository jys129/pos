const axios = require("axios");
const URL_PARAM = require("url");
const cheerio = require("cheerio");

const fs = require("fs");

// 회사 코드
const COMPANY_CODE = "poscoplantec";
// posco, 포스코
// poscoenc, 포스코건설
// poscoict, 포스코ICT
// poscochem, 포스코케미칼
// poscoplantec, 포스코플랜텍

// URL 정보
const BASE_URL = "https://findpeople.posco.co.kr:4443/S35/S35020/s35050f10/";
const LOGIN_URL = BASE_URL + "s35050f000.do?event=auth&company=unitech&companyTp=S&isOutLogin=Y&comExType=&shaPw=Uni245100**&befPage=s35050f010&branch=service&service=unitech&etc=&empNo=admin&pw=VW5pMjQ1MTAwKio%3D";
const MAIN_URL = BASE_URL + "s35050f020.do?company=" + COMPANY_CODE + "&companyTp=p&event=find&orgCode=";

var PERSON_LIST = [];

// 세션
const webInstance = axios.create({ baseURL: BASE_URL });

const ORGANIZATION_FILENAME = "organizationList_" + COMPANY_CODE + ".json";
const PERSON_FILENAME = "personList_" + COMPANY_CODE + ".json";

async function initWebInstance() {
	let resp = await axios.get(LOGIN_URL);
	let cookie = resp.headers["set-cookie"][0]; // get cookie from request
	webInstance.defaults.headers.Cookie = cookie; // attach cookie to axiosInstance for future requests
}

async function main() {
	await initWebInstance();

	let organizationList = JSON.parse(fs.readFileSync(ORGANIZATION_FILENAME));

	let count = 0;
	for (const organization of organizationList) {
		count++;
		console.log(`${count}/${organizationList.length}, ${JSON.stringify(organization)}`);
		await getMemberFromOrganization(organization);
	}

	// 인사 정보를 파일로 저장
	fs.writeFileSync(PERSON_FILENAME, JSON.stringify(PERSON_LIST));
	console.log("finished!!!");
}

async function getMemberFromOrganization(organization) {
	// 이메일 포함 목록 요청
	let params = new URL_PARAM.URLSearchParams(organization);
	let url = BASE_URL + organization.action + "?" + params;

	let htmlEmail = await webInstance.post(url, {
		method: "post",
	});

	let $ = cheerio.load(htmlEmail.data);
	let $tdEmailList = $("td");

	// 전화번호 포함 목록 요청
	delete organization.companyTp; // companyTp유무에 따라 전화번호 / 이메일이 결정됨
	params = new URL_PARAM.URLSearchParams(organization);
	url = BASE_URL + organization.action + "?" + params;

	let html = await webInstance.post(url, {
		method: "post",
	});

	$ = cheerio.load(html.data);
	$tdList = $("td");

	// 부서 리스트 가져오기
	for (let index = 0; index < $tdList.length; index++) {
		const td = $tdList[index];
		let str = replaceAll($(td).html(), "\n", "");

		let person = getPerson(organization.groupName, str);
		if (person) {
			index++;
			person.position = replaceAll($($tdList[index]).html(), "\n", "");
			index++;
			person.rank = replaceAll($($tdList[index]).html(), "\n", "");
			index++;
			person.phone1 = replaceAll($($tdList[index]).html(), "\n", "");
			index++;
			person.phone2 = replaceAll($($tdList[index]).html(), "\n", "");
			index++;
			person.desc = replaceAll($($tdList[index]).html(), "\n", "");
			person.mail = replaceAll($($tdEmailList[index]).html(), "\n", "");

			addPerson(person);
		}
	}
}

function addPerson(person) {
	// console.log(JSON.stringify(person));
	let tmp = PERSON_LIST.find((el) => el.personId === person.personId);
	if (!tmp) {
		PERSON_LIST.push(person);
	} else {
		console.log("중복!");
	}
}

function getPerson(groupName, str) {
	if (str.indexOf("goPersonDetail") === -1) {
		return null;
	} else {
		try {
			let personId = str.split("'")[9];
			let name = str.split(">")[1].split("<")[0];
			let person = {
				groupName: groupName,
				name: name,
				personId: personId,
			};
			if (name === "") {
				return null;
			} else {
				return person;
			}
		} catch (error) {
			return null;
		}
	}
}

function replaceAll(str, searchStr, replaceStr) {
	let tmpString = str;
	tmpString = tmpString.split(searchStr).join(replaceStr);
	tmpString = tmpString.split("&nbsp;").join("");
	return tmpString;
}

main();
