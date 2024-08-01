import React, { useState, useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import axios from 'axios';

const ChatComponent = ({ crewId = 2 }) => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [sender, setSender] = useState(''); // 사용자 입력을 위한 sender 상태
    const [isConnected, setIsConnected] = useState(false);
    const clientRef = useRef(null);
    const subscriptionRef = useRef(null); // 구독 객체 저장

    useEffect(() => {
        fetchMessages(); // 컴포넌트 마운트 시 메시지 가져오기
        connect();

        return () => {
            disconnect();
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe(); // 구독 해제
                subscriptionRef.current = null; // 구독 객체 초기화
            }
        };
    }, [crewId]); // crewId가 변경될 때마다 메시지 재가져오기

    const fetchMessages = async () => {
        try {
            const response = await axios.get(`http://localhost:8080/api/chats/${crewId}`);
            setMessages(response.data);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const connect = () => {
        const socket = new SockJS('http://localhost:8080/ws');
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
        if (!subscriptionRef.current) { // 중복 구독 방지
            setIsConnected(true);
            subscriptionRef.current = clientRef.current.subscribe('/topic/messages', onMessageReceived);
        }
    };

    const onMessageReceived = (message) => {
        const chatMessage = JSON.parse(message.body);
        setMessages((prevMessages) => {
            const isDuplicate = prevMessages.some(msg => msg.id === chatMessage.id);
            if (!isDuplicate) {
                return [...prevMessages, chatMessage]; // 새로운 메시지 추가
            }
            return prevMessages; // 중복인 경우 기존 메시지 유지
        });
    };

    const sendMessage = () => {
        if (isConnected && clientRef.current && sender && message.trim()) { // 메시지가 공백이 아닐 경우
            const chatMessage = {
                id: Date.now(), // 고유 ID로 타임스탬프 사용
                sender,
                message,
                crewId,
            };
            clientRef.current.publish({
                destination: '/app/send',
                body: JSON.stringify(chatMessage),
            });
            setMessage('');
        } else {
            console.error("Client is not connected, sender is empty, or message is empty.");
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
            <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Enter your name"
            />
            {sender && ( // sender가 입력되면 메시지 내역을 표시
                <div style={{ marginBottom: '10px' }}>
                    {messages.map((msg) => (
                        <div key={msg.id} style={{
                            textAlign: msg.sender === sender ? 'right' : 'left',
                            margin: '5px 0'
                        }}>
                            <strong>{msg.sender}:</strong> {msg.message}
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
            <button onClick={sendMessage} disabled={!isConnected || !sender || !message.trim()}>Send</button>
        </div>
    );
};

export default ChatComponent;
