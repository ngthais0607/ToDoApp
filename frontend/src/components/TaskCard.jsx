import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  SquarePen,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Input } from "./ui/input";
import api from "@/lib/axios";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// Priority display config
// ─────────────────────────────────────────────
const PRIORITY_CONFIG = {
  urgent: {
    badge:  "bg-red-100    text-red-700    border-red-200",
    border: "border-l-4 border-l-red-400",
    label:  "Urgent",
  },
  high: {
    badge:  "bg-orange-100 text-orange-700 border-orange-200",
    border: "border-l-4 border-l-orange-400",
    label:  "High",
  },
  medium: {
    badge:  "bg-blue-100   text-blue-700   border-blue-200",
    border: "border-l-4 border-l-blue-400",
    label:  "Medium",
  },
  low: {
    badge:  "bg-green-100  text-green-700  border-green-200",
    border: "border-l-4 border-l-green-400",
    label:  "Low",
  },
};

// Tag colour palette — cycles based on tag string hash
const TAG_PALETTES = [
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-pink-100   text-pink-700   border-pink-200",
  "bg-cyan-100   text-cyan-700   border-cyan-200",
  "bg-amber-100  text-amber-700  border-amber-200",
  "bg-lime-100   text-lime-700   border-lime-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

function tagColour(tag) {
  let hash = 0;
  for (const ch of tag) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return TAG_PALETTES[hash % TAG_PALETTES.length];
}

// ─────────────────────────────────────────────
// Countdown / due-date helpers
// ─────────────────────────────────────────────
function getCountdown(dueDate) {
  if (!dueDate) return null;
  const due  = new Date(dueDate);
  const now  = new Date();
  const diff = due - now; // ms

  if (diff < 0) {
    return { label: "Overdue", style: "text-red-600 font-semibold", icon: "alert" };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days  = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (hours < 24) {
    return {
      label: `${hours}h left`,
      style: hours < 6 ? "text-red-500 font-semibold" : "text-orange-500",
      icon:  "clock",
    };
  }
  if (days < 7) {
    return { label: `${days}d left`, style: "text-sky-600", icon: "clock" };
  }
  return { label: `${weeks}w left`, style: "text-slate-500", icon: "clock" };
}

// ─────────────────────────────────────────────
// TaskCard component
// ─────────────────────────────────────────────
const TaskCard = ({ task, index, handleTaskChanged, onTagClick }) => {
  const [isEditting, setIsEditting]       = useState(false);
  const [updateTaskTitle, setUpdateTaskTitle] = useState(task.title || "");
  const [countdown, setCountdown]         = useState(() => getCountdown(task.dueDate));

  // Update countdown every minute
  useEffect(() => {
    if (!task.dueDate) return;
    const id = setInterval(() => setCountdown(getCountdown(task.dueDate)), 60_000);
    return () => clearInterval(id);
  }, [task.dueDate]);

  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const isOverdue = countdown?.label === "Overdue" && task.status !== "completed";

  // ── API actions ───────────────────────────────────────────────────
  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success("Task deleted.");
      handleTaskChanged();
    } catch {
      toast.error("An error occurred while deleting the task.");
    }
  };

  const updateTask = async () => {
    try {
      setIsEditting(false);
      await api.put(`/tasks/${task._id}`, { title: updateTaskTitle });
      toast.success(`Task updated.`);
      handleTaskChanged();
    } catch {
      toast.error("An error occurred while updating the task.");
    }
  };

  const toggleComplete = async () => {
    try {
      if (task.status === "active") {
        await api.put(`/tasks/${task._id}`, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });
        toast.success(`"${task.title}" completed.`);
      } else {
        await api.put(`/tasks/${task._id}`, {
          status: "active",
          completedAt: null,
        });
        toast.success(`"${task.title}" marked as incomplete.`);
      }
      handleTaskChanged();
    } catch {
      toast.error("An error occurred while updating the task.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") updateTask();
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <Card
      className={cn(
        "p-4 border-0 shadow-custom-md hover:shadow-custom-lg transition-all duration-200 animate-fade-in group",
        isOverdue ? "bg-red-50/70 animate-pulse-border" : "bg-gradient-card",
        priorityConfig.border,
        isOverdue && "border-l-red-500",
        task.status === "completed" && "opacity-70"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* ── Complete toggle ──────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 size-8 rounded-full mt-0.5 transition-all duration-200",
            task.status === "completed"
              ? "text-success hover:text-success/80"
              : "text-muted-foreground hover:text-primary"
          )}
          onClick={toggleComplete}
        >
          {task.status === "completed" ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Circle className="size-5" />
          )}
        </Button>

        {/* ── Content ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title (editable) */}
          {isEditting ? (
            <Input
              placeholder="What needs to be done?"
              className="h-10 text-base border-border/50 focus:border-primary/50"
              type="text"
              value={updateTaskTitle}
              onChange={(e) => setUpdateTaskTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              onBlur={() => {
                setIsEditting(false);
                setUpdateTaskTitle(task.title || "");
              }}
              autoFocus
            />
          ) : (
            <p
              className={cn(
                "text-base leading-snug transition-all duration-200",
                task.status === "completed"
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              )}
            >
              {task.title}
            </p>
          )}

          {/* ── Badges row ─────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Priority badge */}
            <Badge
              variant="outline"
              className={`text-xs capitalize px-2 py-0 ${priorityConfig.badge}`}
            >
              {priorityConfig.label}
            </Badge>

            {/* Countdown / due date badge */}
            {countdown && task.status !== "completed" && (
              <Badge
                variant="outline"
                className={`text-xs flex items-center gap-1 px-2 py-0 border-slate-200 bg-slate-50 ${countdown.style}`}
              >
                {countdown.icon === "alert" ? (
                  <AlertTriangle className="size-3" />
                ) : (
                  <Clock className="size-3" />
                )}
                {countdown.label}
              </Badge>
            )}

            {/* Tag badges — clickable */}
            {task.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-xs px-2 py-0 cursor-pointer hover:opacity-70 transition-opacity ${tagColour(tag)}`}
                onClick={() => onTagClick?.(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>

          {/* ── Date meta ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>Created {new Date(task.createdAt).toLocaleString()}</span>
            {task.dueDate && (
              <>
                <span>·</span>
                <Clock className="size-3" />
                <span>
                  Due {new Date(task.dueDate).toLocaleDateString("vi-VN")}
                </span>
              </>
            )}
            {task.completedAt && (
              <>
                <span>·</span>
                <CheckCircle2 className="size-3 text-success" />
                <span>
                  Done {new Date(task.completedAt).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ── Action buttons ───────────────────────────────────────── */}
        <div className="hidden gap-1 group-hover:inline-flex animate-slide-up shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-info transition-colors"
            onClick={() => {
              setIsEditting(true);
              setUpdateTaskTitle(task.title || "");
            }}
          >
            <SquarePen className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => deleteTask(task._id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
