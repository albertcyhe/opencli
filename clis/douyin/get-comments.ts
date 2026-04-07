/**
 * Douyin get-comments — fetch video comments via internal API.
 *
 * Uses the existing fetchDouyinComments() infrastructure with browserFetch
 * which handles a_bogus signing automatically.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import { fetchDouyinComments } from './_shared/public-api.js';

function parseAwemeId(input: string): string {
  // https://www.douyin.com/video/7084282190913326382
  const match = input.match(/\/video\/(\d+)/);
  if (match) return match[1];
  // bare ID
  if (/^\d+$/.test(input.trim())) return input.trim();
  throw new CommandExecutionError(`Cannot parse aweme_id from: ${input}. Expected a Douyin video URL or numeric ID.`);
}

cli({
  site: 'douyin',
  name: 'get-comments',
  description: '获取抖音视频评论',
  domain: 'www.douyin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'url', required: true, positional: true, help: 'Douyin video URL or aweme_id' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of comments (max 50)' },
  ],
  columns: ['rank', 'comment_id', 'author', 'text', 'likes', 'replies_count', 'time'],
  func: async (page, kwargs) => {
    const awemeId = parseAwemeId(kwargs.url);
    const limit = Math.min(Number(kwargs.limit) || 20, 50);

    await page.goto('https://www.douyin.com');
    await page.wait(3);

    const comments = await fetchDouyinComments(page, awemeId, limit);
    if (comments.length === 0) throw new EmptyResultError('douyin/get-comments', 'No comments found');

    return comments.map((c, i) => ({
      rank: i + 1,
      comment_id: c.cid || `dy-comment-${i + 1}`,
      author: c.nickname,
      text: c.text.substring(0, 300),
      likes: c.digg_count,
      replies_count: c.reply_comment_total ?? 0,
      time: c.create_time ? new Date(c.create_time * 1000).toISOString().slice(0, 19).replace('T', ' ') : '',
    }));
  },
});
