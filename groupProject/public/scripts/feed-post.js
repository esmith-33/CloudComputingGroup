/**
 * Copyright 2015 Google Inc. All Rights Reserved.
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

// Shortcuts to DOM Elements.
var FeedForm = document.getElementById('comment-area-box'); //used
var FeedInput = document.getElementById('form-control'); ///used
var addPost = document.getElementById('add-post'); //used
var addButton = document.getElementById('add'); //used
var recentPostsSection = document.getElementById('recent-posts-list'); //used
var userPostsSection = document.getElementById('user-posts-list'); //used
var listeningFirebaseRefs = [];

function writeNewPost(uid, username, picture, body) {
	// A post entry.
	var postData = {
		author: username,
		uid: uid,
		body: body,
		title: title,
		starCount: 0,
		authorPic: picture
	};

	// Get a key for a new Post.
	var newPostKey = firebase.database().ref().child('posts').push().key;

	// Write the new post's data simultaneously in the posts list and the user's post list.
	var updates = {};
	updates['/posts/' + newPostKey] = postData;
	updates['/user-posts/' + uid + '/' + newPostKey] = postData;

	return firebase.database().ref().update(updates);
}

/**
 * Star/unstar post.
 */
// [START post_stars_transaction]
function toggleStar(postRef, uid) {
	postRef.transaction(function(post) {
		if (post) {
			if (post.stars && post.stars[uid]) {
				post.starCount--;
				post.stars[uid] = null;
			} else {
				post.starCount++;
				if (!post.stars) {
					post.stars = {};
				}
				post.stars[uid] = true;
			}
		}
		return post;
	});
}
// [END post_stars_transaction]

/**
 * Creates a post element. THIS IS AFTER THE POST HAS BEEN WRITTEN
 */
function createPostElement(postId, text, author, authorId, authorPic) {
	var uid = firebase.auth().currentUser.uid;

	var html =
		'<div class="post post-' +
		postId +
		' mdl-cell mdl-cell--12-col ' +
		'mdl-cell--6-col-tablet mdl-cell--4-col-desktop mdl-grid mdl-grid--no-spacing">' +
		'<div class="mdl-card mdl-shadow--2dp">' +
		'</div>' +
		'<div class="header">' +
		'<div>' +
		'<div class="avatar"></div>' +
		'<div class="username mdl-color-text--black"></div>' +
		'</div>' +
		'</div>' +
		'<span class="star">' +
		'<div class="not-starred material-icons">star_border</div>' +
		'<div class="starred material-icons">star</div>' +
		'<div class="star-count">0</div>' +
		'</span>' +
		'<div class="text"></div>' + /////////from the textarea
		'</div>' +
		'</form>' +
		'</div>' +
		'</div>';

	// Create the DOM element from the HTML.
	var div = document.createElement('div');
	div.innerHTML = html;
	var postElement = div.firstChild;
	if (componentHandler) {
		componentHandler.upgradeElements(postElement.getElementsByClassName('mdl-textfield')[0]);
	}

	var star = postElement.getElementsByClassName('starred')[0];
	var unStar = postElement.getElementsByClassName('not-starred')[0];

	// Set values.
	postElement.getElementsByClassName('text')[0].innerText = text;

	postElement.getElementsByClassName('username')[0].innerText = author || 'Anonymous';
	postElement.getElementsByClassName('avatar')[0].style.backgroundImage =
		'url("' + (authorPic || './silhouette.jpg') + '")';

	// Listen for comments.
	// [START child_event_listener_recycler]

	// [END child_event_listener_recycler]

	// Listen for likes counts.
	// [START post_value_event_listener]
	var starCountRef = firebase.database().ref('posts/' + postId + '/starCount');
	starCountRef.on('value', function(snapshot) {
		updateStarCount(postElement, snapshot.val());
	});
	// [END post_value_event_listener]

	// Listen for the starred status.
	var starredStatusRef = firebase.database().ref('posts/' + postId + '/stars/' + uid);
	starredStatusRef.on('value', function(snapshot) {
		updateStarredByCurrentUser(postElement, snapshot.val());
	});

	// Keep track of all Firebase reference on which we are listening.
	listeningFirebaseRefs.push(starCountRef);
	listeningFirebaseRefs.push(starredStatusRef);

	// Bind starring action.
	var onStarClicked = function() {
		var globalPostRef = firebase.database().ref('/posts/' + postId); ////feed
		var userPostRef = firebase.database().ref('/user-posts/' + authorId + '/' + postId); /////profile
		toggleStar(globalPostRef, uid);
		toggleStar(userPostRef, uid);
	};
	unStar.onclick = onStarClicked;
	star.onclick = onStarClicked;

	return postElement;
}

