/**
 * YouTube reply — post a top-level comment on a video.
 *
 * Uses the InnerTube create_comment endpoint. Requires being logged into YouTube.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, CommandExecutionError } from '@jackwener/opencli/errors';
import { parseVideoId } from './utils.js';

cli({
  site: 'youtube',
  name: 'reply',
  description: 'Post a comment on a YouTube video',
  domain: 'www.youtube.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'url', required: true, positional: true, help: 'YouTube video URL or video ID' },
    { name: 'text', required: true, positional: true, help: 'Comment text' },
  ],
  columns: ['status', 'message', 'text'],
  func: async (page, kwargs) => {
    const videoId = parseVideoId(kwargs.url);
    const text = kwargs.text;

    await page.goto(`https://www.youtube.com/watch?v=${videoId}`);
    await page.wait(3);

    const result = await page.evaluate(`(async () => {
      try {
        const videoId = ${JSON.stringify(videoId)};
        const commentText = ${JSON.stringify(text)};
        const cfg = window.ytcfg?.data_ || {};
        const apiKey = cfg.INNERTUBE_API_KEY;
        const context = cfg.INNERTUBE_CONTEXT;
        if (!apiKey || !context) return { ok: false, message: 'YouTube config not found — are you logged in?' };

        // Extract createCommentParams from the page data
        let createParams = null;

        // Try from ytInitialData
        if (window.ytInitialData) {
          const results = window.ytInitialData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
          const commentSection = results.find(i => i.itemSectionRenderer?.targetId === 'comments-section');
          const continuation = commentSection?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;

          if (continuation) {
            // Fetch comments section to get createCommentParams
            const contResp = await fetch('/youtubei/v1/next?key=' + apiKey + '&prettyPrint=false', {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context, continuation })
            });
            if (contResp.ok) {
              const contData = await contResp.json();
              // Look for createRenderer in the response
              const header = contData.onResponseReceivedEndpoints?.[0]?.reloadContinuationItemsCommand?.continuationItems
                || contData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems
                || [];
              for (const item of header) {
                const renderer = item.commentsHeaderRenderer;
                if (renderer?.createRenderer?.commentSimpleboxRenderer?.submitButton?.buttonRenderer?.serviceEndpoint?.createCommentEndpoint?.createCommentParams) {
                  createParams = renderer.createRenderer.commentSimpleboxRenderer.submitButton.buttonRenderer.serviceEndpoint.createCommentEndpoint.createCommentParams;
                  break;
                }
              }
            }
          }
        }

        if (!createParams) return { ok: false, message: 'Could not find comment params — comments may be disabled or you are not logged in' };

        // Post the comment
        const resp = await fetch('/youtubei/v1/comment/create_comment?key=' + apiKey + '&prettyPrint=false', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            commentText,
            createCommentParams: createParams,
          })
        });

        if (!resp.ok) return { ok: false, message: 'Failed to post comment: HTTP ' + resp.status };
        const data = await resp.json();

        // Check for success indicators
        if (data.actionResult?.status === 'STATUS_SUCCEEDED'
          || data.actions?.some(a => a.createCommentAction)) {
          return { ok: true, message: 'Comment posted successfully' };
        }

        return { ok: false, message: 'Unexpected response — comment may not have been posted' };
      } catch (e) {
        return { ok: false, message: e.toString() };
      }
    })()`);

    return [{
      status: result.ok ? 'success' : 'failed',
      message: result.message,
      text,
    }];
  },
});
