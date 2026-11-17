/**
 * Single choice quiz: several questions with the same answer options.
 *
 * config.options:   ['nicht 1NF', '1NF', '2NF', '3NF']
 * config.questions: [{prompt (HTML), facts? (HTML), answer (option), why (HTML)}]
 */
class ChoiceQuiz extends Exercise {
  renderBody(body) {
    const { options, questions } = this.config;
    this.answers = new Map();
    body.innerHTML = `<ol class="quiz">
      ${questions.map((q, i) => `
        <li data-q="${i}">
          <div>${q.prompt}</div>
          ${q.facts ? `<p class="facts">${q.facts}</p>` : ''}
          <div class="chips choices" role="radiogroup">
            ${(q.options ?? options).map((o) => `<button class="chip" role="radio" aria-checked="false" aria-pressed="false" data-opt="${o}">${o}</button>`).join('')}
            <span class="mark"></span>
          </div>
          <p class="why" hidden>${q.why}</p>
        </li>`).join('')}
    </ol>`;
    body.querySelectorAll('li[data-q]').forEach((li) => {
      li.querySelectorAll('[data-opt]').forEach((btn) => btn.addEventListener('click', () => this.#choose(li, btn.dataset.opt)));
    });
  }

  #choose(li, option) {
    this.answers.set(Number(li.dataset.q), option);
    li.querySelectorAll('[data-opt]').forEach((b) => {
      const on = b.dataset.opt === option;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-checked', String(on));
    });
    li.classList.remove('right', 'wrong');
    li.querySelector('.mark').textContent = '';
  }

  evaluate() {
    let correct = 0;
    let answered = 0;
    this.config.questions.forEach((q, i) => {
      const li = this.body.querySelector(`[data-q="${i}"]`);
      const a = this.answers.get(i);
      if (a === undefined) return;
      answered++;
      const ok = a === q.answer;
      if (ok) correct++;
      li.classList.toggle('right', ok);
      li.classList.toggle('wrong', !ok);
      li.querySelector('.mark').textContent = ok ? '✔' : '✘';
      li.querySelector('.why').hidden = !ok;
    });
    const total = this.config.questions.length;
    if (!answered) return { ok: false, message: 'Du hast noch keine Frage beantwortet.' };
    if (correct === total) return { ok: true, message: `Alle ${total} richtig – stark!` };
    if (answered < total) return { ok: false, message: `${correct} von ${answered} beantworteten Fragen richtig, ${total - answered} noch offen.` };
    return { ok: false, message: `${correct} von ${total} richtig. Prüfe die rot markierten nochmal – Schritt für Schritt: 1NF? 2NF? 3NF?` };
  }

  applySolution() {
    this.config.questions.forEach((q, i) => this.#choose(this.body.querySelector(`[data-q="${i}"]`), q.answer));
    this.evaluate();
    this.body.querySelectorAll('.why').forEach((w) => { w.hidden = false; });
  }
}
