import { Router, type IRouter } from "express";
import { fetchChildPages } from "../lib/notion.js";

const PARENT_PAGE_ID = "33822941161280f1832dfdd6343fb8e4";

const router: IRouter = Router();

router.get("/astro", async (req, res): Promise<void> => {
  req.log.info({ parentPageId: PARENT_PAGE_ID }, "Fetching Notion child pages");

  const pages = await fetchChildPages(PARENT_PAGE_ID);

  if (pages.length === 0) {
    req.log.warn("No child pages found under Notion page");
    res.type("text/plain").send("");
    return;
  }

  const sections = pages.map((page) => {
    const lines: string[] = [];
    lines.push(`# ${page.title}`);
    if (page.content) {
      lines.push("");
      lines.push(page.content);
    }
    return lines.join("\n");
  });

  const output = sections.join("\n\n---\n\n");

  req.log.info({ pageCount: pages.length }, "Astro prompt assembled");

  res.type("text/plain").send(output);
});

export default router;
