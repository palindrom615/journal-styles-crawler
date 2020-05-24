const puppeteer = require("puppeteer");
const fs = require("fs").promises;

const device = puppeteer.devices["Galaxy Note 3"];

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

  const scsPromise = page.screenshot({
    path: "screenshots/" + journal + ".png",
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
        console.log("36:getComputedStyle error: ", e, location.href);
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
    .filter((str) => !str.startsWith("//"))
    .map((str) => str.split(","))
    .filter((arr) => arr.length === 2 && arr[1] !== "");
  const browser = await puppeteer.launch();

  const results = await Promise.all(
    journals.map((journal) => getInfo(journal, browser))
  );
  const resultsJson = results
    .filter((res) => typeof res !== "undefined")
    .map(([_, ...textStyle], journalIdx) => {
      // find second paragraph over 30 words.
      const mainContentFirst = textStyle.filter(
        (t) => typeof t !== "undefined" && t.txt.trim().split(" ").length > 30
      );
      return {
        journal: journals[journalIdx][0],
        site: journals[journalIdx][1],
        ...mainContentFirst[1],
      };
    });
  await browser.close();

  console.log(JSON.stringify(resultsJson));
  await fs.writeFile(
    `result-${Date.now()}.json`,
    JSON.stringify(resultsJson)
  );
})();
