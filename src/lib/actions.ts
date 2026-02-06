'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { addProduct, deleteProduct, getProducts } from './db';

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

export async function createProductAction(formData: FormData) {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const imageFiles = formData.getAll('images') as File[];

    if (!title || !description || imageFiles.length === 0) {
        throw new Error('缺少必填项或未选择图片');
    }

    const MAX_SIZE = 3 * 1024 * 1024; // 3MB

    const imageUrls: string[] = [];

    for (const file of imageFiles) {
        if (file.size > MAX_SIZE) {
            throw new Error(`图片 ${file.name} 超过 3MB 限制`);
        }

        const blob = await put(`product/${Date.now()}-${file.name}`, file, {
            access: 'public'
        });
        imageUrls.push(blob.url);
    }

    await addProduct({
        title,
        description,
        images: imageUrls,
    });

    revalidatePath('/');
    revalidatePath('/admin');
}

export async function deleteProductAction(id: number) {
    await deleteProduct(id);
    revalidatePath('/');
    revalidatePath('/admin');
}

export async function fetchProductsAction() {
    return await getProducts();
}
