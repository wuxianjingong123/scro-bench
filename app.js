"use strict";

const scenes = {
  bread: {
    image: "bread.jpg",
    alt: "A cluster of bread rolls on a table with a black rectangular mask near its edge",
    cue: "Cluster boundary",
    title: "Bread rolls",
    question: "Does the black rectangle cover at least one bread roll?",
    answer: "no",
    explanation: "The visible rolls form a complete cluster. The rectangle sits outside the cluster and covers only the background.",
  },
  go: {
    image: "go.jpg",
    alt: "A Go board with visible stones and a black rectangular mask",
    cue: "Spatial separation",
    title: "Go stones",
    question: "Does the black rectangle cover at least one Go stone?",
    answer: "no",
    explanation: "The rectangle covers part of the board where there are no stones.",
  },
  tomatoes: {
    image: "tomatoes.jpg",
    alt: "Tomatoes arranged in rows on a checkered cloth with a black rectangular mask interrupting the pattern",
    cue: "Pattern continuity",
    title: "Tomatoes",
    question: "Does the black rectangle cover at least one tomato?",
    answer: "yes",
    explanation: "The mask interrupts a regular arrangement of tomatoes. The original image confirms that it covers tomatoes.",
  },
};

function initializeExamples() {
  const section = document.querySelector("#examples");
  const panel = document.querySelector("#example-panel");
  if (!section || !panel) return;

  const tabs = Array.from(section.querySelectorAll("[data-example][role='tab']"))
    .filter((tab) => Object.hasOwn(scenes, tab.dataset.example));
  const image = panel.querySelector("#example-image");
  const kicker = panel.querySelector("#example-kicker");
  const title = panel.querySelector("#example-title");
  const question = panel.querySelector("#example-question");
  const feedback = panel.querySelector("#example-feedback");
  const feedbackTitle = panel.querySelector("#example-feedback-title");
  const feedbackCopy = panel.querySelector("#example-feedback-copy");
  const answers = Array.from(panel.querySelectorAll("[data-answer]"));
  if (!tabs.length || !image || !kicker || !title || !question || !feedback || !feedbackTitle || !feedbackCopy) return;

  let currentScene;
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-atomic", "true");

  function setScene(tab) {
    currentScene = scenes[tab.dataset.example];
    panel.dataset.example = tab.dataset.example;
    panel.setAttribute("aria-labelledby", tab.id);

    for (const option of tabs) {
      const selected = option === tab;
      option.setAttribute("aria-selected", String(selected));
      option.tabIndex = selected ? 0 : -1;
    }

    image.alt = currentScene.alt;
    image.src = `./assets/${currentScene.image}`;
    kicker.textContent = currentScene.cue;
    title.textContent = currentScene.title;
    question.textContent = currentScene.question;

    delete panel.dataset.state;
    feedback.hidden = true;
    feedback.classList.remove("is-correct", "is-incorrect");
    feedbackTitle.textContent = "";
    feedbackCopy.textContent = "";
    for (const answer of answers) {
      delete answer.dataset.state;
      answer.setAttribute("aria-pressed", "false");
    }
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => setScene(tab));
    tab.addEventListener("keydown", (event) => {
      const next = {
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (typeof next !== "number") return;

      event.preventDefault();
      setScene(tabs[next]);
      tabs[next].focus();
    });
  }

  for (const control of document.querySelectorAll("[data-open-example]")) {
    const tab = tabs.find((option) => option.dataset.example === control.dataset.openExample);
    if (!tab) continue;

    control.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      setScene(tab);
      if (control.getAttribute("href") !== "#examples") {
        event.preventDefault();
        section.scrollIntoView({ block: "start" });
      }
      tab.focus({ preventScroll: true });
    });
  }

  for (const answer of answers) {
    answer.addEventListener("click", () => {
      const correct = answer.dataset.answer === currentScene.answer;
      const state = correct ? "correct" : "incorrect";
      panel.dataset.state = state;

      for (const option of answers) {
        const selected = option === answer;
        option.setAttribute("aria-pressed", String(selected));
        if (selected) option.dataset.state = state;
        else delete option.dataset.state;
      }

      feedback.classList.toggle("is-correct", correct);
      feedback.classList.toggle("is-incorrect", !correct);
      feedback.hidden = false;
      const expected = currentScene.answer === "yes" ? "Yes" : "No";
      feedbackTitle.textContent = correct ? `Correct · ${expected}` : `Ground truth · ${expected}`;
      feedbackCopy.textContent = currentScene.explanation;
    });
  }

  setScene(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") ?? tabs[0]);
}

function initializeResults() {
  const table = document.querySelector("#results-table");
  const select = document.querySelector("#result-sort");
  const body = table?.tBodies[0];
  if (!select || !body) return;

  const rows = Array.from(body.rows);
  const people = rows.filter((row) => row.hasAttribute("data-human"));
  const models = rows.filter((row) => !row.hasAttribute("data-human"));
  const directions = { bacc: -1, fpr: 1, fnr: 1, error: 1 };

  function sortResults() {
    const metric = select.value;
    if (!Object.hasOwn(directions, metric)) return;

    const rankedModels = models
      .map((row) => ({ row, score: Number.parseFloat(row.dataset[metric]) }))
      .sort((a, b) => {
        if (Number.isNaN(a.score)) return Number.isNaN(b.score) ? 0 : 1;
        if (Number.isNaN(b.score)) return -1;
        return directions[metric] * (a.score - b.score);
      });

    const orderedRows = document.createDocumentFragment();
    for (const person of people) {
      const rank = person.querySelector("[data-rank]");
      if (rank) rank.textContent = "—";
      orderedRows.append(person);
    }

    let position = 0;
    for (const [index, result] of rankedModels.entries()) {
      if (index === 0 || result.score !== rankedModels[index - 1].score) position = index + 1;
      const rank = result.row.querySelector("[data-rank]");
      if (rank) rank.textContent = Number.isNaN(result.score) ? "—" : String(position);
      orderedRows.append(result.row);
    }
    body.append(orderedRows);

    for (const heading of table.querySelectorAll("th[data-metric]")) {
      if (heading.dataset.metric === metric) {
        heading.setAttribute("aria-sort", directions[metric] === -1 ? "descending" : "ascending");
      } else {
        heading.removeAttribute("aria-sort");
      }
    }
  }

  select.addEventListener("change", sortResults);
  sortResults();
}

function initializeNavigation() {
  const toggle = document.querySelector("#nav-toggle");
  const nav = document.querySelector("#site-nav");
  if (!toggle || !nav) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  }

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return;

    setOpen(false);
    if (nav.contains(document.activeElement)) toggle.focus();
  });

  setOpen(false);
}

function initializeAnalysisLinks() {
  function openSection(hash) {
    const section = document.getElementById(hash.slice(1));
    if (section?.matches("details.analysis-details")) section.open = true;
  }

  for (const link of document.querySelectorAll("a.analysis-link")) {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      openSection(link.hash);
    });
  }

  window.addEventListener("hashchange", () => openSection(window.location.hash));
  openSection(window.location.hash);
}

function initializeSite() {
  initializeExamples();
  initializeResults();
  initializeNavigation();
  initializeAnalysisLinks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSite, { once: true });
} else {
  initializeSite();
}
