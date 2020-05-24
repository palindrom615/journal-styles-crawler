const puppeteer = require("puppeteer");
const fs = require("fs").promises;

const device = puppeteer.devices["Galaxy Note 3"];

(async () => {
  const urls = (await fs.readFile("./urls", "utf8")).trim().split("\n");
  const browser = await puppeteer.launch();

  const getInfo = async (url) => {
    const page = await browser.newPage();
    await page.emulate(device);
    await page.goto(url);

    const { hostname } = new URL(url);
    const scsPromise = page.screenshot({
      path: hostname + ".png",
      fullPage: true,
    });

    const textNodes = await page.$x(
      "//text()[not(parent::script|parent::style|parent::noscript)]"
    );
    const textStylePromises = textNodes.map((elemHandler) =>
      elemHandler.evaluate((elem) => {
        style = getComputedStyle(elem.parentNode || elem);

        return {
          txt: elem.wholeText,
          fontSize: style.getPropertyValue("font-size"),
          fontFamily: style.getPropertyValue("font-family"),
        };
      })
    );
    return Promise.all([scsPromise, ...textStylePromises]);
  };

  const results = await Promise.all(urls.map(getInfo));
  const resultsJson = results.map(([_, ...textStyle], urlIdx) => {
    // find second paragraph over 30 words.
    const mainContentFirst = textStyle.filter(
      (t) => t.txt.trim().split(" ").length > 30
    );
    return { site: urls[urlIdx], ...mainContentFirst[1] };
  });
  await browser.close();

  await fs.writeFile("result.json", JSON.stringify(resultsJson));
})();
