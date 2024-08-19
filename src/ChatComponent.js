import React, { useState, useEffect, useRef, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // jwt-decode 라이브러리에서 명시적으로 가져오기

const token = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiVVNFUiIsIm1lbWJlcklkIjoxMTgsImlhdCI6MTcyNDA1MzAyOSwiZXhwIjoxNzI0NjU3ODI5fQ.qusqtfXUC-zu_-gF22Ie_2BwEx8WnrVGYGbRtje7FuY'; // 실제 토큰으로 교체하세요

// Axios 기본 설정
axios.defaults.baseURL = 'http://localhost:8082';
axios.interceptors.request.use(config => {
    config.headers['Authorization'] = `Bearer ${token}`;
    return config;
}, error => {
    return Promise.reject(error);
});

const ChatComponent = ({ crewId = 1, receiverId = 106 }) => {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const clientRef = useRef(null);
    const subscriptionRef = useRef(null);

    // JWT 토큰에서 memberId 추출
    const { memberId: senderId } = jwtDecode(token); // memberId를 senderId로 설정

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
            const params = {};
            if (receiverId) {
                params.receiverId = receiverId; // receiverId가 있을 경우에만 추가
            }
            const response = await axios.get(`/api/v1/crews/${crewId}/chats`, { params });
            if (Array.isArray(response.data)) {
                const validMessages = response.data.filter(msg => msg && msg.data.senderId !== undefined && msg.data.message !== undefined);
                setMessages(validMessages);
            } else {
                console.error("예상치 못한 응답 형식:", response.data);
            }
        } catch (error) {
            console.error("메시지 가져오기 오류:", error);
            if (error.response && error.response.status === 404) {
                setError("토큰이 유효하지 않습니다. 다시 로그인 해주세요.");
            } else {
                setError("메시지를 가져오는 데 실패했습니다.");
            }
        }
    };

    const connect = () => {
        const socket = new SockJS('http://localhost:8082/ws');
        clientRef.current = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${token}` // JWT 토큰을 헤더에 추가
            },
            onConnect: onConnected,
            debug: (str) => console.log(str),
            onStompError: (frame) => {
                console.error('브로커 오류: ' + frame.headers['message']);
                setError("WebSocket 연결 오류: " + frame.headers['message']);
            }
        });
        clientRef.current.activate();
    };

    const onConnected = () => {
        console.log("WebSocket 연결 성공");
        if (!subscriptionRef.current) {
            setIsConnected(true);
            subscriptionRef.current = clientRef.current.subscribe('/topic/messages', onMessageReceived);
        }
    };

    const onMessageReceived = (message) => {
        const chatMessage = JSON.parse(message.body);
        if (chatMessage && chatMessage.data !== undefined) {
            setMessages((prevMessages) => {
                const isDuplicate = prevMessages.some(msg => msg.data.id === chatMessage.id);
                if (!isDuplicate) {
                    return [...prevMessages, chatMessage];
                }
                return prevMessages;
            });
        }
    };

    const sendMessage = useCallback(() => {
        if (isConnected && clientRef.current && message.trim()) {
            const chatMessage = { senderId, receiverId, message, crewId };
            clientRef.current.publish({
                destination: `/app/send/${crewId}`,
                body: JSON.stringify(chatMessage),
            });
            setMessage('');
        } else {
            console.error("클라이언트가 연결되어 있지 않거나 메시지가 비어 있습니다.");
        }
    }, [isConnected, message, senderId, receiverId, crewId]);

    const disconnect = () => {
        if (clientRef.current) {
            clientRef.current.deactivate();
        }
        setIsConnected(false);
    };

    return (
        <div>
            <h2>채팅방: {crewId}</h2>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            {messages.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
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
                placeholder="메시지를 입력하세요"
            />
            <button onClick={sendMessage} disabled={!isConnected || !message.trim()}>전송</button>
        </div>
    );
};

export default ChatComponent;