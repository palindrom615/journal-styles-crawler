const puppeteer = require("puppeteer");
const filter = require("async/filter");
const map = require("async/map");
const fs = require("fs").promises;

const device = puppeteer.devices["Galaxy Note 3"];

const EXT = ".chn";

const prefix = new Date().toISOString() + EXT;

const takeScreenshot = async (page, articleTextNodes, journal) => {
  const pageScsh = await page.screenshot({
    path: `${prefix}/${journal}.png`,
    fullPage: true,
  });
  if (!articleTextNodes || !articleTextNodes[1]) {
    console.log(`${journal} no article TextNodes`);
    return;
  }
  const typeScsh = await articleTextNodes[1]
    .evaluateHandle((node) => {
      const p = node.parentNode;
      const pp = node.parentNode.parentNode;

      p.textContent =
        "美事訳征之計刊活真選重入。問帰所禁泉原京海顔著選携西碁気。子支確出来伊復日応京点敷設南。立芸想地蘇必思投勝使急出新。東期安竹難戦円更本因速掲断高食。性質北中出夕頭類読刊談疑決条震意連。成島周所午校発治玉測因系。告雪都州配文遣題事併間理購民廃続柳場少海。書衛先順念家転職産制性重家政必的変促。圧歴較報技停解変語委元負含徴。";
      return p;
    })
    .then(async (handle) => {
      try {
        return await handle
          .asElement()
          .screenshot({ path: `${prefix}/${journal}-type.png` });
      } catch (e) {
        console.log(e, await handle.evaluate(node => node.innerHTML));
      }
    });
  return;
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
        // elem.wholeText.trim().split(" ").length > 20 &&
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
        letterSpacing: style.getPropertyValue("letter-spacing"),
        wordSpacing: style.getPropertyValue("word-spacing"),
      };
    });
  });
  await takeScreenshot(page, articleTextNodes, journal);

  return textStylePromises;
};

(async () => {
  await fs.mkdir(prefix);

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

  await fs.writeFile(`${prefix}/result.json`, JSON.stringify(resultsJson));
  return;
})();
