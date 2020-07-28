var UsersRef = firebase.firestore().collection('Users');
const db = firebase.firestore();
var searchQuery = UsersRef.where('name', '>=', SearchInputElement);

var SearchFormElement = document.getElementById('search-forms');
var SearchInputElement = document.getElementById('search-people');
var SearchButtonElement = document.getElementById('submit-search');
var SearchButtonElement = document.getElementById('submit-search');

function searchPeople() {
	searchQuery()
		.get()
		.then(function(querySnapshot) {
			querySnapshot.forEach(function(doc) {
				// doc.data() is never undefined for query doc snapshots
				console.log(doc.id, ' => ', doc.data());
			});
		})
		.catch(function(error) {
			console.log('Error getting documents: ', error);
		});
}
function onSearchFormSubmit(e) {
	e.preventDefault();
	// Check that the user entered a value
	if (SearchInputElement.value) {
		resetMaterialTextfield(SearchInputElement).then(function() {
			// Clear Feed text field and re-enable the SEND button.
			toggleSearchButton();
		});
	}
}
function toggleSearchButton() {
	if (searchInputElement.value) {
		SearchtButtonElement.removeAttribute('disabled');
	} else {
		SearchButtonElement.setAttribute('disabled', 'true');
	}
}
function displayUsers() {
	usersRef.on('child_added', function(snapshot) {
		// Create the HTML for a user.
		var photoURL = snapshot.val().photoURL || 'assets/images/users/profile_placeholder.png';
		var displayName = snapshot.val().displayName;
		var uid = snapshot.key;
		var userTemplates = '<div>' + displayName + '</div>';
	});
}
var div = document.createElement('div');
div.innerHTML = userTemplates;
var userElement = div.firstChild;
usersContainers.appendChild(userElement);
var usersContainer = document.getElementById('demo-all-users-list');
displayUsers();
