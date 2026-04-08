import Task from "../models/Task.js";
import { parseDSL, PRIORITY_ORDER } from "../dsl/index.js";

// ─────────────────────────────────────────────
// GET /api/tasks?filter=today&sort=priority
// ─────────────────────────────────────────────
export const getAllTasks = async (req, res) => {
  const { filter = "today", sort = "createdAt" } = req.query;
  const now = new Date();
  let startDate;

  switch (filter) {
    case "today": {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    }
    case "week": {
      const mondayDate =
        now.getDate() - (now.getDay() - 1) - (now.getDay() === 0 ? 7 : 0);
      startDate = new Date(now.getFullYear(), now.getMonth(), mondayDate);
      break;
    }
    case "month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "all":
    default: {
      startDate = null;
    }
  }

  const matchQuery = startDate ? { createdAt: { $gte: startDate } } : {};

  // Shared helper fields used by multiple sort modes
  const priorityField = {
    $addFields: {
      _priorityOrder: {
        $switch: {
          branches: [
            { case: { $eq: ["$priority", "urgent"] }, then: 4 },
            { case: { $eq: ["$priority", "high"] },   then: 3 },
            { case: { $eq: ["$priority", "medium"] }, then: 2 },
            { case: { $eq: ["$priority", "low"] },    then: 1 },
          ],
          default: 0,
        },
      },
    },
  };

  const dueDateField = {
    $addFields: {
      _dueDateSort: {
        $cond: {
          if: { $eq: ["$dueDate", null] },
          then: new Date("9999-12-31"),
          else: "$dueDate",
        },
      },
    },
  };

  let tasksSortStage;
  if (sort === "smart") {
    // Smart sort: priority DESC → nearest deadline first (nulls last) → newest first
    tasksSortStage = [
      priorityField,
      dueDateField,
      { $sort: { _priorityOrder: -1, _dueDateSort: 1, createdAt: -1 } },
    ];
  } else if (sort === "priority") {
    tasksSortStage = [
      priorityField,
      { $sort: { _priorityOrder: -1, createdAt: -1 } },
    ];
  } else if (sort === "dueDate") {
    tasksSortStage = [
      dueDateField,
      { $sort: { _dueDateSort: 1, createdAt: -1 } },
    ];
  } else {
    // default: newest first
    tasksSortStage = [{ $sort: { createdAt: -1 } }];
  }

  try {
    const result = await Task.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          tasks: tasksSortStage,
          activeCount: [
            { $match: { status: "active" } },
            { $count: "count" },
          ],
          completeCount: [
            { $match: { status: "completed" } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const tasks        = result[0].tasks;
    const activeCount  = result[0].activeCount[0]?.count  || 0;
    const completeCount= result[0].completeCount[0]?.count || 0;

    res.status(200).json({ tasks, activeCount, completeCount });
  } catch (error) {
    console.error("Error when calling getAllTasks", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// POST /api/tasks/parse  (preview only, no DB)
// ─────────────────────────────────────────────
export const parseTaskDSL = (req, res) => {
  const { dsl } = req.body;
  if (typeof dsl !== "string" || !dsl.trim()) {
    return res.status(400).json({ message: "Field 'dsl' is required" });
  }

  const result = parseDSL(dsl.trim());
  if (!result.ok) {
    return res.status(422).json({
      message: result.error,
      phase:   result.phase,
    });
  }

  // Return the parsed task preview (dueDate as ISO string for JSON)
  res.status(200).json({ task: result.task });
};

// ─────────────────────────────────────────────
// POST /api/tasks
// Accepts: { dsl } OR { title, priority?, dueDate?, tags? }
// ─────────────────────────────────────────────
export const createTask = async (req, res) => {
  try {
    let taskData;

    if (req.body.dsl) {
      // ── DSL mode: parse the input string ─────────────────────────
      const result = parseDSL(req.body.dsl.trim());
      if (!result.ok) {
        return res.status(422).json({
          message: result.error,
          phase:   result.phase,
        });
      }
      taskData = result.task;
    } else {
      // ── Simple mode: plain fields ─────────────────────────────────
      const { title, priority = "medium", dueDate = null, tags = [] } = req.body;
      if (!title?.trim()) {
        return res.status(400).json({ message: "Field 'title' is required" });
      }
      taskData = { title: title.trim(), priority, dueDate, tags };
    }

    const task    = new Task(taskData);
    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error when calling createTask", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// PUT /api/tasks/:id
// ─────────────────────────────────────────────
export const updateTask = async (req, res) => {
  try {
    const { title, status, completedAt, priority, dueDate, tags } = req.body;
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { title, status, completedAt, priority, dueDate, tags },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task does not exist" });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error when calling updateTask", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/tasks/:id
// ─────────────────────────────────────────────
export const deleteTask = async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({ message: "Task does not exist" });
    }

    res.status(200).json(deletedTask);
  } catch (error) {
    console.error("Error when calling deleteTask", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
