#!/bin/bash
# 百度搜索资源平台 - 主动推送脚本
# 使用方法：
# 1. 登录 https://ziyuan.baidu.com/ 获取你的推送 token
# 2. 替换下方 YOUR_TOKEN 为实际 token
# 3. 运行: bash scripts/baidu-push.sh
#
# 文档参考: https://ziyuan.baidu.com/linksubmit/index

SITE="jsontool.cn"
TOKEN="YOUR_TOKEN"  # ← 替换为你的百度站长平台 token

echo "=== 百度主动推送 ==="
echo "站点: $SITE"
echo ""

# 推送所有 URL
curl -H 'Content-Type:text/plain' \
  --data-binary @baidu-urls.txt \
  "http://data.zz.baidu.com/urls?site=https://${SITE}&token=${TOKEN}"

echo ""
echo ""
echo "=== 推送完成 ==="
echo "共推送 $(wc -l < baidu-urls.txt) 个 URL"
echo ""
echo "提示："
echo "- 新站每天配额通常为 10 条"
echo "- 建议每天运行一次，持续 3-5 天"
echo "- 查看推送效果: https://ziyuan.baidu.com/linksubmit/index"
