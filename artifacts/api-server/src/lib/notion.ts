import { Client } from "@notionhq/client";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

type RichTextItem = { plain_text: string };

interface FullBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

function extractRichText(richText: RichTextItem[] | undefined): string {
  if (!richText || richText.length === 0) return "";
  return richText.map((t) => t.plain_text).join("");
}

function richOf(block: FullBlock, key: string): RichTextItem[] {
  const inner = block[key] as { rich_text?: RichTextItem[] } | undefined;
  return inner?.rich_text ?? [];
}

function blockToText(block: FullBlock, depth = 0): string {
  const indent = "  ".repeat(depth);
  const type = block.type;

  switch (type) {
    case "paragraph":
      return extractRichText(richOf(block, "paragraph"))
        ? `${indent}${extractRichText(richOf(block, "paragraph"))}`
        : "";
    case "heading_1":
      return extractRichText(richOf(block, "heading_1"))
        ? `${indent}# ${extractRichText(richOf(block, "heading_1"))}`
        : "";
    case "heading_2":
      return extractRichText(richOf(block, "heading_2"))
        ? `${indent}## ${extractRichText(richOf(block, "heading_2"))}`
        : "";
    case "heading_3":
      return extractRichText(richOf(block, "heading_3"))
        ? `${indent}### ${extractRichText(richOf(block, "heading_3"))}`
        : "";
    case "bulleted_list_item":
      return extractRichText(richOf(block, "bulleted_list_item"))
        ? `${indent}- ${extractRichText(richOf(block, "bulleted_list_item"))}`
        : "";
    case "numbered_list_item":
      return extractRichText(richOf(block, "numbered_list_item"))
        ? `${indent}1. ${extractRichText(richOf(block, "numbered_list_item"))}`
        : "";
    case "to_do": {
      const inner = block.to_do as
        | { rich_text?: RichTextItem[]; checked?: boolean }
        | undefined;
      const text = extractRichText(inner?.rich_text);
      const checked = inner?.checked ? "[x]" : "[ ]";
      return text ? `${indent}${checked} ${text}` : "";
    }
    case "toggle":
      return extractRichText(richOf(block, "toggle"))
        ? `${indent}▸ ${extractRichText(richOf(block, "toggle"))}`
        : "";
    case "quote":
      return extractRichText(richOf(block, "quote"))
        ? `${indent}> ${extractRichText(richOf(block, "quote"))}`
        : "";
    case "callout":
      return extractRichText(richOf(block, "callout"))
        ? `${indent}[callout] ${extractRichText(richOf(block, "callout"))}`
        : "";
    case "code": {
      const inner = block.code as
        | { rich_text?: RichTextItem[]; language?: string }
        | undefined;
      const text = extractRichText(inner?.rich_text);
      const lang = inner?.language ?? "";
      return text
        ? `${indent}\`\`\`${lang}\n${indent}${text}\n${indent}\`\`\``
        : "";
    }
    case "divider":
      return `${indent}---`;
    case "table_row": {
      const inner = block.table_row as
        | { cells?: RichTextItem[][] }
        | undefined;
      const cells = (inner?.cells ?? []).map((cell) =>
        cell.map((t) => t.plain_text).join(""),
      );
      return `${indent}| ${cells.join(" | ")} |`;
    }
    default:
      return "";
  }
}

async function fetchBlocksRecursively(
  blockId: string,
  depth = 0,
): Promise<string[]> {
  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const raw of response.results) {
      const block = raw as FullBlock;
      if (!("type" in block)) continue;
      const line = blockToText(block, depth);
      if (line) lines.push(line);

      if (block.has_children) {
        const children = await fetchBlocksRecursively(block.id, depth + 1);
        lines.push(...children);
      }
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return lines;
}

function getPageTitle(
  properties: Record<string, { type: string; title?: RichTextItem[] }>,
): string {
  for (const prop of Object.values(properties)) {
    if (prop.type === "title" && prop.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "Untitled";
}

export async function fetchChildPages(
  parentPageId: string,
): Promise<Array<{ title: string; content: string }>> {
  const pages: Array<{ title: string; content: string }> = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: parentPageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const raw of response.results) {
      const block = raw as FullBlock;
      if (block.type !== "child_page") continue;
      const inner = block.child_page as { title?: string } | undefined;
      const title = inner?.title ?? "Untitled";
      const contentLines = await fetchBlocksRecursively(block.id);
      pages.push({ title, content: contentLines.join("\n") });
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return pages;
}

export async function fetchAllDatabasePages(
  databaseId: string,
): Promise<Array<{ title: string; content: string }>> {
  const pages: Array<{ title: string; content: string }> = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: databaseId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const result of response.results) {
      const page = result as {
        id: string;
        properties?: Record<
          string,
          { type: string; title?: RichTextItem[] }
        >;
      };
      if (!page.properties) continue;
      const title = getPageTitle(page.properties);
      const contentLines = await fetchBlocksRecursively(page.id);
      pages.push({ title, content: contentLines.join("\n") });
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  return pages;
}
