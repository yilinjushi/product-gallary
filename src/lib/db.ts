import { createClient, type VercelKV } from '@vercel/kv';

function getKVClient(): VercelKV {
    const url =
        process.env.KV_REST_API_URL ??
        process.env.GALLARY_KV_REST_API_URL ??
        process.env.gallary_KV_REST_API_URL ??
        process.env.GALLARY_REDIS_REST_API_URL ??
        process.env.GALLARY_REDIS_URL ??
        process.env.gallary_REDIS_URL;
    const token =
        process.env.KV_REST_API_TOKEN ??
        process.env.GALLARY_KV_REST_API_TOKEN ??
        process.env.gallary_KV_REST_API_TOKEN ??
        process.env.GALLARY_REDIS_REST_API_TOKEN ??
        process.env.GALLARY_REDIS_TOKEN ??
        process.env.gallary_REDIS_TOKEN;

    if (!url || !token) {
        throw new Error(
            '@vercel/kv: Missing required environment variables. ' +
                'Need either (KV_REST_API_URL + KV_REST_API_TOKEN) or (GALLARY_KV_REST_API_URL + GALLARY_KV_REST_API_TOKEN) or (gallary_REDIS_URL + gallary_REDIS_TOKEN).'
        );
    }
    return createClient({ url, token });
}

const kv = getKVClient();

export interface Product {
    id: number;
    title: string;
    description: string;
    images: string[]; // URLs: [main, switch1, switch2, ...]
    created_at?: string;
}

const KV_KEY = 'products';

export async function getProducts(): Promise<Product[]> {
    try {
        await initDb(); // Ensure table exists
        const products = await kv.get<Product[]>(KV_KEY);
        return products || [];
    } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
    }
}

export async function addProduct(product: Omit<Product, 'id'>) {
    try {
        const products = await getProducts();
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;

        const newProduct: Product = {
            ...product,
            id: newId,
            created_at: new Date().toISOString(),
        };

        products.unshift(newProduct); // Add to beginning (DESC order)
        await kv.set(KV_KEY, products);
        return { success: true };
    } catch (error) {
        console.error('Failed to add product:', error);
        return { success: false, error };
    }
}

export async function deleteProduct(id: number) {
    try {
        const products = await getProducts();
        const updatedProducts = products.filter(p => p.id !== id);
        await kv.set(KV_KEY, updatedProducts);
        return { success: true };
    } catch (error) {
        console.error('Failed to delete product:', error);
        return { success: false, error };
    }
}

export async function initDb() {
    try {
        const exists = await kv.exists(KV_KEY);
        if (!exists) {
            console.log('Seeding initial products to KV...');
            const { products: initialProducts } = await import('@/data/products');
            const seededProducts: Product[] = initialProducts.map(p => ({
                id: p.id,
                title: p.title,
                description: p.description,
                images: [p.image, p.applicationImage],
                created_at: new Date().toISOString(),
            }));

            await kv.set(KV_KEY, seededProducts);
        }
    } catch (error) {
        console.error('Failed to initialize KV database:', error);
    }
}
