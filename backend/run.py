import uvicorn
import os
import sys
import time

# 确保当前目录是backend
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

# 添加当前目录到系统路径
sys.path.append(backend_dir)

if __name__ == "__main__":
    print("正在启动社区团购API服务...")
    print(f"当前工作目录: {os.getcwd()}")
    
    try:
        # 运行FastAPI应用
        uvicorn.run(
            "app.main:app",  # 应用的路径，格式为"模块:应用实例"
            host="0.0.0.0",  # 监听所有网络接口
            port=8000,       # 端口
            reload=True      # 热重载，代码变更时自动重启
        )
    except ImportError as e:
        print(f"启动失败，导入错误: {e}")
        print("\n可能需要检查以下几点:")
        print("1. 确保所有依赖已安装: pip install -r requirements.txt")
        print("2. 检查文件路径是否正确")
        print("3. 检查引用的模块和函数是否存在")
        time.sleep(10)  # 给用户时间查看错误信息