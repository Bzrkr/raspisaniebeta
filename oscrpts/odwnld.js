async function fetchJson(url) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
            return res.json();
        }

        function log(line) {
            const el = document.getElementById('log');
            const time = new Date().toLocaleTimeString();
            el.textContent += `[${time}] ${line}\n`;
            el.scrollTop = el.scrollHeight;
        }

        function setProgress(done, total) {
            const pct = total > 0 ? Math.round(done * 100 / total) : 0;
            document.getElementById('bar').style.width = pct + '%';
            document.getElementById('pct').textContent = pct + '%';
        }

        function saveAsJson(filename, data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }

        async function startDownload() {
            const btn = document.getElementById('start');
            btn.disabled = true;
            document.getElementById('bar').style.width = '0%';
            document.getElementById('pct').textContent = '0%';
            document.getElementById('log').textContent = '';

            try {
                log('Загружаю список преподавателей...');
                const teachers = await fetchJson('https://iis.bsuir.by/api/v1/employees/all');
                log(`Преподавателей: ${teachers.length}`);

                const total = teachers.length;
                let done = 0;
                setProgress(done, total);

                const schedulesByTeacher = {};

                // Параллельность по батчам для снижения нагрузки
                const batchSize = 10;
                for (let i = 0; i < teachers.length; i += batchSize) {
                    const batch = teachers.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (t) => {
                        try {
                            const sc = await fetchJson(`https://iis.bsuir.by/api/v1/employees/schedule/${t.urlId}`);
                            schedulesByTeacher[t.urlId] = sc;
                            log(`✓ ${t.fio}`);
                        } catch (e) {
                            schedulesByTeacher[t.urlId] = { schedules: {}, previousSchedules: {} };
                            log(`✗ ${t.fio}: ${e.message}`);
                        } finally {
                            done += 1;
                            setProgress(done, total);
                        }
                    }));
                }

                const payload = {
                    generatedAt: new Date().toISOString(),
                    teachers: teachers,
                    teacherSchedules: schedulesByTeacher
                };

                saveAsJson('schedules.json', payload);
                log('Готово. Файл schedules.json сохранён. Загрузите его в корень сайта (рядом с index.html).');
              
            } catch (e) {
                log('Ошибка: ' + e.message);
            } finally {
                btn.disabled = false;
            }
             
                    window.open('https://github.com/Bzrkr/raspisaniebeta/upload/main', '_blank', 'noopener');
              
        }