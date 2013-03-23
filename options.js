var background = chrome.extension.getBackgroundPage(),
	notifyEl = document.getElementById('notify'),
	notifyOptions = document.getElementById('notify-options');

function saveOptions (){
	'use strict';
	var i, item,
			inputs = document.getElementsByTagName("input"),
			vals   = {};

	for (i = 0; i < inputs.length; i += 1){
		item = inputs.item(i);
		vals[item.id] = item.type === 'checkbox' ? item.checked : item.value;
	}

	background.bitcoinLive
		.saveSettings(vals)
		.loadSettings(vals);
	localStorage["bitcoinLiveOptions"] = JSON.stringify(vals);

	var status = document.getElementById("status");
	status.innerHTML = "Options Saved.";
	setTimeout(function() {
		status.innerHTML = "";
	}, 750);
}

function restoreOptions (){
	var vals = localStorage["bitcoinLiveOptions"];
	if (!vals) {
		return;
	} else {
		vals = JSON.parse(vals);
	}
	Object.keys(vals).forEach(function(key){
		var el = document.getElementById(key);
		if (el) {
			if (el.type === 'checkbox') {
				el.checked = vals[key];
			} else {
				el.value = vals[key];
			}
		}
	});
	toggleNotification();
}

function toggleNotification (){
	if (notifyEl.checked) {
		notifyOptions.className = '';
	} else {
		notifyOptions.className = 'hidden';
	}
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
notifyEl.addEventListener('change', toggleNotification);
