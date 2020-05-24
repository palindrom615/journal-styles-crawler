const puppeteer = require("puppeteer");
// const devices = require("puppeteer/DeviceDescriptors");
const device = puppeteer.devices["Galaxy Note 3"];
(async () => {
  const browser = await puppeteer.launch();

  const urls = ["https://m.khan.co.kr/view.html?art_id=202005240837001"];

  const getInfo = async (url) => {
    const { hostname } = new URL(url);
    console.log(hostname)
    const page = await browser.newPage();
    await page.emulate(device);
    await page.goto(url);
    const scsPromise = page.screenshot({ path: hostname+'.png', fullPage: true });
    // const nodes = await page.$$("*");

    // const nodeArr = Array.from(nodes);

    const texts = await page.$x(
      "//text()[not(parent::script|parent::style)]"
    );
    console.log(texts);

    const textsInnerTextPromise = texts.map((e) =>
      e.evaluate((e) => {
        style = getComputedStyle(e.parentNode);
        return {
          txt: e.wholeText,
          parent: e.parentNode,
          fontSize: style.getPropertyValue("font-size"),
          fontFamily: style.getPropertyValue("font-family"),
        };
      })
    );
    return Promise.all([scsPromise, ...textsInnerTextPromise]);
  };

  await Promise.all(urls.map(getInfo));

  await browser.close();
})();
