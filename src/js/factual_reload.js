(function factualReloadMain() {
  let lastTimestamp = null;
  const reloadInterval = function reloadInterval() {
    let xhr;
    xhr = new XMLHttpRequest;
    xhr.open('GET', 'reload.html');
    xhr.send(null);

    xhr.onload = function onLoadCallback() {
      if (lastTimestamp !== xhr.responseText) {
        console.info('Extension reloading.');
        lastTimestamp = xhr.responseText;
        return chrome.runtime.reload();
      }
    };
  };

  (function factualReload() {
    let xhr;
    xhr = new XMLHttpRequest;
    xhr.open('GET', 'reload.html');
    xhr.send(null);

    xhr.onload = function onLoadCallback() {
      lastTimestamp = xhr.responseText;
      return setInterval(reloadInterval, 1000);
    };
  })();
}).call(this);
