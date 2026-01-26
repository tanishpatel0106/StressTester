import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "data")

export interface StoredVersion {
  id: string
  filename: string
  created_at: string
}

export async function saveVersionedPayload<T>(
  name: string,
  payload: T
): Promise<StoredVersion> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `${name}-${timestamp}.json`
  const filePath = path.join(DATA_DIR, filename)
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8")
  return {
    id: `${name}-${timestamp}`,
    filename,
    created_at: new Date().toISOString(),
  }
}

export async function listVersions(prefix?: string): Promise<StoredVersion[]> {
  try {
    const files = await fs.readdir(DATA_DIR)
    return files
      .filter((file) => (prefix ? file.startsWith(prefix) : true))
      .map((file) => ({
        id: file.replace(/\.json$/, ""),
        filename: file,
        created_at: file.split("-").slice(-6).join(":") || "",
      }))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}
