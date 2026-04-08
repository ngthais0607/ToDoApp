import express from "express";
import {
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  parseTaskDSL,
} from "../controller/tasksControllers.js";

const router = express.Router();

// POST /api/tasks/parse  — DSL preview (must be before /:id routes)
router.post("/parse", parseTaskDSL);

router.get("/",      getAllTasks);
router.post("/",     createTask);
router.put("/:id",   updateTask);
router.delete("/:id",deleteTask);

export default router;
