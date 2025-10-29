// Класс для управления задачами
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('motivatorTasks')) || [];
        this.completedTasks = JSON.parse(localStorage.getItem('motivatorCompletedTasks')) || [];
        this.achievements = JSON.parse(localStorage.getItem('motivatorAchievements')) || [];
        this.userLevel = parseInt(localStorage.getItem('motivatorLevel')) || 1;
        this.userXP = parseInt(localStorage.getItem('motivatorXP')) || 0;
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.motivationQuotes = [
            { text: "Каждый день - это новая возможность стать лучше!", author: "Мотиватор" },
            { text: "Успех - это сумма небольших усилий, повторяемых день за днем.", author: "Роберт Кольер" },
            { text: "Единственный способ делать великую работу - это любить то, что ты делаешь.", author: "Стив Джобс" },
            { text: "Не бойся медленного прогресса, бойся стоять на месте.", author: "Неизвестный" },
            { text: "Твоя жизнь становится лучше, когда ты становишься лучше.", author: "Брайан Трейси" },
            { text: "Мечты не работают, пока не работаешь ты.", author: "Джон Максвелл" },
            { text: "Каждый эксперт когда-то был новичком.", author: "Хелен Хейс" },
            { text: "Победа - это не все, но желание победить - это все.", author: "Винс Ломбарди" }
        ];
        this.init();
    }

    init() {
        this.bindEvents();
        this.detectPage();
        this.renderTasks();
        this.updateProgress();
    }

    detectPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        
        switch(filename) {
            case 'index.html':
            case '':
                this.initHomePage();
                break;
            case 'tasks.html':
                this.initTasksPage();
                break;
            case 'archive.html':
                this.initArchivePage();
                break;
        }
    }

    initHomePage() {
        this.renderTasksPreview();
        this.renderAchievements();
        this.renderWeeklyChart();
        this.createParticles();
        this.showRandomQuote();
        this.updateUserLevel();
    }

    initTasksPage() {
        this.bindFilterEvents();
        this.bindSortEvents();
        this.bindActionEvents();
    }

    initArchivePage() {
        this.renderArchiveStats();
        this.bindArchiveEvents();
    }

    bindEvents() {
        // Форма добавления задачи
        const addTaskForm = document.getElementById('addTaskForm');
        addTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Обработка Enter в поле ввода
        const taskInput = document.getElementById('taskInput');
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const taskText = taskInput.value.trim();

        if (taskText === '') {
            this.showNotification('Введите текст задачи', 'warning');
            return;
        }

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(newTask);
        this.saveTasks();
        this.renderTasks();
        this.updateProgress();
        
        taskInput.value = '';
        this.showNotification('Задача добавлена!', 'success');
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            
            if (task.completed) {
                // Добавляем в архив выполненных задач
                this.completedTasks.push({
                    ...task,
                    completedAt: new Date().toISOString()
                });
                this.saveCompletedTasks();
                this.addXP(10);
                this.checkAchievements();
                this.playSound('success');
                this.showNotification('Задача выполнена! 🎉 +10 XP', 'success');
            } else {
                // Удаляем из архива
                this.completedTasks = this.completedTasks.filter(t => t.id !== taskId);
                this.saveCompletedTasks();
                this.showNotification('Задача возвращена в работу', 'info');
            }
            
            this.saveTasks();
            this.renderTasks();
            this.updateProgress();
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const taskItem = document.querySelector(`[data-id="${taskId}"]`);
        const taskText = taskItem.querySelector('.task-text');
        const editForm = taskItem.querySelector('.task-edit-form');
        const editInput = taskItem.querySelector('.task-edit-input');

        // Показываем форму редактирования
        taskText.style.display = 'none';
        editForm.classList.add('active');
        editInput.value = task.text;
        editInput.focus();
        editInput.select();

        // Обработчики для кнопок
        const saveBtn = taskItem.querySelector('.task-edit-save');
        const cancelBtn = taskItem.querySelector('.task-edit-cancel');

        const saveEdit = () => {
            const newText = editInput.value.trim();
            if (newText && newText !== task.text) {
                task.text = newText;
                this.saveTasks();
                this.renderTasks();
                this.showNotification('Задача обновлена', 'success');
            } else {
                this.cancelEdit(taskId);
            }
        };

        const cancelEdit = () => {
            taskText.style.display = 'block';
            editForm.classList.remove('active');
            editInput.value = task.text;
        };

        saveBtn.onclick = saveEdit;
        cancelBtn.onclick = cancelEdit;

        // Enter для сохранения, Escape для отмены
        editInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        };
    }

    cancelEdit(taskId) {
        const taskItem = document.querySelector(`[data-id="${taskId}"]`);
        const taskText = taskItem.querySelector('.task-text');
        const editForm = taskItem.querySelector('.task-edit-form');
        
        taskText.style.display = 'block';
        editForm.classList.remove('active');
    }

    deleteTask(taskId) {
        if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateProgress();
            this.showNotification('Задача удалена', 'info');
        }
    }

    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        const emptyState = document.getElementById('emptyState');

        if (!tasksList) return;

        // Фильтрация и сортировка задач
        let filteredTasks = this.getFilteredTasks();
        filteredTasks = this.sortTasks(filteredTasks);

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        
        tasksList.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="taskManager.toggleTask(${task.id})">
                </div>
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-edit-form">
                    <input type="text" class="task-edit-input" value="${this.escapeHtml(task.text)}">
                    <div class="task-edit-buttons">
                        <button class="task-edit-save">✓</button>
                        <button class="task-edit-cancel">✗</button>
                    </div>
                </div>
                <button class="task-edit" onclick="taskManager.editTask(${task.id})" title="Редактировать задачу">
                    ✏️
                </button>
                <button class="task-delete" onclick="taskManager.deleteTask(${task.id})" title="Удалить задачу">
                    🗑️
                </button>
            </div>
        `).join('');
    }

    updateProgress() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.completedTasks.length; // Используем архив выполненных задач
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Обновляем текст прогресса
        const progressPercentageEl = document.getElementById('progressPercentage');
        const completedTasksEl = document.getElementById('completedTasks');
        const totalTasksEl = document.getElementById('totalTasks');
        
        if (progressPercentageEl) progressPercentageEl.textContent = `${percentage}%`;
        if (completedTasksEl) completedTasksEl.textContent = completedTasks;
        if (totalTasksEl) totalTasksEl.textContent = totalTasks;

        // Анимируем круг прогресса
        this.animateProgressCircle(percentage);
    }

    animateProgressCircle(percentage) {
        const circle = document.querySelector('.progress-ring-fill');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;
        
        // Анимация заполнения круга
        setTimeout(() => {
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }, 100);

        // Изменяем цвет в зависимости от прогресса
        if (percentage === 100) {
            circle.style.stroke = '#4a90e2'; // Синий для 100%
        } else if (percentage >= 75) {
            circle.style.stroke = '#7b68ee'; // Фиолетовый для 75%+
        } else if (percentage >= 50) {
            circle.style.stroke = '#ffc107'; // Желтый для 50%+
        } else if (percentage >= 25) {
            circle.style.stroke = '#fd7e14'; // Оранжевый для 25%+
        } else {
            circle.style.stroke = '#dc3545'; // Красный для <25%
        }
    }

    saveTasks() {
        localStorage.setItem('motivatorTasks', JSON.stringify(this.tasks));
    }

    saveCompletedTasks() {
        localStorage.setItem('motivatorCompletedTasks', JSON.stringify(this.completedTasks));
    }

    getFilteredTasks() {
        switch(this.currentFilter) {
            case 'active':
                return this.tasks.filter(t => !t.completed);
            case 'completed':
                return this.tasks.filter(t => t.completed);
            default:
                return this.tasks;
        }
    }

    sortTasks(tasks) {
        switch(this.currentSort) {
            case 'alphabetical':
                return tasks.sort((a, b) => a.text.localeCompare(b.text));
            case 'status':
                return tasks.sort((a, b) => a.completed - b.completed);
            default: // created
                return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
    }

    bindFilterEvents() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTasks();
            });
        });
    }

    bindSortEvents() {
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.renderTasks();
            });
        }
    }

    bindActionEvents() {
        const markAllBtn = document.getElementById('markAllCompleted');
        const markOneBtn = document.getElementById('markOneCompleted');
        const clearCompletedBtn = document.getElementById('clearCompleted');

        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => {
                this.tasks.forEach(task => {
                    if (!task.completed) {
                        task.completed = true;
                        this.completedTasks.push({
                            ...task,
                            completedAt: new Date().toISOString()
                        });
                    }
                });
                this.saveTasks();
                this.saveCompletedTasks();
                this.renderTasks();
                this.updateProgress();
                this.showNotification('Все задачи отмечены как выполненные!', 'success');
            });
        }

        if (markOneBtn) {
            markOneBtn.addEventListener('click', () => {
                this.markOneTaskCompleted();
            });
        }

        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', () => {
                if (confirm('Удалить все выполненные задачи?')) {
                    this.tasks = this.tasks.filter(t => !t.completed);
                    this.completedTasks = []; // Очищаем архив
                    this.saveTasks();
                    this.saveCompletedTasks();
                    this.renderTasks();
                    this.updateProgress();
                    this.showNotification('Выполненные задачи удалены', 'info');
                }
            });
        }
    }

    markOneTaskCompleted() {
        const activeTasks = this.tasks.filter(t => !t.completed);
        if (activeTasks.length === 0) {
            this.showNotification('Нет активных задач для отметки', 'warning');
            return;
        }

        // Выбираем случайную задачу или первую
        const randomTask = activeTasks[Math.floor(Math.random() * activeTasks.length)];
        this.toggleTask(randomTask.id);
        this.showNotification(`Задача "${randomTask.text}" отмечена как выполненная!`, 'success');
        
        // Обновляем превью задач на главной странице
        this.renderTasksPreview();
        this.renderAchievements();
        this.renderWeeklyChart();
    }

    renderTasksPreview() {
        const tasksPreview = document.getElementById('tasksPreview');
        if (!tasksPreview) return;

        const activeTasks = this.tasks.filter(t => !t.completed).slice(0, 3);
        
        if (activeTasks.length === 0) {
            tasksPreview.innerHTML = '<p style="text-align: center; color: #b8b8b8;">Нет активных задач</p>';
            return;
        }

        tasksPreview.innerHTML = activeTasks.map(task => `
            <div class="task-preview-item">
                <span class="task-preview-text">${this.escapeHtml(task.text)}</span>
                <span class="task-preview-status active">Активная</span>
            </div>
        `).join('');
    }

    renderArchiveStats() {
        const totalCompleted = this.completedTasks.length;
        const today = new Date().toDateString();
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const completedToday = this.completedTasks.filter(t => 
            new Date(t.completedAt).toDateString() === today
        ).length;
        
        const completedThisWeek = this.completedTasks.filter(t => 
            new Date(t.completedAt) >= weekAgo
        ).length;

        const totalCompletedEl = document.getElementById('totalCompleted');
        const completedTodayEl = document.getElementById('completedToday');
        const completedThisWeekEl = document.getElementById('completedThisWeek');

        if (totalCompletedEl) totalCompletedEl.textContent = totalCompleted;
        if (completedTodayEl) completedTodayEl.textContent = completedToday;
        if (completedThisWeekEl) completedThisWeekEl.textContent = completedThisWeek;
    }

    bindArchiveEvents() {
        const dateFilter = document.getElementById('dateFilter');
        const searchInput = document.getElementById('searchArchive');
        const markOneBtn = document.getElementById('markOneFromArchive');
        const exportBtn = document.getElementById('exportArchive');
        const clearBtn = document.getElementById('clearArchive');

        if (dateFilter) {
            dateFilter.addEventListener('change', () => {
                this.renderArchive();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.renderArchive();
            });
        }

        if (markOneBtn) {
            markOneBtn.addEventListener('click', () => {
                this.markOneTaskCompleted();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportArchive();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Очистить весь архив? Это действие нельзя отменить.')) {
                    this.completedTasks = [];
                    this.saveCompletedTasks();
                    this.renderArchive();
                    this.showNotification('Архив очищен', 'info');
                }
            });
        }
    }

    renderArchive() {
        const archiveList = document.getElementById('archiveList');
        const emptyArchive = document.getElementById('emptyArchive');
        
        if (!archiveList) return;

        let filteredTasks = this.completedTasks;
        
        // Фильтрация по дате
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            const filterValue = dateFilter.value;
            const now = new Date();
            
            switch(filterValue) {
                case 'today':
                    const today = now.toDateString();
                    filteredTasks = filteredTasks.filter(t => 
                        new Date(t.completedAt).toDateString() === today
                    );
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    filteredTasks = filteredTasks.filter(t => 
                        new Date(t.completedAt) >= weekAgo
                    );
                    break;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    filteredTasks = filteredTasks.filter(t => 
                        new Date(t.completedAt) >= monthAgo
                    );
                    break;
            }
        }

        // Поиск
        const searchInput = document.getElementById('searchArchive');
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredTasks = filteredTasks.filter(t => 
                t.text.toLowerCase().includes(searchTerm)
            );
        }

        // Сортировка по дате выполнения
        filteredTasks.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        if (filteredTasks.length === 0) {
            archiveList.innerHTML = '';
            if (emptyArchive) emptyArchive.style.display = 'block';
            return;
        }

        if (emptyArchive) emptyArchive.style.display = 'none';

        archiveList.innerHTML = filteredTasks.map(task => {
            const completedDate = new Date(task.completedAt);
            const dateStr = completedDate.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="archive-item" data-id="${task.id}">
                    <span class="archive-text">${this.escapeHtml(task.text)}</span>
                    <span class="archive-date">${dateStr}</span>
                    <button class="archive-delete" onclick="taskManager.deleteFromArchive(${task.id})" title="Удалить из архива">
                        🗑️
                    </button>
                </div>
            `;
        }).join('');
    }

    deleteFromArchive(taskId) {
        if (confirm('Удалить эту задачу из архива?')) {
            this.completedTasks = this.completedTasks.filter(t => t.id !== taskId);
            this.saveCompletedTasks();
            this.renderArchive();
            this.showNotification('Задача удалена из архива', 'info');
        }
    }

    exportArchive() {
        const dataStr = JSON.stringify(this.completedTasks, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `motivator-archive-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Архив экспортирован', 'success');
    }

    // Мотивационные функции
    showRandomQuote() {
        const quoteElement = document.getElementById('motivationQuote');
        const authorElement = document.getElementById('quoteAuthor');
        
        if (quoteElement && authorElement) {
            const randomQuote = this.motivationQuotes[Math.floor(Math.random() * this.motivationQuotes.length)];
            quoteElement.textContent = `"${randomQuote.text}"`;
            authorElement.textContent = `- ${randomQuote.author}`;
        }
    }

    showNewQuote() {
        this.showRandomQuote();
        this.showNotification('Новая мотивация! 💪', 'success');
    }

    // Система достижений
    renderAchievements() {
        const achievementsGrid = document.getElementById('achievementsGrid');
        if (!achievementsGrid) return;

        const achievements = [
            {
                id: 'first_task',
                title: 'Первые шаги',
                description: 'Создайте свою первую задачу',
                icon: '🎯',
                requirement: 1,
                current: this.tasks.length,
                type: 'tasks_created'
            },
            {
                id: 'task_master',
                title: 'Мастер задач',
                description: 'Создайте 10 задач',
                icon: '📝',
                requirement: 10,
                current: this.tasks.length,
                type: 'tasks_created'
            },
            {
                id: 'completionist',
                title: 'Завершитель',
                description: 'Выполните 5 задач',
                icon: '✅',
                requirement: 5,
                current: this.completedTasks.length,
                type: 'tasks_completed'
            },
            {
                id: 'streak_master',
                title: 'Серия побед',
                description: 'Выполняйте задачи 3 дня подряд',
                icon: '🔥',
                requirement: 3,
                current: this.getCurrentStreak(),
                type: 'daily_streak'
            },
            {
                id: 'speed_demon',
                title: 'Скоростной демон',
                description: 'Выполните 3 задачи за день',
                icon: '⚡',
                requirement: 3,
                current: this.getTodayCompleted(),
                type: 'daily_tasks'
            },
            {
                id: 'dedication',
                title: 'Преданность',
                description: 'Используйте приложение 7 дней',
                icon: '💎',
                requirement: 7,
                current: this.getDaysUsed(),
                type: 'days_used'
            }
        ];

        achievementsGrid.innerHTML = achievements.map(achievement => {
            const isUnlocked = achievement.current >= achievement.requirement;
            const progress = Math.min((achievement.current / achievement.requirement) * 100, 100);
            
            return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                    <div class="achievement-progress">
                        <div class="achievement-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div style="font-size: 0.7rem; color: #b8b8b8; margin-top: 5px;">
                        ${achievement.current}/${achievement.requirement}
                    </div>
                </div>
            `;
        }).join('');
    }

    getCurrentStreak() {
        // Простая логика для серии дней
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
        
        const todayCompleted = this.completedTasks.filter(t => 
            new Date(t.completedAt).toDateString() === today
        ).length;
        
        const yesterdayCompleted = this.completedTasks.filter(t => 
            new Date(t.completedAt).toDateString() === yesterday
        ).length;
        
        return todayCompleted > 0 && yesterdayCompleted > 0 ? 2 : (todayCompleted > 0 ? 1 : 0);
    }

    getTodayCompleted() {
        const today = new Date().toDateString();
        return this.completedTasks.filter(t => 
            new Date(t.completedAt).toDateString() === today
        ).length;
    }

    getDaysUsed() {
        // Простая логика - считаем дни с момента первого использования
        const firstTask = this.tasks[0];
        if (!firstTask) return 0;
        
        const firstDate = new Date(firstTask.createdAt);
        const today = new Date();
        const diffTime = Math.abs(today - firstDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.min(diffDays, 7);
    }

    // Статистика недели
    renderWeeklyChart() {
        const weeklyChart = document.getElementById('weeklyChart');
        if (!weeklyChart) return;

        const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        const weekData = this.getWeeklyData();

        weeklyChart.innerHTML = days.map((day, index) => {
            const value = weekData[index] || 0;
            const height = Math.max((value / Math.max(...weekData, 1)) * 100, 10);
            
            return `
                <div class="chart-bar" style="height: ${height}%">
                    <div class="chart-bar-value">${value}</div>
                    <div class="chart-bar-label">${day}</div>
                </div>
            `;
        }).join('');
    }

    getWeeklyData() {
        const weekData = [0, 0, 0, 0, 0, 0, 0];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - i));
            const dateString = date.toDateString();
            
            weekData[i] = this.completedTasks.filter(task => 
                new Date(task.completedAt).toDateString() === dateString
            ).length;
        }
        
        return weekData;
    }

    // Частицы
    createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
            particle.style.animationDelay = Math.random() * 2 + 's';
            particlesContainer.appendChild(particle);

            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 6000);
        };

        // Создаем частицы каждые 2 секунды
        setInterval(createParticle, 2000);
        
        // Создаем начальные частицы
        for (let i = 0; i < 5; i++) {
            setTimeout(createParticle, i * 400);
        }
    }

    // Звуковые эффекты
    playSound(type) {
        if (!this.soundsEnabled) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'success':
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
                oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
                break;
            case 'achievement':
                oscillator.frequency.setValueAtTime(261.63, audioContext.currentTime); // C4
                oscillator.frequency.setValueAtTime(329.63, audioContext.currentTime + 0.1); // E4
                oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime + 0.2); // G4
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime + 0.3); // C5
                break;
        }
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    // Система XP и уровней
    addXP(amount) {
        this.userXP += amount;
        localStorage.setItem('motivatorXP', this.userXP.toString());
        
        const newLevel = Math.floor(this.userXP / 100) + 1;
        if (newLevel > this.userLevel) {
            this.userLevel = newLevel;
            localStorage.setItem('motivatorLevel', this.userLevel.toString());
            this.showLevelUpNotification();
        }
    }

    showLevelUpNotification() {
        this.showNotification(`🎉 Уровень повышен! Теперь вы ${this.userLevel} уровня!`, 'success');
        this.playSound('achievement');
    }

    checkAchievements() {
        // Проверяем достижения после каждого действия
        const achievements = [
            {
                id: 'first_task',
                condition: () => this.tasks.length >= 1,
                title: 'Первые шаги',
                message: '🎯 Поздравляем! Вы создали первую задачу!'
            },
            {
                id: 'task_master',
                condition: () => this.tasks.length >= 10,
                title: 'Мастер задач',
                message: '📝 Невероятно! Вы создали 10 задач!'
            },
            {
                id: 'completionist',
                condition: () => this.completedTasks.length >= 5,
                title: 'Завершитель',
                message: '✅ Потрясающе! Вы выполнили 5 задач!'
            },
            {
                id: 'speed_demon',
                condition: () => this.getTodayCompleted() >= 3,
                title: 'Скоростной демон',
                message: '⚡ Невероятно! 3 задачи за день!'
            }
        ];

        achievements.forEach(achievement => {
            if (achievement.condition() && !this.achievements.includes(achievement.id)) {
                this.achievements.push(achievement.id);
                localStorage.setItem('motivatorAchievements', JSON.stringify(this.achievements));
                this.showNotification(achievement.message, 'success');
                this.playSound('achievement');
            }
        });
    }

    // Обновление уровня пользователя
    updateUserLevel() {
        const currentLevelEl = document.getElementById('currentLevel');
        const xpFillEl = document.getElementById('xpFill');
        const xpTextEl = document.getElementById('xpText');
        
        if (currentLevelEl) currentLevelEl.textContent = this.userLevel;
        
        if (xpFillEl && xpTextEl) {
            const currentLevelXP = (this.userLevel - 1) * 100;
            const nextLevelXP = this.userLevel * 100;
            const progressXP = this.userXP - currentLevelXP;
            const progressPercent = (progressXP / 100) * 100;
            
            xpFillEl.style.width = `${progressPercent}%`;
            xpTextEl.textContent = `${progressXP}/100 XP`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Стили для уведомления
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        // Цвета для разных типов уведомлений
        const colors = {
            success: '#28a745',
            warning: '#ffc107',
            info: '#17a2b8',
            error: '#dc3545'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Удаление через 3 секунды
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Метод для очистки всех задач
    clearAllTasks() {
        if (confirm('Вы уверены, что хотите удалить все задачи? Это действие нельзя отменить.')) {
            this.tasks = [];
            this.saveTasks();
            this.renderTasks();
            this.updateProgress();
            this.showNotification('Все задачи удалены', 'info');
        }
    }

    // Метод для экспорта задач
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `motivator-tasks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Задачи экспортированы', 'success');
    }
}

// Инициализация приложения
let taskManager;

document.addEventListener('DOMContentLoaded', () => {
    taskManager = new TaskManager();
    
    // Добавляем горячие клавиши
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter для быстрого добавления задачи
        if (e.ctrlKey && e.key === 'Enter') {
            const taskInput = document.getElementById('taskInput');
            if (taskInput) taskInput.focus();
        }
        
        // Escape для очистки поля ввода
        if (e.key === 'Escape') {
            const taskInput = document.getElementById('taskInput');
            if (taskInput) {
                taskInput.value = '';
                taskInput.blur();
            }
        }
    });

    // Добавляем контекстное меню для дополнительных функций
    const progressSection = document.querySelector('.progress-section');
    if (progressSection) {
        progressSection.addEventListener('dblclick', () => {
            const options = [
                'Очистить все задачи',
                'Экспортировать задачи',
                'Отменить'
            ];
            
            const choice = prompt(`Дополнительные функции:\n1. ${options[0]}\n2. ${options[1]}\n3. ${options[2]}\n\nВведите номер (1-3):`);
            
            switch(choice) {
                case '1':
                    taskManager.clearAllTasks();
                    break;
                case '2':
                    taskManager.exportTasks();
                    break;
                default:
                    break;
            }
        });
    }
});

// Добавляем поддержку drag & drop для задач (опционально)
document.addEventListener('DOMContentLoaded', () => {
    let draggedElement = null;
    
    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('task-item')) {
            draggedElement = e.target;
            e.target.style.opacity = '0.5';
        }
    });
    
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('task-item')) {
            e.target.style.opacity = '1';
            draggedElement = null;
        }
    });
    
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedElement && e.target.classList.contains('task-item')) {
            const tasksList = document.getElementById('tasksList');
            const targetIndex = Array.from(tasksList.children).indexOf(e.target);
            const draggedIndex = Array.from(tasksList.children).indexOf(draggedElement);
            
            if (targetIndex !== draggedIndex) {
                // Перемещаем задачу в массиве
                const draggedTask = taskManager.tasks[draggedIndex];
                taskManager.tasks.splice(draggedIndex, 1);
                taskManager.tasks.splice(targetIndex, 0, draggedTask);
                
                taskManager.saveTasks();
                taskManager.renderTasks();
            }
        }
    });
});

// Инициализация Swiper слайдера для мотивирующих цитат
document.addEventListener('DOMContentLoaded', function() {
    const motivationSwiper = new Swiper('.motivation-swiper', {
        // Основные настройки
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        speed: 800,
        
        // Эффект перехода
        effect: 'slide',
        
        // Навигация
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        
        // Пагинация
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true,
        },
        
        // Адаптивность
        breakpoints: {
            320: {
                slidesPerView: 1,
                spaceBetween: 20,
            },
            768: {
                slidesPerView: 1,
                spaceBetween: 30,
            },
            1024: {
                slidesPerView: 1,
                spaceBetween: 40,
            }
        },
        
        // События
        on: {
            slideChange: function() {
                // Добавляем эффект при смене слайда
                const activeSlide = this.slides[this.activeIndex];
                if (activeSlide) {
                    activeSlide.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        activeSlide.style.transform = 'scale(1)';
                    }, 300);
                }
            }
        }
    });
    
    // Пауза автопрокрутки при наведении
    const swiperContainer = document.querySelector('.motivation-swiper');
    if (swiperContainer) {
        swiperContainer.addEventListener('mouseenter', () => {
            motivationSwiper.autoplay.stop();
        });
        
        swiperContainer.addEventListener('mouseleave', () => {
            motivationSwiper.autoplay.start();
        });
    }
});
