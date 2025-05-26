document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const habitsContainer = document.getElementById('habits-container');
    const habitInput = document.getElementById('habit-input');
    const habitCategory = document.getElementById('habit-category');
    const addHabitBtn = document.getElementById('add-habit-btn');
    const categoryFilter = document.getElementById('category-filter');
    const themeToggle = document.getElementById('theme-toggle');
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const authModal = document.getElementById('auth-modal');
    const syncBtn = document.getElementById('sync-btn');
    const googleAuthBtn = document.getElementById('google-auth-btn');
    const closeModals = document.querySelectorAll('.close-modal');
    
    // Variáveis de estado
    let habits = JSON.parse(localStorage.getItem('habits')) || [];
    let currentTheme = localStorage.getItem('theme') || 'light';
    let gapiLoaded = false;
    
    // Inicialização
    initTheme();
    renderHabits();
    loadGAPI();
    
    // Event Listeners
    addHabitBtn.addEventListener('click', addHabit);
    habitInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addHabit();
    });
    
    categoryFilter.addEventListener('change', renderHabits);
    themeToggle.addEventListener('click', toggleTheme);
    aboutBtn.addEventListener('click', () => aboutModal.style.display = 'flex');
    syncBtn.addEventListener('click', () => authModal.style.display = 'flex');
    googleAuthBtn.addEventListener('click', handleAuth);
    
    closeModals.forEach(btn => {
        btn.addEventListener('click', function() {
            aboutModal.style.display = 'none';
            authModal.style.display = 'none';
        });
    });
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(e) {
        if (e.target === aboutModal) aboutModal.style.display = 'none';
        if (e.target === authModal) authModal.style.display = 'none';
    });
    
    // Funções
    function initTheme() {
        document.body.setAttribute('data-theme', currentTheme);
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = currentTheme === 'dark' ? 'brightness_7' : 'brightness_4';
    }
    
    function toggleTheme() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = currentTheme === 'dark' ? 'brightness_7' : 'brightness_4';
    }
    
    function addHabit() {
        const text = habitInput.value.trim();
        const category = habitCategory.value;
        
        if (text) {
            const newHabit = {
                id: Date.now(),
                text,
                category,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            habits.unshift(newHabit);
            saveHabits();
            renderHabits();
            habitInput.value = '';
        }
    }
    
    function renderHabits() {
        const filter = categoryFilter.value;
        let filteredHabits = [...habits];
        
        if (filter !== 'all') {
            filteredHabits = habits.filter(habit => habit.category === filter);
        }
        
        habitsContainer.innerHTML = '';
        
        if (filteredHabits.length === 0) {
            habitsContainer.innerHTML = '<p class="no-habits">Nenhum hábito encontrado.</p>';
            return;
        }
        
        filteredHabits.forEach(habit => {
            const habitEl = document.createElement('li');
            habitEl.className = 'habit-item';
            habitEl.innerHTML = `
                <div class="habit-info">
                    <div class="habit-category category-${habit.category}"></div>
                    <span class="habit-text ${habit.completed ? 'completed' : ''}">${habit.text}</span>
                </div>
                <div class="habit-actions">
                    <button class="complete-btn" data-id="${habit.id}" title="Marcar como ${habit.completed ? 'não completado' : 'completado'}">
                        <span class="material-icons">${habit.completed ? 'check_circle' : 'radio_button_unchecked'}</span>
                    </button>
                    <button class="delete-btn" data-id="${habit.id}" title="Excluir">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            `;
            
            habitsContainer.appendChild(habitEl);
        });
        
        // Adicionar event listeners aos botões
        document.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                toggleComplete(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                deleteHabit(id);
            });
        });
    }
    
    function toggleComplete(id) {
        habits = habits.map(habit => {
            if (habit.id === id) {
                return {...habit, completed: !habit.completed};
            }
            return habit;
        });
        
        saveHabits();
        renderHabits();
    }
    
    function deleteHabit(id) {
        if (confirm('Tem certeza que deseja excluir este hábito?')) {
            habits = habits.filter(habit => habit.id !== id);
            saveHabits();
            renderHabits();
        }
    }
    
    function saveHabits() {
        localStorage.setItem('habits', JSON.stringify(habits));
    }
    
    function loadGAPI() {
        gapi.load('client:auth2', function() {
            gapi.client.init({
                apiKey: 'YOUR_API_KEY',
                clientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar.events'
            }).then(function() {
                gapiLoaded = true;
                // Verificar se já está autenticado
                if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
                    syncBtn.textContent = 'Sincronizado';
                    syncBtn.disabled = true;
                }
            }).catch(error => {
                console.error('Erro ao carregar GAPI:', error);
            });
        });
    }
    
    function handleAuth() {
        if (!gapiLoaded) {
            alert('A API do Google ainda não foi carregada. Por favor, tente novamente.');
            return;
        }
        
        const authInstance = gapi.auth2.getAuthInstance();
        
        if (authInstance.isSignedIn.get()) {
            // Já autenticado
            syncWithGoogleCalendar();
        } else {
            // Fazer login
            authInstance.signIn()
                .then(() => {
                    authModal.style.display = 'none';
                    syncBtn.textContent = 'Sincronizado';
                    syncBtn.disabled = true;
                    syncWithGoogleCalendar();
                })
                .catch(error => {
                    console.error('Erro de autenticação:', error);
                    alert('Falha na autenticação com o Google.');
                });
        }
    }
    
    function syncWithGoogleCalendar() {
        if (!gapiLoaded) return;
        
        const calendarId = 'primary';
        const promises = habits.map(habit => {
            // Verificar se já foi sincronizado
            if (habit.eventId) return Promise.resolve();
            
            const event = {
                summary: `[Organizador] ${habit.text}`,
                description: `Categoria: ${habit.category}\nCriado em: ${new Date(habit.createdAt).toLocaleString()}`,
                start: {
                    dateTime: new Date().toISOString(),
                    timeZone: 'America/Sao_Paulo'
                },
                end: {
                    dateTime: new Date(Date.now() + 3600000).toISOString(),
                    timeZone: 'America/Sao_Paulo'
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        {method: 'popup', minutes: 30}
                    ]
                }
            };
            
            return gapi.client.calendar.events.insert({
                calendarId,
                resource: event
            }).then(response => {
                habit.eventId = response.result.id;
                return habit;
            });
        });
        
        Promise.all(promises)
            .then(updatedHabits => {
                habits = updatedHabits.filter(h => h); // Remove undefined (já sincronizados)
                saveHabits();
                alert('Hábitos sincronizados com sucesso com o Google Agenda!');
            })
            .catch(error => {
                console.error('Erro ao sincronizar:', error);
                alert('Ocorreu um erro ao sincronizar com o Google Agenda.');
            });
    }
});