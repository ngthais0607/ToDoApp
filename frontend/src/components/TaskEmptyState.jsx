import React from "react";
import { Card } from "./ui/card";
import { ClipboardList } from "lucide-react";

const TaskEmptyState = ({ filter }) => {
  return (
    <Card className="p-8 text-center border-0 bg-gradient-card shadow-custom-md">
      <div className="space-y-3">
        <div className="mx-auto size-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ClipboardList className="size-7 text-primary/60" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">
            {filter === "active"
              ? "No active tasks."
              : filter === "completed"
              ? "No completed tasks yet."
              : "No tasks here."}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "all"
              ? "Add your first task above to get started!"
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
