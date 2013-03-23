var background = chrome.extension.getBackgroundPage(),
    frameEl = document.getElementById('graphFrame');

frameEl.src = background.bitcoinLive.getSetting('iframeUrl');