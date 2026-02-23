import React from 'react';

export const Template: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Template Page</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Template Content</h2>
          <p className="text-gray-600">
            This is a template page that can be used as a starting point for new pages in the application.
          </p>
        </div>
      </div>
    </div>
  );
};
