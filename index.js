const puppeteer = require("puppeteer");
const fs = require("fs").promises;

const device = puppeteer.devices["Galaxy Note 3"];

(async () => {
  const journals = (await fs.readFile("./journals", "utf8"))
    .trim()
    .split("\n")
    .map((string) => string.split(","))
    .filter((arr) => arr.length === 2 && arr[1] !== "");
  const browser = await puppeteer.launch();

  const getInfo = async ([journal, url]) => {
    const page = await browser.newPage();
    await page.emulate(device);
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 0,
      });
    } catch (e) {
      console.log(e, journal, url);
      return;
    }

    const { hostname } = new URL(url);
    const scsPromise = page.screenshot({
      path: journal + ".png",
      fullPage: true,
    });

    const textNodes = await page.$x(
      "//text()[not(parent::script|parent::style|parent::noscript)]"
    );
    const textStylePromises = textNodes.map((elemHandler) =>
      elemHandler.evaluate((elem) => {
        try {
          style = getComputedStyle(elem.parentNode || elem);
        } catch (e) {
          console.log(e, journal, url);
          return;
        }
        return {
          txt: elem.wholeText,
          fontSize: style.getPropertyValue("font-size"),
          fontFamily: style.getPropertyValue("font-family"),
        };
      })
    );
    return Promise.all([scsPromise, ...textStylePromises]);
  };

  const results = await Promise.all(journals.map(getInfo));
  const resultsJson = results
    .filter((result) => typeof result !== "undefined")
    .map(([_, ...textStyle], journalIdx) => {
      // find second paragraph over 30 words.
      const mainContentFirst = textStyle.filter(
        (t) => t.txt.trim().split(" ").length > 30
      );
      return {
        journal: journals[journalIdx][0],
        site: journals[journalIdx][1],
        ...mainContentFirst[1],
      };
    });
  await browser.close();

  await fs.writeFile("result.json", JSON.stringify(resultsJson));
})();
