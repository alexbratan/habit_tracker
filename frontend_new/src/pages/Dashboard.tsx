import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { CompactDashboard } from '../components/CompactDashboard';
import { Logo } from '../components/Logo';
import ChatbotModal from '../components/ChatbotModal';
import { Bot } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo size="md" showText={true} />
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsChatbotOpen(true)}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                title="AI Assistant"
              >
                <Bot className="w-5 h-5" />
              </button>
              <span className="text-gray-700 font-medium">Welcome, {user?.username || user?.email}</span>
              <button
                onClick={logout}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <CompactDashboard />
      </main>

      <ChatbotModal 
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />
    </div>
  );
};
