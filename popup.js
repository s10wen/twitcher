/**
 * Copyright 2012 Thom Seddon.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

if (!chrome.cookies) {
	chrome.cookies = chrome.experimental.cookies;
}

var COOKIE_TOKEN = 'auth_token';
var COOKIE_ID = 'twid';

function getInfoFromUid(uid) {
	var req = new XMLHttpRequest(), parsed;
	req.open("GET", "https://api.twitter.com/1/users/lookup.json?user_id=" + uid, false);
	req.send();

	parsed = JSON.parse(req.responseText)[0];

	return {img: parsed.profile_image_url, name: parsed.screen_name};
}

/*
 * Had to make some assumptions here
 *
 * Mine is always "u={myuid}|{RandomBase64Stuff}"
 * but for flexibility I have assumed the pipe
 * character separates any number of variables
 * and that the u={myuid} may be found in any position
 */
function setCookieId(uid) {
	var set = false;

	if (twid) {
		var parts = twid.split('|');
		for (var i in parts) {
			if (parts.slice(0, 2) == 'u=') {
				parts[i] = 'u=' + uid;
				set = true;
				break;
			}
		}

		twid = parts.join('|');
	}

	if (!set) twid = 'u=' + uid + '|' + twid; //Fallback

	return twid;
}

function saveAccounts() {
	chrome.storage.sync.set({accounts: JSON.stringify(accounts)});
}

function switchAccount(e) {
	var target = e.target, id;
	while (target.tagName != 'DIV') {
		target = target.parentNode;
	}
	id = target.getAttribute('data-uid');

	chrome.cookies.set({
		url: 'https://twitter.com',
		name: COOKIE_TOKEN,
		value: accounts[id].token,
		domain: '.twitter.com',
		path: '/',
		secure: true,
		httpOnly: true
	});

	chrome.cookies.set({
		url: 'https://twitter.com',
		name: COOKIE_ID,
		value:  setCookieId(id),
		domain: '.twitter.com',
		path: '/',
		secure: true,
		httpOnly: true
	});

	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.reload(tab.id);
	});
}

function removeAccount(e) {
	var id = e.target.previousElementSibling.getAttribute('data-uid');

	if (accounts[id]) {
		delete accounts[id];
		saveAccounts();
		render();
	}
}

function render() {
	//Build html
	var html = '';
	for (var id in accounts) {
		html += '<div class="account-outer">' +
					'<div class="account' + (id == uid ? ' current' : '') + '" data-uid="' + id + '">' + 
						'<img src="' + accounts[id].img +'"><br>' +
						'<strong>' + accounts[id].name + '</strong><br>' +
					'</div>' +
					'<a class="remove">remove</a>' +
				'</div>';
	}

	document.querySelector('#accounts').innerHTML = html;

	//Attach events
	var elems = document.querySelectorAll('div.account');
	for (var i in elems) {
		if (elems[i].nodeType !== Node.ELEMENT_NODE) continue;
		elems[i].addEventListener('click', switchAccount, false)
	}

	elems = document.querySelectorAll('a.remove');
	for (i in elems) {
		if (elems[i].nodeType !== Node.ELEMENT_NODE) continue;
		elems[i].addEventListener('click', removeAccount, false)
	}
}

/*
 * Boot
 */

var token = false,
	uid = false, //Also used indicate an active session
	accounts, currentAccount, twid;

chrome.cookies.getAll({domain: 'twitter.com'}, function(cookies) {

	//Doing it this way to avoid callback hell
	for (var i in cookies) {
		if (cookies[i].name === COOKIE_TOKEN) {
			token = cookies[i].value;
		} else if (cookies[i].name === COOKIE_ID) {
			twid = cookies[i].value;
			var val = unescape(twid),
					start = val.indexOf('u=') + 1;
			uid = val.slice(start + 1, val.indexOf('|', start));
		}
	}

	chrome.storage.sync.get('accounts', function(rawAccounts){
		if (rawAccounts.accounts && rawAccounts.accounts.length) {
			accounts = JSON.parse(rawAccounts.accounts);
		} else {
			accounts = {};
		}

		if (token && uid) {
			if(!accounts[uid]) {
				accounts[uid] = getInfoFromUid(uid); //This is blocking and slow
				accounts[uid].token = token;
				saveAccounts();
			}
			currentAccount = accounts[uid];
		}

		render();
	});
});

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-17516578-20']);
_gaq.push(['_trackPageview']);

(function() {
	var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	ga.src = 'https://ssl.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();