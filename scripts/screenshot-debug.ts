import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.URL ?? "http://localhost:5173/#/debug";
  const outDir = resolve(__dirname, "..", "screenshots");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();

  async function screenshot(
    width: number,
    height: number,
    name: string,
  ): Promise<string> {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: "networkidle" });
    const dest = resolve(outDir, name);
    await page.screenshot({ path: dest, fullPage: true });
    await page.close();
    return dest;
  }

  const desktop = await screenshot(1920, 1080, "debug-desktop.png");
  const mobile = await screenshot(375, 812, "debug-mobile.png");

  await browser.close();

  console.log(desktop);
  console.log(mobile);
}

main();
