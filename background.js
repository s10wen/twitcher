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

//Globals
var COOKIE_TOKEN = 'auth_token';
	COOKIE_ID = 'twid',
	accounts = {};

function saveAccounts() {
	chrome.storage.sync.set({accounts: JSON.stringify(accounts)});
}

function switchAccount(uid) {
	chrome.cookies.set({
		url: 'https://twitter.com',
		name: COOKIE_TOKEN,
		value: accounts[uid].token,
		domain: '.twitter.com',
		path: '/',
		secure: true,
		httpOnly: true
	});

	chrome.cookies.remove({
		url: 'https://twitter.com',
		name: COOKIE_ID
	});

	chrome.tabs.getSelected(null, function(tab) {
		chrome.tabs.reload(tab.id);
	});
}

function removeAccount(uid) {
	if (accounts[uid]) {
		delete accounts[uid];
		saveAccounts();
	}
}

function saveCurrentUser(currentUser, callback) {
	//Get the token
	chrome.cookies.get({url: 'https://twitter.com', name: COOKIE_TOKEN}, function (cookie){
		if (cookie) {
			accounts[currentUser.uid] = {
				name: currentUser.name,
				img: currentUser.img,
				token: cookie.value
			}
			saveAccounts();
			currentAccount = accounts[currentUser.uid];
		}
		callback();
	})
}

function getAccounts(callback) {
	chrome.storage.sync.get('accounts', function(rawAccounts){
		if (rawAccounts.accounts && rawAccounts.accounts.length) {
			accounts = JSON.parse(rawAccounts.accounts);
		}

		callback(accounts);
	});
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {

	if (sender.id !== window.location.host) return; //Not from us

	if (request.type === 'getAccounts') {
		getAccounts(sendResponse);
	} else if (request.type === 'switchAccount') {
		switchAccount(request.uid);
	} else if (request.type === 'removeAccount') {
		removeAccount(request.uid);
		sendResponse(accounts);
	} else if (request.type === 'currentUser') {
		/*
		 * Saving the current user writes directly into the gloabl accounts object
		 * and saves this so we make sure we have the latest version before doing
		 * so.
		 */
		getAccounts(function() {
			saveCurrentUser(request.currentUser, sendResponse);
		});
	}

	return true;
});


// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (tab.url.match(/^http(s|)\:\/\/(www|)twitter.com(.*)/i)) {
		chrome.pageAction.show(tabId);
	}
});

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-17516578-20']);
_gaq.push(['_trackPageview']);
(function() {
	var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	ga.src = 'https://ssl.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();