function updateStarredByCurrentUser(postElement, starred) {
	if (starred) {
		postElement.getElementsByClassName('starred')[0].style.display = 'inline-block';
		postElement.getElementsByClassName('not-starred')[0].style.display = 'none';
	} else {
		postElement.getElementsByClassName('starred')[0].style.display = 'none';
		postElement.getElementsByClassName('not-starred')[0].style.display = 'inline-block';
	}
}

function updateStarCount(postElement, nbStart) {
	postElement.getElementsByClassName('star-count')[0].innerText = nbStart;
}

/**
 * Starts listening for new posts and populates posts lists.
 */
function startDatabaseQueries() {
	// [START my_top_posts_query]
	var myUserId = firebase.auth().currentUser.uid;
	// [END my_top_posts_query]
	// [START recent_posts_query]
	var recentPostsRef = firebase.database().ref('posts').limitToLast(100); ///////feed////
	// [END recent_posts_query]
	var userPostsRef = firebase.database().ref('user-posts/' + myUserId); //////profile////

	var fetchPosts = function(postsRef, sectionElement) {
		postsRef.on('child_added', function(data) {
			var author = data.val().author || 'Anonymous';
			var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
			containerElement.insertBefore(
				createPostElement(data.key, data.val().body, author, data.val().uid, data.val().authorPic),
				containerElement.firstChild
			);
		});
		postsRef.on('child_changed', function(data) {
			var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
			var postElement = containerElement.getElementsByClassName('post-' + data.key)[0];
			postElement.getElementsByClassName('username')[0].innerText = data.val().author;
			postElement.getElementsByClassName('text')[0].innerText = data.val().body;
			postElement.getElementsByClassName('star-count')[0].innerText = data.val().starCount;
		});
		postsRef.on('child_removed', function(data) {
			var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
			var post = containerElement.getElementsByClassName('post-' + data.key)[0];
			post.parentElement.removeChild(post);
		});
	};

	// Fetching and displaying all posts of each sections.

	fetchPosts(recentPostsRef, recentPostsSection); //////////feed////////////
	fetchPosts(userPostsRef, userPostsSection); ///////////profile////////

	// Keep track of all Firebase refs we are listening to.

	listeningFirebaseRefs.push(recentPostsRef); //feed
	listeningFirebaseRefs.push(userPostsRef); //profile
}

/**
 * Writes the user's data to the database.
 */
// [START basic_write]
function writeUserData(userId, name, email, imageUrl) {
	firebase.database().ref('users/' + userId).set({
		username: name,
		email: email,
		profile_picture: imageUrl
	});
}
// [END basic_write]

function cleanupUi() {
	// Remove all previously displayed posts.

	recentPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
	userPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';

	// Stop all currently listening Firebase listeners.
	listeningFirebaseRefs.forEach(function(ref) {
		ref.off();
	});
	listeningFirebaseRefs = [];
}

function newPostForCurrentUser(text) {
	// [START single_value_read]
	var userId = firebase.auth().currentUser.uid;
	return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
		var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
		// [START_EXCLUDE]
		return writeNewPost(firebase.auth().currentUser.uid, username, firebase.auth().currentUser.photoURL, text);
		// [END_EXCLUDE]
	});
	// [END single_value_read]
}

// Bindings on load.
window.addEventListener(
	'load',
	function() {
		// Bind Sign in button.
		signInButton.addEventListener('click', function() {
			var provider = new firebase.auth.GoogleAuthProvider();
			firebase.auth().signInWithPopup(provider);
		});

		// Bind Sign out button.
		signOutButton.addEventListener('click', function() {
			firebase.auth().signOut();
		});

		// Listen for auth state changes
		firebase.auth().onAuthStateChanged(onAuthStateChanged);

		// Saves message on form submit.
		// Saves message on form submit.
		messageForm.onsubmit = function(e) {
			e.preventDefault();
			var text = messageInput.value;

			if (text && title) {
				newPostForCurrentUser(text).then(function() {
					myPostsMenuButton.click();
				});
				messageInput.value = '';
			}
		};

		myPostsMenuButton.onclick = function() {
			showSection(userPostsSection);
		};

		// addButton.onclick = function () {
		//     showSection(addPost);
		//     messageInput.value = '';

		// };
	},
	false
);
