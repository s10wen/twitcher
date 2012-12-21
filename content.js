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

//Globals
var dropdown = document.querySelector('.global-nav .pull-right .nav .dropdown-menu'),
	currentUser;

function getSetCurrentUser() {
	//Get current uid and image from DOM
	var account = dropdown.querySelector('.account-group'),
		img = dropdown.querySelector('.account-group img');

	return currentUser = {
			uid: account.getAttribute('data-user-id'),
			name: account.getAttribute('data-screen-name'),
			img: img.getAttribute('src')
	}
}

function switchAccount(event) {
	var target = event.target, uid;
	while (target.tagName != 'LI') {
		target = target.parentNode;
	}
	uid = target.getAttribute('data-user-id');

	chrome.extension.sendMessage({type: 'switchAccount', uid: uid});
}

function cleanup() {
	var twichers = dropdown.querySelectorAll('.twitcher-inserted');
	for (var i = 0; i < twichers.length; i++) {
		var childNode = twichers[i];
		if (childNode.parentNode) {
			childNode.parentNode.removeChild(childNode);
		}
	}
}

function render(accounts) {

	//Cleanup previous render
	cleanup();

	var target = dropdown.querySelector('.dropdown-divider'),
		parent = target.parentNode,
		accountsAdded = false,
		li, html;

	//Add divider
	li = document.createElement('li');
	li.className = 'dropdown-divider twitcher-inserted';
	parent.insertBefore(li, target);

	//Add each account
	for (var uid in accounts) {
		var account = accounts[uid];

		if (uid == currentUser.uid) continue;

		li = document.createElement('li');
		li.className = 'twitcher-inserted';
		li.setAttribute('data-user-id', uid);
		li.setAttribute('draggable', true);
		li.innerHTML = '<a><img style="margin:0 9px -4px 0" class="size18" src="' + account.img + '">' + account.name + '</a>';
		li = parent.insertBefore(li, target);
		li.addEventListener('click', switchAccount, false);

		//Add drag shizzle
		li.addEventListener('dragstart', function(event) {
			this.style.opacity = '0.4';
			this.getElementsByTagName('a')[0].style.background = 'red';

			//Store uid
			event.dataTransfer.effectAllowed = 'move';
  			event.dataTransfer.setData('text/html', uid);
		}, false);
		li.addEventListener('dragend', function(event) {
			this.style.opacity = '1';
			this.getElementsByTagName('a')[0].setAttribute('style', '');
		}, false);

		accountsAdded = true;
	}

	if (!accountsAdded) {
		li = document.createElement('li');
		li.className = 'twitcher-inserted';
		li.innerHTML = '<p style="color:#999;font-size:0.8em;margin-left:22px">No other accounts</p>';
		li = parent.insertBefore(li, target);
	}
}


function bindDropListeners() {

	function prevent(event) {
		event.preventDefault();
		return false;
	}

	//This stops it propogating when droped back inside the dropdown
	dropdown.addEventListener('dragover', prevent, false);
	dropdown.addEventListener('dragenter', prevent, false);
	dropdown.addEventListener('drop', function (event) {
		prevent(event);
		event.stopPropagation();
	}, false);

	//Removes it when it's dropped outside the dropdown
	document.body.addEventListener('dragover', prevent, false);
	document.body.addEventListener('dragenter', prevent, false);
	document.body.addEventListener('drop', function (event) {
		prevent(event);
		chrome.extension.sendMessage({type: 'removeAccount', uid: event.dataTransfer.getData('text/html')}, render);
	}, false);
}

//Save latest version of current user
chrome.extension.sendMessage({type: 'currentUser', currentUser: getSetCurrentUser()}, function(){
	//Boot
	bindDropListeners();
	chrome.extension.sendMessage({type: 'getAccounts'}, render);
});