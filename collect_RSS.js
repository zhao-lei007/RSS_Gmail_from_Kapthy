// ==================== 配置区域 ====================
const CONFIG = {
    EMAIL: '你的 Gmail 地址',
    GEMINI_API_KEY: '你的 API key', // 已保留你的 Key
    // 使用更稳定的 Flash 模型版本
    GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',

    SHEET_ID: '',
    SHEET_NAME: 'SentArticles',
    STATE_SHEET_NAME: 'ProcessState',

    HOURS_TO_FETCH: 24,

    // 性能优化参数
    BATCH_SIZE: 15,
    MAX_EMAILS_PER_BATCH: 10,
    EMAIL_DELAY: 500,

    API_RETRY_COUNT: 1,
    API_TIMEOUT: 20000, // 延长超时时间
    RETRY_DELAY: 1000,

    MAX_EXECUTION_TIME: 300000,

    SUBJECT_PREFIX: '[RSS] ',
};

// RSS 订阅源列表
const RSS_FEEDS = [
    { name: "simonwillison.net", url: "https://simonwillison.net/atom/everything/" },
    { name: "jeffgeerling.com", url: "https://www.jeffgeerling.com/blog.xml" },
    { name: "seangoedecke.com", url: "https://www.seangoedecke.com/rss.xml" },
    { name: "krebsonsecurity.com", url: "https://krebsonsecurity.com/feed/" },
    { name: "daringfireball.net", url: "https://daringfireball.net/feeds/main" },
    { name: "ericmigi.com", url: "https://ericmigi.com/rss.xml" },
    { name: "antirez.com", url: "http://antirez.com/rss" },
    { name: "idiallo.com", url: "https://idiallo.com/feed.rss" },
    { name: "maurycyz.com", url: "https://maurycyz.com/index.xml" },
    { name: "pluralistic.net", url: "https://pluralistic.net/feed/" },
    { name: "shkspr.mobi", url: "https://shkspr.mobi/blog/feed/" },
    { name: "lcamtuf.substack.com", url: "https://lcamtuf.substack.com/feed" },
    { name: "mitchellh.com", url: "https://mitchellh.com/feed.xml" },
    { name: "dynomight.net", url: "https://dynomight.net/feed.xml" },
    { name: "utcc.utoronto.ca", url: "https://utcc.utoronto.ca/~cks/space/blog/?atom" },
    { name: "xeiaso.net", url: "https://xeiaso.net/blog.rss" },
    { name: "devblogs.microsoft.com/oldnewthing", url: "https://devblogs.microsoft.com/oldnewthing/feed" },
    { name: "righto.com", url: "https://www.righto.com/feeds/posts/default" },
    { name: "lucumr.pocoo.org", url: "https://lucumr.pocoo.org/feed.atom" },
    { name: "skyfall.dev", url: "https://skyfall.dev/rss.xml" },
    { name: "garymarcus.substack.com", url: "https://garymarcus.substack.com/feed" },
    { name: "rachelbythebay.com", url: "https://rachelbythebay.com/w/atom.xml" },
    { name: "overreacted.io", url: "https://overreacted.io/rss.xml" },
    { name: "timsh.org", url: "https://timsh.org/rss/" },
    { name: "johndcook.com", url: "https://www.johndcook.com/blog/feed/" },
    { name: "gilesthomas.com", url: "https://gilesthomas.com/feed/rss.xml" },
    { name: "matklad.github.io", url: "https://matklad.github.io/feed.xml" },
    { name: "derekthompson.org", url: "https://www.theatlantic.com/feed/author/derek-thompson/" },
    { name: "evanhahn.com", url: "https://evanhahn.com/feed.xml" },
    { name: "terriblesoftware.org", url: "https://terriblesoftware.org/feed/" },
    { name: "rakhim.exotext.com", url: "https://rakhim.exotext.com/rss.xml" },
    { name: "joanwestenberg.com", url: "https://joanwestenberg.com/rss" },
    { name: "xania.org", url: "https://xania.org/feed" },
    { name: "micahflee.com", url: "https://micahflee.com/feed/" },
    { name: "nesbitt.io", url: "https://nesbitt.io/feed.xml" },
    { name: "construction-physics.com", url: "https://www.construction-physics.com/feed" },
    { name: "tedium.co", url: "https://feed.tedium.co/" },
    { name: "susam.net", url: "https://susam.net/feed.xml" },
    { name: "entropicthoughts.com", url: "https://entropicthoughts.com/feed.xml" },
    { name: "buttondown.com/hillelwayne", url: "https://buttondown.com/hillelwayne/rss" },
    { name: "dwarkesh.com", url: "https://www.dwarkeshpatel.com/feed" },
    { name: "borretti.me", url: "https://borretti.me/feed.xml" },
    { name: "wheresyoured.at", url: "https://www.wheresyoured.at/rss/" },
    { name: "jayd.ml", url: "https://jayd.ml/feed.xml" },
    { name: "minimaxir.com", url: "https://minimaxir.com/index.xml" },
    { name: "geohot.github.io", url: "https://geohot.github.io/blog/feed.xml" },
    { name: "paulgraham.com", url: "http://www.aaronsw.com/2002/feeds/pgessays.rss" },
    { name: "filfre.net", url: "https://www.filfre.net/feed/" },
    { name: "blog.jim-nielsen.com", url: "https://blog.jim-nielsen.com/feed.xml" },
    { name: "dfarq.homeip.net", url: "https://dfarq.homeip.net/feed/" },
    { name: "jyn.dev", url: "https://jyn.dev/atom.xml" },
    { name: "geoffreylitt.com", url: "https://www.geoffreylitt.com/feed.xml" },
    { name: "downtowndougbrown.com", url: "https://www.downtowndougbrown.com/feed/" },
    { name: "brutecat.com", url: "https://brutecat.com/rss.xml" },
    { name: "eli.thegreenplace.net", url: "https://eli.thegreenplace.net/feeds/all.atom.xml" },
    { name: "abortretry.fail", url: "https://www.abortretry.fail/feed" },
    { name: "fabiensanglard.net", url: "https://fabiensanglard.net/rss.xml" },
    { name: "oldvcr.blogspot.com", url: "https://oldvcr.blogspot.com/feeds/posts/default" },
    { name: "bogdanthegeek.github.io", url: "https://bogdanthegeek.github.io/blog/index.xml" },
    { name: "hugotunius.se", url: "https://hugotunius.se/feed.xml" },
    { name: "gwern.net", url: "https://gwern.substack.com/feed" },
    { name: "berthub.eu", url: "https://berthub.eu/articles/index.xml" },
    { name: "chadnauseam.com", url: "https://chadnauseam.com/rss.xml" },
    { name: "simone.org", url: "https://simone.org/feed/" },
    { name: "it-notes.dragas.net", url: "https://it-notes.dragas.net/feed/" },
    { name: "beej.us", url: "https://beej.us/blog/rss.xml" },
    { name: "hey.paris", url: "https://hey.paris/index.xml" },
    { name: "danielwirtz.com", url: "https://danielwirtz.com/rss.xml" },
    { name: "matduggan.com", url: "https://matduggan.com/rss/" },
    { name: "refactoringenglish.com", url: "https://refactoringenglish.com/index.xml" },
    { name: "worksonmymachine.substack.com", url: "https://worksonmymachine.substack.com/feed" },
    { name: "philiplaine.com", url: "https://philiplaine.com/index.xml" },
    { name: "steveblank.com", url: "https://steveblank.com/feed/" },
    { name: "bernsteinbear.com", url: "https://bernsteinbear.com/feed.xml" },
    { name: "danieldelaney.net", url: "https://danieldelaney.net/feed" },
    { name: "troyhunt.com", url: "https://www.troyhunt.com/rss/" },
    { name: "herman.bearblog.dev", url: "https://herman.bearblog.dev/feed/" },
    { name: "tomrenner.com", url: "https://tomrenner.com/index.xml" },
    { name: "blog.pixelmelt.dev", url: "https://blog.pixelmelt.dev/rss/" },
    { name: "martinalderson.com", url: "https://martinalderson.com/feed.xml" },
    { name: "danielchasehooper.com", url: "https://danielchasehooper.com/feed.xml" },
    { name: "chiark.greenend.org.uk", url: "https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/feed.xml" },
    { name: "grantslatton.com", url: "https://grantslatton.com/rss.xml" },
    { name: "experimental-history.com", url: "https://www.experimental-history.com/feed" },
    { name: "anildash.com", url: "https://anildash.com/feed.xml" },
    { name: "aresluna.org", url: "https://aresluna.org/main.rss" },
    { name: "michael.stapelberg.ch", url: "https://michael.stapelberg.ch/feed.xml" },
    { name: "miguelgrinberg.com", url: "https://blog.miguelgrinberg.com/feed" },
    { name: "keygen.sh", url: "https://keygen.sh/blog/feed.xml" },
    { name: "mjg59.dreamwidth.org", url: "https://mjg59.dreamwidth.org/data/rss" },
    { name: "computer.rip", url: "https://computer.rip/rss.xml" },
    { name: "tedunangst.com", url: "https://www.tedunangst.com/flak/rss" },
];

