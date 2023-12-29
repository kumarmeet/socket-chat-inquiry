// ChatSocket.js
const knex = require("knex");
// const socketio = require("socket.io");
const config = require("../knexfile");
const { pushNotification } = require("./push_notification_service");
const db = knex(config.development);

class InquiryChatSocket {
    constructor(server) {
        this.io = server;
        this.io.of('v1/customers/chat').on('connection', this.handleConnect.bind(this));
    }

    async handleConnect(socket) {
        console.log("Connected to socket");

        console.log(socket.nsp.name);

        socket.on('join', (joinedData) => {
            console.log("TOTAL CLIENT ->", this.io.engine.clientsCount);

            console.log("JOINED", joinedData);
            return this.handleJoin(socket, joinedData)
        });

        socket.on('message', (messageData) => {
            console.log("MESSAGE");
            return this.handleMessage(socket, messageData)
        });

        socket.on('read', (readData) => {
            console.log("READ");
            return this.handleReadMessage(socket, readData)
        });

        socket.on('leave', (user_id, chat_id) => {
            console.log("LEAVE");
            return this.handleLeave(socket, +user_id, +chatId)
        });
    }

    async handleJoin(socket, joinedData) {
        const { user_id, chat_id, inquiry_id } = joinedData;
        try {
            // Perform database check if the inqury exists
            // const hasInquiry = await db('inquries').where({ id: inquiry_id }).first();

            // if (!hasInquiry) {
            //     socket.emit('error', 'Inquiry not found');
            //     return
            // }


            // if (hasInquiry.Customer_Id !== user_id) {
            //     socket.emit('error', 'Unauthorized');
            //     return
            // }

            // Perform database check if the chat exists
            const chat = await db('chats').where({ id: chat_id }).first();
            if (chat) {
                socket.join(chat_id);
                socket.emit('join', joinedData);
            } else {
                socket.emit('error', 'Chat not found');
                return
            }
        } catch (error) {
            console.error('Error during join:', error);
            socket.emit('error', 'Internal server error');
        }
    }

    async handleMessage(socket, messageData) {
        const { user_id, inquiry_id, chat_id, chat_message, type, media_file } = messageData;
        try {
            // Perform database check if the chat exists
            const chat = await db('chats').where({ id: chat_id }).first();
            const inquiryData = await db("inquries").where({ id: inquiry_id }).first();

            if (!inquiryData) {
                socket.emit('error', 'Inquiry not found');
                return
            }

            if (chat) {
                const { User_Name: customer_name, Customer_Id: customer_id, Assigned_To: assigned_to_name, inquiry_type } = inquiryData;


                // Insert the message into the database
                const [message_id] = await db('chat_messages').insert({
                    chat_id: chat_id,
                    user_id: user_id,
                    chat_message: chat_message,
                    chat_message_type: type, //text, image, audio, video, document
                    media_file: media_file, //path of the media file otherwise null
                    is_read: 0
                });


                const insertedMessageData = await db('chat_messages').where({ id: message_id }).first();

                socket.emit("message", {
                    status: "success",
                    messageData: insertedMessageData,
                    message_id,
                    assigned_to_name
                });

                console.log("insertedMessageData", insertedMessageData);

                // Broadcast the message to all members of the chat
                socket.to(chat_id).emit('message', { user_id, messageData: insertedMessageData, message_id, assigned_to_name });

                const notificationData = {
                    id: chat_id,
                    inquiry_id: inquiry_id,
                    type: "inquiry_chat",
                    customer_id,
                    title: `${inquiry_type} #${inquiry_id}`,
                    body: chat_message
                }

                //send push notification to other member (message reciver)
                await pushNotification('inquiry_chat', customer_id, notificationData);
            } else {
                socket.emit('error', 'Chat not found');
                return
            }
        } catch (error) {
            console.error('Error during message handling:', error);
            socket.emit('error', 'Internal server error');
        }
    }

    async handleReadMessage(socket, readData) {
        const { user_id, chat_id, message_id } = readData;
        try {
            // Perform database check if the chat exists
            const chatMessage = await db('chat_messages').where({ id: message_id }).first();

            if (chatMessage) {
                // update read status of the message into the database
                await db('chat_messages').where({ id: message_id }).update({ is_read: 1 })
                // Broadcast the message to all members of the chat
                socket.emit('read', { readData });
            } else {
                socket.emit('error', 'Message not found');
                return
            }
        } catch (error) {
            console.error('Error during message handling:', error);
            socket.emit('error', 'Internal server error');
        }
    }

    async handleLeave(socket, user_id, chat_id) {
        try {
            socket.leave(chat_id);
            socket.emit('leave', `User ${user_id} left chat ${chat_id}`);
        } catch (error) {
            console.error('Error during leave:', error);
            socket.emit('error', 'Internal server error');
        }
    }
}

module.exports = InquiryChatSocket;
