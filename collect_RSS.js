/**
 * RSS to Gmail - 并发优化版 (2026-02-09)
 *
 * 优化重点：
 * 1. RSS 抓取改为并发 fetchAll，单次运行可扫完整个订阅列表。
 * 2. Gemini 摘要改为并发批量调用，并保留串行降级兜底。
 * 3. 新增时间预算、安全缓冲、锁机制，避免 6 分钟硬超时和重入。
 */

// ==================== 配置区域 ====================
const CONFIG = {
    SCRIPT_VERSION: '2026-02-09.6',
    EMAIL: 'zhaolei28007@gmail.com',
    GEMINI_API_KEY: 'AIzaSyDUzzdav4PZRms3KCwTN-vod1DsOqHd9wM', // 已保留你的 Key
    // 使用更稳定的 Flash 模型版本
    GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',

    SHEET_ID: '',
    SHEET_NAME: 'SentArticles',
    STATE_SHEET_NAME: 'ProcessState',

    HOURS_TO_FETCH: 24,

    // 性能优化参数
    MAX_EMAILS_PER_BATCH: 10,
    EMAIL_DELAY: 100,
    FEED_FETCH_BATCH_SIZE: 20,
    FEED_TIMEOUT: 7000,
    MAX_ITEMS_PER_FEED: 6,
    GEMINI_BATCH_SIZE: 4,
    MAX_PROMPT_CHARS: 2800,
    MIN_SUMMARY_CHARS: 180,
    SENT_URL_LOOKBACK: 2000,

    API_RETRY_COUNT: 2,
    API_TIMEOUT: 12000,
    RETRY_DELAY: 1000,
    GEMINI_MAX_OUTPUT_TOKENS: 1536,

    // Apps Script 单次上限 6 分钟，预留 20 秒做收尾，避免被系统硬中断
    MAX_EXECUTION_TIME: 360000,
    SAFETY_BUFFER_MS: 20000,
    RESERVED_TIME_FOR_GEMINI_MS: 40000,
    RESERVED_TIME_FOR_EMAIL_MS: 20000,

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
    { name: "steipete.me", url: "https://steipete.me/rss.xml" },
    { name: "blog.sshh.io", url: "https://blog.sshh.io/feed" },
];

// ==================== 主函数 ====================

function main() {
    const startTime = new Date().getTime();
    const lock = LockService.getScriptLock();

    if (!lock.tryLock(5000)) {
        console.warn('已有实例在运行，跳过本次触发');
        return;
    }

    console.log('========================================');
    console.log('开始执行 RSS to Gmail（并发优化版）');
    console.log(`脚本版本: ${CONFIG.SCRIPT_VERSION}`);
    console.log(`执行时间: ${new Date().toLocaleString('zh-CN')}`);

    try {
        if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
            console.error('错误: 请先配置 GEMINI_API_KEY');
            return;
        }

        const sheet = getOrCreateSheet();
        const stateSheet = getOrCreateStateSheet();
        const state = getProcessState(stateSheet);
        const sentUrls = getSentUrls(sheet);

        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - CONFIG.HOURS_TO_FETCH);

        const scanResult = fetchFeedsInParallel(RSS_FEEDS, cutoffDate, sentUrls, startTime);
        const allArticles = scanResult.articles;
        allArticles.sort((a, b) => b.pubDate - a.pubDate);

        const articlesToSend = allArticles.slice(0, CONFIG.MAX_EMAILS_PER_BATCH);
        const aiResults = generateAIContentBatch(articlesToSend, startTime);

        let sentCount = 0;
        let skippedCount = 0;
        for (let i = 0; i < articlesToSend.length; i++) {
            if (isTimeoutApproaching(startTime, CONFIG.RESERVED_TIME_FOR_EMAIL_MS / 2)) {
                console.warn('⚠️ 接近超时，停止发送邮件');
                break;
            }

            const article = articlesToSend[i];
            let aiContent = aiResults[i];

            if (!isAiContentComplete(aiContent) && !isTimeoutApproaching(startTime, CONFIG.RESERVED_TIME_FOR_EMAIL_MS / 2)) {
                aiContent = generateAIContent(article);
            }

            if (!isAiContentComplete(aiContent)) {
                skippedCount++;
                console.warn(`⚠️ 摘要未完成，跳过发送: ${article.title}`);
                continue;
            }

            try {
                sendEnhancedArticleEmail(article, aiContent);
                recordSentArticle(sheet, article, aiContent.titleZh);
                sentCount++;
                console.log(`✓ 已发送: ${article.title} | 摘要长度: ${aiContent.summaryZh.length}`);
            } catch (error) {
                console.error(`✗ 发送失败: ${error.message}`);
            }

            if (CONFIG.EMAIL_DELAY > 0) Utilities.sleep(CONFIG.EMAIL_DELAY);
        }

        updateProcessState(stateSheet, {
            currentIndex: 0,
            currentBatch: 1,
            totalBatches: 1,
            lastRunTime: new Date().toISOString(),
            totalArticlesFound: state.totalArticlesFound + allArticles.length,
            totalEmailsSent: state.totalEmailsSent + sentCount,
        });

        const elapsedTime = ((new Date().getTime() - startTime) / 1000).toFixed(2);
        console.log(`完成 | 扫描源: ${scanResult.processedFeeds}/${RSS_FEEDS.length} | 新文章: ${allArticles.length} | 发送: ${sentCount} | 跳过: ${skippedCount} | 耗时: ${elapsedTime}秒`);
        console.log('========================================');
    } finally {
        lock.releaseLock();
    }
}

