import { db } from './config';
import * as firebase from 'firebase/app';
const db = firebase.firestore();
const remove = firebase.firestore.FieldValue.arrayRemove;
const union = firebase.firestore.FieldValue.arrayUnion;

const follow = (followed, follower) => {
	const followersRef = db.collection('followers').doc(followed);

	followersRef.update({ users: union(follower) });
};

// Unfollow User

const unfollow = (followed, follower) => {
	const followersRef = db.collection('followers').doc(followed);

	followersRef.update({ users: remove(follower) });
};

//  Get posts of followers

const getFeed = async () => {
	const followedUsers = await db
		.collection('followers')
		.where('users', 'array-contains', searchQuery)
		.orderBy('lastPost', 'desc')
		.limit(10)
		.get();

	const data = followedUsers.docs.map((doc) => doc.data());

	const posts = data.reduce((acc, cur) => acc.concat(cur.recentPosts), []);

	const sortedPosts = posts.sort((a, b) => b.published - a.published);

	//render sortedPosts in DOM
};