// ==================== 主函数 ====================

function main() {
    const startTime = new Date().getTime();
    console.log('========================================');
    console.log('开始执行 RSS to Gmail（修复版 V2）');
    console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}`);

    if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
        console.error('错误: 请先配置 GEMINI_API_KEY');
        return;
    }

    const sheet = getOrCreateSheet();
    const stateSheet = getOrCreateStateSheet();
    const sentUrls = getSentUrls(sheet);
    const state = getProcessState(stateSheet);

    console.log(`当前批次: ${state.currentBatch}/${state.totalBatches} (起始索引: ${state.currentIndex})`);

    const startIdx = state.currentIndex;
    const endIdx = Math.min(startIdx + CONFIG.BATCH_SIZE, RSS_FEEDS.length);
    const feedsToProcess = RSS_FEEDS.slice(startIdx, endIdx);

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - CONFIG.HOURS_TO_FETCH);

    const allArticles = [];

    for (const feed of feedsToProcess) {
        if (isTimeoutApproaching(startTime)) {
            console.log('⚠️ 接近超时限制，提前停止');
            break;
        }
        try {
            const articles = fetchFeed(feed, cutoffDate, sentUrls);
            allArticles.push(...articles);
            if (articles.length > 0) console.log(`✓ ${feed.name}: ${articles.length} 篇`);
        } catch (error) {
            console.error(`✗ ${feed.name}: ${error.message}`);
        }
    }

    allArticles.sort((a, b) => b.pubDate - a.pubDate);
    const articlesToSend = allArticles.slice(0, CONFIG.MAX_EMAILS_PER_BATCH);

    let sentCount = 0;

    for (const article of articlesToSend) {
        if (isTimeoutApproaching(startTime)) break;

        try {
            const aiContent = generateAIContent(article);
            if (aiContent) {
                sendEnhancedArticleEmail(article, aiContent);
                recordSentArticle(sheet, article, aiContent.titleZh);
                sentCount++;
                console.log(`✓ 已发送: ${article.title}`);
            }
            if (CONFIG.EMAIL_DELAY > 0) Utilities.sleep(CONFIG.EMAIL_DELAY);
        } catch (error) {
            console.error(`✗ 发送失败: ${error.message}`);
        }
    }

    const isComplete = endIdx >= RSS_FEEDS.length;
    updateProcessState(stateSheet, {
        currentIndex: isComplete ? 0 : endIdx,
        currentBatch: isComplete ? 1 : state.currentBatch + 1,
        lastRunTime: new Date().toISOString(),
        totalArticlesFound: state.totalArticlesFound + allArticles.length,
        totalEmailsSent: state.totalEmailsSent + sentCount,
    });

    const elapsedTime = ((new Date().getTime() - startTime) / 1000).toFixed(2);
    console.log(`本批次完成 | 耗时: ${elapsedTime}秒 | 发送: ${sentCount}`);
    console.log('========================================');
}

// ==================== Gemini API (核心修复) ====================

function sanitizeForAPI(text) {
    if (!text) return '';
    text = text.replace(/<[^>]*>/g, ' ');
    return text.trim().substring(0, 5000);
}

function generateAIContent(article) {
    const cleanTitle = sanitizeForAPI(article.title);
    const cleanContent = sanitizeForAPI(article.content);

    const prompt = `You are a helpful assistant. 