// ==================== Gemini API (核心修复) ====================

function sanitizeForAPI(text) {
    if (!text) return '';
    text = text.replace(/<[^>]*>/g, ' ');
    return text.trim().substring(0, CONFIG.MAX_PROMPT_CHARS);
}

function buildGeminiPrompt(article) {
    const cleanTitle = sanitizeForAPI(article.title);
    const cleanContent = sanitizeForAPI(article.content);

    return `You are a helpful assistant. 
Please analyze the following blog post and return a JSON object.

Article Title: ${cleanTitle}

Article Content: 
${cleanContent}

**Strict Requirement:**
1. Output MUST be valid JSON format.
2. "titleZh": Translate the title to Chinese.
3. "summaryZh": Write a complete Chinese summary with 5-8 sentences, about 220-320 Chinese characters.
4. summaryZh must end with a full sentence punctuation (。 or ！ or ？).
5. Do NOT use markdown. Just raw JSON.

**JSON Structure:**
{
  "titleZh": "...",
  "summaryZh": "..."
}`;
}

function buildGeminiRequest(article) {
    const prompt = buildGeminiPrompt(article);
    return {
        url: `${CONFIG.GEMINI_API_ENDPOINT}?key=${CONFIG.GEMINI_API_KEY}`,
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        timeout: CONFIG.API_TIMEOUT,
        payload: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: CONFIG.GEMINI_MAX_OUTPUT_TOKENS,
                responseMimeType: 'application/json'
            }
        })
    };
}

function parseAIResult(rawText, article) {
    if (!rawText) return null;

    rawText = rawText.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

    try {
        const parsed = JSON.parse(rawText);
        return {
            titleZh: parsed.titleZh || article.title,
            summaryZh: (parsed.summaryZh || '').replace(/\*\*/g, '')
        };
    } catch (e) {
        return null;
    }
}

function parseGeminiResponse(response, article) {
    if (!response) return null;
    if (response.getResponseCode() !== 200) return null;

    let result;
    try {
        result = JSON.parse(response.getContentText());
    } catch (e) {
        return null;
    }

    const finishReason = result?.candidates?.[0]?.finishReason || '';
    if (finishReason === 'MAX_TOKENS' || finishReason === 'SAFETY') return null;

    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseAIResult(rawText, article);
}

