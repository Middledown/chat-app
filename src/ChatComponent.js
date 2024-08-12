import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import axios from 'axios';

const ChatComponent = ({ crewId = 1, receiverId = 33, senderId = 11 }) => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef(null);
    const subscriptionRef = useRef(null);

    useEffect(() => {
        fetchMessages();
        connect();

        return () => {
            disconnect();
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, [crewId]);

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`http://localhost:8082/api/v1/crews/${crewId}/chats`, {
                params: {
                    senderId: senderId,
                    receiverId: receiverId
                }
            });
            console.log("Fetched messages:", response.data);
            if (Array.isArray(response.data)) {
                // Ensure that each message has the expected structure
                const validMessages = response.data.filter(msg => msg && msg.data.senderId !== undefined && msg.data.message !== undefined);
                setMessages(validMessages);
            } else {
                console.error("Unexpected response format:", response.data);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const connect = () => {
        const socket = new SockJS('http://localhost:8082/ws');
        clientRef.current = new Client({
            webSocketFactory: () => socket,
            onConnect: onConnected,
            debug: (str) => {
                console.log(str);
            },
            onStompError: (frame) => {
                console.error('Broker error: ' + frame.headers['message']);
            }
        });
        clientRef.current.activate();
    };

    const onConnected = () => {
        if (!subscriptionRef.current) {
            setIsConnected(true);
            subscriptionRef.current = clientRef.current.subscribe('/topic/messages', onMessageReceived);
        }
    };

    const onMessageReceived = (message) => {
            const chatMessage = JSON.parse(message.body);
            console.log("Received message:", chatMessage);
            if (chatMessage && chatMessage.data.senderId !== undefined && chatMessage.data.message !== undefined) {
                setMessages((prevMessages) => {
                    const isDuplicate = prevMessages.some(msg => msg.data.id === chatMessage.id);
                    if (!isDuplicate) {
                        return [...prevMessages, chatMessage];
                    }
                    return prevMessages;
                });
            } else {
                console.error("Invalid message received:", chatMessage);
            }
    };

    const sendMessage = () => {
        if (isConnected && clientRef.current && message.trim() && senderId) {
            const chatMessage = {
                senderId,
                receiverId,
                message,
                crewId,
            };
            clientRef.current.publish({
                destination: '/app/send',
                body: JSON.stringify(chatMessage),
            });
            setMessage('');
        } else {
            console.error("Client is not connected, senderId is empty, or message is empty.");
        }
    };

    const disconnect = () => {
        if (clientRef.current) {
            clientRef.current.deactivate();
        }
        setIsConnected(false);
    };

    return (
        <div>
            <h2>Chat Room: {crewId}</h2>
            {messages && messages.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    {messages.map((msg) => (
                        // Ensure that msg has the expected structure
                        <div key={msg.data.id} style={{
                            textAlign: msg.data.senderId === senderId ? 'right' : 'left',
                            margin: '5px 0'
                        }}>
                            <strong>{msg.data.senderId}:</strong> {msg.data.message}
                        </div>
                    ))}
                </div>
            )}
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
            />
            <button onClick={sendMessage} disabled={!isConnected || !message.trim()}>Send</button>
        </div>
    );
};

export default ChatComponent;
