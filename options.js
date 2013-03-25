var bitcoinLive = chrome.extension.getBackgroundPage().bitcoinLive,
	notifyEl = document.getElementById('notify'),
	notifyOptions = document.getElementById('notify-options'),
	fallbackEl = document.getElementById('httpFallBack'),
	fallbackOptions = document.getElementById('fallback-options');

function saveOptions (){
	'use strict';
	var i, item,
		inputs = document.getElementsByTagName("input"),
		vals   = {};

	for (i = 0; i < inputs.length; i += 1){
		item = inputs.item(i);
		vals[item.id] = item.type === 'checkbox' ? item.checked : item.value;
	}
	inputs = document.getElementsByTagName("select");
	for (i = 0; i < inputs.length; i += 1){
		item = inputs.item(i);
		vals[item.id] = item.value;
	}

	bitcoinLive
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
	var evt,
		vals = localStorage["bitcoinLiveOptions"];
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
	evt = document.createEvent("HTMLEvents");
    evt.initEvent('change', true, true); // event type,bubbling,cancelable
    notifyEl.dispatchEvent(evt);
    fallbackEl.dispatchEvent(evt);
}

function toggleObject (obj){
	if (this.checked) {
		obj.className = '';
	} else {
		obj.className = 'hidden';
	}
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
notifyEl.addEventListener('change', toggleObject.bind(notifyEl, notifyOptions));
fallbackEl.addEventListener('change', toggleObject.bind(fallbackEl, fallbackOptions));