function isAiContentComplete(aiContent) {
    if (!aiContent || !aiContent.summaryZh) return false;

    const summary = aiContent.summaryZh.trim();
    if (!summary) return false;
    if (summary.length < CONFIG.MIN_SUMMARY_CHARS) return false;
    if (summary.indexOf('AI 摘要生成失败') >= 0) return false;
    if ((aiContent.titleZh || '').indexOf('(处理中)') >= 0) return false;

    // 优先要求自然句末；若内容足够长也允许通过，避免误判正常摘要
    if (/[。！？.!?]$/.test(summary)) return true;
    return summary.length >= (CONFIG.MIN_SUMMARY_CHARS + 80);
}

function generateAIContent(article) {
    const request = buildGeminiRequest(article);
    const requestUrl = request.url;
    const requestOptions = Object.assign({}, request);
    delete requestOptions.url;

    for (let attempt = 1; attempt <= CONFIG.API_RETRY_COUNT; attempt++) {
        try {
            const response = UrlFetchApp.fetch(requestUrl, requestOptions);
            const parsed = parseGeminiResponse(response, article);
            if (isAiContentComplete(parsed)) return parsed;
            throw new Error(`API Error: ${response.getResponseCode()}`);
        } catch (error) {
            console.error(`API 尝试 ${attempt} 失败: ${error.message}`);
            if (attempt === CONFIG.API_RETRY_COUNT) {
                return null;
            }
            Utilities.sleep(CONFIG.RETRY_DELAY);
        }
    }
}

function generateAIContentBatch(articles, startTime) {
    const results = new Array(articles.length).fill(null);
    if (articles.length === 0) return results;

    for (let i = 0; i < articles.length; i += CONFIG.GEMINI_BATCH_SIZE) {
        if (isTimeoutApproaching(startTime, CONFIG.RESERVED_TIME_FOR_EMAIL_MS)) {
            console.warn('⚠️ 为邮件发送预留时间，停止 Gemini 调用');
            break;
        }

        const group = articles.slice(i, i + CONFIG.GEMINI_BATCH_SIZE);
        const requests = group.map(buildGeminiRequest);

        let responses = [];
        try {
            responses = UrlFetchApp.fetchAll(requests);
        } catch (error) {
            console.warn(`Gemini 并发请求失败，将降级串行: ${error.message}`);
        }

        for (let j = 0; j < group.length; j++) {
            const article = group[j];
            const idx = i + j;
            const parsed = parseGeminiResponse(responses[j], article);
            if (isAiContentComplete(parsed)) {
                results[idx] = parsed;
                continue;
            }

            if (isTimeoutApproaching(startTime, CONFIG.RESERVED_TIME_FOR_EMAIL_MS)) {
                break;
            }
            const retried = generateAIContent(article);
            if (isAiContentComplete(retried)) {
                results[idx] = retried;
            }
        }
    }

    return results;
}

// ==================== RSS 解析 ====================

function fetchFeed(feed, cutoffDate, sentUrls) {
    const request = buildFeedRequest(feed);
    const requestUrl = request.url;
    const requestOptions = Object.assign({}, request);
    delete requestOptions.url;
    try {
        const response = UrlFetchApp.fetch(requestUrl, requestOptions);
        if (response.getResponseCode() !== 200) return [];
        return parseFeedXml(response.getContentText(), feed, cutoffDate, sentUrls);
    } catch (e) {
        console.warn(`Feed 解析错误 ${feed.name}: ${e.message}`);
        return [];
    }
}

function fetchFeedsInParallel(feeds, cutoffDate, sentUrls, startTime) {
    const articles = [];
    let processedFeeds = 0;

    for (let i = 0; i < feeds.length; i += CONFIG.FEED_FETCH_BATCH_SIZE) {
        if (isTimeoutApproaching(startTime, CONFIG.RESERVED_TIME_FOR_GEMINI_MS)) {
            console.warn('⚠️ 为 Gemini 摘要预留时间，停止继续抓取 RSS');
            break;
        }

        const group = feeds.slice(i, i + CONFIG.FEED_FETCH_BATCH_SIZE);
        const requests = group.map(buildFeedRequest);
        const responses = fetchAllWithIsolation(requests, group.map(function (f) { return f.name; }), 'RSS');

        for (let j = 0; j < group.length; j++) {
            const feed = group[j];
            const response = responses[j];
            processedFeeds++;

            if (!response || response.getResponseCode() !== 200) {
                continue;
            }

            try {
                const parsed = parseFeedXml(response.getContentText(), feed, cutoffDate, sentUrls);
                articles.push(...parsed);
                if (parsed.length > 0) console.log(`✓ ${feed.name}: ${parsed.length} 篇`);
            } catch (e) {
                console.warn(`Feed 解析错误 ${feed.name}: ${e.message}`);
            }
        }
    }

    return { articles: articles, processedFeeds: processedFeeds };
}

