// ==UserScript==
// @name         喵搜~豆包
// @namespace    https://github.com/Nekozuka-Hibiki
// @version      1.2.6
// @description  地址栏快捷问豆包：在任何页面输入 “https://www.doubao.com/chat?prompt=你的问题” 后回车，页面打开即自动填充并发送问题。支持通过菜单切换多种预设模式喵~
// @author       Nekozuka-Hibiki
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 判断当前是否为豆包聊天页面
    const isDoubaoPage = location.hostname === 'www.doubao.com' && location.pathname.startsWith('/chat');

    if (isDoubaoPage) {
        // 预设的各种模式提示词
        const PROMPTS = {
            fast: `
请用最简洁的方式直接给出以上问题的答案。
要求：
- 只输出核心结果，一两句话即可，禁止寒暄、解释、建议或任何附加内容。
- 如果是数据，直接给出事实或数字。
- 如有官网、下载地址或可靠来源等，提供有效网络链接。
- 如果不确定或信息不足，直接回复不确定。`,

            search: `
请直接作为搜索引擎回答以上问题。
要求：
- 优先提供最新、准确的事实和关键信息。
- 全面深度搜索、包括外网及各种论坛。
- 先给出简洁核心答案，再用项目符号列出细节。
- 如涉及时事或数据，始终使用最新知识，并标注大致时间或来源类型。
- 如有官网、下载地址或可靠来源等，优先提供有效网络链接，再补充其他内容。
- 避免寒暄、主观评价，如果信息不足，直接说“当前信息有限”。
- 严格基于可靠事实回答，绝不编造未确认的信息。
- 如果存在争议，列出主流观点并注明来源类型。`,

            explain: `
请作为一位极度耐心、把用户当成完全小白的专业解释者，用最通俗易懂的方式，从零开始深入浅出地解释以上问题。
要求：
- 假设用户什么都不懂，先从最基础的概念讲起，一步一步推进到核心原理，不跳跃任何前置知识。
- 每出现一个新概念、专业术语或容易混淆的点，都立刻用生活中的类比、日常例子或形象比喻来解释。
- 多用“就好比……”、“打个比方……”、“想象一下……”这样的表达。
- 用编号步骤、项目符号或分层小标题清晰结构化回答，便于跟随。
- 如果涉及复杂过程，用简单步骤拆解，每一步都说明“这一步在干什么，为什么要这么做”。
- 绝不跳跃假设用户已经懂了某个前提。
- 最后用最白话的大白话总结核心要点，让用户看完就觉得“哦，原来是这样！”。
- 保持客观，不加个人观点或调侃。
- 所有解释必须基于公认事实和逻辑，禁止添加未确认的内容或虚构例子。`,

            academic: `
请以严谨学术风格回答以上问题。
要求：
- 所有事实必须准确，禁止编造。
- 如涉及数据、研究或事件，请注明大致来源类型（如“根据公开报道”“2025年数据”）。
- 如果存在争议或信息过时，明确指出不同观点或局限性。
- 结构：问题重述 → 核心答案 → 证据支持 → 可能的限制。
- 所有陈述必须有事实依据，禁止任何形式的推测或虚构。
- 格式示例（仅示例非固定格式，需按照实际情况严谨输出）：
  1. 问题重述：XXX问题的核心是探究XXX的关联与影响。
  2. 核心答案：XXX。
  3. 证据支持：根据2025年《XXX行业白皮书》，XXX数据验证了该结论；相关学术论文也指出XXX。
  4. 可能的限制：该结论仅适用于XXX场景，受XXX因素影响可能存在偏差。`,

            decision: `
请帮助对比并辅助决策以上问题中的选项。
要求：
- 用项目符号或表格清晰列出每个选项的主要优缺点。
- 关键对比维度包括：价格、性能、适用场景、用户评价、长期影响等（根据问题合理选择）。
- 最后给出明确推荐及客观理由。
- 保持中立，基于事实，不强加个人偏好。
- 所有优缺点和数据必须来自真实来源，禁止虚构评价或数据。
- 如信息不足，明确说明哪个维度数据缺失。`,

            translate: `
请作为专业翻译与写作助手处理以上任务。
要求：
- 如果是翻译：提供准确、自然、流畅的目标语言版本，默认中文↔英文互译。
- 如果是润色或改写：贴合原文语境优化表达，未明确风格时，默认保持原文基调（正式文本更严谨，口语文本更流畅，使其更正式/简洁/生动，按任务所需）。
- 先输出最终版本，再用项目符号简要说明关键修改理由（如有必要）。
- 严格保留原意，不添加多余内容。`
        };

        // 解析 URL 参数，获取用户问题和选择的模式，并清理 URL
        const getFinalContent = () => {
            try {
                const url = new URL(window.location.href);
                const userPrompt = url.searchParams.get("prompt");
                const mode = url.searchParams.get("mode") || "search";

                if (!userPrompt || !userPrompt.trim()) return null;

                const decoded = decodeURIComponent(userPrompt.trim());
                const selectedPrompt = PROMPTS[mode] || PROMPTS.search;

                // 清理 URL 参数，防止刷新后重复执行
                url.searchParams.delete("prompt");
                url.searchParams.delete("mode");
                window.history.replaceState({}, document.title, url.href);

                return {
                    question: decoded,
                    prompt: selectedPrompt.trim()
                };
            } catch (e) {
                return null;
            }
        };

        // 监听 DOM 变化，直到找到可见的输入框元素
        const observeElement = (selectors, callback) => {
            const observer = new MutationObserver(() => {
                const elem = document.querySelector(selectors);
                if (elem && elem.offsetWidth > 0 && elem.offsetHeight > 0) {
                    callback(elem);
                    observer.disconnect();
                }
            });
            observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
        };

        // 安全地设置输入框的值，并触发 input 和 change 事件以通知页面更新
        const setValueAndTrigger = (element, text) => {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            nativeSetter.call(element, text);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        };

        // 主执行逻辑：分段输入问题、换行、提示词，最后发送
        const main = () => {
            const contentObj = getFinalContent();
            if (!contentObj) return;

            observeElement('textarea[placeholder*="消息"], textarea[placeholder*="输入"], textarea[placeholder*="问"], textarea', (inputBox) => {
                inputBox.focus();

                // 第一步：输入用户问题
                setValueAndTrigger(inputBox, contentObj.question);

                // 第二步：延迟后添加一个换行符 (此时显示：问题 + 换行)
                setTimeout(() => {
                    setValueAndTrigger(inputBox, contentObj.question + '\n');

                    // 第三步：再延迟后追加 [另一个换行符 + 提示词]
                    // 关键点：这里使用 \n\n 确保问题和提示词之间有一个明显的空行
                    setTimeout(() => {
                        // 构造最终文本：问题 + 换行 + 换行 + 提示词
                        const finalText = contentObj.question + '\n\n' + contentObj.prompt;
                        setValueAndTrigger(inputBox, finalText);

                        // 第四步：模拟 Enter 键发送消息
                        const enterEvent = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        });

                        // 短暂延迟确保 DOM 更新完成后再发送
                        setTimeout(() => {
                            inputBox.dispatchEvent(enterEvent);
                        }, 100);

                    }, 500 + Math.random() * 500); // 随机等待 0.5-1 秒
                }, 500 + Math.random() * 500); // 随机等待 0.5-1 秒
            });
        };

        if (document.readyState !== 'loading') {
            main();
        } else {
            document.addEventListener('DOMContentLoaded', main);
        }
    }

    // 注册油猴右键菜单，方便快速启动不同模式
    if (typeof GM_registerMenuCommand !== "undefined" && typeof GM_openInTab !== "undefined") {
        const baseUrl = "https://www.doubao.com/chat?prompt=";
        const modes = [
            { name: "🔍 喵搜模式（默认）", mode: "search" },
            { name: "⚡ 一句喵模式", mode: "fast" },
            { name: "📚 笨喵模式", mode: "explain" },
            { name: "🎓 学喵分析", mode: "academic" },
            { name: "⚖️ 喵对比", mode: "decision" },
            { name: "🌐 喵翻译/喵润色", mode: "translate" }
        ];

        modes.forEach(item => {
            GM_registerMenuCommand(item.name, () => {
                const question = prompt(`${item.name}\n喵～你要问什么呢？`, "");
                if (question && question.trim()) {
                    const encoded = encodeURIComponent(question.trim());
                    const url = `${baseUrl}${encoded}&mode=${item.mode}`;
                    GM_openInTab(url, { active: true, insert: true });
                }
            });
        });
    }

})();
