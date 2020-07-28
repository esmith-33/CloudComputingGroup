/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

initFirebaseAuth();

var nameContainer = document.getElementById('demo-name-container');
var usersContainer = document.getElementById('demo-all-users-list');
var usersCard = document.getElementById('demo-all-users-card');
var snackbar = document.getElementById('demo-snackbar');
// Triggered on Firebase auth state change.
const loadPeople = function(user) {
	// If this is just an ID token refresh we exit.
	if (user && this.currentUid === user.uid) {
		return;
	}
	// Remove all Firebase realtime database listeners.
	if (this.listeners) {
		this.listeners.forEach(function(ref) {
			ref.off();
		});
	}
	this.listeners = [];

	// Adjust UI depending on user state.
	if (user) {
		this.nameContainer.innerText = user.displayName;
		this.usersCard.style.display = 'block';

		this.saveToken();
		this.displayAllUsers();
		this.currentUid = user.uid;
	} else {
		this.usersCard.style.display = 'block';
		this.usersContainer.innerHTML = 'Hello World';
		this.currentUid = 'Who';
	}
};

// Display all users so that they can be followed.
function displayAllUsers() {
	var usersRef = firebase.firestore().collection('Users').orderBy('name', 'desc').limit(12);
	usersRef.onSnapshot(function(snapshot) {
			// Create the HTML for a user.
			var photoURL = doc.data().photoURL || 'assets/images/users/profile_placeholder.png';
			var displayName = doc.data().name;
			var uid = doc.data().uid;
			var userTemplate =
				'<div class="demo-user-container">' +
				'  <img class="demo-profile-pic" src="' +
				photoURL +
				'">' +
				'  <span class="demo-name">' +
				displayName +
				'</span>' +
				'  <span class="demo-notifications-enabled">(notifications enabled)</span>' +
				'  <label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="demo-follow-switch-' +
				uid +
				'">' +
				'    <input type="checkbox" id="demo-follow-switch-' +
				uid +
				'" class="mdl-switch__input">' +
				'    <span class="mdl-switch__label">Follow</span>' +
				'  </label>' +
				'</div>';

			// Create the DOM element from the HTML.
			var div = document.createElement('div');
			div.innerHTML = userTemplate;
			var userElement = div.firstChild;
			this.usersContainer.appendChild(userElement);

			// Activate the Material Design Lite Switch element.
			var materialSwitchContainer = userElement.getElementsByClassName('mdl-switch')[0];
			if (componentHandler) {
				componentHandler.upgradeElement(materialSwitchContainer);
			}

			// Listen for the Switch state from the Realtime database.
			var switchElement = document.getElementById('demo-follow-switch-' + uid);
			var followUserRef = firebase.firestore().collection('followers/' + uid + '/' + this.currentUid);
			followUserRef.onSnapshot('value', function(followSnapshot) {
				switchElement.checked = !!followSnapshot.value();
				if (materialSwitchContainer.MaterialSwitch) {
					materialSwitchContainer.MaterialSwitch.checkDisabled();
					materialSwitchContainer.MaterialSwitch.checkToggleState();
				}
			});

			// Listen for switch state changes from the user.
			switchElement.addEventListener('change', function() {
				followUserRef.set(!!switchElement.checked);
			});
		}.bind()
	);

};




loadPeople();
