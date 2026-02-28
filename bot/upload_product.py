import os
import json
import time
import random
import string
from google import genai
from google.genai import types
from supabase import create_client
from PIL import Image
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not all([GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    raise ValueError("Missing required environment variables. Please check your .env file.")

client = genai.Client(api_key=GEMINI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def process_and_upload(image_path: str = None, user_text: str = ""):
    print(f"[{time.strftime('%X')}] 💡 开始处理请求. 文字描述: {user_text}")
    
    raw_img = None
    if image_path and os.path.exists(image_path):
        print(f"[{time.strftime('%X')}] 📸 发现图片附件: {image_path}")
        raw_img = Image.open(image_path)
    else:
        print(f"[{time.strftime('%X')}] ⌨️ 未提供图片，将根据文字由 AI 想象生成图片。")
    
    # --- Step 1: Gemini 生成文案 + 判断图片质量 ---
    
    prompt = f"""你是一位专业电商运营专家。请完成两件事：
1. 根据图片和用户描述，生成产品文案
2. 判断这张图片是否适合直接用于电商展示（白底图、工厂专业图 → 适合；手机随拍、背景杂乱 → 不适合）

返回严格 JSON格式，不要包含 Markdown 标记 (如 ```json)：
{{
  "title": "极简产品标题",
  "description": "产品描述（主要功能+场景应用，150字以内）",
  "tag": "分类标签",
  "image_quality": "good 或 bad"
}}

用户描述：{user_text}"""

    contents = [prompt]
    if raw_img:
        contents.append(raw_img)

    response = client.models.generate_content(
        model='gemini-2.1-flash' if 'flash' not in 'gemini-2.5-flash' else 'gemini-2.5-flash',
        contents=contents
    )
    
    # 尝试解析 JSON，处理可能的 markdown 块
    text = response.text.strip()
    if text.startswith('```json'):
        text = text[7:-3].strip()
    elif text.startswith('```'):
        text = text[3:-3].strip()
        
    try:
        product_data = json.loads(text)
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析失败，Gemini 返回原文：\n{text}")
        raise e
        
    print(f"[{time.strftime('%X')}] ✅ 提取完毕: {product_data['title']} (图片质量评价: {product_data.get('image_quality', 'unknown')})")
    
    # --- Step 2: 重新生成/从头生成精美产品图 ---
    final_image_path = image_path
    
    # 获取图片的 bytes (如果存在)
    image_bytes = None
    mime_type = "image/jpeg"
    raw_part = None
    
    if image_path and os.path.exists(image_path):
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        ext = image_path.split('.')[-1].lower()
        mime_type = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"
        raw_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    # 如果没有原图，或者原图质量不好（当前强制执行测试）
    if True:
        print(f"[{time.strftime('%X')}] 🎨 正在调用 Gemini Image 生成/重绘展示图...")
        
        gen_prompt = (
            f"请生成一张适合电商展示的高清产品图。标题是：{product_data['title']}。说明：{product_data['description']}。"
            "要求：现代极简风格背景，光线柔和自然，产品居中突出，画面干净专业。保持产品本身属性100%符合上述描述。"
        )
        contents = [gen_prompt]
        if raw_part:
            contents.append(raw_part)
            gen_prompt = "根据这张产品原图，" + gen_prompt + "必须严格保持原本产品本身的颜色、材质、角度和结构外观100%不变。"
            contents[0] = gen_prompt # Update prompt if we have a reference image

        try:
            if raw_part:
                # 场景 A: 传统的图生图 (Remix) -> 使用 gemini-2.5-flash-image
                img_response = client.models.generate_content(
                    model="gemini-2.5-flash-image", 
                    contents=contents,
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE", "TEXT"]
                    )
                )
                
                for part in img_response.candidates[0].content.parts:
                    if part.inline_data:
                        final_image_path = "generated_product.jpeg"
                        with open(final_image_path, "wb") as f:
                            f.write(part.inline_data.data)
                        print(f"[{time.strftime('%X')}] ✨ 图片重绘已就绪: {final_image_path}")
                        break
            else:
                # 场景 B: 纯文字生图 -> 使用更专业的 Imagen 4 引擎 (imagen-4.0-generate-001)
                # 备注：Imagen 4 专门用于根据文字生成高精图像
                print(f"[{time.strftime('%X')}] 🎨 正在使用 Imagen 4 引擎从文字创造图像...")
                img_gen_res = client.models.generate_images(
                    model='imagen-4.0-generate-001',
                    prompt=gen_prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        include_rai_reason=True
                    )
                )
                
                if img_gen_res.generated_images:
                    final_image_path = "generated_product.jpeg"
                    with open(final_image_path, "wb") as f:
                        f.write(img_gen_res.generated_images[0].image.image_bytes)
                    print(f"[{time.strftime('%X')}] ✨ Imagen 4 创造图像成功: {final_image_path}")
                else:
                    raise ValueError("Imagen 4 未能生成图像，可能是触发了安全过滤或配额问题。")
        except Exception as e:
            if image_path:
                print(f"[{time.strftime('%X')}] ⚠️ 图片生成失败，回退使用原图。错误细节: {e}")
                final_image_path = image_path
            else:
                print(f"[{time.strftime('%X')}] ❌ 纯文字生成图片失败且无原始图片，无法继续。错误细节: {e}")
                raise e
    else:
         print(f"[{time.strftime('%X')}] 🖼️ 跳过生成，使用当前已有图片。")
    
    # --- Step 3: 上传到 Supabase ---
    if not final_image_path:
        raise ValueError("❌ 未能获取到产品图片。请尝试上传图片，或者检查 Gemini 生图配额是否已满。")

    print(f"[{time.strftime('%X')}] ☁️ 正在上传图片到 Supabase Storage...")
    ext = final_image_path.split('.')[-1]
    if ext.lower() not in ['jpg', 'jpeg', 'png', 'webp', 'jpeg']:
        ext = 'jpg'
        
    file_name = f"{int(time.time())}-{''.join(random.choices(string.ascii_lowercase, k=6))}.{ext}"
    
    with open(final_image_path, "rb") as f:
        # 获取图片的MIME类型以确保正确的ContentType
        mime_type = f"image/{'jpeg' if ext.lower() in ['jpg', 'jpeg'] else ext.lower()}"
        res = supabase.storage.from_("product-images").upload(
            file_name,
            f,
            file_options={"content-type": mime_type}
        )
    
    image_url = supabase.storage.from_("product-images").get_public_url(file_name)
    print(f"[{time.strftime('%X')}] 🔗 图片公开 URL: {image_url}")
    
    # 写入数据库
    print(f"[{time.strftime('%X')}] 💾 正在将产品数据写入数据库表...")
    try:
        supabase.table("products").insert({
            "title": product_data["title"],
            "description": product_data["description"],
            "images": [image_url],
            "tag": product_data.get("tag", "未分类"),
            "fav": 300,
            "views": 3000,
            "sort_order": 0
        }).execute()
        print(f"[{time.strftime('%X')}] 🎉 插入成功！")
    except Exception as e:
         print(f"[{time.strftime('%X')}] ❌ 插入数据库失败: {e}")
         raise e
    
    # 如果生成了临时的新图，考虑在后面删掉，以节省空间。
    
    return product_data["title"]

# 用于本地开发测试
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='手动测试上传产品')
    parser.add_argument('image', help='图片路径')
    parser.add_argument('--text', default='请分析这件商品', help='用户描述文本')
    args = parser.parse_args()
    
    if os.path.exists(args.image):
        title = process_and_upload(args.image, args.text)
        print(f"\n=========================================\n✅ 产品「{title}」本地传图流程跑通！\n=========================================")
    else:
        print(f"❌ 找不到图片文件: {args.image}")