function buildFeedRequest(feed) {
    return {
        url: feed.url,
        method: 'get',
        muteHttpExceptions: true,
        followRedirects: true,
        timeout: CONFIG.FEED_TIMEOUT,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RSS2Gmail/1.0)'
        }
    };
}

function fetchAllWithIsolation(requests, labels, contextTag) {
    if (requests.length === 0) return [];

    try {
        return UrlFetchApp.fetchAll(requests);
    } catch (error) {
        console.warn(contextTag + ' 批量请求失败，切换串行: ' + error.message);
        const responses = [];

        for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            const label = labels[i] || req.url || 'unknown';
            const requestUrl = req.url;
            const requestOptions = Object.assign({}, req);
            delete requestOptions.url;

            try {
                responses.push(UrlFetchApp.fetch(requestUrl, requestOptions));
            } catch (singleError) {
                console.warn(contextTag + ' 请求失败 ' + label + ': ' + singleError.message);
                responses.push(null);
            }
        }

        return responses;
    }
}

function parseFeedXml(xml, feed, cutoffDate, sentUrls) {
    try {
        const doc = XmlService.parse(xml);
        const root = doc.getRootElement();

        if (root.getName().toLowerCase() === 'rss') {
            return parseRss(root, feed, cutoffDate, sentUrls);
        }
        return parseAtom(root, feed, cutoffDate, sentUrls);
    } catch (error) {
        if (!isEntityLimitError(error)) throw error;

        const sanitized = sanitizeXmlForParsing(xml);
        try {
            const doc = XmlService.parse(sanitized);
            const root = doc.getRootElement();
            if (root.getName().toLowerCase() === 'rss') {
                return parseRss(root, feed, cutoffDate, sentUrls);
            }
            return parseAtom(root, feed, cutoffDate, sentUrls);
        } catch (retryError) {
            console.warn('XML 解析降级为正则 ' + feed.name + ': ' + retryError.message);
            return parseFeedWithRegexFallback(sanitized, feed, cutoffDate, sentUrls);
        }
    }
}

function isEntityLimitError(error) {
    if (!error || !error.message) return false;
    return error.message.indexOf('JAXP00010003') >= 0
        || error.message.indexOf('length of entity') >= 0;
}

function sanitizeXmlForParsing(xml) {
    if (!xml) return '';
    return xml
        .replace(/<!DOCTYPE[\s\S]*?\]>/gi, '')
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<!ENTITY[\s\S]*?>/gi, '')
        .replace(/&xml;/gi, '')
        .replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, '');
}

function parseFeedWithRegexFallback(xml, feed, cutoffDate, sentUrls) {
    if (/<entry\b/i.test(xml)) return parseAtomByRegex(xml, feed, cutoffDate, sentUrls);
    return parseRssByRegex(xml, feed, cutoffDate, sentUrls);
}

function parseRssByRegex(xml, feed, cutoffDate, sentUrls) {
    const articles = [];
    const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

    for (let i = 0; i < items.length; i++) {
        if (articles.length >= CONFIG.MAX_ITEMS_PER_FEED) break;
        const item = items[i];

        const link = decodeXmlEntities(extractXmlTag(item, 'link'));
        if (!link || sentUrls.has(link)) continue;

        const pubDate = parseDate(decodeXmlEntities(extractXmlTag(item, 'pubDate')));
        if (pubDate < cutoffDate) continue;

        articles.push({
            title: decodeXmlEntities(extractXmlTag(item, 'title')) || 'No Title',
            link: link,
            content: decodeXmlEntities(extractXmlTag(item, 'content:encoded'))
                || decodeXmlEntities(extractXmlTag(item, 'description'))
                || '',
            pubDate: pubDate,
            source: feed.name
        });
    }

    return articles;
}

