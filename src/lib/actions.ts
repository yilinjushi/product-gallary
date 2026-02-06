'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { addProduct, deleteProduct, getProducts, updateProduct, type Product } from './db';

export async function uploadImage(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) return null;

    try {
        const blob = await put(file.name, file, {
            access: 'public',
        });
        return blob.url;
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}

export type CreateProductResult = { success: true } | { success: false; error: string };

export async function createProductAction(formData: FormData): Promise<CreateProductResult> {
    try {
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const imageFiles = formData.getAll('images') as File[];

        if (!title || !description || imageFiles.length === 0) {
            return { success: false, error: '缺少必填项或未选择图片' };
        }

        const MAX_SIZE = 3 * 1024 * 1024; // 3MB

        const imageUrls: string[] = [];

        for (const file of imageFiles) {
            if (file.size > MAX_SIZE) {
                return { success: false, error: `图片 ${file.name} 超过 3MB 限制` };
            }

            const blob = await put(`product/${Date.now()}-${file.name}`, file, {
                access: 'public'
            });
            imageUrls.push(blob.url);
        }

        const result = await addProduct({
            title,
            description,
            images: imageUrls,
        });

        if (!result.success) {
            const msg = result.error instanceof Error ? result.error.message : '数据库写入失败';
            return { success: false, error: msg };
        }

        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('createProductAction error:', error);
        return { success: false, error: message };
    }
}

export type UpdateProductResult = { success: true } | { success: false; error: string };

export async function updateProductAction(id: number, formData: FormData): Promise<UpdateProductResult> {
    try {
        const title = formData.get('title') as string | null;
        const description = formData.get('description') as string | null;
        const imageFiles = formData.getAll('images') as File[];
        const MAX_SIZE = 3 * 1024 * 1024;

        const updates: { title?: string; description?: string; images?: string[] } = {};
        if (title != null && title.trim()) updates.title = title.trim();
        if (description != null && description.trim()) updates.description = description.trim();

        if (imageFiles.length > 0) {
            const imageUrls: string[] = [];
            for (const file of imageFiles) {
                if (file.size > MAX_SIZE) return { success: false, error: `图片 ${file.name} 超过 3MB 限制` };
                const blob = await put(`product/${Date.now()}-${file.name}`, file, { access: 'public' });
                imageUrls.push(blob.url);
            }
            updates.images = imageUrls;
        }

        if (Object.keys(updates).length === 0) return { success: false, error: '无修改内容' };
        const result = await updateProduct(id, updates);
        if (!result.success) {
            const msg = result.error instanceof Error ? result.error.message : '更新失败';
            return { success: false, error: msg };
        }
        revalidatePath('/');
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('updateProductAction error:', error);
        return { success: false, error: message };
    }
}

export async function deleteProductAction(id: number) {
    await deleteProduct(id);
    revalidatePath('/');
    revalidatePath('/admin');
}

export async function fetchProductsAction(): Promise<Product[]> {
    try {
        return await getProducts();
    } catch (error) {
        console.error('fetchProductsAction error:', error);
        return [];
    }
}

export async function checkPasswordAction(password: string) {
    return password === (process.env.ADMIN_PASSWORD || 'admin123');
}
