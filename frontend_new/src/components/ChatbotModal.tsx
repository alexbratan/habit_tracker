import React, { useState, useRef, useEffect } from 'react';
import { chatbotAPI, ChatMessage, ChatResponse } from '../api';
import { Send, Bot, User, Calendar, Clock, Plus, Check } from 'lucide-react';

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatbotModal: React.FC<ChatbotModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I\'m your AI habit assistant. I can help you create schedules, manage your habits, and provide personalized advice. How can I help you today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedSchedule, setSuggestedSchedule] = useState<any>(null);
  const [suggestedHabits, setSuggestedHabits] = useState<any[] | null>(null);
  const [isCreatingHabits, setIsCreatingHabits] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: ChatResponse = await chatbotAPI.chat({
        messages: [...messages, userMessage]
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.suggested_schedule) {
        setSuggestedSchedule(response.suggested_schedule);
      }
      
      if (response.suggested_habits) {
        setSuggestedHabits(response.suggested_habits);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const applySchedule = () => {
    // This would integrate with your existing habit/plan creation logic
    console.log('Applying schedule:', suggestedSchedule);
    // You could emit an event or call a callback prop here
  };

  const createSuggestedHabits = async () => {
    if (!suggestedHabits || suggestedHabits.length === 0) return;
    
    setIsCreatingHabits(true);
    try {
      const result = await chatbotAPI.createSuggestedHabits(suggestedHabits);
      
      // Add success message
      const successMessage: ChatMessage = {
        role: 'assistant',
        content: `Great! I've added ${result.habits.length} new habits to your list: ${result.habits.map((h: any) => h.name).join(', ')}.`
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Clear suggested habits
      setSuggestedHabits(null);
      
    } catch (error) {
      console.error('Error creating habits:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I had trouble adding those habits. Please try again.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCreatingHabits(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-xl relative cursor-move"
        style={{ 
          width: '420px', 
          maxWidth: '420px',
          transform: `translate(${position.x}px, ${position.y}px)`,
          userSelect: isDragging ? 'none' : 'auto'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-2 rounded-t-lg flex justify-between items-center cursor-move">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="font-medium text-sm">AI Assistant</span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="h-64 overflow-y-auto p-3 space-y-2">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 mt-1 flex-shrink-0" />
                  ) : (
                    <Bot className="w-5 h-5 mt-1 flex-shrink-0" />
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <div className="animate-pulse">Thinking...</div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Habits */}
        {suggestedHabits && suggestedHabits.length > 0 && (
          <div className="border-t p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Suggested Habits</h3>
            </div>
            <div className="mb-3 text-sm text-gray-700">
              <p>Would you like to add these habits to your list?</p>
              <ul className="mt-2 space-y-1">
                {suggestedHabits.map((habit: any, index: number) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>{habit.name} ({habit.default_duration} minutes)</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createSuggestedHabits}
                disabled={isCreatingHabits}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
              >
                {isCreatingHabits ? 'Adding...' : 'Add Habits'}
              </button>
              <button
                onClick={() => setSuggestedHabits(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors text-sm"
              >
                No Thanks
              </button>
            </div>
          </div>
        )}

        {/* Suggested Schedule */}
        {suggestedSchedule && (
          <div className="border-t p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Suggested Schedule</h3>
            </div>
            <div className="mb-3 text-sm text-gray-700">
              {suggestedSchedule.notes && <p>{suggestedSchedule.notes}</p>}
              {suggestedSchedule.habits && (
                <ul className="mt-2 space-y-1">
                  {suggestedSchedule.habits.map((habit: any, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{habit.name} - {habit.suggested_time} ({habit.duration_minutes}min)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={applySchedule}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Apply Schedule
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about habits, scheduling, or anything else..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotModal;
