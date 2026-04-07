/**
 * YouTube reply-comment — reply to a specific comment on a video.
 *
 * Uses InnerTube create_comment_reply endpoint. The comment-id comes
 * from the `youtube comments` command output.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, CommandExecutionError } from '@jackwener/opencli/errors';
import { parseVideoId } from './utils.js';

cli({
  site: 'youtube',
  name: 'reply-comment',
  description: 'Reply to a specific YouTube comment',
  domain: 'www.youtube.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'comment-id', required: true, positional: true, help: 'Comment ID from youtube comments output' },
    { name: 'text', required: true, positional: true, help: 'Reply text' },
    { name: 'url', required: true, help: 'Video URL (needed for context)' },
  ],
  columns: ['status', 'message', 'comment_id', 'text'],
  func: async (page, kwargs) => {
    const videoId = parseVideoId(kwargs.url);
    const commentId = kwargs['comment-id'];
    const text = kwargs.text;

    await page.goto(`https://www.youtube.com/watch?v=${videoId}`);
    await page.wait(3);

    const result = await page.evaluate(`(async () => {
      try {
        const videoId = ${JSON.stringify(videoId)};
        const commentId = ${JSON.stringify(commentId)};
        const replyText = ${JSON.stringify(text)};
        const cfg = window.ytcfg?.data_ || {};
        const apiKey = cfg.INNERTUBE_API_KEY;
        const context = cfg.INNERTUBE_CONTEXT;
        if (!apiKey || !context) return { ok: false, message: 'YouTube config not found — are you logged in?' };

        // Step 1: Get comment continuation token
        let continuationToken = null;
        if (window.ytInitialData) {
          const results = window.ytInitialData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
          const commentSection = results.find(i => i.itemSectionRenderer?.targetId === 'comments-section');
          continuationToken = commentSection?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        }
        if (!continuationToken) {
          const nextResp = await fetch('/youtubei/v1/next?key=' + apiKey + '&prettyPrint=false', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context, videoId })
          });
          if (!nextResp.ok) return { ok: false, message: 'Failed to get video data: HTTP ' + nextResp.status };
          const nextData = await nextResp.json();
          const results = nextData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
          const commentSection = results.find(i => i.itemSectionRenderer?.targetId === 'comments-section');
          continuationToken = commentSection?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        }
        if (!continuationToken) return { ok: false, message: 'No comment section found' };

        // Step 2: Fetch comments to find the target comment's reply params
        const contResp = await fetch('/youtubei/v1/next?key=' + apiKey + '&prettyPrint=false', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, continuation: continuationToken })
        });
        if (!contResp.ok) return { ok: false, message: 'Failed to fetch comments' };
        const contData = await contResp.json();

        // Search for createReplyParams in the comment thread renderers
        let createReplyParams = null;
        const endpoints = contData.onResponseReceivedEndpoints || [];
        for (const ep of endpoints) {
          const items = ep.reloadContinuationItemsCommand?.continuationItems
            || ep.appendContinuationItemsAction?.continuationItems
            || [];
          for (const item of items) {
            const thread = item.commentThreadRenderer;
            if (!thread) continue;
            // Check if this is the target comment by matching key/commentId
            const viewModel = thread.commentViewModel?.commentViewModel;
            const commentKey = thread.commentViewModel?.commentKey
              || viewModel?.commentKey
              || thread.comment?.commentRenderer?.commentId
              || '';
            // Try multiple ways to match the comment
            if (commentKey === commentId || commentKey.includes(commentId)) {
              const replyRenderer = thread.commentViewModel?.commentViewModel?.replyCommandParams
                || thread.replies?.commentRepliesRenderer?.submitButton?.buttonRenderer?.serviceEndpoint?.createCommentReplyEndpoint?.createReplyParams;
              if (replyRenderer) {
                createReplyParams = replyRenderer;
                break;
              }
            }
          }
          if (createReplyParams) break;
        }

        if (!createReplyParams) return { ok: false, message: 'Could not find reply params for comment ' + commentId + ' — try using a different comment_id format' };

        // Step 3: Post the reply
        const resp = await fetch('/youtubei/v1/comment/create_comment_reply?key=' + apiKey + '&prettyPrint=false', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            commentText: replyText,
            createReplyParams,
          })
        });

        if (!resp.ok) return { ok: false, message: 'Failed to post reply: HTTP ' + resp.status };
        const data = await resp.json();

        if (data.actionResult?.status === 'STATUS_SUCCEEDED'
          || data.actions?.some(a => a.createCommentReplyAction)) {
          return { ok: true, message: 'Reply posted successfully' };
        }

        return { ok: false, message: 'Unexpected response — reply may not have been posted' };
      } catch (e) {
        return { ok: false, message: e.toString() };
      }
    })()`);

    return [{
      status: result.ok ? 'success' : 'failed',
      message: result.message,
      comment_id: commentId,
      text,
    }];
  },
});
