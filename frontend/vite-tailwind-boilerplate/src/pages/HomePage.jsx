import React from "react";
import { Link } from "react-router-dom";

function Greeting({ username }) {
  return (
    <h1 className="text-3xl font-semibold text-gray-800 mb-10">
      Hi, {username}!
    </h1>
  );
}

function ProgressBar({ value }) {
  const [animatedValue, setAnimatedValue] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const duration = 800; // ms
    const stepTime = 16;
    const increment = value / (duration / stepTime);

    const interval = setInterval(() => {
      start += increment;
      if (start >= value) {
        start = value;
        clearInterval(interval);
      }
      setAnimatedValue(Math.round(start));
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-3 bg-green-500 rounded-full transition-all"
        style={{ width: `${animatedValue}%` }}
      />
    </div>
  );
}


function NextHabit({ title, duration }) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">Next habit</p>
      <div className="flex items-center gap-4">
        <div className="text-3xl">📖</div>
        <div>
          <p className="text-gray-800 font-medium">{title}</p>
          <p className="text-sm text-gray-500">Duration: {duration} mins</p>
        </div>
      </div>
    </div>
  );
}

function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const duration = 800;
    const stepTime = 16;
    const increment = value / (duration / stepTime);

    const interval = setInterval(() => {
      start += increment;
      if (start >= value) {
        start = value;
        clearInterval(interval);
      }
      setDisplayValue(Math.round(start));
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <div className="text-5xl font-semibold text-gray-800 mb-4">
      {displayValue}%
    </div>
  );
}

function calculateMinutes({ hours = 0, minutes = 0 }) {
  return Number(hours) * 60 + Number(minutes);
}

function parseDuration(text) {
  const hoursMatch = text.match(/(\d+)h/);
  const minutesMatch = text.match(/(\d+)m/);

  return {
    hours: hoursMatch ? Number(hoursMatch[1]) : 0,
    minutes: minutesMatch ? Number(minutesMatch[1]) : 0
  };
}

function totalMinutes(items) {
  return items.reduce((sum, item) => sum + calculateMinutes(item), 0);
}

function ProgressCard({ progress, nextHabit }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-medium text-gray-700 mb-1">
          Today’s Progress
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {new Intl.DateTimeFormat('ro-RO', { weekday: 'long' }).format(new Date())}
        </p>

        <AnimatedNumber value={progress} />

        <div className="mb-8">
          <ProgressBar value={progress} />
        </div>

        <NextHabit
          title={nextHabit.title}
          duration={nextHabit.duration}
        />
      </div>
    </div>
  );
}

function SettingsCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col justify-center gap-6">
      <button className="flex items-center gap-4 w-full border border-gray-200 rounded-xl px-6 py-4 text-gray-700 hover:bg-gray-50 transition">
        <span className="text-xl">⚙️</span>
        <span className="font-medium">Habit Settings</span>
      </button>

      <button className="flex items-center gap-4 w-full border border-gray-200 rounded-xl px-6 py-4 text-gray-700 hover:bg-gray-50 transition">
        <span className="text-xl">👤</span>
        <span className="font-medium">Profile Settings</span>
      </button>
    </div>
  );
}

// ProgressToday component moved to separate file

export default function HomePage() {
  const user = {
    username: "Alex",
    nextHabit: {
      title: "Read for 20 minutes",
      duration: "0h 20m",
    },
  };

  const doneTasks = [
    { title: "Sala", hours: 1, minutes: 30 },
    { title: "Învățat spaniolă", hours: 1, minutes: 0 },
  ];

  const toDoTasks = [
    { title: "Light walk", hours: 0, minutes: 15 },
    { title: user.nextHabit.title, hours: 0, minutes: 20 },
  ];

  const totalDoneMinutes = totalMinutes(doneTasks);
  const totalToDoMinutes = totalMinutes(toDoTasks);
  const progressValue = Math.round(
    (totalDoneMinutes / (totalDoneMinutes + totalToDoMinutes)) * 100 || 0
  );

  return (
    <div className="min-h-screen bg-[#e3f2ff] flex flex-col items-center px-6 py-10">
      <Greeting username={user.username} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        <Link to="/progress/today" className="cursor-pointer">
          <ProgressCard
            progress={progressValue}
            nextHabit={user.nextHabit}
            doneMinutes={totalDoneMinutes}
            plannedMinutes={totalDoneMinutes + totalToDoMinutes}
          />
        </Link>
        <SettingsCard />
      </div>
    </div>
  );
}
