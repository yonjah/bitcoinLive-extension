/*globals chrome, webkitNotifications, console*/
/*jshint boss: true, debug:true, loopfunc:true, strict: true, expr: true */
//audio from http://www.freesound.org/people/steveygos93/
var bitcoinLive = (function (){
	"use strict";
	var global, connect,
		version = chrome.runtime.getManifest().version,
		settings            = {
			version            : void 0,
			currency           : 'USD',
			crCode             : '$',
			httpFallBack       : true,
			httpWait           : 10000,
			badgeProp          : "last_all",
			avgReset           : 600,
			iframeUrl          : 'http://bitcoinity.org/markets',
			mute               : false,
			notify             : true,
			notificationTimeout: 5000,

			notifyTimeChange   : false,
			timeInt            : 120000, //time int to notify change
			timeValueChange    : 200000, //value change in microFiat 100,000 = 1 Fiat (usd, euro, etc)

			notifyPrecentChange: true,
			percentInt         : 120000, //time int to notify change
			percentValueChange : 0.05,  //(0.01 = 1%)

			notifyMax          : false,
			maxValue           : 15000000, //max value in in microFiat.

			notifyMin          : false,
			minValue           : 14000000 //max value in in microFiat.
		},
		currencies          = {
			'USD': '$',
			'AUD': 'A$',
			'CAD': 'C$',
			'CHF': 'CHF',
			'CNY': 'C¥',
			'DKK': 'Kr',
			'EUR': '€',
			'GBP': '£',
			'HKD': 'H$',
			'JPY': 'J¥',
			'NZD': 'N$',
			'PLN': 'zł',
			'RUB': 'руб',
			'SEK': 'Kr',
			'SGD': 'S$',
			'THB': '฿'
		},
		average             = 0,
		avgCount            = 0,
		webSocketUrl        = 'ws://websocket.mtgox.com/mtgox?Currency={0}',
		socketIoUrl         = 'https://socketio.mtgox.com/mtgox',
		httpApiUrl          = 'http://data.mtgox.com/api/1/BTC{0}/ticker',
		history             = {startTime: (new Date()).getTime(), all: [], min:Infinity, max: 0},
		audio               = new webkitAudioContext(),
		audioBuffer         = {};

	function formatTime(t) {
		t = new Date(t);
		return t.getDate() + '/' + t.getMonth() + ' ' + t.getHours()+ ':' + t.getMinutes()+ ':' + t.getSeconds();

	}
	function loadSound(url, id) {
		var request = new XMLHttpRequest();
		request.open('GET', url, true);
		request.responseType = 'arraybuffer';

		request.onload = function() {
			audio.decodeAudioData(request.response, function(buffer) {
				audioBuffer[id] = buffer;
			});
		};
		request.send();
	}

	function playSound(id) {
		if (!settings.mute) {
			var source = audio.createBufferSource(); // creates a sound source
			source.buffer = audioBuffer[id];                    // tell the source which sound to play
			source.connect(audio.destination);       // connect the source to the context's destination (the speakers)
			source.noteOn(0);
		}
	}

	function notify (title, msg, audio, img, timeout) {
		var notification = webkitNotifications.createNotification(
			img || 'bitcoin-128.png',
			title || '',
			msg || ''
		);
		audio && playSound(audio);
		notification.show();
		timeout && setTimeout(notification.close.bind(notification), timeout);
	}

	function notifyVersionChange () {
		webkitNotifications.createHTMLNotification('version-note.html').show();
	}

	function setHistory (param, time){
		var first, minMax, maxVal, minVal,
			recal = false,
			doReset = false,
			resetTime = time - settings.timeInt,
			val = param.value_int;

		if (!val) { //we are ignoring 0 or no value since mtGox sometimes go crazy and we don't want to scare ppl :-D
			return;
		}
		time = time || (new Date()).getTime();
		if (settings.notify) {
			if (settings.notifyMax && val > settings.maxValue) {
				notify(
					'Bitcoind Passed Max',
					'Current value is '+ val/100000 + '\n(' + formatTime(time)+')',
					'raise',
					'bitcoin-128.png'
				);
				settings.notifyMax = false;
				saveSettings();
			}

			if (settings.notifyMin && val < settings.minValue) {
				notify(
					'Bitcoind Passed Min',
					'Current value is '+ val/100000 + '\n(' + formatTime(time)+')',
					'drop',
					'bitcoin-128.png'
				);
				settings.notifyMin = false;
				saveSettings();
			}

			if (settings.notifyTimeChange || settings.notifyPrecentChange) {
				if (settings.notifyPrecentChange) {
					maxVal = history.max * settings.percentValueChange;
					minVal = history.min * settings.percentValueChange;
				} else {
					maxVal = settings.timeValueChange;
					minVal = settings.timeValueChange;
				}

				if (history.max - val >= maxVal) {
					doReset = true;
					notify(
						'Drastic value drop',
						'Current value is '+ val/100000 + '\n Record max is ' + history.max/100000,
						'drop',
						'bitcoin-128.png',
						settings.notificationTimeout
					);
				} else if (val - history.min >= minVal) {
					doReset = true;
					notify(
						'Drastic value rise',
						'Current value is '+ val/100000 + '\n Record min is ' + history.min/100000,
						'raise',
						'bitcoin-128.png',
						settings.notificationTimeout
					);
				}
			}
		}
		if (doReset) {
			resetHistory(val, time);
		} else {
			history.min = Math.min(history.min, val);
			history.max = Math.max(history.max, val);
			history.all.push([val, time]);

			while(resetTime > history.all[0][1]) {
				first = history.all.shift();
				if (!recal && (first[0] === history.min || first[0] === history.max)) {
					recal = true;
				}
			}
			if (recal) {
				minMax = history.all.reduce(function(arr, item) {
					return [Math.min(arr[0], item[0]), Math.max(arr[1], item[0])];
				}, [Infinity, 0]);
				history.min = minMax[0];
				history.max = minMax[1];
			}
		}
	}

	function resetHistory(val, time){
		history.min = val || Infinity;
		history.max = val || 0;
		history.all = val ? [[val, time || 0]] : [];
	}

	function setBadge (param){
		var value = param.value,
			value_int = param.value_int;

		chrome.browserAction.setBadgeText({text: value});
		chrome.browserAction.setBadgeBackgroundColor({color: value_int >= average ? '#0A0' : '#A00'});

		if (avgCount >= settings.avgReset) {
			average = value_int;
			avgCount = 1;
		} else {
			average = ((average * avgCount) + parseInt(value_int, 10)) / (avgCount + 1);
			avgCount += 1;
		}
	}

	function setTitle (data){
		chrome.browserAction.setTitle({title: 'sell: ' + data.sell.display + ' buy: ' + data.buy.display});
	}

	function setData (data, time) {
		var param = data[settings.badgeProp];
		setBadge(param);
		setHistory(param, time);
		setTitle(data);
	}

	function getUrlCurrency (url, cur) {
		return url.replace(/\{0\}/, cur);
	}

	connect = {
		httpApiActive: true,
		websocket: (function () {
			var currentUrl,
				connection,
				timeout,
				wait = 30000,
				maxWait = 1800000,
				errorCount = 0;

			function reconnect (){
				clearTimeout(timeout);
				console.log('reconnect in ' + wait / 1000 + ' seconds');
				timeout = setTimeout(startConnection, wait);
				if (settings.httpFallBack) {
					connect.httpApiActive = true;
				}
				if (errorCount < 3) {
					wait = Math.max(wait * 2, maxWait);
					errorCount = 0;
				}
			}

			function open (){
				console.log('mtgox Connection success');
				connection.send(JSON.stringify({
					op: 'subscribe',
					channel: 'ticker'
				}));
				connection.send(JSON.stringify({
					op : 'mtgox.subscribe',
					channel : 'ticker'
				}));
				connect.httpApiActive = false;
				wait = 30000;
				errorCount = 0;
			}

			function error (){
				console.log('WebSocket Error ' + error);
				errorCount += 1;
				reconnect();
			}

			function close (){
				console.log('connection was closed');
				errorCount += 1;
				reconnect();
			}

			function message (e){
				var data = JSON.parse(e.data);
				if (data.private === "ticker") {
					setData(data.ticker);
				} else if (data.channel) {
					connection.send(JSON.stringify({
						"op":"unsubscribe",
						"channel": data.channel
					}));
				}
			}

			function startConnection () {
				clearTimeout(timeout);
				connection = new WebSocket(currentUrl),
				connection.onopen = open;
				connection.onerror = error;
				connection.onclose = close;
				connection.onmessage = message;
			}

			function init (url) {
				timeout && clearTimeout(timeout);
				currentUrl = getUrlCurrency(url, settings.currency);
				if (connection) {
					connection.onclose = function(){};
					connection.close();
				}
				wait = 30000;
				startConnection();
			}
			return init;
		}()),
		httpApi: (function (){
			var currentUrl,
				timeout,
				lastFetch,
				xhr;

			function readyState (){
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {
						var data = JSON.parse(xhr.responseText);
						if (data.result === "success") {
							data = data['return'];
							if (lastFetch !== data.now) {
								lastFetch = data.now;
								setData(data, window.parseInt(data.now / 1000, 10));
							}
						} else {
							console.log('mtgox api error', data);
						}
					} else {
						console.log('could not open http connection', xhr);
					}
					window.clearTimeout(timeout);
					timeout = setTimeout(timeRequest, settings.httpWait);
				}
			}

			function sendRequest (){
				xhr = new XMLHttpRequest();
				xhr.onreadystatechange = readyState;
			    xhr.open('GET', currentUrl);
			    xhr.send();
			}

			function timeRequest (){
				if (connect.httpApiActive) {
					sendRequest();
				} else {
					window.clearTimeout(timeout);
					timeout = setTimeout(timeRequest, settings.httpWait);
				}
			}
			function init (url){
				currentUrl = getUrlCurrency(url, settings.currency);
				timeRequest();
			}
			return init;
		}()),

		all: function () {
			connect.active = true;
			connect.websocket(webSocketUrl);
			connect.httpApi(httpApiUrl);
		},
		active: false
	};

	function loadSettings (){
		var reconnect = false,
			vals = localStorage["bitcoinLiveOptions"];
		if (!vals) {
			saveSettings();
		} else {
			vals = JSON.parse(vals);
			if (connect.active && vals.currency !== settings.currency) {
				reconnect = true;
			}
			if (vals.valueChange) {
				vals.timeValueChange = vals.valueChange;
			}
			settings = {
				version            : version,
				currency           : vals.currency || settings.currency,
				crCode             : currencies[vals.currency || settings.currency],
				badgeProp          : vals.badgeProp || settings.badgeProp,
				avgReset           : 600,
				httpFallBack       : vals.httpFallBack === false ? false : true,
				httpWait           : (vals.httpWait * 1000)|| settings.httpWait,
				iframeUrl          : vals.iframeUrl || settings.iframeUrl,
				notificationTimeout: (vals.notificationTimeout * 1000)|| settings.notificationTimeout,
				mute               : vals.mute || false,
				notify             : vals.notify !== void 0 ? vals.notify : settings.notify,
				notifyTimeChange   : vals.notifyTimeChange !== void 0 ? vals.notifyTimeChange : settings.notifyTimeChange,
				timeInt            : (vals.timeInt * 1000) || settings.timeInt, //time int to notify change
				timeValueChange    : (vals.timeValueChange * 100000) || settings.timeValueChange, //value change in mictobitcoin 100,000 = 1btc
				notifyPrecentChange: vals.notifyPrecentChange !== void 0 ? vals.notifyPrecentChange : settings.notifyPrecentChange,
				percentInt         : (vals.percentInt * 1000) || settings.percentInt,
				percentValueChange : (vals.percentValueChange / 100) || settings.percentValueChange,
				notifyMax          : vals.notifyMax !== void 0 ? vals.notifyMax : settings.notifyMax,
				maxValue           : (vals.maxValue * 100000) || settings.maxValue,
				notifyMin          : vals.notifyMin !== void 0 ? vals.notifyMin : settings.notifyMin,
				minValue           : (vals.minValue * 100000) || settings.minValue
			};
			if (vals.version !== version){
				notifyVersionChange();
				saveSettings();
			} else if (Object.keys(vals).length !== Object.keys(settings).length) {
				saveSettings();
			}
		}
		if (reconnect) {
			connect.all();
		}
		resetHistory();
		return this;
	}

	function saveSettings (vals){
		if (!vals) {
			vals = {
				currency           : settings.currency,
				crCode             : currencies[settings.currency],
				httpFallBack       : settings.httpFallBack,
				httpWait           : settings.httpWait / 1000,
				badgeProp          : settings.badgeProp,
				avgReset           : settings.avgReset,
				iframeUrl          : settings.iframeUrl,
				notificationTimeout: settings.notificationTimeout / 1000,
				mute               : settings.mute,
				notify             : settings.notify,
				notifyTimeChange   : settings.notifyTimeChange,
				timeInt            : settings.timeInt / 1000, //time int to notify change
				timeValueChange    : settings.timeValueChange / 100000, //value change in mictobitcoin 100,000 = 1btc
				notifyPrecentChange: settings.notifyPrecentChange,
				percentInt         : settings.percentInt / 1000,
				percentValueChange : settings.percentValueChange * 100,
				notifyMax          : settings.notifyMax,
				maxValue           : settings.maxValue  / 100000,
				notifyMin          : settings.notifyMin,
				minValue           : settings.minValue / 100000
			};
		}
		vals.version = version;
		localStorage["bitcoinLiveOptions"] = JSON.stringify(vals);
		return this;
	}

	function getSetting (key) {
		return settings[key];
	}


	loadSound('2bip.ogg', 'raise');
	loadSound('3bip.ogg', 'drop');
	loadSettings();
	connect.all();

	global = {
		getSetting  : getSetting,
		saveSettings: saveSettings,
		loadSettings: loadSettings,
		history     : history
	};
	return global;
}());
