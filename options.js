var bitcoinLive = chrome.extension.getBackgroundPage().bitcoinLive,
	trackerEl = document.getElementById('tracker'),
	currencyEl = document.getElementById('currency'),
	badgePropEl = document.getElementById('badgeProp'),
	notifyEl = document.getElementById('notify'),
	notifyOptions = document.getElementById('notify-options'),
	fallbackEl = document.getElementById('httpFallBack'),
	fallbackOptions = document.getElementById('fallback-options'),
	propDict = {
		'last_all'  : 'Last all',
		'avg'       : 'Average',
		'buy'       : 'Buy',
		'sell'      : 'Sell',
		'high'      : 'High',
		'low'       : 'Low',
		'last'      : 'Last',
		'last_local': 'Last local',
		'last_orig' : 'Last orig',
		'24h_avg'   : '24 Hours Average',
		'ask'       : 'Sell',
		'bid'       : 'Buy'
	};

function saveOptions (){
	'use strict';
	var i, item,
		inputs = document.getElementsByTagName("input"),
		vals   = {};

	for (i = 0; i < inputs.length; i += 1){
		item = inputs.item(i);
		vals[item.id] = (item.type === 'checkbox' || item.type === 'radio') ? item.checked : item.value;
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
	var evt = document.createEvent("HTMLEvents"),
		vals = localStorage["bitcoinLiveOptions"];
    evt.initEvent('change', true, true); // event type,bubbling,cancelable
	if (!vals) {
		return;
	} else {
		vals = JSON.parse(vals);
	}

	if (vals.tracker) {
		trackerEl.value = vals.tracker;
		trackerEl.dispatchEvent(evt);
	}

	Object.keys(vals).forEach(function(key){
		var el = document.getElementById(key);
		if (el) {
			if (el.type === 'checkbox' || el.type === 'radio') {
				el.checked = vals[key];
			} else {
				el.value = vals[key];
			}
		}
	});
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

function setTrackerOptions () {
	var tracker = bitcoinLive.getApi(trackerEl.value),
		currencies = '',
		budgetProps = '';

	if (tracker) {
		currencies = tracker.optionalCurrencies.reduce(function (options, curID) {
			options.push('<option value="' + curID + '">' + bitcoinLive.currencies[curID] + ' ' + curID + '</option>');
			return options;
		}, []).join('');

		budgetProps = tracker.optionalProps.reduce(function (options, propID) {
			options.push('<option value="' + propID + '">' + propDict[propID] + '</option>');
			return options;
		}, []).join('');
	}

	currencyEl.innerHTML = currencies;
	badgePropEl.innerHTML = budgetProps;
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
notifyEl.addEventListener('change', toggleObject.bind(notifyEl, notifyOptions));
fallbackEl.addEventListener('change', toggleObject.bind(fallbackEl, fallbackOptions));
trackerEl.addEventListener('change', setTrackerOptions);
