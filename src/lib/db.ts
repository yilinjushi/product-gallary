import { createClient, type RedisClientType } from 'redis';

export const KV_NOT_CONFIGURED_MESSAGE =
    '数据库未配置：请设置 REDIS_URL 环境变量（本地可执行 vercel env pull .env.development.local）。';

/** 与 Next.js App Router / Vercel 文档一致：createClient({ url }).connect() */
function getRedisUrl(): string | null {
    return (
        process.env.REDIS_URL ??
        process.env.KV_URL ??
        process.env.GALLARY_REDIS_URL ??
        process.env.gallary_REDIS_URL ??
        null
    );
}

let _redis: RedisClientType | null = null;
let _redisConnectPromise: Promise<RedisClientType | null> | null = null;

async function getRedis(): Promise<RedisClientType | null> {
    const url = getRedisUrl();
    if (!url) return null;

    if (_redis?.isOpen) return _redis;
    if (_redisConnectPromise) return _redisConnectPromise;

    _redisConnectPromise = (async (): Promise<RedisClientType | null> => {
        try {
            const redis = await createClient({ url }).connect() as RedisClientType;
            redis.on('error', (err) => console.error('Redis Client Error', err));
            _redis = redis;
            return redis;
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            _redisConnectPromise = null;
            return null;
        }
    })();

    return _redisConnectPromise;
}

export interface Product {
    id: number;
    title: string;
    description: string;
    images: string[];
    created_at?: string;
}

const KV_KEY = 'products';

export async function getProducts(): Promise<Product[]> {
    const client = await getRedis();
    if (!client) return [];
    try {
        await initDb();
        const raw = await client.get(KV_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Product[];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to fetch products:', error);
        return [];
    }
}

export async function addProduct(product: Omit<Product, 'id'>) {
    const client = await getRedis();
    if (!client) return { success: false, error: new Error(KV_NOT_CONFIGURED_MESSAGE) };
    try {
        const products = await getProducts();
        const newId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
        const newProduct: Product = {
            ...product,
            id: newId,
            created_at: new Date().toISOString(),
        };
        products.unshift(newProduct);
        await client.set(KV_KEY, JSON.stringify(products));
        return { success: true };
    } catch (error) {
        console.error('Failed to add product:', error);
        return { success: false, error };
    }
}

export async function updateProduct(id: number, data: { title?: string; description?: string; images?: string[] }) {
    const client = await getRedis();
    if (!client) return { success: false, error: new Error(KV_NOT_CONFIGURED_MESSAGE) };
    try {
        const products = await getProducts();
        const index = products.findIndex((p) => p.id === id);
        if (index === -1) return { success: false, error: new Error('产品不存在') };
        products[index] = {
            ...products[index],
            ...(data.title != null && { title: data.title }),
            ...(data.description != null && { description: data.description }),
            ...(data.images != null && data.images.length > 0 && { images: data.images }),
        };
        await client.set(KV_KEY, JSON.stringify(products));
        return { success: true };
    } catch (error) {
        console.error('Failed to update product:', error);
        return { success: false, error };
    }
}

export async function deleteProduct(id: number) {
    const client = await getRedis();
    if (!client) return { success: false, error: new Error(KV_NOT_CONFIGURED_MESSAGE) };
    try {
        const products = await getProducts();
        const updatedProducts = products.filter((p) => p.id !== id);
        await client.set(KV_KEY, JSON.stringify(updatedProducts));
        return { success: true };
    } catch (error) {
        console.error('Failed to delete product:', error);
        return { success: false, error };
    }
}

export async function initDb() {
    const client = await getRedis();
    if (!client) return;
    try {
        const raw = await client.get(KV_KEY);
        if (raw != null) return;
        console.log('Seeding initial products to Redis...');
        const { products: initialProducts } = await import('@/data/products');
        const seededProducts: Product[] = initialProducts.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            images: [p.image, p.applicationImage],
            created_at: new Date().toISOString(),
        }));
        await client.set(KV_KEY, JSON.stringify(seededProducts));
    } catch (error) {
        console.error('Failed to initialize Redis database:', error);
    }
}
