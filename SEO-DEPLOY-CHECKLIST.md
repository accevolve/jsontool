# JsonTool.cn SEO 部署与上线清单

## 第一步：部署上线（必须）

- [ ] 确认所有新文件已 commit 并 push 到 GitHub
- [ ] 确认 GitHub Pages 已启用并绑定 jsontool.cn 域名
- [ ] 确认 HTTPS 已启用（GitHub Pages Settings → Enforce HTTPS）
- [ ] 访问 https://jsontool.cn/ 确认页面正常加载
- [ ] 访问 https://jsontool.cn/json-format.html 确认新页面可访问
- [ ] 访问 https://jsontool.cn/json-parse.html 确认新页面可访问
- [ ] 访问 https://jsontool.cn/robots.txt 确认可访问
- [ ] 访问 https://jsontool.cn/sitemap.xml 确认可访问

## 第二步：搜索引擎提交（必须）

### 百度搜索资源平台
1. 登录 https://ziyuan.baidu.com/
2. 添加站点 jsontool.cn（如未添加）
3. 站点管理 → 链接提交 → 手动提交：粘贴 baidu-urls.txt 中的所有 URL
4. 站点管理 → 链接提交 → sitemap：提交 https://jsontool.cn/sitemap.xml
5. 获取推送 token，编辑 scripts/baidu-push.sh 中的 TOKEN，运行脚本

### Google Search Console
1. 登录 https://search.google.com/search-console
2. 添加资源 jsontool.cn
3. 提交 sitemap：https://jsontool.cn/sitemap.xml
4. 使用「网址检查」工具请求编入索引

### Bing Webmaster Tools
1. 登录 https://www.bing.com/webmasters
2. 添加站点
3. 提交 sitemap

## 第三步：外链建设（排名前5的关键杠杆）

准备好的文章在 articles/ 目录下：

- [ ] 掘金发布 `articles/juejin-json-tools.md`（JSON 工具推荐类文章）
- [ ] CSDN 发布 `articles/csdn-json-format.md`（JSON 格式优化技术文章）
- [ ] SegmentFault 发布（可复用以上文章，适当修改标题）
- [ ] V2EX 分享帖（推荐在 #programmer 或 #share 节点）

文章中已嵌入以下链接：
- https://jsontool.cn/ （首页，锚文本「JSON 在线解析」）
- https://jsontool.cn/json-format.html （格式优化页）
- https://jsontool.cn/json-parse.html （解析页）
- https://jsontool.cn/json-validate.html （校验页）
- https://jsontool.cn/courses/ （教程页）

## 第四步：持续监控

- [ ] 每周检查百度搜索「json在线解析」「json格式优化」「json解析」的排名
- [ ] 百度搜索资源平台查看收录量变化
- [ ] 如果 2 周后排名未进入前 20，考虑增加外链数量
- [ ] 如果排名进入前 10 但未进前 5，考虑增加内容页面或博客

## 预期时间线

| 里程碑 | 预期时间 |
|--------|----------|
| 百度收录首页 | 1-3 天 |
| 百度收录全部页面 | 1-2 周 |
| 「json格式优化」进前 20 | 2-4 周 |
| 「json格式优化」进前 5 | 4-8 周 |
| 「json在线解析」进前 20 | 4-8 周 |
| 「json在线解析」进前 5 | 8-16 周（需持续外链建设） |
