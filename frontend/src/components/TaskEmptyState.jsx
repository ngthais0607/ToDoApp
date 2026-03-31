import React from "react";
import { Card } from "./ui/card";
import { Circle } from "lucide-react";

const TaskEmptyState = ({ filter }) => {
  return (
    <Card className="p-8 text-center border-0 bg-gradient-card shadow-custom-md">
      <div className="space-y-3">
        <Circle className="mx-auto size-12 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-foreground">
            {filter === "active"
              ? "There are no active tasks."
              : filter === "completed"
              ? "No tasks have been completed yet."
              : "There are no tasks yet."}
          </h3>

          <p className="text-sm text-muted-foreground">
            {filter === "all"
              ? "Add your first task to get started!"
              : filter === "active"
              ? 'Switch to "All" to see your completed tasks.'
              : 'Switch to "All" to see your active tasks.'}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default TaskEmptyState;