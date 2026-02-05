import React from "react";
import { ProgressBar } from "../components/ProgressBar";
import { AnimatedNumber } from "../components/AnimatedNumber";

export default function ProgressToday() {
  const habitsDoneToday = [
    { name: "Sala", duration: "1h 30m" },
    { name: "Învățat spaniolă", duration: "1h" },
    { name: "Mers la facultate", duration: "4h" },
  ];

  const nextHabit = { title: "Citește", duration: "0h 20m" };
  const baseActivities = [
    "Jurnal de recunoștință",
    "Întindere de 5 minute",
    "Mic dejun nutritiv",
    "Alergat ușor",
    "Meditație rapidă"
  ];
  const [modalOpen, setModalOpen] = React.useState(false);
  const [activityDurations, setActivityDurations] = React.useState(
    () => Object.fromEntries(baseActivities.map((activity) => [activity, { hours: "", minutes: "" }]))
  );
  const [customActivity, setCustomActivity] = React.useState({ name: "", hours: "", minutes: "" });
  const [customActivities, setCustomActivities] = React.useState([]);
  const [selectedActivities, setSelectedActivities] = React.useState(
    () => Object.fromEntries(baseActivities.map((activity) => [activity, false]))
  );

  const updateDuration = (activity, field, value) => {
    setActivityDurations((prev) => ({
      ...prev,
      [activity]: {
        ...prev[activity],
        [field]: value
      }
    }));
  };

  const toggleSelection = (activity) => {
    setSelectedActivities((prev) => ({
      ...prev,
      [activity]: !prev[activity]
    }));
  };

  const addCustomActivity = () => {
    const trimmed = customActivity.name.trim();
    if (!trimmed) return;

    setCustomActivities((prev) => [...prev, trimmed]);
    setActivityDurations((prev) => ({
      ...prev,
      [trimmed]: { hours: customActivity.hours, minutes: customActivity.minutes }
    }));
    setSelectedActivities((prev) => ({ ...prev, [trimmed]: false }));
    setCustomActivity({ name: "", hours: "", minutes: "" });
  };

  const initialToDos = [
    { title: nextHabit.title, hours: 0, minutes: 0 },
    { title: "Mindful breathing", hours: 0, minutes: 5 },
    { title: "Light walk", hours: 0, minutes: 15 }
  ];

  const parseDurationLabel = (label) => {
    if (!label) return { hours: 0, minutes: 0 };
    const hoursMatch = label.match(/(\d+)h/);
    const minutesMatch = label.match(/(\d+)m/);
    return {
      hours: hoursMatch ? Number(hoursMatch[1]) : 0,
      minutes: minutesMatch ? Number(minutesMatch[1]) : 0
    };
  };

  const initialDone = habitsDoneToday.map((habit) => ({
    title: habit.name,
    ...parseDurationLabel(habit.duration)
  }));

  const [toDoTasks, setToDoTasks] = React.useState(initialToDos);
  const [doneTasks, setDoneTasks] = React.useState(initialDone);
  const allActivities = [...baseActivities, ...customActivities];

  const handleConfirm = () => {
    const selected = allActivities
      .filter((activity) => selectedActivities[activity])
      .map((activity) => {
        const duration = activityDurations[activity] || { hours: "", minutes: "" };
        return {
          title: activity,
          hours: Number(duration.hours) || 0,
          minutes: Number(duration.minutes) || 0
        };
      });

    setToDoTasks((prev) => [...prev, ...selected]);
    setSelectedActivities(Object.fromEntries(allActivities.map((activity) => [activity, false])));
    console.log("Submitting activities", selected);
    setModalOpen(false);
  };

  const removeFromToDo = (index) => {
    setToDoTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const moveToDone = (index) => {
    setDoneTasks((prev) => [...prev, toDoTasks[index]]);
    removeFromToDo(index);
  };

  const moveToToDoFromDone = (index) => {
    setToDoTasks((prev) => [...prev, doneTasks[index]]);
    setDoneTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const removeFromDone = (index) => {
    setDoneTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const durationMinutes = (task) => task.hours * 60 + task.minutes;
  const totalMinutes = (tasks) => tasks.reduce((sum, task) => sum + durationMinutes(task), 0);
  const totalDoneMinutes = React.useMemo(() => totalMinutes(doneTasks), [doneTasks]);
  const totalToDoMinutes = React.useMemo(() => totalMinutes(toDoTasks), [toDoTasks]);
  
  const progressValue = React.useMemo(() => {
    if (!totalDoneMinutes && !totalToDoMinutes) return 0;
    return Math.round((totalDoneMinutes / (totalDoneMinutes + totalToDoMinutes)) * 100);
  }, [totalDoneMinutes, totalToDoMinutes]);

  const nextTask = toDoTasks[0] || { title: nextHabit.title, hours: 0, minutes: 0 };

  return (
    <div className="min-h-screen bg-[#e3f2ff]">
      <div className="px-6 py-10 mx-auto max-w-3xl space-y-8">
        <h1 className="text-2xl font-semibold text-gray-800">Today’s Progress</h1>

        {/* Progres */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col justify-between">
            <AnimatedNumber value={progressValue} />
            <ProgressBar value={progressValue} />
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400 mt-4">
              {totalDoneMinutes}m done / {totalDoneMinutes + totalToDoMinutes}m planned
            </p>
            {toDoTasks.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/60 p-6 text-center font-semibold text-blue-600">
                Everything done for today! Congrats! ✅
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-2">Next habit</p>
                <div className="flex items-center gap-4">
                  <div className="text-3xl">📖</div>
                  <div>
                    <p className="text-gray-800 font-medium">{nextTask.title}</p>
                    <p className="text-sm text-gray-500">Duration: {`${nextTask.hours}h ${nextTask.minutes}m`}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-between items-center">
              <span className="text-sm text-slate-500">Track new movements for today.</span>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-2xl border border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                + Add activity
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Done</div>
            <div className="space-y-3">
              {doneTasks.map((task, index) => (
                <div
                  key={`${task.title}-${index}`}
                  className="bg-white/80 rounded-xl border border-slate-100 p-4 text-gray-700 flex flex-col gap-2"
                >
                  <span className="font-semibold text-slate-900">{task.title}</span>
                  <span className="text-xs text-slate-500">{`${task.hours}h ${task.minutes}m`}</span>
                  <div className="flex gap-2 text-xs text-slate-500">
                    <button
                      onClick={() => moveToToDoFromDone(index)}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-600"
                    >
                      Move to to-do
                    </button>
                    <button
                      onClick={() => removeFromDone(index)}
                      className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">To do</div>
            <div className="space-y-4">
              {toDoTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm font-semibold text-blue-600">
                  Everything done for today! Congrats! ✅
                </div>
              ) : (
                toDoTasks.map((task, index) => (
                  <div
                    key={`${task.title}-${index}`}
                    className="bg-white/70 rounded-xl border border-dashed border-slate-200 p-4 text-gray-700 flex flex-col gap-2"
                  >
                    <span className="font-semibold text-slate-900">{task.title}</span>
                    <span className="text-xs text-slate-500">{`${task.hours}h ${task.minutes}m`}</span>
                    <div className="flex gap-3 text-xs text-slate-500">
                      <button
                        onClick={() => moveToDone(index)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-600"
                      >
                        Mark done
                      </button>
                      <button
                        onClick={() => removeFromToDo(index)}
                        className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[680px] rounded-3xl bg-white p-8 shadow-[0_35px_90px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Add activity</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">Pick one of these starter activities for today’s log:</p>
            <div className="space-y-3">
              {allActivities.map((activity) => (
                <div key={activity} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-slate-700">{activity}</div>                      
                    </div>
                    <div className="flex gap-2">
                      {[{ placeholder: "Hrs", field: "hours" }, { placeholder: "Mins", field: "minutes" }].map(({ placeholder, field }) => (
                        <input
                          key={field}
                          value={activityDurations[activity]?.[field] ?? ""}
                          onChange={(e) => updateDuration(activity, field, e.target.value)}
                          className="h-10 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 shadow-inner focus:border-blue-500 focus:outline-none"
                          placeholder={placeholder}
                        />
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedActivities[activity] ?? false}
                        onChange={() => toggleSelection(activity)}
                        className="h-4 w-4 rounded border border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Log this
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-blue-50/60 p-4">
              <div className="text-sm font-semibold text-slate-700">Add a custom activity</div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input
                  value={customActivity.name}
                  onChange={(e) => setCustomActivity((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="Activity name"
                />
                <input
                  value={customActivity.hours}
                  onChange={(e) => setCustomActivity((prev) => ({ ...prev, hours: e.target.value }))}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="Hrs"
                />
                <input
                  value={customActivity.minutes}
                  onChange={(e) => setCustomActivity((prev) => ({ ...prev, minutes: e.target.value }))}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="Mins"
                />
              </div>
              <button
                onClick={addCustomActivity}
                className="mt-4 rounded-2xl border border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
              >
                Add activity
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleConfirm}
                className="rounded-2xl border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Confirm selections
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
