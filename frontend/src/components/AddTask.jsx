import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axios";

const PRIORITY_STYLES = {
  urgent: "bg-red-100    text-red-700    border-red-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100   text-blue-700   border-blue-200",
  low:    "bg-green-100  text-green-700  border-green-200",
};

/** Coi là DSL nếu có @, #, hoặc "in Nd/Nh/Nw" */
const hasDSLTokens = (value) =>
  /@\w/.test(value) || /#\w/.test(value) || /\bin\s+\d+[dhw]\b/i.test(value);

const AddTask = ({ handleNewTaskAdded }) => {
  const [input, setInput]               = useState("");
  const [preview, setPreview]           = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [showHint, setShowHint]         = useState(false);
  const debounceRef = useRef(null);

  const fetchPreview = useCallback(async (value) => {
    if (!value.trim() || !hasDSLTokens(value)) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    try {
      const res = await api.post("/tasks/parse", { dsl: value });
      setPreview(res.data.task);
      setPreviewError(null);
    } catch (err) {
      setPreview(null);
      setPreviewError(err.response?.data?.message || "Invalid DSL syntax");
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(input), 400);
    return () => clearTimeout(debounceRef.current);
  }, [input, fetchPreview]);

  const addTask = async () => {
    if (!input.trim()) { toast.error("Please enter a task."); return; }
    if (hasDSLTokens(input) && previewError) {
      toast.error("Fix the DSL error before adding.");
      return;
    }
    try {
      // Luôn gửi dsl — backend tự parse và fallback đúng
      await api.post("/tasks", { dsl: input });
      toast.success(`Task "${preview?.title ?? input}" added.`);
      setInput("");
      setPreview(null);
      handleNewTaskAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred.");
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") addTask(); };

  const isDSL     = hasDSLTokens(input);
  const hasInput  = input.trim().length > 0;
  const hasError  = isDSL && !!previewError;
  const hasPreview= isDSL && !!preview;

  return (
    <Card className="p-6 border-0 bg-gradient-card shadow-custom-lg space-y-3 overflow-visible">
      {/* ── Input row ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:flex-1">
          <Input
            type="text"
            placeholder="What needs to be done?"
            className={`h-12 text-base bg-slate-50 border-border/50 focus:border-primary/50 focus:ring-primary/20 pr-8
              ${hasError   ? "border-red-300   focus:border-red-400"   : ""}
              ${hasPreview ? "border-green-300 focus:border-green-400" : ""}
            `}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowHint(true)}
            onBlur={() => setTimeout(() => setShowHint(false), 150)}
          />

          {/* DSL hint tooltip */}
          {showHint && !hasInput && (
            <div className="absolute left-0 top-full mt-2 z-20 w-full rounded-lg border border-border/60 bg-white shadow-lg p-3 space-y-1.5 text-xs">
              <p className="font-semibold text-foreground/80 flex items-center gap-1.5">
                <HelpCircle className="size-3.5 text-primary" /> DSL syntax
              </p>
              <div className="font-mono text-foreground/70 leading-relaxed">
                <span className="text-foreground">Buy groceries</span>{" "}
                <span className="text-orange-500">@high</span>{" "}
                <span className="text-blue-500">in 3d</span>{" "}
                <span className="text-green-600">#personal</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground pt-0.5">
                <span><span className="text-orange-500 font-mono">@priority</span> — low · medium · high · urgent</span>
                <span><span className="text-blue-500 font-mono">in Nd</span> — days · hours (h) · weeks (w)</span>
              </div>
            </div>
          )}
          {/* Validation icon */}
          {isDSL && hasInput && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {hasError
                ? <AlertCircle  className="size-4 text-red-400" />
                : hasPreview
                  ? <CheckCircle2 className="size-4 text-green-500" />
                  : null}
            </span>
          )}
        </div>

        <Button
          variant="gradient"
          size="xl"
          className="px-6"
          onClick={addTask}
          disabled={!hasInput || hasError}
        >
          <Plus className="size-5" />
          Add
        </Button>
      </div>

      {/* ── DSL error ─────────────────────────────────────────────── */}
      {hasError && (
        <p className="text-xs text-red-500 flex items-start gap-1.5">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          {previewError}
        </p>
      )}

      {/* ── DSL preview ───────────────────────────────────────────── */}
      {hasPreview && (
        <div className="rounded-lg border border-green-200 bg-green-50/60 px-4 py-3 space-y-2 text-sm">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Preview</p>
          <p className="font-medium text-foreground">{preview.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-xs capitalize ${PRIORITY_STYLES[preview.priority]}`}>
              {preview.priority}
            </Badge>
            {preview.dueDate && (
              <Badge variant="outline" className="text-xs text-sky-700 bg-sky-50 border-sky-200">
                Due {new Date(preview.dueDate).toLocaleDateString("vi-VN")}
              </Badge>
            )}
            {preview.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AddTask;
