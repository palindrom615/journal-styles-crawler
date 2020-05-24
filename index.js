const puppeteer = require("puppeteer");
const fs = require("fs");
// const devices = require("puppeteer/DeviceDescriptors");
const device = puppeteer.devices["Galaxy Note 3"];
(async () => {
  const browser = await puppeteer.launch();

  const urls = ["https://m.khan.co.kr/view.html?art_id=202005240837001"];

  const getInfo = async (url) => {
    const { hostname } = new URL(url);
    const page = await browser.newPage();
    await page.emulate(device);
    await page.goto(url);
    const scsPromise = page.screenshot({
      path: hostname + ".png",
      fullPage: true,
    });

    const texts = await page.$x("//text()[not(parent::script|parent::style)]");
    const textsInnerTextPromise = texts.map((elemHandler) =>
      elemHandler.evaluate((elem) => {
        style = getComputedStyle(elem.parentNode);
        return {
          txt: elem.wholeText,
          fontSize: style.getPropertyValue("font-size"),
          fontFamily: style.getPropertyValue("font-family"),
        };
      })
    );
    return Promise.all([scsPromise, ...textsInnerTextPromise]);
  };

  const results = await Promise.all(urls.map(getInfo));
  const resultsJson = results.map(([_, ...textStyle], urlIdx) => {
    const mainContentFirst = textStyle.find((t) => t.txt.length > 100);
    return { site: url[urlIdx], ...mainContentFirst };
  });
  await browser.close();

  await fs.writeFile("result.json", JSON.stringify(resultsJson), () => {});
})();
