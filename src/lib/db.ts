import { sql } from '@vercel/postgres';

export interface Product {
    id: number;
    title: string;
    description: string;
    images: string[]; // URLs: [main, switch1, switch2, ...]
    created_at?: string;
}

export async function getProducts() {
    try {
        await initDb(); // Ensure table exists
        const { rows } = await sql<Product>`SELECT * FROM products ORDER BY created_at DESC`;
        return rows;
    } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
    }
}

export async function addProduct(product: Omit<Product, 'id'>) {
    try {
        await sql`
      INSERT INTO products (title, description, images)
      VALUES (${product.title}, ${product.description}, ${JSON.stringify(product.images)})
    `;
        return { success: true };
    } catch (error) {
        console.error('Failed to add product:', error);
        return { success: false, error };
    }
}

export async function deleteProduct(id: number) {
    try {
        await sql`DELETE FROM products WHERE id = ${id}`;
        return { success: true };
    } catch (error) {
        console.error('Failed to delete product:', error);
        return { success: false, error };
    }
}

export async function initDb() {
    try {
        // We check if the table exists. If it exists but has the old schema, we might need to migrate.
        // For this simple project, we'll try to add the column if it doesn't exist, or recreate if it's easier.
        // Since we are in development, dropping and recreating is simplest if we want to change columns.

        // Check if 'images' column exists
        const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'images';
    `;

        if (columnCheck.rowCount === 0) {
            console.log('Migrating database schema...');
            await sql`DROP TABLE IF EXISTS products`;
        }

        await sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        images JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

        // Check if empty and seed
        const { count } = (await sql`SELECT COUNT(*) as count FROM products`).rows[0];
        if (parseInt(count) === 0) {
            console.log('Seeding initial products...');
            const { products: initialProducts } = await import('@/data/products');
            for (const p of initialProducts) {
                // Map old schema to new schema for seeding
                const images = [p.image, p.applicationImage];
                await sql`
          INSERT INTO products (title, description, images)
          VALUES (${p.title}, ${p.description}, ${JSON.stringify(images)})
        `;
            }
        }
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
}
