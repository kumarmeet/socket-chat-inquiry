const knex = require("knex");
const config = require("../knexfile");
const db = knex(config.development);

// const initiateChat = async (data) => {
//   try {
//     return await db('chats').insert(data);
//   } catch (err) {
//     console.log(err);
//     throw err;
//   }
// };

const getChatMessagesData = async (chatId) => {
  try {
    const chat = await db('chat_messages')
      .where('chat_id', chatId)
      .orderBy('created_at', "DESC");

    await db('chat_messages').where('chat_id', chatId).update({ is_read: 1 });

    return chat;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const getChatUsers = async () => {
  try {
    // const chatUsers = await db('chat_messages')
    //   .distinct('chat_messages.user_id')
    //   .join('users', 'users.id', '=', 'chat_messages.user_id')
    //   .select('chat_messages.*', 'users.*')

    const chatUsers = await db('chat_messages')
      .distinct('users.id')
      .join('users', 'users.id', '=', 'chat_messages.user_id')
      .select('users.*', "chat_messages.chat_id as chat_id");

    return chatUsers;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const getReadChatMessagesData = async (chatId, userId) => {
  try {
    const chat = await db('chat_messages')
      .where('chat_id', chatId)
      .andWhere('user_id', userId)
      .andWhere('is_read', 1)
      .orderBy('created_at', "DESC");

    return chat;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const getUnreadChatMessagesData = async (chatId, userId) => {
  try {
    const chat = await db('chat_messages')
      .where('chat_id', chatId)
      .andWhere('user_id', userId)
      .andWhere('is_read', 0)
      .orderBy('created_at', "DESC");

    return chat;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

module.exports = {
  // initiateChat,
  getChatMessagesData,
  getReadChatMessagesData,
  getUnreadChatMessagesData,
  getChatUsers
};
