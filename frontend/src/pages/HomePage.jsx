import AddTask from "@/components/AddTask";
import DateTimeFilter from "@/components/DateTimeFilter";
import Footer from "@/components/Footer";
import { Header } from "@/components/Header";
import StatsAndFilters from "@/components/StatsAndFilters";
import TaskList from "@/components/TaskList";
import TaskListPagination from "@/components/TaskListPagination";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { visibleTaskLimit } from "@/lib/data";
import { ArrowDownUp, CalendarClock, Flag, Sparkles, X } from "lucide-react";

const SORT_OPTIONS = [
  { value: "smart",     label: "Smart",    icon: Sparkles },
  { value: "priority",  label: "Priority", icon: Flag },
  { value: "dueDate",   label: "Deadline", icon: CalendarClock },
  { value: "createdAt", label: "Newest",   icon: ArrowDownUp },
];

const HomePage = () => {
  const [taskBuffer, setTaskBuffer]         = useState([]);
  const [activeTaskCount, setActiveTaskCount]   = useState(0);
  const [completeTaskCount, setCompleteTaskCount] = useState(0);
  const [filter, setFilter]     = useState("all");
  const [dateQuery, setDateQuery] = useState("today");
  const [sort, setSort]         = useState("smart");
  const [activeTag, setActiveTag] = useState(null);
  const [page, setPage]         = useState(1);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get(`/tasks?filter=${dateQuery}&sort=${sort}`);
      setTaskBuffer(res.data.tasks);
      setActiveTaskCount(res.data.activeCount);
      setCompleteTaskCount(res.data.completeCount);
    } catch (error) {
      console.error("Error occurred while fetching tasks:", error);
      toast.error("An error occurred while fetching tasks.");
    }
  }, [dateQuery, sort]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { setPage(1); }, [filter, dateQuery, sort, activeTag]);

  const handleTaskChanged = () => fetchTasks();
  const handleNext  = () => { if (page < totalPages) setPage((p) => p + 1); };
  const handlePrev  = () => { if (page > 1) setPage((p) => p - 1); };
  const handlePageChange = (newPage) => setPage(newPage);

  const filteredTasks = taskBuffer.filter((task) => {
    const statusMatch = filter === "active"
      ? task.status === "active"
      : filter === "completed"
        ? task.status === "completed"
        : true;
    const tagMatch = activeTag ? task.tags?.includes(activeTag) : true;
    return statusMatch && tagMatch;
  });

  const visibleTasks = filteredTasks.slice(
    (page - 1) * visibleTaskLimit,
    page * visibleTaskLimit
  );

  if (visibleTasks.length === 0) handlePrev();

  const totalPages = Math.ceil(filteredTasks.length / visibleTaskLimit);

  return (
    <div className="min-h-screen w-full bg-[#e9f3ff] relative">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-animated-gradient"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(255,255,255,0.85), transparent 55%),
            radial-gradient(circle at 85% 80%, rgba(189,214,255,0.75), transparent 60%),
            linear-gradient(135deg, #e9f3ff 0%, #d4e4ff 40%, #c8dfff 75%, #bdd8ff 100%)`,
        }}
      />
      <div className="pointer-events-none absolute -top-10 left-10 h-64 w-64 bg-[#cfe4ff] bg-orb" />
      <div className="pointer-events-none absolute -bottom-12 right-10 h-72 w-72 bg-[#d7f0ff] bg-orb" />
      <div className="pointer-events-none absolute top-1/2 -left-16 h-52 w-52 bg-[#e0f3ff] bg-orb" />

      <div className="container relative z-10 pt-8 mx-auto">
        <div className="w-full max-w-2xl p-6 mx-auto space-y-6">
          <Header />

          <AddTask handleNewTaskAdded={handleTaskChanged} />

          <StatsAndFilters
            filter={filter}
            setFilter={setFilter}
            activeTasksCount={activeTaskCount}
            completedTasksCount={completeTaskCount}
          />

          {/* ── Sort + active tag ─────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Sort:</span>
            {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSort(value)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  sort === value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "text-muted-foreground border-border/50 hover:border-primary/40 bg-white/60"
                }`}
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}

            {/* Active tag filter chip */}
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200 transition-colors"
              >
                #{activeTag}
                <X className="size-3" />
              </button>
            )}
          </div>

          <TaskList
            filteredTasks={visibleTasks}
            filter={filter}
            handleTaskChanged={handleTaskChanged}
            onTagClick={(tag) => setActiveTag(tag === activeTag ? null : tag)}
          />

          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <TaskListPagination
              handleNext={handleNext}
              handlePrev={handlePrev}
              handlePageChange={handlePageChange}
              page={page}
              totalPages={totalPages}
            />
            <DateTimeFilter dateQuery={dateQuery} setDateQuery={setDateQuery} />
          </div>

          <Footer
            activeTasksCount={activeTaskCount}
            completedTasksCount={completeTaskCount}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
