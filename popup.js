var bitcoinLive = chrome.extension.getBackgroundPage().bitcoinLive,
    frameEl = document.getElementById('graphFrame');

frameEl.src = bitcoinLive.getSetting('iframeUrl');