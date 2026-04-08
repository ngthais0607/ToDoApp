import React from "react";
import TaskCard from "./TaskCard";
import TaskEmptyState from "./TaskEmptyState";

const TaskList = ({ filteredTasks, filter, handleTaskChanged, onTagClick }) => {
  if (!filteredTasks || filteredTasks.length === 0) {
    return <TaskEmptyState filter={filter} />;
  }

  return (
    <div className="space-y-3">
      {filteredTasks.map((task, index) => (
        <TaskCard
          key={task._id}
          task={task}
          index={index}
          handleTaskChanged={handleTaskChanged}
          onTagClick={onTagClick}
        />
      ))}
    </div>
  );
};

export default TaskList;