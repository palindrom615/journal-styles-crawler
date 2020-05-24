const puppeteer = require("puppeteer");
const fs = require("fs").promises;

const device = puppeteer.devices["Galaxy Note 3"];

const getInfo = async ([journal, url], browser) => {
  const page = await browser.newPage();
  await page.emulate(device);
  page.on("console", (msg) => {
    for (let i = 0; i < msg._args.length; ++i)
      console.log(`${i}: ${msg._args[i]}`);
  });
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 0,
    });
  } catch (e) {
    console.log(e, journal, url);
    return;
  }

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
        console.log(e, location.href);
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

(async () => {
  const journals = (await fs.readFile("./journals", "utf8"))
    .trim()
    .split("\n")
    .map((string) => string.split(","))
    .filter((arr) => arr.length === 2 && arr[1] !== "");
  const browser = await puppeteer.launch();

  const results = await Promise.all(
    journals.map((journal) => getInfo(journal, browser))
  );
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