Please analyze the following blog post and return a JSON object.

Article Title: ${cleanTitle}

Article Content: 
${cleanContent}

**Strict Requirement:**
1. Output MUST be valid JSON format.
2. "titleZh": Translate the title to Chinese.
3. "summaryZh": Write a detailed summary (200-300 words) in Chinese.
4. Do NOT use markdown. Just raw JSON.

**JSON Structure:**
{
  "titleZh": "...",
  "summaryZh": "..."
}`;

    for (let attempt = 1; attempt <= CONFIG.API_RETRY_COUNT; attempt++) {
        try {
            const response = UrlFetchApp.fetch(
                `${CONFIG.GEMINI_API_ENDPOINT}?key=${CONFIG.GEMINI_API_KEY}`,
                {
                    method: 'post',
                    contentType: 'application/json',
                    muteHttpExceptions: true,
                    timeout: CONFIG.API_TIMEOUT,
                    payload: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 8192, // ⚠️ 增加到 8k，防止生成中途截断
                            responseMimeType: "application/json"
                        }
                    })
                }
            );

            if (response.getResponseCode() !== 200) throw new Error(`API Error: ${response.getResponseCode()}`);

            const result = JSON.parse(response.getContentText());
            let rawText = result.candidates[0].content.parts[0].text.trim();

            // 清理 Markdown
            rawText = rawText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

            try {
                // 尝试标准解析
                const parsed = JSON.parse(rawText);
                return {
                    titleZh: parsed.titleZh || article.title,
                    summaryZh: (parsed.summaryZh || '').replace(/\*\*/g, '')
                };
            } catch (e) {
                console.warn('JSON Parse 失败，尝试正则提取...');

                // ⚠️ 正则强制提取：就算 JSON 烂了也能扣出内容
                // 匹配 "summaryZh": "内容... 直到遇到引号或结束
                const titleMatch = rawText.match(/"titleZh"\s*:\s*"([^"]*?)"/);
                const summaryMatch = rawText.match(/"summaryZh"\s*:\s*"([\s\S]*?)(?:"\s*}|$)/);

                let extractedTitle = titleMatch ? titleMatch[1] : null;
                let extractedSummary = summaryMatch ? summaryMatch[1] : null;

                if (extractedSummary) {
                    return {
                        titleZh: extractedTitle || article.title,
                        summaryZh: extractedSummary // 提取到的部分内容
                    };
                }

                // 最后的防线：如果连正则都匹配不到，说明彻底乱了
                // 手动清理 JSON 符号，只留文字，防止显示代码
                const cleanedText = rawText
                    .replace(/["{}]/g, '')
                    .replace(/titleZh:/g, '\n【标题】：')
                    .replace(/summaryZh:/g, '\n【摘要】：')
                    .trim();

                return {
                    titleZh: `${article.title} (处理中)`,
                    summaryZh: cleanedText
                };
            }

        } catch (error) {
            console.error(`API 尝试 ${attempt} 失败: ${error.message}`);
            if (attempt === CONFIG.API_RETRY_COUNT) {
                return {
                    titleZh: article.title,
                    summaryZh: 'AI 摘要生成失败，请直接阅读原文。',
                };
            }
            Utilities.sleep(CONFIG.RETRY_DELAY);
        }
    }
}

// ==================== RSS 解析 ====================

function fetchFeed(feed, cutoffDate, sentUrls) {
    try {
        const response = UrlFetchApp.fetch(feed.url, {
            muteHttpExceptions: true,
            followRedirects: true,
            timeout: 8000,
        });
        if (response.getResponseCode() !== 200) return [];

        const xml = response.getContentText();
        const doc = XmlService.parse(xml);
        const root = doc.getRootElement();

        if (root.getName().toLowerCase() === 'rss') {
            return parseRss(root, feed, cutoffDate, sentUrls);
        } else {
            return parseAtom(root, feed, cutoffDate, sentUrls);
        }
    } catch (e) {
        console.warn(`Feed 解析错误 ${feed.name}: ${e.message}`);
        return [];
    }
}

function parseRss(root, feed, cutoffDate, sentUrls) {
    const articles = [];
    const items = root.getChild('channel')?.getChildren('item') || [];

    for (const item of items) {
        const link = getChildText(item, 'link');
        if (!link || sentUrls.has(link)) continue;

        const pubDate = parseDate(getChildText(item, 'pubDate'));
        if (pubDate < cutoffDate) continue;

        articles.push({
            title: getChildText(item, 'title') || 'No Title',
            link: link,
            content: getChildText(item, 'content:encoded') || getChildText(item, 'description') || '',
            pubDate: pubDate,
            source: feed.name
        });
    }
    return articles;
}

function parseAtom(root, feed, cutoffDate, sentUrls) {
    const articles = [];
    const ns = root.getNamespace();
    const entries = root.getChildren('entry', ns);

    for (const entry of entries) {
        let link = '';
        const linkEls = entry.getChildren('link', ns);
        for (const l of linkEls) {
            if (!l.getAttribute('rel') || l.getAttribute('rel').getValue() === 'alternate') {
                link = l.getAttribute('href')?.getValue();
                break;
            }
        }

        if (!link || sentUrls.has(link)) continue;

        const dateStr = entry.getChild('published', ns)?.getText() || entry.getChild('updated', ns)?.getText();
        const pubDate = parseDate(dateStr);
        if (pubDate < cutoffDate) continue;

        let content = entry.getChild('content', ns)?.getText() || entry.getChild('summary', ns)?.getText() || '';

        articles.push({
            title: entry.getChild('title', ns)?.getText() || 'No Title',
            link: link,
            content: content,
            pubDate: pubDate,
            source: feed.name
        });
    }
    return articles;
}

function getChildText(element, name) {
    if (name.includes(':')) {
        const parts = name.split(':');
        const children = element.getChildren();
        for (const c of children) {
            if (c.getName() === parts[1]) return c.getText();
        }
        return '';
    }
    return element.getChild(name)?.getText() || '';
}

function parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : new Date(0);
}

// ==================== 邮件发送 ====================

function cleanText(text) {
    if (!text) return '';
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim();
}

function sendEnhancedArticleEmail(article, aiContent) {
    const cleanTitle = cleanText(article.title);
    const subject = CONFIG.SUBJECT_PREFIX + cleanTitle;

    const htmlBody = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
      
      <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="color: #6b7280; font-size: 13px; margin-bottom: 8px;">
          ${article.source} · ${article.pubDate.toLocaleDateString('zh-CN')}
        </div>
        <h2 style="margin: 0 0 12px 0; font-size: 20px; line-height: 1.4; color: #111827;">
          <a href="${article.link}" style="color: inherit; text-decoration: none;">${cleanTitle}</a>
        </h2>
        <h3 style="margin: 0; font-size: 16px; font-weight: 500; color: #059669; line-height: 1.5;">
          ${aiContent.titleZh}
        </h3>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="font-weight: 600; color: #166534; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
          AI 智能摘要
        </div>
        <div style="color: #14532d; font-size: 15px; line-height: 1.7; white-space: pre-wrap; word-break: break-word;">
          ${aiContent.summaryZh}
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <div style="font-weight: 600; color: #4b5563; font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
          原文片段
        </div>
        <div style="color: #6b7280; font-size: 14px; line-height: 1.6; max-height: 300px; overflow-y: hidden; position: relative;">
          ${sanitizeForAPI(article.content).substring(0, 800)}...
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${article.link}" style="display: inline-block; background-color: #2563eb; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 500; font-size: 15px;">
          阅读完整原文
        </a>
      </div>
    </div>
  `;

    GmailApp.sendEmail(CONFIG.EMAIL, subject, aiContent.summaryZh, { htmlBody: htmlBody, name: 'RSS Digest' });
}

