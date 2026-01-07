

"use client";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Stage, Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Edit, Trash, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TaskBoardProps {
  stages: Stage[];
  tasksByStage: Record<string, Task[]>;
  onTaskMove: (taskId: string, newStageId: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onCreateTask: (stageId: string) => void;
  onCreateStage: () => void;
  onEditStage: (stage: Stage) => void;
  onDeleteStage: (stageId: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
}

export function TaskBoard({
  stages,
  tasksByStage,
  onTaskMove,
  onTaskClick,
  onCreateTask,
  onCreateStage,
  onEditStage,
  onDeleteStage,
  onCompleteTask,
}: TaskBoardProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    try {
      await onTaskMove(draggableId, destination.droppableId);
    } catch (error) {
      console.error("Failed to move task:", error);
      toast.error("Failed to move task");
    }
  };

  const handleEditStage = (stage: Stage) => {
    onEditStage(stage);
  };

  const handleDeleteStage = async (stageId: string) => {
    setIsDeleting(stageId);
    try {
      await onDeleteStage(stageId);
      toast.success("Stage deleted successfully");
    } catch (error) {
      console.error("Failed to delete stage:", error);
      toast.error("Failed to delete stage");
    } finally {
      setIsDeleting(null);
    }
  };

  const isTaskComplete = (task: Task) => {
    const taskStage = stages.find(s => s.id === task.stageId);
    return taskStage?.isCompleted || (task as any).isComplete;
  };

  const handleCompleteTask = async (taskId: string) => {
    setIsCompleting(taskId);
    try {
      await onCompleteTask(taskId);
      toast.success("Task marked as complete");
    } catch (error) {
      console.error("Failed to complete task:", error);
      toast.error("Failed to complete task");
    } finally {
      setIsCompleting(null);
    }
  };

  const getNextStageId = (currentStageId: string) => {
    const currentStageIndex = stages.findIndex(s => s.id === currentStageId);
    if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
      return null;
    }
    return stages[currentStageIndex + 1].id;
  };

  return (
    <div className="h-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 p-6 min-w-max">
          {stages.map((stage) => {
            if (!stage || !stage.id) return null;
            return (
            <div key={stage.id} className="w-80 flex-shrink-0">
              <div className={`relative rounded-xl ${stage?.color} dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900/90 p-4 mb-4 border border-transparent dark:border-slate-700/50 shadow-md dark:shadow-xl dark:shadow-purple-500/5 transition-all duration-300 hover:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-purple-500/10 dark:hover:border-purple-500/30`}>
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 dark:hover:from-blue-500/5 dark:hover:via-purple-500/5 dark:hover:to-pink-500/5 rounded-xl transition-all duration-300 pointer-events-none"></div>
                
                <div className="relative z-10 flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base transition-colors">
                      {stage.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs font-semibold bg-white/80 dark:bg-slate-700/80 dark:text-slate-200 border dark:border-slate-600 shadow-sm">
                      {tasksByStage[stage.id]?.length || 0}
                    </Badge>
                    {stage.isCompleted && (
                      <Badge variant="default" className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-800 dark:text-green-300 border-green-200 dark:border-green-500/50 text-xs font-semibold shadow-sm dark:shadow-green-500/20">
                        Completed
                      </Badge>
                    )}
                  </div>

                  <div className="group-hover:opacity-100 transition-all text-gray-700 dark:text-slate-300">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-white/50 dark:hover:bg-slate-700/70 dark:hover:text-white rounded-lg transition-all hover:scale-110"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 dark:border-slate-700/50 backdrop-blur-xl dark:shadow-2xl dark:shadow-purple-500/20"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setTimeout(() => handleEditStage(stage), 10); // 10ms delay
                          }}
                          className="dark:text-slate-200 dark:hover:bg-gradient-to-r dark:hover:from-blue-900/40 dark:hover:to-purple-900/40 dark:hover:text-white cursor-pointer transition-all font-medium"
                        >
                          <Edit className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteStage(stage.id)}
                          className="dark:text-slate-200 dark:hover:bg-gradient-to-r dark:hover:from-red-900/40 dark:hover:to-rose-900/40 text-red-700 dark:hover:text-red-300 cursor-pointer transition-all font-medium"
                          disabled={isDeleting === stage.id}
                        >
                          <Trash className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                          {isDeleting === stage.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {stage.assignedTeam && (
                  <p className="relative z-10 text-sm text-gray-600 dark:text-slate-400 mb-3 px-2 py-1 rounded-md bg-white/50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-600/30 font-medium">
                    <span className="text-purple-600 dark:text-purple-400">Team:</span> {stage.assignedTeam}
                  </p>
                )}

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`relative z-10 min-h-[200px] space-y-3 rounded-xl transition-all duration-300 ${
                        snapshot.isDraggingOver
                          ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-2 border-2 border-blue-300 dark:border-blue-500/50 shadow-lg dark:shadow-blue-500/20"
                          : ""
                      }"`}
                    >
                      {tasksByStage[stage.id]?.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={
                                snapshot.isDragging ? "rotate-2 scale-105" : ""
                              }
                            >
                              <TaskCard
                                task={task}
                                onClick={() => onTaskClick(task)}
                                isComplete={isTaskComplete(task)}
                                onComplete={() => handleCompleteTask(task.id)}
                                showCompleteButton={!isTaskComplete(task) && !!getNextStageId(task.stageId)}
                                isCompleting={isCompleting === task.id}
                                stages={stages}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <Button
                  variant="ghost"
                  className="relative z-10 w-full mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 dark:border dark:border-slate-700/50 dark:hover:border-blue-500/50 transition-all duration-200 font-medium rounded-lg dark:shadow-md dark:hover:shadow-lg dark:hover:shadow-blue-500/20"
                  onClick={() => onCreateTask(stage.id)}
                >
                  <Plus className="h-4 w-4 mr-2 transition-transform hover:scale-110" />
                  Add Record
                </Button>
              </div>
            </div>
            );
          })}

          <div className="w-80 flex-shrink-0">
            <Button
              variant="outline"
              className="w-full h-32 border-dashed border-2 border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-purple-500 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 dark:bg-slate-800/30 dark:text-slate-300 dark:hover:text-white transition-all duration-300 rounded-xl dark:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-purple-500/20 font-semibold text-base"
              onClick={onCreateStage}
            >
              <Plus className="h-6 w-6 mr-2 transition-all duration-300 hover:scale-110 hover:rotate-90" />
              Add Stage
            </Button>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}