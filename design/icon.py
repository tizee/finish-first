#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = ["Pillow"]
# ///

import os
from PIL import Image

def generate_extension_icons(source_file):
    # 定义Chrome插件所需的标准尺寸
    sizes = [16, 32, 48, 128]

    # 检查源文件是否存在
    if not os.path.exists(source_file):
        print(f"错误：未找到文件 '{source_file}'。请确保源图片在当前目录下。")
        return

    try:
        # 打开源图片
        with Image.open(source_file) as img:
            # 确保图片是RGBA模式（支持透明背景）
            if img.mode != 'RGBA':
                img = img.convert('RGBA')

            print(f"正在处理源文件: {source_file}")

            # 遍历尺寸并调整大小
            for size in sizes:
                # 使用LANCZOS滤镜进行高质量缩放
                resized_img = img.resize((size, size), Image.Resampling.LANCZOS)

                # 生成文件名，例如 icon16.png
                output_filename = f"icon{size}.png"

                # 保存文件
                resized_img.save(output_filename, format="PNG")
                print(f"已生成: {output_filename} ({size}x{size})")

        print("\n所有图标已生成完毕，可直接用于manifest.json配置。")

    except Exception as e:
        print(f"处理过程中发生错误: {e}")

if __name__ == "__main__":
    # 请确保你的源图片名为 icon_source.png
    generate_extension_icons("finish-first.png")
