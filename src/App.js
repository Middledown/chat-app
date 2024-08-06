import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import ChatComponent from './ChatComponent';
import ImageUploader from './ImageUploader';

const App = () => {
    return (
        <Router>
            <div>
                <h1>Chat Application</h1>
                <nav>
                    <Link to="/">Chat</Link>
                    <Link to="/upload">Image Upload</Link>
                </nav>
                <Routes>
                    <Route path="/" element={<ChatComponent roomId="general" />} />
                    <Route path="/upload" element={<ImageUploader />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
