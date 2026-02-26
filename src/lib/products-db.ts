import path from "node:path";
import Database from "better-sqlite3";

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  warranty_months: number;
  tags: string;
};

export type Product = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  warranty_months: number;
  tags: string[];
};

let db: Database.Database | null = null;

function getDb() {
  if (db) {
    return db;
  }

  const dbPath = path.join(process.cwd(), "src", "data", "products.db");
  db = new Database(dbPath, { readonly: true });
  return db;
}

function parseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string");
    }
    return [];
  } catch {
    return [];
  }
}

export function getProductsFromDb(): Product[] {
  const database = getDb();
  const rows = database
    .prepare(
      `
      SELECT sku, name, category, price, stock, warranty_months, tags
      FROM pc_parts
      ORDER BY category ASC, sku ASC
      `,
    )
    .all() as ProductRow[];

  return rows.map((row) => ({
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: row.price,
    stock: row.stock,
    warranty_months: row.warranty_months,
    tags: parseTags(row.tags),
  }));
}
