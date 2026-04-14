import app from "./app";
import { logger } from "./lib/logger";

// 雏菊小屋接口
app.get('/api/daisy/read/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const url = `https://raw.githubusercontent.com/zzb19910125/CHUJUDaisy-House-Vault/master/雏菊小屋/${filePath}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(404).json({ error: 'File not found' });
    }
    const content = await response.text();
    res.json({ content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/daisy/list', async (req, res) => {
  try {
    const url = 'https://api.github.com/repos/zzb19910125/CHUJUDaisy-House-Vault/contents/雏菊小屋';
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ke-memory-server'
      }
    });
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch files' });
    }
    const files = await response.json();
    res.json({ files: files.map((f: any) => ({ name: f.name, type: f.type })) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
