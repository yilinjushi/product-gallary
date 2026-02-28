import os
import asyncio
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

# 导入刚才写的核心逻辑（在同一个目录下）
from upload_product import process_and_upload

# 配置日志以便在控制台查看Bot运行状态
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not TELEGRAM_TOKEN:
    raise ValueError("Missing TELEGRAM_BOT_TOKEN in .env. Please configure your .env file.")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # 如果用户既没发图也没发文，忽略
    if not update.message.photo and not update.message.text:
        return

    temp_image_path = None
    try:
        if update.message.photo:
            # 模式 A: 有图模式（美化/重绘）
            photo_file = await update.message.photo[-1].get_file()
            temp_image_path = f"temp_{update.message.message_id}.jpg"
            await photo_file.download_to_drive(temp_image_path)
            user_text = update.message.caption or "请根据图片分析"
            await update.message.reply_text("🔄 收到图片，正在进行 AI 美化及文案润色...")
        else:
            # 模式 B: 纯文字模式（从头生成）
            user_text = update.message.text
            await update.message.reply_text("🔄 收到指令，正在为您从头‘想象’并生成产品图及文案...")

        # 执行上传逻辑 (在异步应用中，将长耗时阻塞的API调用封装在独立的线程运行)
        title = await asyncio.to_thread(process_and_upload, temp_image_path, user_text)
        
        await update.message.reply_text(f"✅ 上架成功！🎉\n\n产品「{title}」已自动发布。您可以前往网站查看效果。")
        
    except Exception as e:
        logging.error(f"处理过程中发生错误: {e}")
        error_msg = str(e)
        await update.message.reply_text(f"❌ 抱歉，处理失败：\n{error_msg}")
    finally:
        # 清理临时下载的原始文件
        if temp_image_path and os.path.exists(temp_image_path):
            os.remove(temp_image_path)
            
        # 若需要清理生成的 `generated_product.jpeg` 也可在此处理
        if os.path.exists("generated_product.jpeg"):
            os.remove("generated_product.jpeg")

if __name__ == '__main__':
    print("🤖 Telegram 机器人引导模块启动中...")
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    
    # 监听：拦截任何带有照片的消息，并且也会听文本（方便回复说明指引）
    app.add_handler(MessageHandler(filters.PHOTO | filters.TEXT, handle_message))
    
    print("✅ 机器人已成功上线！现在可以在 Telegram 里向它发送带配图的商品卡片了！")
    app.run_polling()
