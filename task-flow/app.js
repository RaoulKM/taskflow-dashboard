class TodoApp {
  constructor() {
    this.tasks = this.loadTasks();
    this.currentFilter = "all";
    this.editingTaskId = null;
    this.initializeEventListeners();
    this.renderTasks();
    this.updateStats();
    this.setMinDate();
  }

  initializeEventListeners() {
    // Form submission
    document.getElementById("taskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleTaskSubmission();
    });

    // Search functionality
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.renderTasks(e.target.value);
    });

    // Filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.setActiveFilter(e.target.dataset.filter);
      });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter") {
          e.preventDefault();
          document
            .getElementById("taskForm")
            .dispatchEvent(new Event("submit"));
        }
      }
    });
  }

  setMinDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("taskDueDate").setAttribute("min", today);
  }

  handleTaskSubmission() {
    const title = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();
    const priority = document.getElementById("taskPriority").value;
    const dueDate = document.getElementById("taskDueDate").value;

    if (!title) {
      this.showNotification("Please enter a task title", "error");
      return;
    }

    const taskData = {
      title,
      description,
      priority,
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    if (this.editingTaskId) {
      this.updateTask(this.editingTaskId, taskData);
      this.editingTaskId = null;
      this.showNotification("Task updated successfully!", "success");
    } else {
      this.addTask(taskData);
      this.showNotification("Task added successfully!", "success");
    }

    this.resetForm();
    this.renderTasks();
    this.updateStats();
  }

  addTask(taskData) {
    const task = {
      id: this.generateId(),
      ...taskData,
    };
    this.tasks.push(task);
    this.saveTasks();
  }

  updateTask(id, taskData) {
    const taskIndex = this.tasks.findIndex((task) => task.id === id);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
      this.saveTasks();
    }
  }

  deleteTask(id) {
    if (confirm("Are you sure you want to delete this task?")) {
      this.tasks = this.tasks.filter((task) => task.id !== id);
      this.saveTasks();
      this.renderTasks();
      this.updateStats();
      this.showNotification("Task deleted successfully!", "info");
    }
  }

  toggleTaskCompletion(id) {
    const task = this.tasks.find((task) => task.id === id);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? new Date().toISOString() : null;
      this.saveTasks();
      this.renderTasks();
      this.updateStats();

      const message = task.completed
        ? "Task completed! 🎉"
        : "Task marked as pending";
      this.showNotification(message, "success");
    }
  }

  editTask(id) {
    const task = this.tasks.find((task) => task.id === id);
    if (task) {
      this.editingTaskId = id;
      document.getElementById("taskTitle").value = task.title;
      document.getElementById("taskDescription").value = task.description || "";
      document.getElementById("taskPriority").value = task.priority;
      document.getElementById("taskDueDate").value = task.dueDate || "";

      document.getElementById("taskTitle").focus();
      document.querySelector(".btn").textContent = "Update Task";
      this.showNotification("Editing task...", "info");
    }
  }

  setActiveFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    this.renderTasks();
  }

  renderTasks(searchQuery = "") {
    const container = document.getElementById("tasksList");
    let filteredTasks = this.filterTasks(this.tasks, this.currentFilter);

    if (searchQuery) {
      filteredTasks = filteredTasks.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description &&
            task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filteredTasks.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <h3>No Tasks Found</h3>
                    <p>${
                      searchQuery
                        ? "No tasks match your search criteria."
                        : this.getEmptyStateMessage()
                    }</p>
                </div>
            `;
      return;
    }

    // Sort tasks: incomplete first, then by priority and due date
    filteredTasks.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed - b.completed;
      }

      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    container.innerHTML = filteredTasks
      .map((task) => this.createTaskHTML(task))
      .join("");
  }

  createTaskHTML(task) {
    const isOverdue =
      task.dueDate && !task.completed && new Date(task.dueDate) < new Date();
    const dueDateFormatted = task.dueDate
      ? this.formatDate(task.dueDate)
      : null;

    return `
            <div class="task-item ${
              task.completed ? "completed" : ""
            }" data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-checkbox ${
                      task.completed ? "checked" : ""
                    }" onclick="todoApp.toggleTaskCompletion('${task.id}')">
                        ${task.completed ? "✓" : ""}
                    </div>
                    <div class="task-details">
                        <h3 class="task-title">${this.escapeHtml(
                          task.title
                        )}</h3>
                        ${
                          task.description
                            ? `<p class="task-description">${this.escapeHtml(
                                task.description
                              )}</p>`
                            : ""
                        }
                        <div class="task-meta">
                            <span class="task-priority priority-${
                              task.priority
                            }">${task.priority.toUpperCase()}</span>
                            ${
                              dueDateFormatted
                                ? `<span class="task-due-date ${
                                    isOverdue ? "overdue" : ""
                                  }">📅 ${dueDateFormatted} ${
                                    isOverdue ? "(Overdue)" : ""
                                  }</span>`
                                : ""
                            }
                        </div>
                        <div class="task-actions">
                            <button class="task-btn edit" onclick="todoApp.editTask('${
                              task.id
                            }')">Edit</button>
                            <button class="task-btn delete" onclick="todoApp.deleteTask('${
                              task.id
                            }')">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  filterTasks(tasks, filter) {
    const now = new Date();
    switch (filter) {
      case "completed":
        return tasks.filter((task) => task.completed);
      case "pending":
        return tasks.filter((task) => !task.completed);
      case "high":
        return tasks.filter((task) => task.priority === "high");
      case "overdue":
        return tasks.filter(
          (task) =>
            task.dueDate && !task.completed && new Date(task.dueDate) < now
        );
      default:
        return tasks;
    }
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((task) => task.completed).length;
    const pending = total - completed;
    const overdue = this.tasks.filter(
      (task) =>
        task.dueDate && !task.completed && new Date(task.dueDate) < new Date()
    ).length;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("overdueTasks").textContent = overdue;

    // Update progress bar
    const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
    document.getElementById(
      "progressFill"
    ).style.width = `${progressPercentage}%`;
  }

  getEmptyStateMessage() {
    switch (this.currentFilter) {
      case "completed":
        return "No completed tasks yet. Keep working!";
      case "pending":
        return "No pending tasks. Great job!";
      case "high":
        return "No high priority tasks.";
      case "overdue":
        return "No overdue tasks. Excellent!";
      default:
        return "Add your first task to get started!";
    }
  }

  resetForm() {
    document.getElementById("taskForm").reset();
    document.querySelector(".btn").textContent = "Add Task";
    this.editingTaskId = null;
  }

  showNotification(message, type = "info") {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Helper function to escape HTML to prevent XSS attacks
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper function to generate a unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Save tasks to local storage
  saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(this.tasks));
  }

  // Load tasks from local storage
  loadTasks() {
    const tasks = localStorage.getItem("tasks");
    return tasks ? JSON.parse(tasks) : [];
  }
}

// Initialize the application
const todoApp = new TodoApp();
