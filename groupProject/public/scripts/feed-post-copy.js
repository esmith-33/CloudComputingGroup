/**
 * Copyright 2018 Google Inc. All Rights Reserved.
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

// Signs-in Friendly Chat.
function signIn() {
    // Sign into Firebase using popup auth & Google as the identity provider.
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
}

// Signs-out.
function signOut() {
    // Sign out of Firebase.
    firebase.auth().signOut();
}


window.onload = function () {
    initApp();
};

// Initiate Firebase Auth.
function initFirebaseAuth() {
    // Listen to auth state changes.
    firebase.auth().onAuthStateChanged(authStateObserver);
}

// Returns the signed-in user's profile pic URL.
function getProfilePicUrl() {
    return firebase.auth().currentUser.photoURL || '/images/profile_placeholder.png';
}

// Returns the signed-in user's display name.
function getUserName() {
    return firebase.auth().currentUser.displayName;
}


// Returns true if a user is signed-in.
function isUserSignedIn() {
    return !!firebase.auth().currentUser;
}

// Saves a new Feeds to your Cloud Firestore database.
function saveFeeds(FeedText) {
    // Add a new Feeds entry to the database.
    return firebase.firestore().collection('Feeds').add({
        name: getUserName(),
        text: FeedText,
        profilePicUrl: getProfilePicUrl(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function (error) {
        console.error('Error writing new Feeds to database', error);
    });
}

// Loads chat Feeds history and listens for upcoming ones.
function loadFeeds() {
    // Create the query to load the last 12 Feeds and listen for new ones.
    var query = firebase.firestore()
        .collection('Feeds')
        .orderBy('timestamp', 'desc')
        .limit(12);

    // Start listening to the query.
    query.onSnapshot(function (snapshot) {
        snapshot.docChanges().forEach(function (change) {
            if (change.type === 'removed') {
                deleteFeeds(change.doc.id);
            } else {
                var Feeds = change.doc.data();
                displayFeeds(change.doc.id, Feed.timestamp, Feed.name,
                    Feed.text, Feed.profilePicUrl, Feed.imageUrl);
            }
        });
    });
}

// Saves a new Feeds containing an image in Firebase.
// This first saves the image in Firebase storage.
function saveImageFeeds(file) {
    // 1 - We add a Feeds with a loading icon that will get updated with the shared image.
    firebase.firestore().collection('Feeds').add({
        name: getUserName(),
        imageUrl: LOADING_IMAGE_URL,
        profilePicUrl: getProfilePicUrl(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function (FeedsRef) {
        // 2 - Upload the image to Cloud Storage.
        var filePath = firebase.auth().currentUser.uid + '/' + FeedsRef.id + '/' + file.name;
        return firebase.storage().ref(filePath).put(file).then(function (fileSnapshot) {
            // 3 - Generate a public URL for the file.
            return fileSnapshot.ref.getDownloadURL().then((url) => {
                // 4 - Update the chat Feeds placeholder with the image's URL.
                return FeedsRef.update({
                    imageUrl: url,
                    storageUri: fileSnapshot.metadata.fullPath
                });
            });
        });
    }).catch(function (error) {
        console.error('There was an error uploading a file to Cloud Storage:', error);
    });
}

// Saves the messaging device token to the datastore.
function saveMessagingDeviceToken() {
    firebase.messaging().getToken().then(function (currentToken) {
        if (currentToken) {
            console.log('Got FCM device token:', currentToken);
            // Saving the Device Token to the datastore.
            firebase.firestore().collection('fcmTokens').doc(currentToken)
                .set({ uid: firebase.auth().currentUser.uid });
        } else {
            // Need to request permissions to show notifications.
            requestNotificationsPermissions();
        }
    }).catch(function (error) {
        console.error('Unable to get messaging token.', error);
    });
}

// Requests permission to show notifications.
function requestNotificationsPermissions() {
    console.log('Requesting notifications permission...');
    firebase.messaging().requestPermission().then(function () {
        // Notification permission granted.
        saveMessagingDeviceToken();
    }).catch(function (error) {
        console.error('Unable to get permission to notify.', error);
    });
}

// Triggered when a file is selected via the media picker.
function onMediaFileSelected(event) {
    event.preventDefault();
    var file = event.target.files[0];

    // Clear the selection in the file picker input.
    imageFormElement.reset();

    // Check if the file is an image.
    if (!file.type.match('image.*')) {
        var data = {
            message: 'You can only share images',
            timeout: 2000
        };
        signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
        return;
    }
    // Check if the user is signed-in
    if (checkSignedInWithFeeds()) {
        saveImageFeeds(file);
    }
}

// Triggered when the send new Feeds form is submitted.
function onFeedsFormSubmit(e) {
    e.preventDefault();
    // Check that the user entered a Feeds and is signed in.
    if (FeedsInputElement.value && checkSignedInWithFeeds()) {
        saveFeeds(FeedsInputElement.value).then(function () {
            // Clear Feeds text field and re-enable the SEND button.
            resetMaterialTextfield(FeedsInputElement);
            toggleButton();
        });
    }
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
    if (user) { // User is signed in!
        // Get the signed-in user's profile pic and name.
        var profilePicUrl = getProfilePicUrl();
        var userName = getUserName();

        // Set the user's profile pic and name.
        userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
        userNameElement.textContent = userName;

        // Show user's profile and sign-out button.
        userNameElement.removeAttribute('hidden');
        userPicElement.removeAttribute('hidden');
        signOutButtonElement.removeAttribute('hidden');

        // Hide sign-in button.
        signInButtonElement.setAttribute('hidden', 'true');

        // We save the Firebase Messaging Device token and enable notifications.
        saveMessagingDeviceToken();
    } else { // User is signed out!
        // Hide user's profile and sign-out button.
        userNameElement.setAttribute('hidden', 'true');
        userPicElement.setAttribute('hidden', 'true');
        signOutButtonElement.setAttribute('hidden', 'true');

        // Show sign-in button.
        signInButtonElement.removeAttribute('hidden');
    }
}

// Returns true if user is signed-in. Otherwise false and displays a Feeds.
function checkSignedInWithFeeds() {
    // Return true if the user is signed in Firebase
    if (isUserSignedIn()) {
        return true;
    }

    // Display a Feeds to the user using a Toast.
    var data = {
        message: 'You must sign-in first',
        timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
    element.value = '';
    element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

// Template for Feeds.
var FEED_TEMPLATE =
    '<div class="Feed-container">' +
    '<div class="spacing"><div class="pic"></div>' +
    '<div class="name"></div></div>' +
    '<div class="Feed"></div>' +
    '</div>';

// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
    if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
        return url + '?sz=150';
    }
    return url;
}

// A loading image URL.
var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';

// Delete a Feeds from the UI.
function deleteFeeds(id) {
    var div = document.getElementById(id);
    // If an element for that Feeds exists we delete it.
    if (div) {
        div.parentNode.removeChild(div);
    }
}

function createAndInsertFeeds(id, timestamp) {
    const container = document.createElement('div');
    container.innerHTML = FEED_TEMPLATE;
    const div = container.firstChild;
    div.setAttribute('id', id);

    // If timestamp is null, assume we've gotten a brand new Feeds.
    // https://stackoverflow.com/a/47781432/4816918
    timestamp = timestamp ? timestamp.toMillis() : Date.now();
    div.setAttribute('timestamp', timestamp);

    // figure out where to insert new Feeds
    const existingFeeds = FeedsListElement.children;
    if (existingFeeds.length === 0) {
        FeedsListElement.appendChild(div);
    } else {
        let FeedsListNode = existingFeeds[0];

        while (FeedsListNode) {
            const FeedsListNodeTime = FeedsListNode.getAttribute('timestamp');

            if (!FeedsListNodeTime) {
                throw new Error(
                    `Child ${FeedsListNode.id} has no 'timestamp' attribute`

                );
            }

            if (FeedsListNodeTime > timestamp) {
                break;
            }

            FeedsListNode = FeedsListNode.nextSibling;
        }

        FeedsListElement.insertBefore(div, FeedsListNode);
    }

    return div;
}

// Displays a Feeds in the UI.
function displayFeeds(id, timestamp, name, text, picUrl, imageUrl) {
    var div = document.getElementById(id) || createAndInsertFeeds(id, timestamp);

    // profile picture
    if (picUrl) {
        div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
    }

    div.querySelector('.name').textContent = name;
    var FeedsElement = div.querySelector('.Feed');

    if (text) { // If the Feeds is text.
        FeedsElement.textContent = text;
        // Replace all line breaks by <br>.
        FeedsElement.innerHTML = FeedsElement.innerHTML.replace(/\n/g, '<br>');
    } else if (imageUrl) { // If the Feeds is an image.
        var image = document.createElement('img');
        image.addEventListener('load', function () {
            FeedsListElement.scrollTop = FeedsListElement.scrollHeight;
        });
        image.src = imageUrl + '&' + new Date().getTime();
        FeedsElement.innerHTML = '';
        FeedsElement.appendChild(image);
    }
    // Show the card fading-in and scroll to view the new Feeds.
    setTimeout(function () { div.classList.add('visible') }, 1);
    FeedsListElement.scrollTop = FeedsListElement.scrollHeight;
    FeedsInputElement.focus();
}

// Enables or disables the submit button depending on the values of the input
// fields.
function toggleButton() {
    if (FeedsInputElement.value) {
        submitButtonElement.removeAttribute('disabled');
    } else {
        submitButtonElement.setAttribute('disabled', 'true');
    }
}

// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
    if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
            'Make sure you go through the codelab setup instructions and make ' +
            'sure you are running the codelab using `firebase serve`');
    }
}

// Checks that Firebase has been imported.
checkSetup();

// Shortcuts to DOM Elements.
var FeedsListElement = document.getElementById('Feeds');
var FeedsFormElement = document.getElementById('Feed-form');
var FeedsInputElement = document.getElementById('Feed');
var submitButtonElement = document.getElementsByName('submit');
var imageButtonElement = document.getElementById('submitImage');
var imageFormElement = document.getElementById('image-form');
var mediaCaptureElement = document.getElementById('mediaCapture');
var userPicElement = document.getElementById('user-pic');
var userNameElement = document.getElementById('user-name');
var signInButtonElement = document.getElementById('sign-in');
var signOutButtonElement = document.getElementById('sign-out');
var signInSnackbarElement = document.getElementById('must-signin-snackbar');

// Saves Feeds on form submit.
FeedsFormElement.addEventListener('submit', onFeedsFormSubmit);
signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);

// Toggle for the button.
FeedsInputElement.addEventListener('keyup', toggleButton);
FeedsInputElement.addEventListener('change', toggleButton);

// Events for image upload.
imageButtonElement.addEventListener('click', function (e) {
    e.preventDefault();
    mediaCaptureElement.click();
});
mediaCaptureElement.addEventListener('change', onMediaFileSelected);

// initialize Firebase
initFirebaseAuth();

// TODO: Initialize Firebase Performance Monitoring.
firebase.performance();

// We load currently existing chat Feeds and listen to new ones.
loadFeeds();