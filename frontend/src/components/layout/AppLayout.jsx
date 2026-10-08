import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const AppLayout = ({ title, children }) => {
  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: '#f8fafc' }}>
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Area (Navbar + Screen Content) */}
      <div className="d-flex flex-column flex-grow-1 overflow-x-hidden">
        <Navbar title={title} />
        <main className="flex-grow-1 p-4 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;