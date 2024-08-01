import React from 'react';
import ChatComponent from './ChatComponent';

const App = () => {
  return (
      <div>
        <h1>Chat Application</h1>
        <ChatComponent roomId="general" />
      </div>
  );
};

export default App;
