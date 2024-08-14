import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import axios from 'axios';

// JWT 토큰을 상수로 정의
const token = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiVVNFUiIsIm1lbWJlcklkIjoxMDYsImlhdCI6MTcyMzUyNjQ0NiwiZXhwIjoxNzI0MTMxMjQ2fQ.YfdbjGJVbUikf9yHmMySUm4eTP2y-q5LI0OSYOYI1TM';

// Axios 기본 설정 및 인터셉터 추가
axios.defaults.baseURL = 'http://localhost:8082'; // 기본 URL 설정
axios.interceptors.request.use(config => {
    config.headers['Authorization'] = `Bearer ${token}`; // 모든 요청에 JWT 토큰 추가
    return config;
}, error => {
    return Promise.reject(error);
});

const ChatComponent = ({ crewId = 1, receiverId = 22, senderId = 11 }) => {
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
            const response = await axios.get(`/api/v1/crews/${crewId}/chats`, {
                headers: {
                    Authorization: `Bearer ${token}` // 직접 헤더에 JWT 토큰 추가
                },
                params: {
                    senderId: senderId,
                    receiverId: receiverId
                }
            });
            console.log("Fetched messages:", response.data);
            if (Array.isArray(response.data)) {
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
            connectHeaders: {
                Authorization: `Bearer ${token}`, // JWT 토큰 추가
            },
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
