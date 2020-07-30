
'use strict';



// Loads chat Feeds history and listens for upcoming ones.
function loadNewsFeeds() {
	// Create the query to load the last 12 Feeds and listen for new ones.
	var query = firebase.firestore().collection('Feeds').orderBy('timestamp', 'desc').limit(12);
	
	// Start listening to the query.
	query.onSnapshot(function(snapshot) {
		snapshot.docChanges().forEach(function(change) {
			if (change.type === 'removed') {
				deleteFeed(change.doc.id);
			} else {
				var Feed = change.doc.data();
				displayFeed(change.doc.id, Feed.timestamp, Feed.name, Feed.text, Feed.profilePicUrl, Feed.imageUrl);
			}
		});
	});
}


function createAndInsertFeed(id, timestamp) {
	const container = document.createElement('div');
	container.innerHTML = Feed_TEMPLATE;
	const div = container.firstChild;
	div.setAttribute('id', id);

	// If timestamp is null, assume we've gotten a brand new Feed.
	// https://stackoverflow.com/a/47781432/4816918
	timestamp = timestamp ? timestamp.toMillis() : Date.now();
	div.setAttribute('timestamp', timestamp);

	// figure out where to insert new Feed
	const existingFeeds = FeedListElement.children;
	if (existingFeeds.length === 0) {
		FeedListElement.appendChild(div);
	} else {
		let FeedListNode = existingFeeds[0];

		while (FeedListNode) {
			const FeedListNodeTime = FeedListNode.getAttribute('timestamp');

			if (!FeedListNodeTime) {
				throw new Error(`Child ${FeedListNode.id} has no 'timestamp' attribute`);
			}

			if (FeedListNodeTime > timestamp) {
				break;
			}

			FeedListNode = FeedListNode.nextSibling;
		}

		FeedListElement.appendChild(div, FeedListNode);
	}

	return div;
}

// Displays a Feed in the UI.
function displayFeed(id, timestamp, name, text, picUrl, imageUrl) {
	var div = document.getElementById(id) || createAndInsertFeed(id, timestamp);

	// profile picture
	if (picUrl) {
		div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
	}

	div.querySelector('.name').textContent = name;
	var FeedElement = div.querySelector('.Feed');

	if (text) {
		// If the Feed is text.
		FeedElement.textContent = text;
		// Replace all line breaks by <br>.
		FeedElement.innerHTML = FeedElement.innerHTML.replace(/\n/g, '<br>');
	} else if (imageUrl) {
		// If the Feed is an image.
		var image = document.createElement('img');
		image.addEventListener('load', function() {
			FeedListElement.scrollTop = FeedListElement.scrollHeight;
		});
		image.src = imageUrl + '&' + new Date().getTime();
		FeedElement.innerHTML = '';
		FeedElement.appendChild(image);
	}
	// Show the card fading-in and scroll to view the new Feed.
	setTimeout(function() {
		div.classList.add('visible');
	}, 1);
	FeedListElement.scrollTop = FeedListElement.scrollHeight;
	FeedInputElement.focus();
}

// Shortcuts to DOM Elements.
var FeedListElement = document.getElementById('NewsFeeds');
var FeedFormElement = document.getElementById('Feed-forms');
var FeedInputElement = document.getElementById('Feed');
var submitButtonElement = document.getElementById('submit');
var imageButtonElement = document.getElementById('submitImages');
var imageFormElement = document.getElementById('image-forms');
var mediaCaptureElement = document.getElementById('mediaCapture');
var userPicElement = document.getElementById('user-pic');
var userNameElement = document.getElementById('user-name');
var signInButtonElement = document.getElementById('sign-in');
var signOutButtonElement = document.getElementById('sign-out');
var signInSnackbarElement = document.getElementById('must-signin-snackbar');




// We load currently existing chat Feeds and listen to new ones.
loadNewsFeeds();
