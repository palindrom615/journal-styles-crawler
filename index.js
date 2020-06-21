const puppeteer = require("puppeteer");
const filter = require("async/filter");
const map = require("async/map");
const fs = require("fs").promises;

const device = puppeteer.devices["Galaxy Note 3"];

const EXT = "";
const datePrefix = new Date().toISOString();

const takeScreenshot = async (page, articleTextNodes) => {
  const pageScsh = page.screenshot({
    path: `${datePrefix}/${journal}.png`,
    fullPage: true,
  });
  const typeScsh = articleTextNodes[1]
    .evaluateHandle((node) => {
      const p = node.parentNode;
      const pp = node.parentNode.parentNode;

      p.textContent =
        "이 문제를 해결하려면 지방의료원을 서둘러 설립해야 한다. 대전시는 2015년 메르스 사태 때 지방의료원이 없어 대응에 어려움을 겪고 피해도 컸다는 시 안팎의 진단에 따라 지방의료원 설립을 추진해왔다. 당시 노인질환 전문병원인 대청병원과 역시 노인 환자가 많이 몰리는 건양대병원 두곳에서만 17명의 확진자가 발생했다. 고위험군이 몰려 있는 시설에서 확진자가 많이 나오다 보니 병상 자원 부족 문제가 더 심각하게 드러났다. 전국 사망자 38명 중 12명이 대전에서 나왔다. 박희용 대전시 보건정책과 주무관은 “당시에 민간 병원에 환자들을 받아달라 사정했고, 의료진이 부족해 군의관·간호장교까지 투입하며 대응했는데도 피해가 컸다”고 말했다.";
      return p;
    })
    .then((handle) => {
      return handle
        .asElement()
        .screenshot({ path: `${datePrefix}/${journal}-type.png` });
    });
  return Promise.all([pageScsh, typeScsh]);
};

const getInfo = async ([journal, url], browser) => {
  const page = await browser.newPage();
  await page.emulate(device);
  page.on("console", (msg) => {
    for (let i = 0; i < msg._args.length; ++i)
      console.log(`${journal}: ${msg._args[i]}`);
  });
  try {
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 0,
    });
  } catch (e) {
    console.log("19:page goto error: ", e, journal, url);
    return;
  }

  const textNodes = await page.$x(
    "//text()[not(parent::script|parent::style|parent::noscript) and string-length() > 80]"
  );

  const articleTextNodes = await filter(textNodes, async (elemHandle) => {
    return elemHandle.evaluate((elem) => {
      return (
        elem.wholeText.trim().split(" ").length > 30 &&
        getComputedStyle(elem.parentNode).getPropertyValue("display") !== "none"
      );
    });
  });

  const textStylePromises = map(articleTextNodes, async (elemHandle) => {
    return elemHandle.evaluate((elem) => {
      // find second paragraph over 30 words.
      try {
        style = getComputedStyle(elem.parentNode || elem);
      } catch (e) {
        console.log("36:getComputedStyle error: ", e, location.href);
        return;
      }
      return {
        txt: elem.wholeText,
        fontSize: style.getPropertyValue("font-size"),
        fontFamily: style.getPropertyValue("font-family"),
        lineHeight: style.getPropertyValue("line-height"),
      };
    });
  });
  await takeScreenshot(page, articleTextNodes);

  return textStylePromises;
};

(async () => {
  await fs.mkdir(datePrefix);

  const journals = (await fs.readFile(`./journals${EXT}`, "utf8"))
    .trim()
    .split("\n")
    .filter((str) => !str.startsWith("//"))
    .map((str) => str.split(","))
    .filter((arr) => arr.length === 2 && arr[1] !== "");

  const browser = await puppeteer.launch();

  const results = await map(journals, async (journal) =>
    getInfo(journal, browser)
  );
  const resultsJson = results.map((textStyle, journalIdx) => {
    return {
      journal: journals[journalIdx][0],
      site: journals[journalIdx][1],
      ...textStyle[1],
    };
  });
  await browser.close();

  await fs.writeFile(`${datePrefix}/result.json`, JSON.stringify(resultsJson));
  return;
})();
