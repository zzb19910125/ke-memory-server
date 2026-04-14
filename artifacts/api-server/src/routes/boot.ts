import { Router, type IRouter } from "express";
import { fetchAllDatabasePages } from "../lib/notion.js";

const DATABASE_ID = "55865e6a4c0a496794eaccd44642f173";

const router: IRouter = Router();

router.get("/boot", async (req, res): Promise<void> => {
  req.log.info({ databaseId: DATABASE_ID }, "Fetching Notion database pages");

  const pages = await fetchAllDatabasePages(DATABASE_ID);

  if (pages.length === 0) {
    req.log.warn("No pages found in Notion database");
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

  const prompt = sections.join("\n\n---\n\n");

  req.log.info({ pageCount: pages.length }, "Boot prompt assembled");

  res.type("text/plain").send(prompt);
});

export default router;
