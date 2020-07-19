// Imports the Google Cloud client library
const {PubSub} = require('@google-cloud/pubsub');

async function quickstart(
  projectId = 'cs403-5cc4c', // Your Google Cloud Platform project ID
  topicName = 'Test' // Name for the new topic to create
) {
  // Instantiates a client
  const pubsub = new PubSub({projectId});

  // Creates the new topic
  const [topic] = await pubsub.createTopic(topicName);
  console.log(`Topic ${topic.name} created.`);
}