function parseAtomByRegex(xml, feed, cutoffDate, sentUrls) {
    const articles = [];
    const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];

    for (let i = 0; i < entries.length; i++) {
        if (articles.length >= CONFIG.MAX_ITEMS_PER_FEED) break;
        const entry = entries[i];

        const link = decodeXmlEntities(extractAtomLink(entry));
        if (!link || sentUrls.has(link)) continue;

        const dateStr = decodeXmlEntities(extractXmlTag(entry, 'published'))
            || decodeXmlEntities(extractXmlTag(entry, 'updated'));
        const pubDate = parseDate(dateStr);
        if (pubDate < cutoffDate) continue;

        const content = decodeXmlEntities(extractXmlTag(entry, 'content'))
            || decodeXmlEntities(extractXmlTag(entry, 'summary'))
            || '';

        articles.push({
            title: decodeXmlEntities(extractXmlTag(entry, 'title')) || 'No Title',
            link: link,
            content: content,
            pubDate: pubDate,
            source: feed.name
        });
    }

    return articles;
}

function extractAtomLink(entryXml) {
    const altMatch = entryXml.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i)
        || entryXml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*\/?>/i);
    if (altMatch) return altMatch[1];

    const hrefMatch = entryXml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    return hrefMatch ? hrefMatch[1] : '';
}

function extractXmlTag(xml, tagName) {
    const escapedTag = escapeRegex(tagName);
    const regex = new RegExp('<' + escapedTag + '\\b[^>]*>([\\s\\S]*?)<\\/' + escapedTag + '>', 'i');
    const match = xml.match(regex);
    if (!match || !match[1]) return '';

    return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
        .replace(/<[^>]+>/g, ' ')
        .trim();
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXmlEntities(text) {
    if (!text) return '';
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, function (match, num) {
            const code = parseInt(num, 10);
            return isNaN(code) ? match : String.fromCharCode(code);
        })
        .replace(/&#x([0-9a-fA-F]+);/g, function (match, hex) {
            const code = parseInt(hex, 16);
            return isNaN(code) ? match : String.fromCharCode(code);
        })
        .trim();
}

function parseRss(root, feed, cutoffDate, sentUrls) {
    const articles = [];
    const items = root.getChild('channel')?.getChildren('item') || [];

    for (const item of items) {
        if (articles.length >= CONFIG.MAX_ITEMS_PER_FEED) break;

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
        if (articles.length >= CONFIG.MAX_ITEMS_PER_FEED) break;

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
    const date = dateStr ? new Date(dateStr) : new Date(0);
    return isNaN(date.getTime()) ? new Date(0) : date;
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
        const count = Math.min(lastRow - 1, CONFIG.SENT_URL_LOOKBACK);
        const data = sheet.getRange(Math.max(2, lastRow - count + 1), 1, count, 1).getValues();
        data.forEach(r => urls.add(r[0]));
    }
    return urls;
}

function recordSentArticle(sheet, article, titleZh) {
    sheet.appendRow([article.link, article.title, titleZh, article.source, new Date()]);
}

function isTimeoutApproaching(start, reserveMs) {
    const reserve = reserveMs || 0;
    const hardLimit = CONFIG.MAX_EXECUTION_TIME - CONFIG.SAFETY_BUFFER_MS - reserve;
    return (new Date().getTime() - start) >= hardLimit;
}

function setupTrigger() {
    ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
    ScriptApp.newTrigger('main').timeBased().everyHours(4).create();
    console.log('触发器已重置');
}

// 兼容旧触发器函数名，避免 monitorNewFiles 继续执行旧逻辑
function monitorNewFiles() {
    main();
}

function testOptimizedWorkflow() {
    main();
}
