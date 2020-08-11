'use strict';
const db = firebase.firestore();
const remove = firebase.firestore.FieldValue.arrayRemove;
const union = firebase.firestore.FieldValue.arrayUnion;

const follow  = (followed, follower) => {
    const followersRef = db.collection('followers').doc(followed);

   followersRef.update({ users: union(follower) });
}

// 2. Unfollow User

export const unfollow  = (followed, follower) => {
    const followersRef = db.collection('followers').doc(followed);

    followersRef.update({ users: remove(follower) });
}



// 3. Get posts of followers

const getFeed = async () => {
	var email = firebase.auth().currentUser.email;
	const followedUsers = await db.collection('followers')
		.where('Users', 'array-contains', (email))
		.orderBy('Feeds', 'desc')
		.limit(10)
		.get();


	const data = followedUsers.docs.map(doc => doc.data());

	const Feeds = data.reduce((acc, cur) => acc.concat(cur.recentPosts), []);
 

	const sortedFeeds = Feeds.sort((a, b) => b.published - a.published)
}