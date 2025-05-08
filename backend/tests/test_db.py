# test_db.py
import pymysql

try:
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='1811983038',
        database='tuangou_db'
    )
    print("连接成功!")
    connection.close()
except Exception as e:
    print(f"连接失败: {e}")