const puppeteer = require("puppeteer");
// const devices = require("puppeteer/DeviceDescriptors");
const device = puppeteer.devices["Galaxy Note 3"];

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.emulate(device);
  await page.goto("https://m.khan.co.kr/view.html?art_id=202005240837001");
  // await page.screenshot({ path: "example.png", fullPage: true });
  // const nodes = await page.$$("*");

  // const nodeArr = Array.from(nodes);
  const properties = [];
  const texts = await page.$x('//text()[not(parent::script|parent::style)]')
  const texts_innerText = await Promise.all(texts.map(e => e.evaluate(e => ({txt: e.wholeText, parent: e.parentNode}))))
  console.log(texts_innerText.filter(t => t.txt.length > 100))
  const nodeTypes= await page.$$eval('div, p', nodes => nodes.map(n => n.textContent));
  // nodeTypes.filter(n => n === 3)
  // console.log(nodeTypes.filter(n => n.length > 50))
  // for (node of nodes.entries()) {
  //   console.log(node)
  //   properties.push(node.nodeType);
  // }
  // const properties = await Promise.all(nodeArr.map(n => n.jsonValue()))
  // await Promise.all(properties)
  console.log(properties)

  await browser.close();
})();
