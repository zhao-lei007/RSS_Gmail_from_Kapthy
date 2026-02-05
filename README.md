# RSS to Gmail with Gemini Summary

这是一个可以在 Google Drive 的 Google Apps Script 中运行的脚本。它能够定期扫描 RSS 订阅源，利用 Gemini LLM 对新增内容进行总结，并将摘要和原文链接发送到你的邮箱。

## 功能特点

*   **定期扫描**：自动扫描预设的 RSS 列表，识别新发布的 Blog 内容。
*   **智能总结**：调用 Gemini LLM 为每篇新文章生成中文摘要。
*   **邮件推送**：将文章摘要、通过 AI 翻译的标题以及原文链接直接发送到你的 Gmail 邮箱，方便高效阅读。
*   **分批处理**：针对 Apps Script 的运行时间限制（单次 6 分钟），内置分批扫描机制，每次运行扫描 15 个 Blog，循环处理。

## 使用方法

按照以下步骤将脚本添加至你的 Google Drive 并开始运行：

### 1. 创建脚本
进入 [Google Drive](https://drive.google.com/)，点击左上角的 "New" -> "More" -> "Google Apps Script"（如果没有找到，请先关联该应用）。或者直接访问 [script.google.com](https://script.google.com/) 新建项目。

### 2. 拷贝代码
将本项目中的 `collect_RSS.js` 文件的所有代码复制并粘贴到新建的 Apps Script 项目的代码编辑区中（覆盖默认的 `Code.gs` 内容）。

### 3. 配置参数
在脚本顶部的 `CONFIG` 区域填入你的个人信息：
*   **EMAIL**: 填写接收邮件的 Gmail 地址。
*   **GEMINI_API_KEY**: 填写你的 Gemini API Key。

```javascript
const CONFIG = {
    EMAIL: 'your_email@gmail.com',
    GEMINI_API_KEY: 'your_gemini_api_key',
    // ... 其他配置可保持默认
};
```

### 4. 设置触发器
为了让脚本自动定期运行，需要执行一次触发器设置函数：
1.  在编辑器上方的工具栏中，找到函数选择下拉框，选择 `setupTrigger` 函数。
2.  点击 “Run” 按钮。
3.  **注意**：首次运行时，Google 会提示需要授权（Review permissions），请按照提示选择你的账号并允许脚本访问（如果出现 "Google hasn't verified this app"，点击 "Advanced" -> "Go to ... (unsafe)" 继续）。

执行完毕后，脚本会自动创建一个每 4 小时运行一次的时间触发器。

### 5. 运行脚本
*   你可以随时手动选择 `main` 函数并点击 “Run” 来立即触发一次扫描。
*   或者直接等待触发器按照预定时间自动运行。

## 注意事项

*   **运行频率**：脚本默认设定为每 **4 小时** 自动运行一次。
*   **分批机制**：由于 Google Apps Script 单次运行有 6 分钟的时间限制，为了防止超时，脚本每次只会扫描列表中的 **15 个** 目标 Blog。它会自动记录进度，下一次运行时会接着扫描后续的 Blog，确保所有订阅源都能被覆盖。