// ==================== 辅助功能 ====================

function getOrCreateSpreadsheet() {
    const files = DriveApp.getFilesByName('RSS to Gmail - 发送记录');
    if (files.hasNext()) return SpreadsheetApp.open(files.next());
    return SpreadsheetApp.create('RSS to Gmail - 发送记录');
}

function getOrCreateSheet() {
    const ss = getOrCreateSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEET_NAME);
        sheet.appendRow(['URL', 'Title', 'ZH Title', 'Source', 'Date']);
    }
    return sheet;
}

function getOrCreateStateSheet() {
    const ss = getOrCreateSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.STATE_SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(CONFIG.STATE_SHEET_NAME);
        sheet.getRange(1, 1, 6, 2).setValues([
            ['属性', '值'], ['currentIndex', 0], ['currentBatch', 1],
            ['totalBatches', 0], ['totalArticles', 0], ['totalSent', 0]
        ]);
    }
    return sheet;
}

function getProcessState(sheet) {
    const data = sheet.getRange(2, 2, 6, 1).getValues();
    return {
        currentIndex: parseInt(data[0][0]) || 0,
        currentBatch: parseInt(data[1][0]) || 1,
        totalBatches: parseInt(data[2][0]) || 0,
        totalArticlesFound: parseInt(data[3][0]) || 0,
        totalEmailsSent: parseInt(data[4][0]) || 0
    };
}

function updateProcessState(sheet, state) {
    sheet.getRange(2, 2, 6, 1).setValues([
        [state.currentIndex], [state.currentBatch], [state.totalBatches],
        [state.totalArticlesFound], [state.totalEmailsSent], [state.lastRunTime]
    ]);
}

function getSentUrls(sheet) {
    const urls = new Set();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const data = sheet.getRange(Math.max(2, lastRow - 500), 1, Math.min(lastRow - 1, 500), 1).getValues();
        data.forEach(r => urls.add(r[0]));
    }
    return urls;
}

function recordSentArticle(sheet, article, titleZh) {
    sheet.appendRow([article.link, article.title, titleZh, article.source, new Date()]);
}

function isTimeoutApproaching(start) {
    return (new Date().getTime() - start) > CONFIG.MAX_EXECUTION_TIME;
}

function setupTrigger() {
    ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
    ScriptApp.newTrigger('main').timeBased().everyHours(4).create();
    console.log('触发器已重置');
}

function testOptimizedWorkflow() {
    main();
}