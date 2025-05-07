import pymysql

# 连接到MySQL
conn = pymysql.connect(
    host='localhost',
    user='root',
    password='1811983038'
)

try:
    with conn.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS tuangou_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print("数据库创建成功")
finally:
    conn.close()