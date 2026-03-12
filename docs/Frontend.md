# Frontend Documentation

## Overview

The frontend is a React TypeScript application that provides a modern, responsive interface for the Habit Tracker. It uses Tailwind CSS for styling and includes features for authentication, habit management, weekly planning, and progress tracking.

## Technology Stack

- **React 18.2.0** - UI framework with hooks and concurrent features
- **TypeScript 4.9.0** - Type safety and better development experience
- **React Router 6.8.0** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios 1.6.0** - HTTP client for API calls
- **Headless UI** - Unstyled, accessible UI components
- **Heroicons & Lucide React** - Icon libraries
- **Framer Motion** - Animation library

## Project Structure

```
frontend_new/src/
├── api/                    # API service functions
│   ├── auth.ts            # Authentication API calls
│   ├── chatbot.ts         # Chatbot API calls
│   ├── dayActions.ts      # Day actions API
│   ├── habits.ts          # Habits API
│   ├── overrides.ts       # Overrides API
│   ├── progress.ts        # Progress API
│   ├── weeklyPlans.ts     # Weekly plans API
│   └── weeklyReport.ts    # Weekly report API
├── auth/                   # Authentication context
│   ├── AuthContext.tsx    # Authentication state management
│   └── ProtectedRoute.tsx # Route protection component
├── components/             # Reusable UI components
│   ├── ChatbotModal.tsx   # AI chatbot interface
│   ├── CompactDashboard.tsx # Dashboard summary
│   ├── DayActions.tsx     # Day action management
│   ├── DayCard.tsx        # Single day display
│   ├── HabitModal.tsx     # Habit creation/editing
│   ├── HabitsManager.tsx  # Habit list management
│   ├── Logo.tsx           # Application logo
│   ├── PlanItemRow.tsx    # Weekly plan item
│   ├── ProgressBar.tsx    # Progress indicator
│   ├── Streak.tsx         # Streak display
│   ├── WeekGrid.tsx       # Week grid layout
│   ├── WeekView.tsx       # Weekly planning view
│   ├── WeeklyPlansManager.tsx # Weekly plans management
│   └── WeeklyReportModal.tsx # Weekly report display
├── pages/                  # Page components
│   ├── Dashboard.tsx       # Main dashboard page
│   ├── Login.tsx          # Login page
│   ├── Register.tsx       # Registration page
│   ├── Template.tsx       # Template page
│   └── Week.tsx           # Week planning page
├── utils/                  # Utility functions
│   └── api.ts             # API configuration
├── App.tsx                # Main application component
├── index.tsx              # Application entry point
└── index.css              # Global styles
```

## Core Components

### Authentication System

#### AuthContext.tsx
Manages global authentication state using React Context:
- User login/logout
- JWT token management
- Protected route access
- User data persistence

#### ProtectedRoute.tsx
Higher-order component that protects routes requiring authentication:
- Redirects unauthenticated users to login
- Preserves intended destination for post-login redirect

### Main Pages

#### Dashboard.tsx
Main dashboard displaying:
- Today's habits and progress
- Quick stats and streaks
- Navigation to other features

#### Week.tsx
Weekly planning interface:
- 7-day week grid
- Habit scheduling
- Progress visualization

#### Login.tsx & Register.tsx
Authentication pages with:
- Form validation
- Error handling
- Loading states
- Responsive design

### Key Components

#### WeekView.tsx (35KB)
Complex component for weekly habit management:
- Drag-and-drop habit scheduling
- Real-time progress updates
- Habit completion tracking
- Override management

#### HabitModal.tsx (17KB)
Modal for creating and editing habits:
- Form validation
- Duration settings
- Active/inactive status management

#### WeeklyReportModal.tsx (17KB)
Modal displaying weekly analytics:
- Completion statistics
- Progress charts
- Habit performance metrics

#### ChatbotModal.tsx (11KB)
AI-powered chatbot interface:
- Real-time conversation
- Habit formation advice
- Progress insights

#### Streak.tsx (13KB)
Component for displaying habit streaks:
- Current streak calculation
- Visual indicators
- Motivational messages

## API Integration

### API Service Layer
Each API endpoint has a dedicated service file in the `api/` directory:

```typescript
// Example: api/habits.ts
export const getHabits = async (): Promise<Habit[]> => {
  const response = await api.get('/habits');
  return response.data;
};

export const createHabit = async (habit: HabitCreate): Promise<Habit> => {
  const response = await api.post('/habits', habit);
  return response.data;
};
```

### Error Handling
Global error handling through Axios interceptors:
- Automatic token refresh
- Consistent error messages
- Network error handling

## State Management

### Local State
- Component-level state with React hooks
- Form state management
- UI state (modals, loading)

### Global State
- Authentication state via Context API
- User preferences
- Application-wide settings

## Styling Approach

### Tailwind CSS Configuration
- Utility-first CSS approach
- Responsive design patterns
- Custom theme configuration
- Component consistency

### Design System
- Consistent color palette
- Typography scale
- Spacing system
- Component variants

## Key Features

### Responsive Design
- Mobile-first approach
- Breakpoint-based layouts
- Touch-friendly interactions
- Adaptive components

### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Screen reader support

### Performance
- Code splitting with React.lazy
- Component memoization
- Optimized re-renders
- Efficient API calls

## User Experience

### Loading States
- Skeleton screens
- Progress indicators
- Loading spinners
- Smooth transitions

### Error Handling
- User-friendly error messages
- Recovery options
- Form validation feedback
- Network error handling

### Interactions
- Hover states
- Focus indicators
- Smooth animations
- Micro-interactions

## Development Patterns

### Component Architecture
- Functional components with hooks
- Props typing with TypeScript
- Composition over inheritance
- Single responsibility principle

### Code Organization
- Feature-based structure
- Shared components
- Custom hooks
- Utility functions

### TypeScript Usage
- Strict type checking
- Interface definitions
- Generic types
- Type guards

## Build Configuration

### Package.json Scripts
```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

### Environment Variables
- REACT_APP_API_URL: Backend API endpoint
- REACT_APP_ENVIRONMENT: Development/production mode

## Deployment Considerations

### Build Optimization
- Code splitting
- Tree shaking
- Asset optimization
- Bundle analysis

### Production Configuration
- Environment-specific builds
- API endpoint configuration
- Error tracking
- Performance monitoring

## Future Enhancements

### Planned Features
- Progressive Web App (PWA) support
- Offline functionality
- Push notifications
- Advanced analytics

### Technical Improvements
- State management with Redux Toolkit
- Server-side rendering
- Component testing
- E2E testing automation
