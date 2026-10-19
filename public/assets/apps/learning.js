export async function mount(root, style, ctx) {
  root.className = 'app-learning';
  const { el, api, notify } = ctx;
  const state = { courses: [], progress: [], course: null, lesson: 0, answers: new Map(), result: null };
  const button = (text, className, action) => { const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node; };
  root.replaceChildren(el('p', 'learning-loading', 'Getting your next good idea ready…'));
  try { const [courses, progress] = await Promise.all([api('/courses'), api(`/progress?style=${encodeURIComponent(style.slug)}`)]); state.courses = courses.courses; state.progress = progress.progress; }
  catch (error) { root.replaceChildren(el('h1', '', 'We could not load your classroom.'), el('p', '', error.message), button('Try again', 'btn', () => mount(root, style, ctx))); return; }
  const done = (course, lesson) => state.progress.some(item => item.courseId === course.id && item.lessonId === lesson.id && item.completed);
  const completedCount = course => course.lessons.filter(lesson => done(course, lesson)).length;
  function illustration() {
    const scene = el('div', 'learning-illustration'); scene.setAttribute('role', 'img'); scene.setAttribute('aria-label', 'Illustrated stack of books and a bright idea');
    scene.append(el('span', 'learning-spark learning-spark-one', '✳'), el('span', 'learning-spark learning-spark-two', '+'), el('div', 'learning-sun', '✧'));
    const books = el('div', 'learning-books'); books.append(el('div', 'learning-book learning-book-one'), el('div', 'learning-book learning-book-two'), el('div', 'learning-book learning-book-three')); scene.append(books, el('span', 'learning-illustration-caption', 'A little more curious, every day.')); return scene;
  }
  function render() {
    const wrap = el('div', 'learning-wrap'); const header = el('header', 'learning-header');
    const brand = el('a', 'learning-brand', style.brand || 'Little Steps'); brand.href = '../../'; brand.setAttribute('aria-label', 'Back to style gallery');
    const navigation = el('nav', 'learning-navigation'); navigation.setAttribute('aria-label', 'Learning navigation'); navigation.append(button('Explore courses', 'learning-nav-active', () => { state.course = null; render(); }), el('span', 'learning-learner', '● Your learning space')); header.append(brand, navigation); wrap.append(header);
    if (ctx.mode === 'preview') wrap.append(el('p', 'learning-preview', 'Preview classroom · Read every lesson here. Start the Node backend to save progress or have your quiz scored.'));
    if (state.course) renderCourse(wrap); else renderCatalog(wrap);
    const footer = el('footer', 'learning-footer'); footer.append(el('strong', '', style.brand || 'Little Steps'), el('span', '', 'Small lessons. Real understanding. A fictional learning platform demo.')); wrap.append(footer); root.replaceChildren(wrap);
  }
  function renderCatalog(wrap) {
    const hero = el('section', 'learning-hero'); const copy = el('div', 'learning-hero-copy'); copy.append(el('p', 'eyebrow', 'BIG IDEAS START SMALL'), el('h1', '', style.headline || 'Stay curious. Grow a little.'), el('p', 'learning-hero-description', style.description || 'Make space for a new skill. Friendly lessons for the things you have always wanted to understand.'));
    copy.append(button('Find your next lesson ↗', 'btn', () => { const courses = root.querySelector('.learning-course-list'); courses?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }));
    const badges = el('div', 'learning-hero-badges'); badges.append(el('span', '', '✓ Learn at your pace'), el('span', '', '✓ Practice as you go')); copy.append(badges); hero.append(copy, illustration()); wrap.append(hero);
    const courseSection = el('section', 'learning-course-list'); const sectionHeader = el('div', 'learning-section-heading'); sectionHeader.append(el('div', '', 'YOUR NEXT CHAPTER'), el('h2', '', 'A good place to begin.')); courseSection.append(sectionHeader);
    if (!state.courses.length) courseSection.append(el('p', 'learning-empty', 'New courses are on the way. Please check back soon.'));
    const grid = el('div', 'learning-course-grid');
    state.courses.forEach((course, index) => {
      const card = el('article', 'learning-course-card'); const art = el('div', `learning-course-art learning-course-art-${index % 3}`); art.setAttribute('aria-hidden', 'true'); art.append(el('span', 'learning-course-art-number', `0${index + 1}`), el('span', 'learning-course-art-icon', ['⌘', '▥', '✳'][index % 3]));
      const content = el('div', 'learning-course-content'); content.append(el('p', 'learning-category', course.category), el('h3', '', course.title), el('p', 'learning-course-description', course.description));
      const count = completedCount(course); content.append(el('p', 'learning-course-meta', `${course.lessons.length} bite-sized lessons · ${count} completed`));
      if (count) { const progress = el('progress', 'learning-progress'); progress.max = course.lessons.length; progress.value = count; progress.setAttribute('aria-label', `${course.title}: ${count} of ${course.lessons.length} lessons completed`); content.append(progress); }
      content.append(button(count ? 'Continue learning ↗' : 'Let’s get started ↗', 'learning-course-link', () => { state.course = course; state.lesson = Math.max(0, course.lessons.findIndex(lesson => !done(course, lesson))); state.result = null; render(); })); card.append(art, content); grid.append(card);
    }); courseSection.append(grid); wrap.append(courseSection);
    const note = el('aside', 'learning-note'); note.append(el('span', '', '✳'), el('div', '', 'You do not have to know everything. Just be ready to learn something.')); wrap.append(note);
  }
  function renderCourse(wrap) {
    const course = state.course; const lesson = course.lessons[state.lesson]; const main = el('section', 'learning-classroom');
    main.append(button('← All courses', 'learning-back', () => { state.course = null; render(); }));
    const intro = el('div', 'learning-classroom-heading'); intro.append(el('p', 'learning-category', course.category), el('h1', '', course.title), el('p', '', course.description)); main.append(intro);
    const layout = el('div', 'learning-classroom-layout'); const curriculum = el('aside', 'learning-curriculum'); curriculum.append(el('h2', '', 'Your learning path'));
    const count = completedCount(course); const progress = el('progress', 'learning-progress'); progress.max = course.lessons.length || 1; progress.value = count; progress.setAttribute('aria-label', `${count} of ${course.lessons.length} lessons completed`); curriculum.append(progress, el('p', 'learning-progress-caption', `${count} / ${course.lessons.length} lessons complete`));
    const lessonNav = el('nav', 'learning-lessons'); lessonNav.setAttribute('aria-label', 'Course lessons');
    course.lessons.forEach((item, index) => {
      const node = button('', state.lesson === index ? 'learning-lesson-nav is-active' : 'learning-lesson-nav', () => { state.lesson = index; render(); }); node.append(el('span', 'learning-lesson-number', done(course, item) ? '✓' : String(index + 1).padStart(2, '0')), el('span', '', item.title)); node.setAttribute('aria-current', state.lesson === index ? 'step' : 'false'); lessonNav.append(node);
    }); curriculum.append(lessonNav, el('p', 'learning-curriculum-note', 'Your completed lessons are saved to this browser’s workspace when the Node backend is running.'));
    const content = el('div', 'learning-lesson-content');
    if (!lesson) content.append(el('p', 'learning-empty', 'No lessons are available for this course yet.'));
    else {
      const article = el('article', 'learning-lesson-article'); article.append(el('p', 'eyebrow', `LESSON ${String(state.lesson + 1).padStart(2, '0')} OF ${String(course.lessons.length).padStart(2, '0')}`), el('h2', '', lesson.title));
      for (const paragraph of (Array.isArray(lesson.body) ? lesson.body : [lesson.body])) article.append(el('p', 'learning-lesson-body', paragraph));
      const takeaway = el('aside', 'learning-takeaway'); takeaway.append(el('span', '', '✧'), el('p', '', 'Try explaining this idea in your own words before moving on. That is where understanding begins.')); article.append(takeaway);
      const completion = button(done(course, lesson) ? '✓ Lesson complete — mark incomplete' : 'Mark lesson complete', 'btn learning-completion', async () => {
        completion.disabled = true;
        try { const response = await api('/progress', { method: 'PUT', body: { style: style.slug, courseId: course.id, lessonId: lesson.id, completed: !done(course, lesson) } }); state.progress = state.progress.filter(item => !(item.courseId === course.id && item.lessonId === lesson.id)); state.progress.push(response.progress); render(); notify(response.progress.completed ? 'Lesson completed. Nice progress!' : 'Lesson marked incomplete.'); }
        catch (error) { completion.disabled = false; notify(error.message, 'error'); }
      }); article.append(completion);
      const paging = el('div', 'learning-paging');
      if (state.lesson > 0) paging.append(button('← Previous lesson', 'learning-page-link', () => { state.lesson--; render(); }));
      if (state.lesson < course.lessons.length - 1) paging.append(button('Next lesson →', 'learning-page-link', () => { state.lesson++; render(); }));
      article.append(paging); content.append(article);
      renderQuiz(content, course);
    }
    layout.append(curriculum, content); main.append(layout); wrap.append(main);
  }
  function renderQuiz(content, course) {
    const quiz = el('form', 'learning-quiz'); quiz.append(el('p', 'eyebrow', 'A LITTLE CHECK-IN'), el('h2', '', 'Put your ideas to the test.'), el('p', 'learning-quiz-description', 'Answer all questions. The server checks your answers and returns your score.'));
    const courseAnswers = state.answers.get(course.id) || new Map(); state.answers.set(course.id, courseAnswers);
    course.lessons.forEach((lesson, index) => {
      const fieldset = el('fieldset', 'learning-question'); const legend = el('legend', '', `${index + 1}. ${lesson.question}`); fieldset.append(legend);
      lesson.choices.forEach((choice, choiceIndex) => {
        const label = el('label', 'learning-choice'); const input = el('input'); input.type = 'radio'; input.name = `answer-${lesson.id}`; input.value = String(choiceIndex); input.required = true; input.checked = courseAnswers.get(lesson.id) === choiceIndex;
        input.addEventListener('change', () => { courseAnswers.set(lesson.id, choiceIndex); state.result = null; resultArea.replaceChildren(); }); label.append(input, el('span', '', choice)); fieldset.append(label);
      }); quiz.append(fieldset);
    });
    const submit = el('button', 'btn', 'Check my answers'); submit.type = 'submit'; quiz.append(submit);
    const resultArea = el('div', 'learning-quiz-result'); resultArea.setAttribute('aria-live', 'polite');
    if (state.result) resultArea.append(el('p', '', `Your score: ${state.result.score} / ${state.result.total}. ${state.result.score === state.result.total ? 'You have got the idea. Keep growing!' : 'Revisit the lessons and give it another try.'}`)); quiz.append(resultArea);
    quiz.addEventListener('submit', async event => {
      event.preventDefault(); if (courseAnswers.size !== course.lessons.length) { notify('Please choose an answer for every question.', 'error'); return; } submit.disabled = true; submit.textContent = 'Checking…';
      try { state.result = await api('/quiz', { method: 'POST', body: { style: style.slug, courseId: course.id, answers: course.lessons.map(lesson => ({ lessonId: lesson.id, choice: courseAnswers.get(lesson.id) })) } }); resultArea.replaceChildren(el('p', '', `Your score: ${state.result.score} / ${state.result.total}. ${state.result.score === state.result.total ? 'You have got the idea. Keep growing!' : 'Revisit the lessons and give it another try.'}`)); notify('Your quiz has been scored.'); }
      catch (error) { notify(error.message, 'error'); }
      finally { submit.disabled = false; submit.textContent = 'Check my answers'; }
    }); content.append(quiz);
  }
  render();
}
