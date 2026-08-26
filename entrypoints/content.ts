export default defineContentScript({
  matches: ['*://app.jobcakes.com/*', '*://jobcakes.com/*', '*://*.jobcakes.com/*'],
  main() {
    console.log('Hello content.', location.href);

    // const container = document.createElement('span'); 
    // document.body.append(container); 

    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      console.log('received[content]', message);
      if (message?.type !== 'GET_JOB') return;
      const drawer = document.querySelector(
        'aside, [data-side], [class*=panel]',
      );
      sendResponse(
        drawer ? { ok: true } : { ok: false, error: 'no drawer' },
      );
    });
  },
});
