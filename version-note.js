console.log(document.getElementById('version'), chrome.runtime.getManifest().version);
document.getElementById('version').innerHTML = chrome.runtime.getManifest().version;
