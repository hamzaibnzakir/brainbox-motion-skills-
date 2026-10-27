import path from "path";
import playwright from "./pw.mjs";
const [, , file, out, w = 1080, h = 1920] = process.argv;
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto('file://' + path.resolve(file));
await page.waitForTimeout(400);
await page.screenshot({ path: out });
await browser.close();
