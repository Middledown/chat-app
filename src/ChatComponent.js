import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import axios from 'axios';

const ChatComponent = ({ crewId = 2 }) => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [sender, setSender] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef(null);
    const subscriptionRef = useRef(null);
    const messagesEndRef = useRef(null);

    // 고정된 시간을 지정
    const createDate = '2024-08-02T00:00:00'; // 원하는 시간으로 설정

    useEffect(() => {
        fetchMessages(createDate); // createDate을 인자로 전달
        connect();

        return () => {
            disconnect();
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, [crewId]);

    const fetchMessages = async (createDate) => {
        try {
            const response = await axios.get(`http://localhost:8082/api/v1/chats/${crewId}`, {
                params: { createDate } // createDate을 쿼리 파라미터로 전달
            });

            // 응답에서 첫 번째 요소의 data를 확인
            if (response.data && Array.isArray(response.data[0].data)) {
                setMessages(response.data[0].data);
            } else {
                console.error("API response is not an array:", response.data);
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
            onDisconnect: onDisconnected,
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

    const onDisconnected = () => {
        setIsConnected(false);
        alert("Disconnected from the chat. Attempting to reconnect...");
        setTimeout(connect, 5000); // 5초 후 재연결 시도
    };

    const onMessageReceived = (message) => {
        const chatMessage = JSON.parse(message.body);
        setMessages((prevMessages) => {
            const isDuplicate = prevMessages.some(msg => msg.id === chatMessage.id);
            if (!isDuplicate) {
                return [...prevMessages, chatMessage];
            }
            return prevMessages;
        });
    };

    const sendMessage = () => {
        if (isConnected && clientRef.current && sender && message.trim()) {
            const chatMessage = {
                sender,
                message,
                crewId
                // createDate // 고정된 LocalDateTime 포함
            };
            clientRef.current.publish({
                destination: '/app/send',
                body: JSON.stringify(chatMessage),
            });
            setMessage('');
        } else {
            alert("Unable to send message. Please check your connection and inputs.");
        }
    };

    const disconnect = () => {
        if (clientRef.current) {
            clientRef.current.deactivate();
        }
        setIsConnected(false);
        alert("Disconnected from the chat.");
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div>
            <h2>Chat Room: {crewId}</h2>
            <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Enter your name"
            />
            {sender && (
                <div style={{ marginBottom: '10px' }}>
                    {Array.isArray(messages) && messages.map((msg) => (
                        <div key={msg.id} style={{
                            textAlign: msg.sender === sender ? 'right' : 'left',
                            margin: '5px 0'
                        }}>
                            <strong>{msg.sender}:</strong> {msg.message} (시간: {msg.createDate}) {/* 시간 표시 */}
                        </div>
                    ))}
                    <div ref={messagesEndRef} /> {/* 메시지 끝을 참조하여 스크롤 */}
                </div>
            )}
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message"
            />
            <button onClick={sendMessage} disabled={!isConnected || !sender || !message.trim()}>Send</button>
        </div>
    );
};

export default ChatComponent;
